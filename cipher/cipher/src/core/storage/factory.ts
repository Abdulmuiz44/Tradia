/**
 * Storage Factory
 *
 * Factory functions for creating and initializing the storage system.
 * Provides a simplified API for common storage setup patterns.
 *
 * @module storage/factory
 */

import { StorageManager } from './manager.js';
import type { StorageConfig, StorageBackends } from './types.js';
import { createLogger } from '../logger/index.js';
import { LOG_PREFIXES } from './constants.js';
import { env } from '../env.js';

/**
 * Factory result containing both the manager and backends
 */
export interface StorageFactory {
	/** The storage manager instance for lifecycle control */
	manager: StorageManager;
	/** The connected storage backends ready for use */
	backends: StorageBackends;
}

/**
 * Creates and connects storage backends
 *
 * This is the primary factory function for initializing the storage system.
 * It creates a StorageManager, connects to the configured backends, and
 * returns both the manager and the connected backends.
 *
 * @param config - Storage configuration
 * @returns Promise resolving to manager and connected backends
 * @throws {StorageConnectionError} If connection fails and no fallback is available
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { manager, backends } = await createStorageBackends({
 *   cache: { type: 'redis', host: 'localhost' },
 *   database: { type: 'sqlite', path: './data' }
 * });
 *
 * // Use the backends
 * await backends.cache.set('key', 'value', 300);
 * await backends.database.set('user:1', userData);
 *
 * // Cleanup when done
 * await manager.disconnect();
 * ```
 *
 * @example
 * ```typescript
 * // Development configuration
 * const { manager, backends } = await createStorageBackends({
 *   cache: { type: 'in-memory' },
 *   database: { type: 'in-memory' }
 * });
 * ```
 */
export async function createStorageBackends(config: StorageConfig): Promise<StorageFactory> {
	const logger = createLogger({ level: env.CIPHER_LOG_LEVEL });

	logger.debug(`${LOG_PREFIXES.FACTORY} Creating storage system`, {
		cacheType: config.cache.type,
		databaseType: config.database.type,
	});

	// Create manager
	const manager = new StorageManager(config);

	try {
		// Connect to backends
		const backends = await manager.connect();

		logger.info(`${LOG_PREFIXES.FACTORY} Storage system created successfully`, {
			cache: manager.getInfo().backends.cache,
			database: manager.getInfo().backends.database,
		});

		return { manager, backends };
	} catch (error) {
		// If connection fails, ensure cleanup
		await manager.disconnect().catch(() => {
			// Ignore disconnect errors during cleanup
		});

		logger.error(`${LOG_PREFIXES.FACTORY} Failed to create storage system`, {
			error: error instanceof Error ? error.message : String(error),
		});

		throw error;
	}
}

/**
 * Creates storage backends with default configuration
 *
 * Convenience function that creates storage with in-memory backends.
 * Useful for testing or development environments.
 *
 * @returns Promise resolving to manager and connected backends
 *
 * @example
 * ```typescript
 * const { manager, backends } = await createDefaultStorage();
 * // Uses in-memory backends for both cache and database
 * ```
 */
export async function createDefaultStorage(): Promise<StorageFactory> {
	return createStorageBackends({
		cache: { type: 'in-memory' },
		database: { type: 'in-memory' },
	});
}

/**
 * Creates storage backends from environment variables
 *
 * Reads storage configuration from environment variables and creates
 * the storage system. Falls back to in-memory if not configured.
 *
 * Environment variables:
 * - STORAGE_CACHE_TYPE: Cache backend type (redis, in-memory)
 * - STORAGE_CACHE_HOST: Redis host (if using Redis)
 * - STORAGE_CACHE_PORT: Redis port (if using Redis)
 * - STORAGE_CACHE_USERNAME: Redis username (if using Redis)
 * - STORAGE_CACHE_PASSWORD: Redis password (if using Redis)
 * - STORAGE_DATABASE_TYPE: Database backend type (sqlite, in-memory)
 * - STORAGE_DATABASE_PATH: SQLite database path (if using SQLite)
 *
 * @returns Promise resolving to manager and connected backends
 *
 * @example
 * ```typescript
 * // Set environment variables
 * process.env.STORAGE_CACHE_TYPE = 'redis';
 * process.env.STORAGE_CACHE_HOST = 'localhost';
 *
 * const { manager, backends } = await createStorageFromEnv();
 * ```
 */
export async function createStorageFromEnv(): Promise<StorageFactory> {
	const logger = createLogger({ level: env.CIPHER_LOG_LEVEL });

	// Build cache configuration from environment
	const cacheType = env.STORAGE_CACHE_TYPE;
	let cacheConfig: StorageConfig['cache'];

	if (cacheType === 'redis') {
		const port = env.STORAGE_CACHE_PORT || 6379;
		const database = env.STORAGE_CACHE_DATABASE;

		cacheConfig = {
			type: 'redis',
			host: env.STORAGE_CACHE_HOST || 'localhost',
			port: port,
			username: env.STORAGE_CACHE_USERNAME,
			password: env.STORAGE_CACHE_PASSWORD,
			database: database,
		};
	} else {
		cacheConfig = { type: 'in-memory' };
	}

	// Build database configuration from environment
	const dbType = env.STORAGE_DATABASE_TYPE;
	let dbConfig: StorageConfig['database'];

	if (dbType === 'sqlite') {
		dbConfig = {
			type: 'sqlite',
			path: env.STORAGE_DATABASE_PATH,
			database: env.STORAGE_DATABASE_NAME,
		};
	} else {
		// Use in-memory for any unsupported types or when not specified
		if (dbType && dbType !== 'in-memory') {
			logger.warn(
				`${LOG_PREFIXES.FACTORY} Database type '${dbType}' not yet supported, using in-memory`
			);
		}
		dbConfig = { type: 'in-memory' };
	}

	logger.info(`${LOG_PREFIXES.FACTORY} Creating storage from environment`, {
		cacheType,
		databaseType: dbType,
	});

	return createStorageBackends({
		cache: cacheConfig,
		database: dbConfig,
	});
}

/**
 * Type guard to check if an object is a StorageFactory
 *
 * @param obj - Object to check
 * @returns true if the object has manager and backends properties
 */
export function isStorageFactory(obj: unknown): obj is StorageFactory {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'manager' in obj &&
		'backends' in obj &&
		obj.manager instanceof StorageManager
	);
}
