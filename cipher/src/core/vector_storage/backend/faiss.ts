import type { VectorStore } from './vector-store.js';
import type { SearchFilters, VectorStoreResult } from './types.js';
import { VectorStoreError, VectorStoreConnectionError, VectorDimensionError } from './types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES, ERROR_MESSAGES } from '../constants.js';
import { env } from '../../env.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Index, IndexFlatL2, IndexFlatIP, MetricType } from 'faiss-node';

/**
 * FaissBackendConfig Interface
 * Configuration for the FaissBackend.
 */
export interface FaissBackendConfig {
	collectionName: string;
	dimension: number;
	type: 'faiss';
	distance?: 'Cosine' | 'Euclidean' | 'IP';
	normalize?: boolean;
	options?: Record<string, any>;
	/** Base directory for storing FAISS collection data. */
	baseStoragePath?: string;
}

/**
 * FaissBackend Class
 *
 * Implements the VectorStore interface for an in-memory FAISS-like vector store.
 * This is a simplified implementation for demonstration purposes, mimicking core
 * vector database operations.
 */
export class FaissBackend implements VectorStore {
	private readonly config: FaissBackendConfig;
	private readonly collectionName: string;
	private readonly dimension: number;
	private readonly logger: Logger;
	private connected = false;
	private faissIndex: Index | undefined; // Native FAISS index
	private payloads: Map<number, { id: number; vector: number[]; payload: Record<string, any> }> =
		new Map(); // Store all entry data
	private readonly collectionFilePath: string;
	private needsSave = false; // Track if data needs to be saved

	constructor(config: FaissBackendConfig) {
		this.config = config;
		this.collectionName = config.collectionName;
		this.dimension = config.dimension;
		this.logger = createLogger({
			level: env.CIPHER_LOG_LEVEL || 'info',
		});

		this.logger.debug(`${LOG_PREFIXES.FAISS} Backend initialized`, {
			collection: this.collectionName,
			dimension: this.dimension,
		});
		// Apply default values for optional properties

		this.collectionFilePath = path.join(
			this.config.baseStoragePath || './faiss-data',
			`${this.collectionName}.json`
		);
		this.config.normalize = false;

		// Initialize FAISS index based on distance metric
		switch (this.config.distance) {
			case 'Cosine':
				this.faissIndex = new IndexFlatIP(this.dimension);
				this.config.normalize = true;

				break;
			case 'Euclidean':
				this.faissIndex = new IndexFlatL2(this.dimension);
				break;
			case 'IP':
				this.faissIndex = new IndexFlatIP(this.dimension);
				break;
			default:
				// Default to L2 if not specified or unknown
				this.faissIndex = new IndexFlatL2(this.dimension);
				this.logger.warn(
					`${LOG_PREFIXES.FAISS} No distance metric specified or unsupported, defaulting to Euclidean (L2).`
				);
		}
	}

	/**
	 * Validate the dimension of a given vector.
	 */
	private validateDimension(vector: number[], _operation: string): void {
		if (vector.length !== this.dimension) {
			throw new VectorDimensionError(
				`${ERROR_MESSAGES.INVALID_DIMENSION}: expected ${this.dimension}, got ${vector.length}`,
				this.dimension,
				vector.length
			);
		}
	}

