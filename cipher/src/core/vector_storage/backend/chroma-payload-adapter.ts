/**
 * ChromaDB Payload Adapter
 *
 * Handles transformation of complex payloads to ChromaDB-compatible flat metadata
 * and back to original format. ChromaDB only supports primitive types (string, number, boolean)
 * in metadata, so this adapter provides various strategies to handle complex nested objects.
 *
 * @module vector_storage/backend/chroma-payload-adapter
 */

import type {
	ChromaPayloadAdapter,
	PayloadTransformationConfig,
	FieldTransformationConfig,
	PayloadTransformationStrategy,
} from './types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES } from '../constants.js';

/**
 * Default configuration for payload transformation
 */
const DEFAULT_CONFIG: PayloadTransformationConfig = {
	defaultStrategy: 'json-string',
	autoFlattenNested: true,
	maxNestingDepth: 3,
	fieldConfigs: {
		// Legacy field configurations for backward compatibility
		tags: { strategy: 'comma-separated' },
		currentProgress: { strategy: 'json-string' },
		bugsEncountered: { strategy: 'json-string' },
		workContext: { strategy: 'json-string' },
		// Common field patterns
		id: { strategy: 'preserve' },
		created_at: { strategy: 'preserve' },
		updated_at: { strategy: 'preserve' },
		timestamp: { strategy: 'preserve' },
		score: { strategy: 'preserve' },
		version: { strategy: 'preserve' },
	},
};

/**
 * Implementation of ChromaPayloadAdapter
 *
 * Provides flexible payload transformation with configurable strategies
 * for different field types and nested object handling.
 *
 * @example
 * ```typescript
 * const adapter = new DefaultChromaPayloadAdapter();
 *
 * // Transform complex payload for ChromaDB storage
 * const complexPayload = {
 *   user: { name: 'John', profile: { age: 30, skills: ['js', 'ts'] } },
 *   tags: ['important', 'reviewed'],
 *   metadata: { created: new Date(), version: 1 }
 * };
 *
 * const flatMetadata = adapter.serialize(complexPayload);
 * // Result: { user_name: 'John', user_profile_age: 30, user_profile_skills: 'js,ts', tags: 'important,reviewed', ... }
 *
 * // Transform back from ChromaDB metadata
 * const originalPayload = adapter.deserialize(flatMetadata);
 * ```
 */
export class DefaultChromaPayloadAdapter implements ChromaPayloadAdapter {
	private config: PayloadTransformationConfig;
	private readonly logger: Logger;

	constructor(config?: Partial<PayloadTransformationConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.logger = createLogger({
			level: process.env.CIPHER_LOG_LEVEL || 'info',
		});

		// Merge field configs
		if (config?.fieldConfigs) {
			this.config.fieldConfigs = { ...DEFAULT_CONFIG.fieldConfigs, ...config.fieldConfigs };
		}
	}

	/**
	 * Serialize complex payload to ChromaDB-compatible metadata
	 */
	serialize(payload: Record<string, any>): Record<string, string | number | boolean> {
		if (!payload || typeof payload !== 'object') {
			return {};
		}

		const result: Record<string, string | number | boolean> = {};

		for (const [key, value] of Object.entries(payload)) {
			if (value === null || value === undefined) {
				continue;
			}

			const fieldConfig = this.config.fieldConfigs[key];
			const strategy = fieldConfig?.strategy || this.getStrategyForValue(value);

			try {
				const transformedEntries = this.serializeField(key, value, strategy, fieldConfig);
				Object.assign(result, transformedEntries);
			} catch (error) {
				this.logger.warn(`${LOG_PREFIXES.CHROMA} Failed to serialize field '${key}'`, {
					key,
					strategy,
					error: error instanceof Error ? error.message : String(error),
				});
				// Fallback to JSON string serialization
				if (strategy !== 'json-string') {
					try {
						result[key] = JSON.stringify(value);
					} catch (jsonError) {
						this.logger.error(`${LOG_PREFIXES.CHROMA} Failed JSON fallback for field '${key}'`, {
							key,
							jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
						});
					}
				}
			}
		}

		return result;
	}

