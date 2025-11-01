/**
 * Redis Backend Implementation
 *
 * Provides a Redis-based cache backend implementation using the ioredis library.
 * Supports all standard cache operations plus additional Redis-specific features.
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - Connection pooling and retry logic
 * - TTL support for cache expiration
 * - Batch operations (mget/mset) for performance
 * - List operations for compatibility with DatabaseBackend patterns
 *
 * @module storage/backend/redis-backend
 */

import { Redis } from 'ioredis';
import type { CacheBackend } from './cache-backend.js';
import type { RedisBackendConfig } from '../config.js';

/**
 * Redis Cache Backend
 *
 * Implements the CacheBackend interface using Redis as the storage engine.
 * Handles connection management, error recovery, and data serialization.
 *
 * @example
 * ```typescript
 * const redis = new RedisBackend({
 *   type: 'redis',
 *   host: 'localhost',
 *   port: 6379,
 *   password: 'secret',
 *   database: 0
 * });
 *
 * await redis.connect();
 * await redis.set('key', { data: 'value' }, 3600); // 1 hour TTL
 * ```
 */
export class RedisBackend implements CacheBackend {
	/** The Redis client instance */
	private redis: Redis | null = null;

	/** Connection status flag */
	private connected = false;

	/**
	 * Creates a new Redis backend instance
	 *
	 * @param config - Redis configuration options
	 */
	constructor(private config: RedisBackendConfig) {}

	/**
	 * Establishes connection to Redis server
	 *
	 * Sets up connection with retry logic, error handling, and event listeners.
	 * Configuration supports both individual options and connection URL.
	 *
	 * @throws {StorageConnectionError} If connection fails after retries
	 */
	async connect(): Promise<void> {
		// Skip if already connected
		if (this.connected) return;

		// Create Redis client with configuration
		this.redis = new Redis({
			// Host and port configuration
			...(this.config.host && { host: this.config.host }),
			...(this.config.port && { port: this.config.port }),
			...(this.config.username && { username: this.config.username }),
			...(this.config.password && { password: this.config.password }),

			// Database selection (default: 0)
			db: this.config.database || 0,

			// Force IPv4 to avoid IPv6 issues
			family: 4,

			// Timeout configuration
			...(this.config.connectionTimeoutMillis && {
				connectTimeout: this.config.connectionTimeoutMillis,
			}),
			...(this.config.connectionTimeoutMillis && {
				commandTimeout: this.config.connectionTimeoutMillis,
			}),

			// Retry configuration
			maxRetriesPerRequest: 3,

			// Lazy connect for explicit connection control
			lazyConnect: true,

			// Merge any additional options from config
			...this.config.options,
		});

		// Explicitly connect since lazyConnect is enabled
		let connectionError: Error | null = null;
		this.redis.on('error', err => {
			connectionError = err;
		});

		await new Promise<void>((resolve, reject) => {
			const onReady = () => {
				this.connected = true;
				cleanup();
				resolve();
			};
			const onError = (err: Error) => {
				cleanup();
				reject(new Error('Redis connection failed: ' + err.message));
			};
			const cleanup = () => {
				this.redis?.off('ready', onReady);
				this.redis?.off('error', onError);
			};
			this.redis?.once('ready', onReady);
			this.redis?.once('error', onError);

			// Use configurable timeout or default to 10 seconds
			const timeoutMs = this.config.connectionTimeoutMillis || 10000;
			setTimeout(() => {
				cleanup();
				if (connectionError) {
					reject(new Error('Redis connection failed: ' + connectionError.message));
				} else {
					reject(new Error('Redis connection failed: timeout'));
				}
			}, timeoutMs);

			// Start the connection - this is critical for lazyConnect: true
			this.redis?.connect().catch(onError);
		});
	}

	/**
	 * Gracefully disconnects from Redis
	 *
	 * Ensures all pending commands are completed before closing the connection.
	 */
	async disconnect(): Promise<void> {
		if (this.redis) {
			await this.redis.quit();
			this.redis = null;
		}
		this.connected = false;
	}

	/**
	 * Checks if the Redis connection is active and ready
	 *
	 * @returns true if connected and Redis status is 'ready'
	 */
	isConnected(): boolean {
		return this.connected && this.redis?.status === 'ready';
	}

	/**
	 * Returns the backend type identifier
	 *
	 * @returns 'redis'
	 */
	getBackendType(): string {
		return 'redis';
	}

	// Core operations

	/**
	 * Retrieves and deserializes a value from Redis
	 *
	 * @template T - The expected type of the cached value
	 * @param key - The cache key
	 * @returns The cached value or undefined if not found
	 * @throws {StorageError} If deserialization fails
	 */
	async get<T>(key: string): Promise<T | undefined> {
		this.checkConnection();
		const value = await this.redis!.get(key);
		return value ? JSON.parse(value) : undefined;
	}

	/**
	 * Serializes and stores a value in Redis with optional TTL
	 *
	 * @template T - The type of the value to cache
	 * @param key - The cache key
	 * @param value - The value to cache
	 * @param ttlSeconds - Optional TTL in seconds
	 */
	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		this.checkConnection();
		const serialized = JSON.stringify(value);

