/**
 * ChromaDB Vector Store Backend
 *
 * Implementation of the VectorStore interface for ChromaDB vector database.
 * ChromaDB is an open-source embedding database focused on developer experience.
 *
 * Features:
 * - HTTP-based client for remote ChromaDB servers
 * - Built-in embedding functions support
 * - Rich metadata filtering capabilities
 * - Multiple distance metrics support
 *
 * @module vector_storage/backend/chroma
 */

import { ChromaClient } from 'chromadb';
import type { VectorStore } from './vector-store.js';
import type {
	SearchFilters,
	VectorStoreResult,
	ChromaBackendConfig,
	ChromaPayloadAdapter,
	PayloadTransformationConfig,
} from './types.js';
import { VectorStoreError, VectorStoreConnectionError, VectorDimensionError } from './types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES, DEFAULTS, ERROR_MESSAGES } from '../constants.js';
import { DefaultChromaPayloadAdapter } from './chroma-payload-adapter.js';

/**
 * ChromaDB filter structure
 */
interface ChromaFilter {
	[key: string]: any;
}

/**
 * ChromaBackend Class
 *
 * Implements the VectorStore interface for ChromaDB vector database.
 *
 * @example
 * ```typescript
 * const chroma = new ChromaBackend({
 *   type: 'chroma',
 *   url: 'http://localhost:8000',
 *   collectionName: 'documents',
 *   dimension: 1536
 * });
 *
 * await chroma.connect();
 * await chroma.insert([vector], [1], [{ title: 'Document' }]);
 * const results = await chroma.search(queryVector, 10);
 * ```
 */
export class ChromaBackend implements VectorStore {
	private client: ChromaClient;
	private collection: any = null;
	private readonly config: ChromaBackendConfig;
	private readonly collectionName: string;
	private readonly dimension: number;
	private readonly logger: Logger;
	private readonly payloadAdapter: ChromaPayloadAdapter;
	private connected = false;

	constructor(config: ChromaBackendConfig, payloadAdapter?: ChromaPayloadAdapter) {
		this.config = config;
		this.collectionName = config.collectionName;
		this.dimension = config.dimension;
		this.logger = createLogger({
			level: process.env.CIPHER_LOG_LEVEL || 'info',
		});

		// Initialize payload adapter with default configuration
		this.payloadAdapter = payloadAdapter || new DefaultChromaPayloadAdapter();

		// Initialize client
		const clientConfig: any = {};

		if (config.url) {
			// Parse URL to extract host, port, and ssl settings
			const url = new URL(config.url);
			clientConfig.host = url.hostname;
			clientConfig.port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
			clientConfig.ssl = url.protocol === 'https:';
		} else if (config.host) {
			clientConfig.host = config.host;
			clientConfig.port = config.port || 8000;
			clientConfig.ssl = config.ssl || false;
		}

		if (config.headers) {
			clientConfig.fetchOptions = {
				headers: config.headers,
			};
		}

		this.client = new ChromaClient(clientConfig);

		this.logger.debug(`${LOG_PREFIXES.CHROMA} Initialized`, {
			collection: this.collectionName,
			dimension: this.dimension,
			url:
				config.url ||
				`${clientConfig.ssl ? 'https' : 'http'}://${clientConfig.host}:${clientConfig.port}` ||
				'embedded',
		});
	}