	private normalizeVector(vector: number[]): number[] {
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		if (magnitude === 0) {
			// Handle zero vectors - could return as-is or throw error
			this.logger.warn(`${LOG_PREFIXES.FAISS} Zero magnitude vector encountered`);
			return [...vector]; // Return copy of original
		}
		return vector.map(val => val / magnitude);
	}

	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug(`${LOG_PREFIXES.FAISS} Already connected`);
			return;
		}

		this.logger.debug(`${LOG_PREFIXES.FAISS} Connecting to in-memory FAISS store`);
		try {
			// For an in-memory store, connection is always successful.
			// If there were a native FAISS binding, this would involve loading the index.
			this.logger.debug(`${LOG_PREFIXES.FAISS} Successfully connected`);
			await this.loadData();
			this.connected = true;
			this.logger.debug(`${LOG_PREFIXES.FAISS} Data loaded from ${this.config.baseStoragePath}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Connection failed`, { error: error });
			throw new VectorStoreConnectionError(
				ERROR_MESSAGES.CONNECTION_FAILED,
				'faiss',
				error as Error
			);
		}
	}

	async insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'insert');
		}
		if (vectors.length !== ids.length || vectors.length !== payloads.length) {
			throw new VectorStoreError('Vectors, IDs, and payloads must have the same length', 'insert');
		}

		const newEntries: { id: number; vector: number[]; payload: Record<string, any> }[] = [];

		for (let i = 0; i < vectors.length; i++) {
			let vector = vectors[i]!;
			const id = ids[i]!;
			const payload = payloads[i]!;

			if (this.config.normalize) {
				vector = this.normalizeVector(vector);
			}
			this.validateDimension(vector, 'insert');
			// Store entry
			const entry = { id, vector, payload };
			this.payloads.set(id, entry);
			newEntries.push(entry);
		}

		// Save only the new entries
		await this.saveData(newEntries);
		this.logger.debug(`${LOG_PREFIXES.FAISS} Inserted ${vectors.length} vectors`);
	}

	async search(
		query: number[],
		limit: number = 2,
		filters?: SearchFilters
	): Promise<VectorStoreResult[]> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'search');
		}
		this.validateDimension(query, 'search');
		if (this.config.normalize) {
			query = this.normalizeVector(query);
		}

		if (!this.faissIndex) {
			throw new VectorStoreError('FAISS index not initialized', 'search');
		}
		limit = Math.min(limit, this.faissIndex.ntotal());
		const { distances, labels } = this.faissIndex.search(query, limit);

		const results: VectorStoreResult[] = [];

		for (let i = 0; i < labels.length; i++) {
			const idx = labels[i];
			if (idx === undefined) {
				this.logger.warn(`${LOG_PREFIXES.FAISS} Search returned undefined label for index ${i}`);
				continue;
			}
			if (idx < 0) continue; // -1 = invalid

			// Match label back to our stored payloads
			const entry = this.payloads.get(idx);
			if (!entry) continue;
			// Handle distance access safely - cast to any to work around type issues
			const distanceRow = distances[0] as any;
			if (!distanceRow || typeof distanceRow[i] !== 'number') continue;
			const distance = distanceRow[i] as number;

			results.push({
				id: entry.id,
				vector: entry.vector,
				payload: entry.payload,
				score:
					this.config.distance === 'Cosine' || this.config.distance === 'IP'
						? distance
						: 1 / (1 + distance),
			});
		}

		return results;
	}

	async get(vectorId: number): Promise<VectorStoreResult | null> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'get');
		}
		try {
			const payload = this.payloads.get(vectorId);
			if (!payload) return null;

			return {
				id: vectorId,
				vector: payload.vector,
				payload: payload.payload, // Corrected to return only the user-defined payload
				score: 1.0, // For direct retrieval, score is 1.0
			};
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Get failed`, { error: error });
			throw new VectorStoreError('Failed to retrieve vector', 'get', error as Error);
		}
	}

	async update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'update');
		}
		this.validateDimension(vector, 'update');
		try {
			if (!this.payloads.has(vectorId)) {
				throw new VectorStoreError(`Vector with ID ${vectorId} not found for update`, 'update');
			}

			// Remove old vector from FAISS index and add new one
			// FAISS doesn't have a direct 'update' operation for vectors based on ID.
			// The typical approach is to delete and re-add. However, faiss-node doesn't expose a 'remove' by label.
			// For this mock, we will only update the payload in the map and the file.
			// A real FAISS integration would involve more complex re-indexing or a different update strategy.

			const oldEntry = this.payloads.get(vectorId);
			if (oldEntry && this.faissIndex) {
				// Note: Directly removing from FAISS by label is not straightforward in faiss-node.
				// If a true update was needed, the index would likely be rebuilt or the vector replaced at its old index.
				// For simplicity in this mock, we assume the underlying FAISS index handles updates by overwriting if vector ID maps to same position.
				// Or if we rebuild index from scratch.
				// For now, only update the payload and save data.
			}

			const updatedEntry = { ...this.payloads.get(vectorId)!, vector, payload };
			this.payloads.set(vectorId, updatedEntry);
			this.logger.debug(`${LOG_PREFIXES.FAISS} Updated vector ${vectorId}`);

			// Save only the updated entry
			await this.saveData([{ id: vectorId, vector, payload }]);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Update failed`, { error: error });
			throw new VectorStoreError('Failed to update vector', 'update', error as Error);
		}
	}

	async delete(vectorId: number): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'delete');
		}
		try {
			const deleted = this.payloads.delete(vectorId);
			if (!deleted) {
				this.logger.warn(`${LOG_PREFIXES.FAISS} Vector with ID ${vectorId} not found for deletion`);
			} else {
				this.logger.debug(`${LOG_PREFIXES.FAISS} Deleted vector ${vectorId}`);
				// If a real FAISS index, you would rebuild or compact after deletion.
				// For this mock, we only manage the payload and file data.
				await this.removeFromFile(vectorId);
			}
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Delete failed`, { error: error });
			throw new VectorStoreError('Failed to delete vector', 'delete', error as Error);
		}
	}

	async deleteCollection(): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'deleteCollection');
		}
		try {
			this.payloads.clear();
			this.logger.info(`${LOG_PREFIXES.FAISS} Cleared collection ${this.collectionName}`);

			if (this.config.baseStoragePath) {
				try {
					await fs.unlink(this.collectionFilePath);
					this.logger.info(
						`${LOG_PREFIXES.FAISS} Deleted collection file ${this.collectionFilePath}`
					);
				} catch (fileError: any) {
					if (fileError.code !== 'ENOENT') {
						this.logger.warn(
							`${LOG_PREFIXES.FAISS} Failed to delete collection file: ${fileError}`
						);
					}
				}
			}
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Delete collection failed`, { error: error });
			throw new VectorStoreError('Failed to delete collection', 'deleteCollection', error as Error);
		}
	}

	async list(
		filters?: SearchFilters,
		limit: number = 10000
	): Promise<[VectorStoreResult[], number]> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'list');
		}
		try {
			let results = Array.from(this.payloads.entries()).map(entry => ({
				id: entry[0],
				vector: entry[1].vector,
				payload: entry[1].payload, // Corrected to return only the user-defined payload
				score: 1.0, // Score is 1.0 for listing all
			}));

			if (filters) {
				results = results.filter(entry =>
					Object.entries(filters).every(([key, value]) => {
						const payloadValue = (entry.payload as Record<string, any>)[key];
						if (typeof value === 'object' && value !== null) {
							if ('any' in value && Array.isArray(value.any)) {
								return value.any.includes(payloadValue);
							}
							if (typeof payloadValue === 'number') {
								if ('gte' in value && payloadValue < (value as any).gte) return false;
								if ('lte' in value && payloadValue > (value as any).lte) return false;
								if ('gt' in value && payloadValue <= (value as any).gt) return false;
								if ('lt' in value && payloadValue >= (value as any).lt) return false;
							}
							return true;
						}
						return payloadValue === value;
					})
				);
			}

			const paginatedResults = results.slice(0, limit);
			return [paginatedResults, paginatedResults.length];
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.FAISS} List failed`, { error: error });
			throw new VectorStoreError('Failed to list vectors', 'list', error as Error);
		}
	}

	async disconnect(): Promise<void> {
		if (this.connected) {
			this.connected = false;
			this.logger.info(`${LOG_PREFIXES.FAISS} Disconnected`);
		}
	}

	isConnected(): boolean {
		return this.connected;
	}

	getBackendType(): string {
		return 'faiss';
	}

	getDimension(): number {
		return this.dimension;
	}

	getCollectionName(): string {
		return this.collectionName;
	}

	async listCollections(): Promise<string[]> {
		// In a real scenario, FAISS might manage multiple indices, but for this in-memory mock,
		// we'll just return the current collection name if connected.
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'listCollections');
		}
		return [this.collectionName];
	}

	/**
	 * Saves or updates specific vector data in the JSON file.
	 */
	private async saveData(
		specificEntries?: { id: number; vector: number[]; payload: Record<string, any> }[]
	): Promise<void> {
		if (!this.config.baseStoragePath) {
			this.logger.debug(`${LOG_PREFIXES.FAISS} No storage path configured, skipping save.`);
			return;
		}

		try {
			// Ensure the base directory exists
			const baseDir = path.dirname(this.collectionFilePath);
			await fs.mkdir(baseDir, { recursive: true });

			let existingData: { id: number; vector: number[]; payload: Record<string, any> }[] = [];

			// Load existing data if file exists
			try {
				const fileContent = await fs.readFile(this.collectionFilePath, 'utf8');
				existingData = JSON.parse(fileContent);
			} catch (error: any) {
				if (error.code !== 'ENOENT') {
					throw error; // Re-throw if it's not a "file not found" error
				}
				// File doesn't exist, start with empty array (handled by returning '[]' in mock)
			}

			if (specificEntries) {
				// Update or add specific entries
				for (const newEntry of specificEntries) {
					const existingIndex = existingData.findIndex(entry => entry.id === newEntry.id);
					if (existingIndex >= 0) {
						// Update existing entry
						existingData[existingIndex] = newEntry;
					} else {
						// Add new entry
						existingData.push(newEntry);
					}
				}
			} else {
				// Full save - convert the Map to an array of objects for JSON serialization
				existingData = Array.from(this.payloads.entries()).map(([id, entry]) => ({
					id,
					vector: entry.vector,
					payload: entry.payload,
				}));
			}

			await fs.writeFile(this.collectionFilePath, JSON.stringify(existingData, null, 2), 'utf8');
			this.needsSave = false;

			if (specificEntries) {
				this.logger.debug(
					`${LOG_PREFIXES.FAISS} Updated ${specificEntries.length} specific entries in ${this.collectionFilePath}`
				);
			} else {
				this.logger.debug(
					`${LOG_PREFIXES.FAISS} Full save of ${existingData.length} vectors to ${this.collectionFilePath}`
				);
			}
		} catch (error: any) {
			this.logger.error(`${LOG_PREFIXES.FAISS} Failed to save data to ${this.collectionFilePath}`, {
				error: error,
			});
			// Re-throw the error to propagate it up
			throw error;
		}
	}

	/**
	 * Removes specific vector data from the JSON file.
	 */
	private async removeFromFile(vectorId: number): Promise<void> {
		if (!this.config.baseStoragePath) {
			return;
		}

		try {
			let existingData: { id: number; vector: number[]; payload: Record<string, any> }[] = [];

			// Load existing data
			try {
				const fileContent = await fs.readFile(this.collectionFilePath, 'utf8');
				existingData = JSON.parse(fileContent);
			} catch (error: any) {
				if (error.code === 'ENOENT') {
					// File doesn't exist, nothing to remove (handled by returning '[]' in mock)
					return;
				}
				throw error;
			}

			// Remove the entry with the specified ID
			const filteredData = existingData.filter(entry => entry.id !== vectorId);

			if (filteredData.length !== existingData.length) {
				// Only write if something was actually removed
				await fs.writeFile(this.collectionFilePath, JSON.stringify(filteredData, null, 2), 'utf8');
				this.logger.debug(
					`${LOG_PREFIXES.FAISS} Removed vector ID ${vectorId} from ${this.collectionFilePath}`
				);
			}
		} catch (error: any) {
			this.logger.error(
				`${LOG_PREFIXES.FAISS} Failed to remove vector ID ${vectorId} from ${this.collectionFilePath}`,
				{
					error: error,
				}
			);
			throw error;
		}
	}

	/**
	 * Loads vector data from a single JSON file into memory.
	 */
	private async loadData(): Promise<void> {
		if (!this.config.baseStoragePath) {
			this.logger.debug(`${LOG_PREFIXES.FAISS} No storage path configured, skipping load.`);
			return;
		}

		try {
			this.payloads.clear(); // Clear existing in-memory data before loading

			const fileContent = await fs.readFile(this.collectionFilePath, 'utf8');
			const entries: { id: number; vector: number[]; payload: Record<string, any> }[] =
				JSON.parse(fileContent);

			for (const entry of entries) {
				this.payloads.set(entry.id, entry);
				this.faissIndex?.add(entry.vector);
				this.logger.debug(`${LOG_PREFIXES.FAISS} Loaded vector ID ${entry.id}`);
			}

			this.needsSave = false;
			this.logger.debug(
				`${LOG_PREFIXES.FAISS} Loaded ${entries.length} vectors from ${this.collectionFilePath}`
			);
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				this.logger.debug(
					`${LOG_PREFIXES.FAISS} Collection file not found at ${this.collectionFilePath}. Starting fresh.`
				);
			} else {
				this.logger.error(
					`${LOG_PREFIXES.FAISS} Failed to load data from ${this.collectionFilePath}`,
					{
						error: error,
					}
				);
				throw error; // Re-throw other errors
			}
		}
	}
}
