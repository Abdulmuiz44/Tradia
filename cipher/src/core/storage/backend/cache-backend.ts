/**
 * Cache Backend Interface
 *
 * Defines the contract for cache storage implementations.
 * Cache backends are optimized for fast, ephemeral storage with optional TTL support.
 *
 * Implementations can include:
 * - Redis: Distributed caching with network access
 * - In-Memory: Fast local caching with no persistence
 * - Memcached: Distributed memory caching system
 *
 * @module storage/backend/cache-backend
 */

/**
 * CacheBackend Interface
 *
 * Provides a unified API for different cache storage implementations.
 * All methods are asynchronous to support both local and network-based backends.
 *
 * @example
 * ```typescript
 * class RedisBackend implements CacheBackend {
 *   async get<T>(key: string): Promise<T | undefined> {
 *     const value = await this.redis.get(key);
 *     return value ? JSON.parse(value) : undefined;
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface CacheBackend {
	// Basic operations

	/**
	 * Retrieves a value from the cache by key
	 *
	 * @template T - The type of the cached value
	 * @param key - The cache key to retrieve
	 * @returns The cached value if found, undefined otherwise
	 *
	 * @example
	 * ```typescript
	 * const user = await cache.get<User>('user:123');
	 * if (!user) {
	 *   // Cache miss - fetch from database
	 * }
	 * ```
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Stores a value in the cache with optional TTL
	 *
	 * @template T - The type of the value to cache
	 * @param key - The cache key
	 * @param value - The value to cache (will be serialized)
	 * @param ttlSeconds - Optional time-to-live in seconds
	 *
	 * @example
	 * ```typescript
	 * // Cache for 1 hour
	 * await cache.set('user:123', userData, 3600);
	 *
	 * // Cache indefinitely
	 * await cache.set('config', configData);
	 * ```
	 */
	set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

	/**
	 * Removes a value from the cache
	 *
	 * @param key - The cache key to delete
	 *
	 * @example
	 * ```typescript
	 * // Invalidate user cache after update
	 * await cache.delete('user:123');
	 * ```
	 */
	delete(key: string): Promise<void>;

	// Connection management

	/**
	 * Establishes connection to the cache backend
	 *
	 * Should be called before performing any operations.
	 * Implementations should handle reconnection logic internally.
	 *
	 * @throws {StorageConnectionError} If connection fails
	 *
	 * @example
	 * ```typescript
	 * const cache = new RedisBackend(config);
	 * await cache.connect();
	 * // Now ready to use
	 * ```
	 */
	connect(): Promise<void>;

	/**
	 * Gracefully closes the connection to the cache backend
	 *
	 * Should clean up resources and close any open connections.
	 * After disconnect, connect() must be called again before use.
	 *
	 * @example
	 * ```typescript
	 * // Clean shutdown
	 * await cache.disconnect();
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
	 * if (!cache.isConnected()) {
	 *   await cache.connect();
	 * }
	 * ```
	 */
	isConnected(): boolean;

	/**
	 * Returns the backend type identifier
	 *
	 * Useful for logging, monitoring, and conditional logic based on backend type.
	 *
	 * @returns Backend type string (e.g., 'redis', 'memory', 'memcached')
	 *
	 * @example
	 * ```typescript
	 * console.log(`Using ${cache.getBackendType()} for caching`);
	 * ```
	 */
	getBackendType(): string;
}
