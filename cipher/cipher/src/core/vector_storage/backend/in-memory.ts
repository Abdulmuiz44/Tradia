/**
 * In-Memory Vector Store Backend
 *
 * Simple in-memory implementation of the VectorStore interface.
 * Used for development, testing, and as a fallback when external stores are unavailable.
 *
 * Features:
 * - Fast local similarity search
 * - No external dependencies
 * - Automatic memory management with max vector limit
 * - Cosine similarity for search
 *
 * Limitations:
 * - Data is lost on process restart
 * - Limited by available memory
 * - No distributed capabilities
 *
 * @module vector_storage/backend/in-memory
 */

import type { VectorStore } from './vector-store.js';
import type { SearchFilters, VectorStoreResult, InMemoryBackendConfig } from './types.js';
import { VectorStoreError, VectorDimensionError } from './types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES, DEFAULTS, ERROR_MESSAGES } from '../constants.js';

/**
 * In-memory vector entry
 */
interface VectorEntry {
	id: number;
	vector: number[];
	payload: Record<string, any>;
}

/**
 * InMemoryBackend Class
 *
 * Implements the VectorStore interface using in-memory storage.
 *
 * @example
 * ```typescript
 * const store = new InMemoryBackend({
 *   type: 'in-memory',
 *   collectionName: 'test',
 *   dimension: 1536,
 *   maxVectors: 10000
 * });
 *
 * await store.connect();
 * await store.insert([vector], ['doc1'], [{ title: 'Test' }]);
 * const results = await store.search(queryVector, 5);
 * ```
 */
export class InMemoryBackend implements VectorStore {
	private readonly config: InMemoryBackendConfig;
	private readonly collectionName: string;
	private readonly dimension: number;
	private readonly maxVectors: number;
	private readonly logger: Logger;
	private connected = false;

	// In-memory storage
	private vectors: Map<number, VectorEntry> = new Map();

	constructor(config: InMemoryBackendConfig) {
		this.config = config;
		this.collectionName = config.collectionName;
		this.dimension = config.dimension;
		this.maxVectors = config.maxVectors || 10000;
		this.logger = createLogger({
			level: process.env.LOG_LEVEL || 'info',
		});

		this.logger.debug(`${LOG_PREFIXES.MEMORY} Initialized`, {
			collection: this.collectionName,
			dimension: this.dimension,
			maxVectors: this.maxVectors,
		});
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private cosineSimilarity(a: number[], b: number[]): number {
		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		const minLength = Math.min(a.length, b.length);
		for (let i = 0; i < minLength; i++) {
			const aVal = a[i]!;
			const bVal = b[i]!;
			dotProduct += aVal * bVal;
			normA += aVal * aVal;
			normB += bVal * bVal;
		}

		normA = Math.sqrt(normA);
		normB = Math.sqrt(normB);

		if (normA === 0 || normB === 0) {
			return 0;
		}

		return dotProduct / (normA * normB);
	}

	/**
	 * Deep clone an object to prevent reference issues
	 */
	private deepClone<T>(obj: T): T {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		if (Array.isArray(obj)) {
			return obj.map(item => this.deepClone(item)) as unknown as T;
		}

		const cloned = {} as T;
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				cloned[key] = this.deepClone(obj[key]);
			}
		}