		if (ttlSeconds) {
			// Use SETEX for atomic set with expiration
			await this.redis!.setex(key, ttlSeconds, serialized);
		} else {
			// Regular SET without expiration
			await this.redis!.set(key, serialized);
		}
	}

	/**
	 * Deletes a key from Redis
	 *
	 * @param key - The cache key to delete
	 */
	async delete(key: string): Promise<void> {
		this.checkConnection();
		await this.redis!.del(key);
	}

	/**
	 * Batch retrieval of multiple keys
	 *
	 * More efficient than multiple individual get() calls.
	 *
	 * @template T - The expected type of the cached values
	 * @param keys - Array of cache keys
	 * @returns Array of values (undefined for missing keys)
	 */
	async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
		this.checkConnection();
		if (keys.length === 0) return [];

		const values = await this.redis!.mget(...keys);
		return values.map(value => (value ? JSON.parse(value) : undefined));
	}

	/**
	 * Batch storage of multiple key-value pairs
	 *
	 * Uses pipeline for atomic batch operation.
	 * Note: Does not support TTL for batch operations.
	 *
	 * @template T - The type of values to cache
	 * @param entries - Array of [key, value] tuples
	 */
	async mset<T>(entries: [string, T][]): Promise<void> {
		this.checkConnection();
		if (entries.length === 0) return;

		// Use pipeline for atomic batch operation
		const pipeline = this.redis!.pipeline();
		for (const [key, value] of entries) {
			pipeline.set(key, JSON.stringify(value));
		}
		await pipeline.exec();
	}

	/**
	 * Checks if a key exists in Redis
	 *
	 * @param key - The cache key to check
	 * @returns true if key exists, false otherwise
	 */
	async exists(key: string): Promise<boolean> {
		this.checkConnection();
		const result = await this.redis!.exists(key);
		return result === 1;
	}

	/**
	 * Sets expiration time for an existing key
	 *
	 * @param key - The cache key
	 * @param ttlSeconds - TTL in seconds
	 */
	async expire(key: string, ttlSeconds: number): Promise<void> {
		this.checkConnection();
		await this.redis!.expire(key, ttlSeconds);
	}

	// Cache-specific operations

	/**
	 * Atomically increments a numeric value
	 *
	 * Creates the key with value 0 if it doesn't exist.
	 *
	 * @param key - The cache key
	 * @param by - Increment amount (default: 1)
	 * @returns The new value after increment
	 */
	async increment(key: string, by: number = 1): Promise<number> {
		this.checkConnection();
		return await this.redis!.incrby(key, by);
	}

	/**
	 * Atomically decrements a numeric value
	 *
	 * @param key - The cache key
	 * @param by - Decrement amount (default: 1)
	 * @returns The new value after decrement
	 */
	async decrement(key: string, by: number = 1): Promise<number> {
		this.checkConnection();
		return await this.redis!.decrby(key, by);
	}

	// List operations (for compatibility with DatabaseBackend patterns)

	/**
	 * Appends an item to a Redis list
	 *
	 * Creates the list if it doesn't exist.
	 * Items are added to the end of the list (RPUSH).
	 *
	 * @template T - The type of list items
	 * @param key - The list key
	 * @param item - The item to append
	 */
	async append<T>(key: string, item: T): Promise<void> {
		this.checkConnection();
		await this.redis!.rpush(key, JSON.stringify(item));
	}

	/**
	 * Retrieves a range of items from a Redis list
	 *
	 * @template T - The type of list items
	 * @param key - The list key
	 * @param start - Starting index (0-based)
	 * @param count - Number of items to retrieve
	 * @returns Array of items in the specified range
	 */
	async getRange<T>(key: string, start: number, count: number): Promise<T[]> {
		this.checkConnection();
		const items = await this.redis!.lrange(key, start, start + count - 1);
		return items.map(item => JSON.parse(item));
	}

	/**
	 * Lists all keys matching a pattern
	 *
	 * Warning: KEYS command can be slow on large databases.
	 * Consider using SCAN for production use.
	 *
	 * @param prefix - Key prefix to search for
	 * @returns Array of matching keys
	 */
	async list(prefix: string): Promise<string[]> {
		this.checkConnection();
		return await this.redis!.keys(`${prefix}*`);
	}

	/**
	 * Validates connection status before operations
	 *
	 * @throws {Error} If not connected or Redis is not ready
	 * @private
	 */
	private checkConnection(): void {
		if (!this.connected || !this.redis || this.redis.status !== 'ready') {
			throw new Error('RedisBackend not connected');
		}
	}

	/**
	 * Flushes the current Redis database
	 *
	 * Warning: This will delete ALL data in the current database.
	 * Use with caution, typically only in development/testing.
	 */
	async flushdb(): Promise<void> {
		this.checkConnection();
		await this.redis!.flushdb();
	}

	/**
	 * Retrieves Redis server information
	 *
	 * Useful for monitoring and debugging.
	 *
	 * @returns Raw Redis INFO output
	 */
	async info(): Promise<string> {
		this.checkConnection();
		return await this.redis!.info();
	}
}