	/**
	 * Deserialize ChromaDB metadata back to original payload format
	 */
	deserialize(metadata: Record<string, any>): Record<string, any> {
		if (!metadata || typeof metadata !== 'object') {
			return {};
		}

		const result: Record<string, any> = {};
		const processedKeys = new Set<string>();

		// First pass: handle direct field mappings and identify grouped keys
		for (const [key, value] of Object.entries(metadata)) {
			if (processedKeys.has(key)) {
				continue;
			}

			const fieldConfig = this.config.fieldConfigs[key];
			if (fieldConfig) {
				try {
					result[key] = this.deserializeField(key, value, fieldConfig.strategy, fieldConfig);
					processedKeys.add(key);
				} catch (error) {
					this.logger.warn(`${LOG_PREFIXES.CHROMA} Failed to deserialize field '${key}'`, {
						key,
						strategy: fieldConfig.strategy,
						error: error instanceof Error ? error.message : String(error),
					});
					result[key] = value; // Fallback to original value
					processedKeys.add(key);
				}
			}
		}

		// Second pass: handle flattened nested objects (dot notation)
		if (this.config.autoFlattenNested) {
			const nestedGroups = this.groupFlattenedKeys(metadata, processedKeys);
			for (const [rootKey, nestedData] of Object.entries(nestedGroups)) {
				result[rootKey] = this.reconstructNestedObject(nestedData);
				// Mark all related keys as processed
				for (const flatKey in metadata) {
					if (flatKey.startsWith(rootKey + '_')) {
						processedKeys.add(flatKey);
					}
				}
			}
		}

		// Third pass: handle remaining unprocessed keys using heuristics
		for (const [key, value] of Object.entries(metadata)) {
			if (!processedKeys.has(key)) {
				// Determine strategy based on value characteristics
				const strategy = this.inferDeserializationStrategy(value);
				result[key] = this.deserializeField(key, value, strategy);
			}
		}

		return result;
	}

	/**
	 * Get transformation configuration
	 */
	getConfig(): PayloadTransformationConfig {
		return { ...this.config };
	}

	/**
	 * Update transformation configuration
	 */
	updateConfig(config: Partial<PayloadTransformationConfig>): void {
		// Merge the configuration properly, preserving existing field configs
		const mergedFieldConfigs = config.fieldConfigs
			? { ...this.config.fieldConfigs, ...config.fieldConfigs }
			: this.config.fieldConfigs;

		this.config = {
			...this.config,
			...config,
			fieldConfigs: mergedFieldConfigs,
		};
	}

	/**
	 * Determine the best strategy for a given value
	 */
	private getStrategyForValue(value: any): PayloadTransformationStrategy {
		if (value === null || value === undefined) {
			return 'preserve';
		}

		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return 'preserve';
		}

