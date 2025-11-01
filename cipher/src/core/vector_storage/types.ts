/**
 * Vector Storage Module Public API
 *
 * This module re-exports all the necessary types and interfaces for the vector storage system.
 * It provides a simplified, clean API surface for consumers of the vector storage module.
 *
 * The vector storage system architecture:
 * - Single backend design for vector similarity search
 * - Multiple backend implementations: Qdrant, Pinecone, In-Memory, etc.
 * - Consistent API across different backend types
 * - Strong type safety with TypeScript and runtime validation with Zod
 *
 * @module vector_storage
 *
 * @example
 * ```typescript
 * import type { VectorStoreConfig, VectorStore } from './vector_storage/types.js';
 *
 * // Configure vector storage
 * const config: VectorStoreConfig = {
 *   type: 'qdrant',
 *   host: 'localhost',
 *   port: 6333,
 *   collectionName: 'embeddings',
 *   dimension: 1536
 * };
 *
 * // Use vector store
 * const store: VectorStore = createVectorStore(config);
 * ```
 */

/**
 * Re-export simplified vector storage types
 *
 * These exports provide the complete type system needed to work with
 * the vector storage module without exposing internal implementation details.
 */
export type {
	// Core interfaces
	VectorStore, // Interface for vector store implementations
	VectorStoreResult, // Search result structure
	SearchFilters, // Metadata filters for search

	// Configuration types
	BackendConfig, // Union type for all backend configurations
	VectorStoreConfig, // Top-level vector storage system configuration
} from './backend/types.js';
