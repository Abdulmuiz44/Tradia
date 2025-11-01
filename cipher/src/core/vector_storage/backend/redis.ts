/**
 * Redis Vector Storage Backend
 *
 * Implementation of the VectorStore interface for Redis Stack with RediSearch module.
 * Uses Redis FT.SEARCH for efficient vector similarity search with IORedis client.
 *
 * Requires Redis Stack with RediSearch module enabled.
 *
 * @module vector_storage/backend/redis
 */

import { Redis } from 'ioredis';
import type { VectorStore } from './vector-store.js';
import type { SearchFilters, VectorStoreResult, RedisBackendConfig } from './types.js';
import { VectorStoreError, VectorStoreConnectionError, VectorDimensionError } from './types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES, DEFAULTS, ERROR_MESSAGES } from '../constants.js';

type DistanceMetric = 'L2' | 'IP' | 'COSINE';

/**
 * RedisBackend Class
 *
 * Implements the VectorStore interface for Redis Stack with vector search capabilities using IORedis.
 */
export class RedisBackend implements VectorStore {
	private client: Redis;
	private readonly config: RedisBackendConfig;
	private readonly dimension: number;
	private readonly logger: Logger;
	private readonly collectionName: string;
	private readonly indexName: string;
	private readonly distance: DistanceMetric;
	private connected = false;
	private indexCreated = false;

	constructor(config: RedisBackendConfig) {
		this.config = config;
		this.dimension = config.dimension || DEFAULTS.DIMENSION;
		this.collectionName = config.collectionName || 'vectors';
		this.indexName = `${this.collectionName}_idx`;
		this.distance = config.distance || 'COSINE';

		this.logger = createLogger({
			level: process.env.CIPHER_LOG_LEVEL || 'info',
		});

		// Initialize IORedis client
		if (this.config.url) {
			this.client = new Redis(this.config.url);
		} else {
			this.client = new Redis({
				host: this.config.host || 'localhost',
				port: this.config.port ?? 6379,
				password: this.config.password || '',
				username: this.config.username || '',
				enableOfflineQueue: false,
				maxRetriesPerRequest: 3,
			});
		}

		// Setup IORedis client event handlers
		this.client.on('error', error => {
			this.logger.error(`${LOG_PREFIXES.REDIS} Connection error:`, error);
			this.connected = false;
		});

		this.client.on('connect', () => {
			this.logger.info(`${LOG_PREFIXES.REDIS} Connected successfully`);
			this.connected = true;
		});

		this.client.on('close', () => {
			this.logger.info(`${LOG_PREFIXES.REDIS} Connection closed`);
			this.connected = false;
		});

		this.client.on('ready', () => {
			this.logger.info(`${LOG_PREFIXES.REDIS} Client ready`);
			this.connected = true;
		});

		this.logger.debug(`${LOG_PREFIXES.REDIS} Initialized`, {
			collectionName: this.collectionName,
			indexName: this.indexName,
			dimension: this.dimension,
			distance: this.distance,
		});
	}

	/**
	 * Generate Redis key for vector document
	 */
	private getDocumentKey(id: number): string {
		return `${this.collectionName}:${id}`;
	}

	/**
	 * Validate vector dimension
	 */
	private validateDimension(vector: number[], operation: string): void {
		if (vector.length !== this.dimension) {
			throw new VectorDimensionError(
				`${ERROR_MESSAGES.INVALID_DIMENSION}: expected ${this.dimension}, got ${vector.length}`,
				this.dimension,
				vector.length
			);
		}
	}

	/**
	 * Validate ID (must be a valid integer)
	 */
	private validateId(id: number): void {
		if (id === undefined || id === null || !Number.isInteger(id)) {
			throw new VectorStoreError('Redis point IDs must be valid integers', 'id');
		}
	}

	/**
	 * Convert vector to buffer for Redis storage
	 */
	private vectorToBuffer(vector: number[]): Buffer {
		const buffer = Buffer.allocUnsafe(vector.length * 4);
		for (let i = 0; i < vector.length; i++) {
			buffer.writeFloatLE(vector[i] ?? 0, i * 4);
		}
		return buffer;
	}

	/**
	 * Convert buffer back to vector
	 */
	private bufferToVector(buffer: Buffer): number[] {
		const vector: number[] = [];
		for (let i = 0; i < buffer.length; i += 4) {
			vector.push(buffer.readFloatLE(i));
		}
		return vector;
	}

