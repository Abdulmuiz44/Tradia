/**
 * Storage Module Public API
 *
 * This module re-exports all the necessary types and interfaces for the storage system.
 * It provides a simplified, clean API surface for consumers of the storage module.
 *
 * The storage system architecture:
 * - Dual-backend design: Cache (fast, ephemeral) + Database (persistent, reliable)
 * - Multiple backend implementations: Redis, SQLite, In-Memory, etc.
 * - Consistent API across different backend types
 * - Strong type safety with TypeScript and runtime validation with Zod
 *
 * @module storage
 *
 * @example
 * ```typescript
 * import type { StorageConfig, CacheBackend, DatabaseBackend } from './storage/types.js';
 *
 * // Configure storage
 * const config: StorageConfig = {
 *   cache: { type: 'redis', host: 'localhost' },
 *   database: { type: 'sqlite', path: './data' }
 * };
 *
 * // Use backends
 * const cache: CacheBackend = createCacheBackend(config.cache);
 * const db: DatabaseBackend = createDatabaseBackend(config.database);
 * ```
 */

/**
 * Re-export simplified storage types
 *
 * These exports provide the complete type system needed to work with
 * the storage module without exposing internal implementation details.
 */
export type {
	// Backend interfaces
	CacheBackend, // Interface for cache storage implementations
	DatabaseBackend, // Interface for database storage implementations
	StorageBackends, // Combined backends structure

	// Configuration types
	BackendConfig, // Union type for all backend configurations
	StorageConfig, // Top-level storage system configuration
} from './backend/types.js';
