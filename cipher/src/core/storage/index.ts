/**
 * Storage Module Public API
 *
 * This module provides a flexible dual-backend storage system with:
 * - Cache backend for fast, ephemeral storage
 * - Database backend for persistent, reliable storage
 *
 * Features:
 * - Lazy loading of external backends (Redis, SQLite, etc.)
 * - Graceful fallback to in-memory storage
 * - Health monitoring and connection management
 * - Type-safe configuration with runtime validation
 *
 * @module storage
 */

// Core exports
export { StorageManager } from './manager.js';
export type { HealthCheckResult, StorageInfo } from './manager.js';

// Type exports
export type {
	CacheBackend,
	DatabaseBackend,
	StorageBackends,
	BackendConfig,
	StorageConfig,
} from './types.js';

// Configuration exports
export { StorageSchema } from './config.js';
export type {
	InMemoryBackendConfig,
	RedisBackendConfig,
	SqliteBackendConfig,
	PostgresBackendConfig,
} from './config.js';

// Error exports
export { StorageError, StorageConnectionError, StorageNotFoundError } from './backend/types.js';

// Constants exports (for external use if needed)
export {
	LOG_PREFIXES,
	ERROR_MESSAGES,
	BACKEND_TYPES,
	TIMEOUTS,
	HEALTH_CHECK,
	DEFAULTS,
} from './constants.js';

// Backend implementations
export { InMemoryBackend } from './backend/in-memory.js';
// Redis and SQLite backends will be loaded lazily

// Memory History Service exports
export {
	MemoryHistoryStorageService,
	createMemoryHistoryService,
	createMemoryHistoryEntry,
} from './memory-history/index.js';
export type {
	MemoryHistoryEntry,
	MemoryHistoryService,
	HistoryFilters,
	QueryOptions,
	OperationStats,
	MemoryOperation,
} from './memory-history/index.js';

// Factory functions
export {
	createStorageBackends,
	createDefaultStorage,
	createStorageFromEnv,
	isStorageFactory,
	type StorageFactory,
} from './factory.js';