	/**
	 * Create vector search index in Redis using raw commands
	 */
	private async createIndex(): Promise<void> {
		if (this.indexCreated) return;

		try {
			// Check if index already exists using FT.INFO
			try {
				await this.client.call('FT.INFO', this.indexName);
				this.indexCreated = true;
				this.logger.debug(`${LOG_PREFIXES.REDIS} Index ${this.indexName} already exists`);
				return;
			} catch (error) {
				// Index doesn't exist, create it
			}

			// Create the index using FT.CREATE
			const createArgs = [
				this.indexName,
				'ON',
				'JSON',
				'PREFIX',
				'1',
				`${this.collectionName}:`,
				'SCHEMA',
				'$.vector',
				'AS',
				'vector',
				'VECTOR',
				'FLAT',
				'6',
				'TYPE',
				'FLOAT32',
				'DIM',
				this.dimension.toString(),
				'DISTANCE_METRIC',
				this.distance,
			];

			await this.client.call('FT.CREATE', ...createArgs);

			this.indexCreated = true;
			this.logger.info(`${LOG_PREFIXES.REDIS} Created vector index: ${this.indexName}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Failed to create index`, {
				indexName: this.indexName,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new VectorStoreError('Failed to create vector index', 'createIndex', error as Error);
		}
	}

	/**
	 * Build filter query string for FT.SEARCH
	 */
	private buildFilterQuery(filters?: SearchFilters): string {
		if (!filters || Object.keys(filters).length === 0) return '*';

		const conditions: string[] = [];

		for (const [key, value] of Object.entries(filters)) {
			if (value === null || value === undefined) continue;

			// Handle range queries
			if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				('gte' in value || 'gt' in value || 'lte' in value || 'lt' in value)
			) {
				let rangeQuery = `@${key}:[`;

				if ('gte' in value && value.gte !== undefined) {
					rangeQuery += value.gte;
				} else if ('gt' in value && value.gt !== undefined) {
					rangeQuery += `(${value.gt}`;
				} else {
					rangeQuery += '-inf';
				}

				rangeQuery += ' ';

				if ('lte' in value && value.lte !== undefined) {
					rangeQuery += value.lte;
				} else if ('lt' in value && value.lt !== undefined) {
					rangeQuery += `${value.lt})`;
				} else {
					rangeQuery += '+inf';
				}

				rangeQuery += ']';
				conditions.push(rangeQuery);
			}
			// Handle array filters (any)
			else if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				'any' in value &&
				Array.isArray(value.any)
			) {
				const values = value.any.map(v => `"${v}"`).join('|');
				conditions.push(`@${key}:(${values})`);
			}
			// Handle exact matches
			else {
				conditions.push(`@${key}:"${value}"`);
			}
		}

		return conditions.length > 0 ? conditions.join(' ') : '*';
	}

