/**
 * Vector Store Interface
 *
 * Defines the contract for vector storage implementations.
 * Vector stores are optimized for similarity search over high-dimensional vectors.
 *
 * Implementations can include:
 * - Qdrant: High-performance vector similarity search engine
 * - Pinecone: Managed vector database service
 * - Weaviate: Open-source vector search engine
 * - In-Memory: Fast local storage for development/testing
 *
 * @module vector_storage/backend/vector-store
 */

import type { SearchFilters, VectorStoreResult } from './types.js';

/**
 * VectorStore Interface
 *
 * Provides a unified API for different vector storage implementations.
 * All methods are asynchronous to support both local and network-based backends.
 *
 * @example
 * ```typescript
 * class QdrantBackend implements VectorStore {
 *   async search(query: number[], limit?: number): Promise<VectorStoreResult[]> {
 *     const results = await this.client.search(this.collectionName, {
 *       vector: query,
 *       limit: limit || 10
 *     });
 *     return results.map(this.formatResult);
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface VectorStore {
	// Basic vector operations

	/**
	 * Insert vectors with their metadata
	 *
	 * @param vectors - Array of embedding vectors
	 * @param ids - Array of unique integer identifiers for each vector
	 * @param payloads - Array of metadata objects for each vector
	 * @throws {VectorDimensionError} If vector dimensions don't match configuration
	 * @throws {VectorStoreError} If insertion fails
	 *
	 * @example
	 * ```typescript
	 * await store.insert(
	 *   [embedding1, embedding2],
	 *   [1, 2],
	 *   [{ title: 'Doc 1' }, { title: 'Doc 2' }]
	 * );
	 * ```
	 */
	insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void>;

	/**
	 * Search for similar vectors
	 *
	 * @param query - Query vector to search for
	 * @param limit - Maximum number of results to return
	 * @param filters - Optional metadata filters
	 * @returns Array of search results sorted by similarity
	 * @throws {VectorDimensionError} If query dimension doesn't match configuration
	 *
	 * @example
	 * ```typescript
	 * const results = await store.search(queryVector, 5, {
	 *   category: 'technical',
	 *   date: { gte: startDate }
	 * });
	 * ```
	 */
	search(query: number[], limit?: number, filters?: SearchFilters): Promise<VectorStoreResult[]>;

	/**
	 * Retrieve a specific vector by ID
	 *
	 * @param vectorId - The unique integer identifier of the vector
	 * @returns The vector result or null if not found
	 *
	 * @example
	 * ```typescript
	 * const vector = await store.get(123);
	 * if (vector) {
	 *   console.log(vector.payload);
	 * }
	 * ```
	 */
	get(vectorId: number): Promise<VectorStoreResult | null>;

	/**
	 * Update a vector and its metadata
	 *
	 * @param vectorId - The unique integer identifier of the vector
	 * @param vector - The new embedding vector
	 * @param payload - The new metadata
	 * @throws {VectorDimensionError} If vector dimension doesn't match configuration
	 *
	 * @example
	 * ```typescript
	 * await store.update(123, newEmbedding, {
	 *   title: 'Updated Title',
	 *   modified_at: Date.now()
	 * });
	 * ```
	 */
	update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void>;

	/**
	 * Delete a vector
	 *
	 * @param vectorId - The unique integer identifier of the vector to delete
	 *
	 * @example
	 * ```typescript
	 * await store.delete(123);
	 * ```
	 */
	delete(vectorId: number): Promise<void>;

	// Collection management

	/**
	 * Delete the entire collection
	 *
	 * WARNING: This will permanently delete all vectors in the collection.
	 *
	 * @example
	 * ```typescript
	 * // Use with caution!
	 * await store.deleteCollection();
	 * ```
	 */
	deleteCollection(): Promise<void>;

	/**
	 * List vectors with optional filtering
	 *
	 * @param filters - Optional metadata filters
	 * @param limit - Maximum number of results
	 * @returns Tuple of [results, total count]
	 *
	 * @example
	 * ```typescript
	 * const [vectors, totalCount] = await store.list(
	 *   { category: 'documents' },
	 *   100
	 * );
	 * console.log(`Found ${vectors.length} of ${totalCount} total`);
	 * ```
	 */
	list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]>;

	// Connection management

	/**
	 * Establishes connection to the vector store backend
	 *
	 * Should be called before performing any operations.
	 * Implementations should handle reconnection logic internally.
	 *
	 * @throws {VectorStoreConnectionError} If connection fails
	 *
	 * @example
	 * ```typescript
	 * const store = new QdrantBackend(config);
	 * await store.connect();
	 * // Now ready to use
	 * ```
	 */
	connect(): Promise<void>;

	/**
	 * Gracefully closes the connection to the vector store
	 *
	 * Should clean up resources and close any open connections.
	 * After disconnect, connect() must be called again before use.
	 *
	 * @example
	 * ```typescript
	 * // Clean shutdown
	 * await store.disconnect();
	 * ```
	 */
	disconnect(): Promise<void>;

	/**
	 * Checks if the backend is currently connected and ready
	 *
	 * @returns true if connected and operational, false otherwise
	 *
	 * @example
	 * ```typescript
	 * if (!store.isConnected()) {
	 *   await store.connect();
	 * }
	 * ```
	 */
	isConnected(): boolean;

	// Metadata

	/**
	 * Returns the backend type identifier
	 *
	 * Useful for logging, monitoring, and conditional logic based on backend type.
	 *
	 * @returns Backend type string (e.g., 'qdrant', 'pinecone', 'in-memory')
	 *
	 * @example
	 * ```typescript
	 * console.log(`Using ${store.getBackendType()} for vector storage`);
	 * ```
	 */
	getBackendType(): string;

	/**
	 * Get the configured vector dimension
	 *
	 * @returns The dimension of vectors this store expects
	 *
	 * @example
	 * ```typescript
	 * const dim = store.getDimension();
	 * console.log(`Store configured for ${dim}-dimensional vectors`);
	 * ```
	 */
	getDimension(): number;

	/**
	 * Get the collection name
	 *
	 * @returns The name of the collection this store operates on
	 *
	 * @example
	 * ```typescript
	 * console.log(`Operating on collection: ${store.getCollectionName()}`);
	 * ```
	 */
	getCollectionName(): string;
}
