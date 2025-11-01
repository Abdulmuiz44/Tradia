/**
 * Storage Backend Types and Error Classes
 *
 * This module defines the core types and error classes for the storage system.
 * The storage system uses a dual-backend architecture:
 * - Cache Backend: For fast, ephemeral storage (e.g., Redis, in-memory)
 * - Database Backend: For persistent, reliable storage (e.g., SQLite, PostgreSQL)
 *
 * @module storage/backend/types
 */

import type { CacheBackend } from './cache-backend.js';
import type { DatabaseBackend } from './database-backend.js';

// Re-export the backend interfaces for convenience
export type { CacheBackend, DatabaseBackend };

// Re-export configuration types from the config module
export type {
	BackendConfig,
	StorageConfig,
	InMemoryBackendConfig,
	RedisBackendConfig,
	SqliteBackendConfig,
	PostgresBackendConfig,
} from '../config.js';

/**
 * StorageBackends Interface
 *
 * Represents the dual-backend storage system with separate backends for
 * different use cases:
 * - cache: Fast access for temporary data, session storage, etc.
 * - database: Persistent storage for long-term data, user data, etc.
 *
 * @example
 * ```typescript
 * const storage: StorageBackends = {
 *   cache: new RedisBackend(redisConfig),
 *   database: new SqliteBackend(sqliteConfig)
 * };
 * ```
 */
export interface StorageBackends {
	/** Fast, ephemeral storage backend (Redis, Memory) for caching and temporary data */
	cache: CacheBackend;

	/** Persistent, reliable storage backend (PostgreSQL, SQLite, Memory) for long-term data */
	database: DatabaseBackend;
}

/**
 * Base Storage Error Class
 *
 * All storage-related errors extend from this base class.
 * Provides consistent error structure with operation context and optional cause.
 *
 * @example
 * ```typescript
 * throw new StorageError('Failed to save data', 'set', originalError);
 * ```
 */
export class StorageError extends Error {
	constructor(
		message: string,
		/** The operation that failed (e.g., 'get', 'set', 'delete', 'connection') */
		public readonly operation: string,
		/** The underlying error that caused this error, if any */
		public override readonly cause?: Error
	) {
		super(message);
		this.name = 'StorageError';
		this.cause = cause;
	}
}

/**
 * Storage Connection Error
 *
 * Thrown when a storage backend fails to connect or loses connection.
 * Includes the backend type for easier debugging.
 *
 * @example
 * ```typescript
 * throw new StorageConnectionError(
 *   'Failed to connect to Redis',
 *   'redis',
 *   redisError
 * );
 * ```
 */
export class StorageConnectionError extends StorageError {
	constructor(
		override message: string,
		/** The type of backend that failed to connect (e.g., 'redis', 'sqlite') */
		public readonly backendType: string,
		/** The underlying connection error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'connection', cause);
		this.name = 'StorageConnectionError';
	}
}

/**
 * Storage Not Found Error
 *
 * Thrown when attempting to retrieve a key that doesn't exist in storage.
 * Useful for distinguishing between actual errors and missing data.
 *
 * @example
 * ```typescript
 * const value = await cache.get(key);
 * if (!value) {
 *   throw new StorageNotFoundError(`Key not found: ${key}`, key);
 * }
 * ```
 */
export class StorageNotFoundError extends StorageError {
	constructor(
		override message: string,
		/** The key that was not found */
		public readonly key: string,
		/** The underlying error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'not_found', cause);
		this.name = 'StorageNotFoundError';
	}
}