	/**
	 * Convert search filters to ChromaDB filter format
	 */
	private createFilter(filters?: SearchFilters): ChromaFilter | undefined {
		if (!filters) return undefined;

		const chromaFilter: ChromaFilter = {};

		for (const [key, value] of Object.entries(filters)) {
			if (value === null || value === undefined) continue;

			// Handle range queries
			if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				('gte' in value || 'gt' in value || 'lte' in value || 'lt' in value)
			) {
				// ChromaDB uses $gte, $gt, $lte, $lt operators
				const rangeConditions: any = {};
				if ('gte' in value && value.gte !== undefined) rangeConditions.$gte = value.gte;
				if ('gt' in value && value.gt !== undefined) rangeConditions.$gt = value.gt;
				if ('lte' in value && value.lte !== undefined) rangeConditions.$lte = value.lte;
				if ('lt' in value && value.lt !== undefined) rangeConditions.$lt = value.lt;
				chromaFilter[key] = rangeConditions;
			}
			// Handle array filters (any/all)
			else if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				('any' in value || 'all' in value)
			) {
				// ChromaDB uses $in for "any" operations
				if ('any' in value && Array.isArray(value.any)) {
					chromaFilter[key] = { $in: value.any };
				}
				// For 'all', we'd need multiple conditions - ChromaDB doesn't have direct support
				// so we'll use the first value as a fallback
				else if ('all' in value && Array.isArray(value.all) && value.all.length > 0) {
					chromaFilter[key] = value.all[0];
				}
			}
			// Handle exact matches
			else {
				chromaFilter[key] = value;
			}
		}

		return Object.keys(chromaFilter).length > 0 ? chromaFilter : undefined;
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
	 * Validate ID (ChromaDB supports string and number IDs, we'll convert numbers to strings)
	 */
	private validateId(id: number): void {
		if (!Number.isInteger(id) || isNaN(id)) {
			throw new VectorStoreError('ChromaDB point IDs must be valid integers', 'id');
		}
	}

	/**
	 * Get the payload adapter instance
	 */
	getPayloadAdapter(): ChromaPayloadAdapter {
		return this.payloadAdapter;
	}

	// VectorStore implementation

	async insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'insert');
		}

		if (!this.collection) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Collection is null during insert`);
			throw new VectorStoreError('ChromaDB collection not initialized', 'insert');
		}

		// Validate inputs
		if (vectors.length !== ids.length || vectors.length !== payloads.length) {
			throw new VectorStoreError('Vectors, IDs, and payloads must have the same length', 'insert');
		}

		// Validate dimensions and IDs
		for (let i = 0; i < vectors.length; i++) {
			const vector = vectors[i];
			const id = ids[i];

			if (!vector) {
				throw new VectorStoreError(`Vector missing at index ${i}`, 'insert');
			}
			if (id === undefined || id === null) {
				throw new VectorStoreError(`ID missing at index ${i}`, 'insert');
			}

			this.validateDimension(vector, 'insert');
			this.validateId(id);
		}

		this.logger.debug(`${LOG_PREFIXES.CHROMA} Inserting ${vectors.length} vectors`);

		// Convert IDs to strings as ChromaDB expects string IDs
		const stringIds = ids.map(id => id.toString());

		// Convert payloads to be ChromaDB compatible using the payload adapter
		const chromaCompatiblePayloads = payloads.map(payload =>
			this.payloadAdapter.serialize(payload)
		);

		const addParams = {
			ids: stringIds,
			embeddings: vectors,
			metadatas: chromaCompatiblePayloads,
		};

		try {
			// Use upsert to avoid duplicate ID errors on re-inserts
			await this.collection.upsert(addParams);

			this.logger.debug(`${LOG_PREFIXES.CHROMA} Successfully inserted ${vectors.length} vectors`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Insert failed`, {
				error: error instanceof Error ? error.message : String(error),
				vectorCount: vectors.length,
				collectionName: this.collectionName,
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

		if (!this.collection) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Collection is null during search`);
			throw new VectorStoreError('ChromaDB collection not initialized', 'search');
		}

		this.validateDimension(query, 'search');

		this.logger.debug(`${LOG_PREFIXES.CHROMA} Searching with limit ${limit}`, {
			hasFilters: !!filters,
		});

		try {
			const chromaFilter = this.createFilter(filters);

			const searchParams: any = {
				queryEmbeddings: [query],
				nResults: limit,
			};

			if (chromaFilter) {
				searchParams.where = chromaFilter;
			}

			const searchResponse = await this.collection.query(searchParams);

			// ChromaDB returns results in arrays
			const results: VectorStoreResult[] = [];
			if (searchResponse.ids && searchResponse.ids[0]) {
				for (let i = 0; i < searchResponse.ids[0].length; i++) {
					const id = searchResponse.ids[0][i];
					const distance = searchResponse.distances?.[0]?.[i] ?? 0;
					const metadata = searchResponse.metadatas?.[0]?.[i] ?? {};

					// Convert distance to similarity score (ChromaDB returns distances)
					// For cosine distance, similarity = 1 - distance
					const score = 1 - distance;

					results.push({
						id: parseInt(id, 10), // Convert back to number
						score,
						payload: this.payloadAdapter.deserialize(metadata),
					});
				}
			}

			this.logger.debug(`${LOG_PREFIXES.CHROMA} Found ${results.length} results`);

			return results;
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Search failed`, {
				error: error instanceof Error ? error.message : String(error),
				queryLength: query.length,
				limit,
				collectionName: this.collectionName,
			});
			throw new VectorStoreError(ERROR_MESSAGES.SEARCH_FAILED, 'search', error as Error);
		}
	}

	async get(vectorId: number): Promise<VectorStoreResult | null> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'get');
		}

		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.CHROMA} Getting vector ${vectorId}`);

		try {
			const response = await this.collection.get({
				ids: [vectorId.toString()],
				include: ['embeddings', 'metadatas'],
			});

			if (!response.ids || response.ids.length === 0) {
				return null;
			}

			const id = response.ids[0];
			const embedding = response.embeddings?.[0];
			const metadata = response.metadatas?.[0] ?? {};

			return {
				id: parseInt(id, 10),
				vector: embedding || [],
				payload: this.payloadAdapter.deserialize(metadata),
				score: 1.0,
			};
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Get failed`, { error });
			throw new VectorStoreError('Failed to retrieve vector', 'get', error as Error);
		}
	}

	async update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'update');
		}

		this.validateDimension(vector, 'update');
		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.CHROMA} Updating vector ${vectorId}`);

		try {
			// Convert payload to be ChromaDB compatible using the payload adapter
			const convertedPayload = this.payloadAdapter.serialize(payload);

			// ChromaDB doesn't have a direct update method, so we use upsert
			await this.collection.upsert({
				ids: [vectorId.toString()],
				embeddings: [vector],
				metadatas: [convertedPayload],
			});

			this.logger.debug(`${LOG_PREFIXES.CHROMA} Successfully updated vector ${vectorId}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Update failed`, { error });
			throw new VectorStoreError('Failed to update vector', 'update', error as Error);
		}
	}

	async delete(vectorId: number): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'delete');
		}

		this.validateId(vectorId);
		this.logger.debug(`${LOG_PREFIXES.CHROMA} Deleting vector ${vectorId}`);

		try {
			await this.collection.delete({
				ids: [vectorId.toString()],
			});

			this.logger.debug(`${LOG_PREFIXES.CHROMA} Successfully deleted vector ${vectorId}`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Delete failed`, { error });
			throw new VectorStoreError('Failed to delete vector', 'delete', error as Error);
		}
	}

	async deleteCollection(): Promise<void> {
		if (!this.connected) {
			throw new VectorStoreError(ERROR_MESSAGES.NOT_CONNECTED, 'deleteCollection');
		}

		this.logger.warn(`${LOG_PREFIXES.CHROMA} Deleting collection ${this.collectionName}`);

		try {
			await this.client.deleteCollection({ name: this.collectionName });
			this.logger.info(
				`${LOG_PREFIXES.CHROMA} Successfully deleted collection ${this.collectionName}`
			);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Delete collection failed`, { error });
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

		this.logger.debug(`${LOG_PREFIXES.CHROMA} Listing vectors`, {
			hasFilters: !!filters,
			limit,
		});

		try {
			const chromaFilter = this.createFilter(filters);

			const getParams: any = {
				include: ['embeddings', 'metadatas'],
				limit,
			};

			if (chromaFilter) {
				getParams.where = chromaFilter;
			}

			const response = await this.collection.get(getParams);

			const results: VectorStoreResult[] = [];
			if (response.ids) {
				for (let i = 0; i < response.ids.length; i++) {
					const id = response.ids[i];
					const embedding = response.embeddings?.[i];
					const metadata = response.metadatas?.[i] ?? {};

					results.push({
						id: parseInt(id, 10),
						score: 1.0, // Default score for exact match
						payload: this.payloadAdapter.deserialize(metadata),
						vector: embedding,
					});
				}
			}

			// ChromaDB doesn't provide total count directly, so we return the result count
			this.logger.info(`${LOG_PREFIXES.CHROMA} Listed ${results.length} vectors`);

			return [results, results.length];
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} List failed`, { error });
			throw new VectorStoreError('Failed to list vectors', 'list', error as Error);
		}
	}

	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug(`${LOG_PREFIXES.CHROMA} Already connected`);
			return;
		}

		this.logger.info(`${LOG_PREFIXES.CHROMA} Connecting to ChromaDB`);

		try {
			// Try to get or create the collection
			try {
				this.collection = await this.client.getCollection({
					name: this.collectionName,
					embeddingFunction: null as any, // Use null to indicate no embedding function
				});

				this.logger.debug(
					`${LOG_PREFIXES.CHROMA} Collection already exists: ${this.collectionName}`
				);
			} catch (error) {
				// Collection doesn't exist, create it
				this.logger.debug(`${LOG_PREFIXES.CHROMA} Creating collection ${this.collectionName}`);

				// Determine distance metric
				const distance = this.config.distance || 'cosine';
				let metricName = 'cosine';
				if (distance === 'euclidean' || distance === 'l2') {
					metricName = 'l2';
				} else if (distance === 'ip' || distance === 'dot') {
					metricName = 'ip';
				}

				this.collection = await this.client.createCollection({
					name: this.collectionName,
					metadata: {
						'hnsw:space': metricName,
					},
					embeddingFunction: null as any, // Use null to indicate no embedding function
				});
			}

			this.connected = true;
			this.logger.info(`${LOG_PREFIXES.CHROMA} Successfully connected`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.CHROMA} Connection failed`, { error });

			if (error instanceof VectorStoreConnectionError) {
				throw error;
			}

			throw new VectorStoreConnectionError(
				ERROR_MESSAGES.CONNECTION_FAILED,
				'chroma',
				error as Error
			);
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connected) {
			this.logger.debug(`${LOG_PREFIXES.CHROMA} Already disconnected`);
			return;
		}

		this.logger.info(`${LOG_PREFIXES.CHROMA} Disconnecting from ChromaDB`);

		// ChromaDB client doesn't have explicit disconnect
		// Just mark as disconnected and clear collection reference
		this.collection = null;
		this.connected = false;

		this.logger.info(`${LOG_PREFIXES.CHROMA} Successfully disconnected`);
	}

	isConnected(): boolean {
		return this.connected;
	}

	getBackendType(): string {
		return 'chroma';
	}

	getDimension(): number {
		return this.dimension;
	}

	getCollectionName(): string {
		return this.collectionName;
	}
}