	async connect(): Promise<void> {
		if (this.connected && this.client.status === 'ready') {
			this.logger.debug(`${LOG_PREFIXES.REDIS} Already connected`);
			return;
		}

		this.logger.info(`${LOG_PREFIXES.REDIS} Connecting to Redis Stack`);

		try {
			// IORedis connects automatically, we just need to wait for ready
			if (this.client.status !== 'ready') {
				await new Promise((resolve, reject) => {
					let settled = false;
					const timeout = setTimeout(() => {
						if (!settled) {
							settled = true;
							reject(new Error('Connection timeout'));
						}
					}, 10000);

					const onReady = () => {
						if (!settled) {
							settled = true;
							clearTimeout(timeout);
							resolve(void 0);
						}
					};
					const onError = (error: Error) => {
						if (!settled) {
							settled = true;
							clearTimeout(timeout);
							reject(error);
						}
					};

					this.client.once('ready', onReady);
					this.client.once('error', onError);
				});
			}

			this.connected = true;

			// Create vector index
			await this.createIndex();

			this.logger.info(`${LOG_PREFIXES.REDIS} Successfully connected to Redis Stack`, {
				collectionName: this.collectionName,
				indexName: this.indexName,
				dimension: this.dimension,
			});
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Connection failed`, {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new VectorStoreConnectionError(
				ERROR_MESSAGES.CONNECTION_FAILED,
				'redis',
				error as Error
			);
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connected) {
			this.logger.debug(`${LOG_PREFIXES.REDIS} Already disconnected`);
			return;
		}

		this.logger.info(`${LOG_PREFIXES.REDIS} Disconnecting from Redis`);

		try {
			await this.client.quit();
			this.connected = false;
			this.logger.info(`${LOG_PREFIXES.REDIS} Successfully disconnected`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Error during disconnect:`, error);
		}
	}

	async insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'insert');
		}

		// Validate inputs
		if (vectors.length !== ids.length || vectors.length !== payloads.length) {
			throw new VectorStoreError('Vectors, IDs, and payloads must have the same length', 'insert');
		}

		if (vectors.length === 0) {
			this.logger.debug(`${LOG_PREFIXES.REDIS} No vectors to insert`);
			return;
		}

		// Validate dimensions and IDs
		for (let i = 0; i < vectors.length; i++) {
			this.validateDimension(vectors[i]!, 'insert');
			this.validateId(ids[i]!);
		}

		this.logger.debug(`${LOG_PREFIXES.REDIS} Inserting ${vectors.length} vectors`);

		try {
			const pipeline = this.client.pipeline();

			for (let i = 0; i < vectors.length; i++) {
				const id = ids[i];
				const vector = vectors[i];
				const payload = payloads[i] || {};

				const documentKey = this.getDocumentKey(id ?? 0);
				const vectorBuffer = this.vectorToBuffer(vector ?? []);

				const document = {
					id,
					vector: Array.from(vectorBuffer),
					...payload,
				};

				pipeline.call('JSON.SET', documentKey, '$', JSON.stringify(document));
			}

			await pipeline.exec();

			this.logger.debug(`${LOG_PREFIXES.REDIS} Successfully inserted ${vectors.length} vectors`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Insert failed`, {
				error: error instanceof Error ? error.message : String(error),
				vectorCount: vectors.length,
			});
			throw new VectorStoreError('Failed to insert vectors', 'insert', error as Error);
		}
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

		if (limit <= 0) {
			throw new VectorStoreError('Search limit must be positive', 'search');
		}

		this.logger.debug(`${LOG_PREFIXES.REDIS} Searching with limit ${limit}`, {
			hasFilters: !!filters,
		});

		try {
			// Convert query vector to buffer
			const queryBuffer = this.vectorToBuffer(query);

			// Build filter query
			const filterQuery = this.buildFilterQuery(filters);

			// Perform vector search using FT.SEARCH
			const searchQuery = `${filterQuery} => [KNN ${limit} @vector $query_vec AS score]`;

			const searchArgs = [
				this.indexName,
				searchQuery,
				'PARAMS',
				'2',
				'query_vec',
				queryBuffer,
				'RETURN',
				'2',
				'$',
				'score',
				'SORTBY',
				'score',
				'DIALECT',
				'2',
			];

			const searchResult = (await this.client.call('FT.SEARCH', ...searchArgs)) as any[];

			const results: VectorStoreResult[] = [];
			const totalResults = searchResult[0] as number;

			// Parse search results (skip first element which is count)
			for (let i = 1; i < searchResult.length; i += 2) {
				const docKey = searchResult[i];
				const docFields = searchResult[i + 1];

				// Extract document data and score
				let docData: any = {};
				let score = 0;

				for (let j = 0; j < docFields.length; j += 2) {
					const fieldName = docFields[j];
					const fieldValue = docFields[j + 1];

					if (fieldName === '$') {
						docData = JSON.parse(fieldValue);
					} else if (fieldName === 'score') {
						score = parseFloat(fieldValue);
					}
				}

				const id = parseInt(docData.id);
				const similarityScore = 1 - score; // Convert distance to similarity

				// Extract vector
				const vectorArray = docData.vector;
				const vectorBuffer = Buffer.from(vectorArray);
				const vector = this.bufferToVector(vectorBuffer);

				// Extract payload (exclude id and vector)
				const payload = { ...docData };
				delete payload.id;
				delete payload.vector;

				results.push({
					id,
					score: similarityScore,
					payload,
					vector,
				});
			}

			this.logger.debug(`${LOG_PREFIXES.REDIS} Found ${results.length} results`);
			return results;
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Search failed`, {
				error: error instanceof Error ? error.message : String(error),
				limit,
			});
			throw new VectorStoreError(ERROR_MESSAGES.SEARCH_FAILED, 'search', error as Error);
		}
	}

	async get(vectorId: number): Promise<VectorStoreResult | null> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'get');
		}

		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.REDIS} Getting vector ${vectorId}`);

		try {
			const documentKey = this.getDocumentKey(vectorId);
			const documentJson = await this.client.call('JSON.GET', documentKey, '$');

			if (!documentJson) {
				return null;
			}

			const docData = JSON.parse(documentJson as string)[0];
			const vectorArray = docData.vector;
			const vectorBuffer = Buffer.from(vectorArray);
			const vector = this.bufferToVector(vectorBuffer);

			// Extract payload (exclude id and vector)
			const payload = { ...docData };
			delete payload.id;
			delete payload.vector;

			return {
				id: vectorId,
				vector,
				payload,
				score: 1.0, // Perfect match for exact retrieval
			};
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Get failed`, {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
			});
			throw new VectorStoreError('Failed to retrieve vector', 'get', error as Error);
		}
	}

	async update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'update');
		}

		this.validateDimension(vector, 'update');
		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.REDIS} Updating vector ${vectorId}`);

		try {
			const documentKey = this.getDocumentKey(vectorId);
			const existing = await this.client.call('JSON.GET', documentKey, '$');
			if (!existing) {
				throw new VectorStoreError(`Vector ${vectorId} does not exist`, 'update');
			}
			const vectorBuffer = this.vectorToBuffer(vector);

			const document = {
				id: vectorId,
				vector: Array.from(vectorBuffer),
				...payload,
			};

			await this.client.call('JSON.SET', documentKey, '$', JSON.stringify(document));

			this.logger.debug(`${LOG_PREFIXES.REDIS} Successfully updated vector ${vectorId}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Update failed`, {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
			});
			throw new VectorStoreError('Failed to update vector', 'update', error as Error);
		}
	}

	async delete(vectorId: number): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'delete');
		}

		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.REDIS} Deleting vector ${vectorId}`);

		try {
			const documentKey = this.getDocumentKey(vectorId);
			await this.client.del(documentKey);

			this.logger.debug(`${LOG_PREFIXES.REDIS} Successfully deleted vector ${vectorId}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Delete failed`, {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
			});
			throw new VectorStoreError('Failed to delete vector', 'delete', error as Error);
		}
	}

	async deleteCollection(): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'deleteCollection');
		}

		this.logger.info(`${LOG_PREFIXES.REDIS} Deleting collection: ${this.collectionName}`);

		try {
			// Drop the index first
			try {
				await this.client.call('FT.DROPINDEX', this.indexName);
				this.indexCreated = false;
				this.logger.info(`${LOG_PREFIXES.REDIS} Dropped index: ${this.indexName}`);
			} catch (error) {
				// Index might not exist
				this.logger.debug(
					`${LOG_PREFIXES.REDIS} Index ${this.indexName} does not exist or already dropped`
				);
			}

			// Delete all documents with the collection prefix
			const pattern = `${this.collectionName}:*`;
			let cursor = '0';
			let deletedCount = 0;

			do {
				const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
				cursor = result[0];
				const keys = result[1];

				if (keys.length > 0) {
					await this.client.del(...keys);
					deletedCount += keys.length;
				}
			} while (cursor !== '0');

			this.logger.info(
				`${LOG_PREFIXES.REDIS} Deleted ${deletedCount} documents from collection: ${this.collectionName}`
			);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} Delete collection failed`, {
				error: error instanceof Error ? error.message : String(error),
			});
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

		this.logger.debug(`${LOG_PREFIXES.REDIS} Listing vectors with limit ${limit}`, {
			hasFilters: !!filters,
		});

		try {
			// Build filter query
			const filterQuery = this.buildFilterQuery(filters);

			// Use FT.SEARCH to list documents
			const searchArgs = [
				this.indexName,
				filterQuery,
				'LIMIT',
				'0',
				limit.toString(),
				'RETURN',
				'1',
				'$',
			];

			const searchResult = (await this.client.call('FT.SEARCH', ...searchArgs)) as any[];
			const results: VectorStoreResult[] = [];
			const totalCount = searchResult[0] as number;

			// Parse search results (skip first element which is count)
			for (let i = 1; i < searchResult.length; i += 2) {
				const docKey = searchResult[i];
				const docFields = searchResult[i + 1];

				// Extract document data
				let docData: any = {};
				for (let j = 0; j < docFields.length; j += 2) {
					const fieldName = docFields[j];
					const fieldValue = docFields[j + 1];

					if (fieldName === '$') {
						docData = JSON.parse(fieldValue);
						break;
					}
				}

				const id = parseInt(docData.id);

				// Extract vector
				const vectorArray = docData.vector;
				const vectorBuffer = Buffer.from(vectorArray);
				const vector = this.bufferToVector(vectorBuffer);

				// Extract payload (exclude id and vector)
				const payload = { ...docData };
				delete payload.id;
				delete payload.vector;

				results.push({
					id,
					vector,
					payload,
					score: 1.0,
				});
			}

			this.logger.debug(
				`${LOG_PREFIXES.REDIS} Listed ${results.length} vectors (total: ${totalCount})`
			);

			return [results, totalCount];
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.REDIS} List failed`, {
				error: error instanceof Error ? error.message : String(error),
				limit,
			});
			throw new VectorStoreError('Failed to list vectors', 'list', error as Error);
		}
	}

	// Getter methods
	isConnected(): boolean {
		return this.connected && this.client.status === 'ready';
	}

	getBackendType(): string {
		return 'redis';
	}

	getDimension(): number {
		return this.dimension;
	}

	getCollectionName(): string {
		return this.collectionName;
	}
}
