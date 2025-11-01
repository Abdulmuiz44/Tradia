/**
 * Vector Storage Backend Exports
 *
 * Central export point for all backend types, interfaces, and implementations.
 * This module provides a clean API for accessing backend functionality.
 *
 * @module vector_storage/backend
 */

// Export core types and interfaces
export type { VectorStore, VectorStoreResult, SearchFilters } from './types.js';

// Export error classes
export {
	VectorStoreError,
	VectorStoreConnectionError,
	VectorDimensionError,
	CollectionNotFoundError,
} from './types.js';

// Export backend implementations
// Note: Implementations are lazily loaded by the manager to reduce startup time
// export { QdrantBackend } from './qdrant.js';
// export { InMemoryBackend } from './in-memory.js';