		if (Array.isArray(value)) {
			// Check if array contains only strings/numbers for comma-separated
			if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
				return 'comma-separated';
			}
			return 'json-string';
		}

		if (typeof value === 'object') {
			// Empty objects should use JSON string strategy to preserve them
			if (Object.keys(value).length === 0) {
				return 'json-string';
			}
			// Check if object is simple enough for dot notation
			if (this.isSimpleObject(value)) {
				return 'dot-notation';
			}
			return 'json-string';
		}

		return this.config.defaultStrategy;
	}

	/**
	 * Infer deserialization strategy based on stored value characteristics
	 */
	private inferDeserializationStrategy(value: any): PayloadTransformationStrategy {
		if (typeof value === 'string') {
			// Check if it looks like a comma-separated list
			if (value.includes(',') && !value.startsWith('{') && !value.startsWith('[')) {
				return 'comma-separated';
			}
			// Check if it looks like JSON
			if (
				(value.startsWith('{') && value.endsWith('}')) ||
				(value.startsWith('[') && value.endsWith(']'))
			) {
				return 'json-string';
			}
			// Check if this might be a single-item array that was originally serialized
			// This is a heuristic - if the original was ['single'], we need to detect this case
			// For now, we'll use the default behavior unless we have explicit configuration
		}
		return 'preserve';
	}

	/**
	 * Check if an object is simple enough for dot notation flattening
	 */
	private isSimpleObject(obj: any, depth: number = 0): boolean {
		if (depth >= this.config.maxNestingDepth) {
			return false;
		}

		if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
			return false;
		}

		// Count the total number of nested levels and complexity
		const keys = Object.keys(obj);
		if (keys.length > 10) {
			// Too many keys at this level
			return false;
		}

		return Object.values(obj).every(value => {
			if (value === null || value === undefined) return true;
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				return true;
			}
			if (Array.isArray(value)) {
				// Only simple arrays with primitive values
				return (
					value.length <= 5 &&
					value.every(item => typeof item === 'string' || typeof item === 'number')
				);
			}
			if (typeof value === 'object') {
				return this.isSimpleObject(value, depth + 1);
			}
			return false;
		});
	}

	/**
	 * Serialize a single field based on strategy
	 */
	private serializeField(
		key: string,
		value: any,
		strategy: PayloadTransformationStrategy,
		config?: FieldTransformationConfig
	): Record<string, string | number | boolean> {
		const result: Record<string, string | number | boolean> = {};

		// Use custom transformer if available
		if (config?.customTransformer) {
			const transformed = config.customTransformer.serialize(value);
			if (typeof transformed === 'object' && !Array.isArray(transformed)) {
				return transformed;
			}
			result[key] = transformed;
			return result;
		}

		switch (strategy) {
			case 'preserve':
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
					result[key] = value;
				} else {
					result[key] = String(value);
				}
				break;

			case 'json-string':
				result[key] = JSON.stringify(value);
				break;

			case 'comma-separated':
				if (Array.isArray(value)) {
					result[key] = value.filter(item => item != null).join(',');
				} else {
					result[key] = String(value);
				}
				break;

			case 'boolean-flags':
				if (Array.isArray(value)) {
					const prefix = config?.prefix || key;
					for (const item of value) {
						if (item != null) {
							result[`${prefix}_${String(item)}`] = true;
						}
					}
				} else {
					result[key] = Boolean(value);
				}
				break;

			case 'dot-notation':
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					const flattened = this.flattenObject(value, key);
					Object.assign(result, flattened);
				} else {
					result[key] = String(value);
				}
				break;

			default:
				result[key] = JSON.stringify(value);
		}

		return result;
	}

	/**
	 * Deserialize a single field based on strategy
	 */
	private deserializeField(
		key: string,
		value: any,
		strategy: PayloadTransformationStrategy,
		config?: FieldTransformationConfig
	): any {
		// Use custom transformer if available
		if (config?.customTransformer) {
			return config.customTransformer.deserialize(value);
		}

		switch (strategy) {
			case 'preserve':
				return value;

			case 'json-string':
				if (typeof value === 'string') {
					try {
						return JSON.parse(value);
					} catch {
						return value;
					}
				}
				return value;

			case 'comma-separated':
				if (typeof value === 'string') {
					if (value === '') {
						return [];
					}
					return value
						.split(',')
						.filter(item => item.trim().length > 0)
						.map(item => {
							const trimmed = item.trim();
							// Try to convert back to number if it looks like a number
							if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
								const num = Number(trimmed);
								return isNaN(num) ? trimmed : num;
							}
							return trimmed;
						});
				}
				return Array.isArray(value) ? value : [value];

			case 'boolean-flags':
				// This would be handled in the grouping logic
				return value;

			case 'dot-notation':
				// This would be handled in the nested object reconstruction
				return value;

			default:
				if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
					try {
						return JSON.parse(value);
					} catch {
						return value;
					}
				}
				return value;
		}
	}

	/**
	 * Flatten nested object using dot notation
	 */
	private flattenObject(
		obj: Record<string, any>,
		prefix: string = '',
		depth: number = 0
	): Record<string, string | number | boolean> {
		const result: Record<string, string | number | boolean> = {};

		if (depth >= this.config.maxNestingDepth) {
			result[prefix] = JSON.stringify(obj);
			return result;
		}

		for (const [key, value] of Object.entries(obj)) {
			if (value === null || value === undefined) {
				continue;
			}

			const newKey = prefix ? `${prefix}_${key}` : key;

			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				result[newKey] = value;
			} else if (Array.isArray(value)) {
				// Handle arrays as comma-separated for simple types
				if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
					result[newKey] = value.join(',');
				} else {
					result[newKey] = JSON.stringify(value);
				}
			} else if (typeof value === 'object') {
				Object.assign(result, this.flattenObject(value, newKey, depth + 1));
			} else {
				result[newKey] = String(value);
			}
		}

		return result;
	}

	/**
	 * Group flattened keys by their root key
	 */
	private groupFlattenedKeys(
		metadata: Record<string, any>,
		processedKeys: Set<string>
	): Record<string, Record<string, any>> {
		const groups: Record<string, Record<string, any>> = {};

		for (const key in metadata) {
			if (processedKeys.has(key)) {
				continue;
			}

			const underscoreIndex = key.indexOf('_');
			if (underscoreIndex > 0) {
				const rootKey = key.substring(0, underscoreIndex);
				const remainingKey = key.substring(underscoreIndex + 1);

				if (!groups[rootKey]) {
					groups[rootKey] = {};
				}
				groups[rootKey][remainingKey] = metadata[key];
			}
		}

		return groups;
	}

	/**
	 * Reconstruct nested object from flattened keys
	 */
	private reconstructNestedObject(flatData: Record<string, any>): any {
		const result: Record<string, any> = {};

		for (const [key, value] of Object.entries(flatData)) {
			const parts = key.split('_');
			let current = result;

			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				if (!part) continue; // Skip undefined parts
				if (!(part in current)) {
					current[part] = {};
				}
				current = current[part];
			}

			const finalKey = parts[parts.length - 1];
			if (!finalKey) continue; // Skip if finalKey is undefined

			// Try to parse comma-separated values back to arrays
			if (typeof value === 'string' && value.includes(',')) {
				const arrayValue = value
					.split(',')
					.filter(item => item.trim().length > 0)
					.map(item => {
						const trimmed = item.trim();
						// Try to convert back to number if it looks like a number
						if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
							const num = Number(trimmed);
							return isNaN(num) ? trimmed : num;
						}
						return trimmed;
					});
				// Only convert to array if it looks like it should be an array
				current[finalKey] = arrayValue.length > 1 ? arrayValue : value;
			} else {
				current[finalKey] = value;
			}
		}

		return result;
	}
}