		return cloned;
	}

	/**
	 * Check if a vector entry matches the given filters
	 */
	private matchesFilters(entry: VectorEntry, filters?: SearchFilters): boolean {
		if (!filters) return true;

		for (const [key, value] of Object.entries(filters)) {
			const payloadValue = entry.payload[key];

			// Handle null/undefined
			if (value === null || value === undefined) continue;

			// Handle range queries
			if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				('gte' in value || 'gt' in value || 'lte' in value || 'lt' in value)
			) {
				if (typeof payloadValue !== 'number') return false;

				if ('gte' in value && payloadValue < value.gte!) return false;
				if ('gt' in value && payloadValue <= value.gt!) return false;
				if ('lte' in value && payloadValue > value.lte!) return false;
				if ('lt' in value && payloadValue >= value.lt!) return false;
			}
			// Handle array filters
			else if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				('any' in value || 'all' in value)
			) {
				if ('any' in value && Array.isArray(value.any)) {
					// Check if payload value matches any of the values
					if (!value.any.includes(payloadValue)) return false;
				}
			}
			// Handle exact match
			else {
				if (payloadValue !== value) return false;
			}
		}

		return true;
	}

	/**
	 * Validate vector dimension
	 */
	private validateDimension(vector: number[], _operation: any): void {
		if (vector.length !== this.dimension) {
			throw new VectorDimensionError(
				`${ERROR_MESSAGES.INVALID_DIMENSION}: expected ${this.dimension}, got ${vector.length}`,
				this.dimension,
				vector.length
			);
		}
	}

	// VectorStore implementation

	async insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'insert');
		}

		// Validate inputs
		if (vectors.length !== ids.length || vectors.length !== payloads.length) {
			throw new VectorStoreError('Vectors, IDs, and payloads must have the same length', 'insert');
		}

		// Check max vectors limit
		if (this.vectors.size + vectors.length > this.maxVectors) {
			throw new VectorStoreError(
				`Cannot insert ${vectors.length} vectors. Would exceed max limit of ${this.maxVectors}`,
				'insert'
			);
		}

		// Validate dimensions and insert
		for (let i = 0; i < vectors.length; i++) {
			const vector = vectors[i];
			const id = ids[i];
			const payload = payloads[i];

			if (!vector || typeof id !== 'number' || !Number.isInteger(id) || !payload) {
				throw new VectorStoreError(
					`Invalid input at index ${i}: vector, integer id, and payload are required`,
					'insert'
				);
			}

			this.validateDimension(vector, 'insert');

			this.vectors.set(id, {
				id: id,
				vector: [...vector], // Clone to prevent external modification
				payload: this.deepClone(payload), // Deep clone payload
			});
		}

		this.logger.debug(`${LOG_PREFIXES.INDEX} Inserted ${vectors.length} vectors`);
	}

	async search(
		query: number[],
		limit: number = DEFAULTS.SEARCH_LIMIT,
		filters?: SearchFilters
	): Promise<VectorStoreResult[]> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'search');
		}

		this.validateDimension(query, 'search');

		// Calculate similarities for all vectors
		const results: Array<{ entry: VectorEntry; score: number }> = [];

		for (const entry of this.vectors.values()) {
			// Apply filters
			if (!this.matchesFilters(entry, filters)) {
				continue;
			}

			// Calculate similarity
			const score = this.cosineSimilarity(query, entry.vector);
			results.push({ entry, score });
		}

		// Sort by score (descending) and limit
		results.sort((a, b) => b.score - a.score);
		const topResults = results.slice(0, limit);

		// Format results
		const formattedResults = topResults.map(({ entry, score }) => ({
			id: entry.id,
			vector: [...entry.vector],
			payload: this.deepClone(entry.payload),
			score,
		}));

		this.logger.debug(`${LOG_PREFIXES.SEARCH} Found ${formattedResults.length} results`);

		return formattedResults;
	}

	async get(vectorId: number): Promise<VectorStoreResult | null> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'get');
		}

		const entry = this.vectors.get(vectorId);
		if (!entry) {
			return null;
		}

		return {
			id: entry.id,
			vector: [...entry.vector], // Clone vector
			payload: this.deepClone(entry.payload), // Deep clone payload
			score: 1.0, // Perfect match for direct retrieval
		};
	}

	async update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'update');
		}

		this.validateDimension(vector, 'update');

		if (!this.vectors.has(vectorId)) {
			throw new VectorStoreError(`Vector with ID ${vectorId} not found`, 'update');
		}

		this.vectors.set(vectorId, {
			id: vectorId,
			vector: [...vector],
			payload: this.deepClone(payload),
		});

		this.logger.debug(`${LOG_PREFIXES.BACKEND} Updated vector ${vectorId}`);
	}

	async delete(vectorId: number): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'delete');
		}

		if (!this.vectors.has(vectorId)) {
			this.logger.warn(`${LOG_PREFIXES.BACKEND} Vector ${vectorId} not found for deletion`);
			return;
		}

		this.vectors.delete(vectorId);
		this.logger.debug(`${LOG_PREFIXES.BACKEND} Deleted vector ${vectorId}`);
	}

	async deleteCollection(): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'deleteCollection');
		}

		const count = this.vectors.size;
		this.vectors.clear();

		this.logger.info(
			`${LOG_PREFIXES.BACKEND} Deleted collection ${this.collectionName} with ${count} vectors`
		);
	}

	async list(filters?: SearchFilters, limit: number = 100): Promise<[VectorStoreResult[], number]> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'list');
		}

		const results: VectorStoreResult[] = [];
		let count = 0;

		for (const entry of this.vectors.values()) {
			if (this.matchesFilters(entry, filters)) {
				count++;
				if (results.length < limit) {
					results.push({
						id: entry.id,
						vector: [...entry.vector],
						payload: this.deepClone(entry.payload),
						score: 1.0, // Default score for list operations
					});
				}
			}
		}

		this.logger.info(`${LOG_PREFIXES.BACKEND} Listed ${results.length} of ${count} vectors`);

		return [results, count];
	}

	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug(`${LOG_PREFIXES.MEMORY} Already connected`);
			return;
		}

		// In-memory doesn't need actual connection
		this.connected = true;
		this.logger.debug(`${LOG_PREFIXES.MEMORY} Connected (in-memory)`);
	}

	async disconnect(): Promise<void> {
		if (!this.connected) {
			this.logger.debug(`${LOG_PREFIXES.MEMORY} Already disconnected`);
			return;
		}

		this.connected = false;
		this.vectors.clear(); // Clear data on disconnect
		this.logger.info(`${LOG_PREFIXES.MEMORY} Disconnected and cleared data`);
	}

	isConnected(): boolean {
		return this.connected;
	}

	getBackendType(): string {
		return 'in-memory';
	}

	getDimension(): number {
		return this.dimension;
	}

	getCollectionName(): string {
		return this.collectionName;
	}
}
