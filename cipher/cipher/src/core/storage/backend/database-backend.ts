/**
 * Database Backend Interface
 *
 * Defines the contract for persistent storage implementations.
 * Database backends are optimized for reliable, long-term data storage.
 *
 * Implementations can include:
 * - SQLite: Lightweight, file-based database
 * - PostgreSQL: Full-featured relational database
 * - In-Memory: For testing or temporary persistence
 *
 * @module storage/backend/database-backend
 */

/**
 * DatabaseBackend Interface
 *
 * Provides a unified API for different database storage implementations.
 * Extends basic key-value operations with list operations for collections.
 *
 * @example
 * ```typescript
 * class SqliteBackend implements DatabaseBackend {
 *   async get<T>(key: string): Promise<T | undefined> {
 *     const row = await this.db.get('SELECT value FROM store WHERE key = ?', key);
 *     return row ? JSON.parse(row.value) : undefined;
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface DatabaseBackend {
	// Basic key-value operations

	/**
	 * Retrieves a value from the database by key
	 *
	 * @template T - The type of the stored value
	 * @param key - The storage key to retrieve
	 * @returns The stored value if found, undefined otherwise
	 *
	 * @example
	 * ```typescript
	 * const settings = await db.get<AppSettings>('app:settings');
	 * ```
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Stores a value in the database
	 *
	 * Unlike cache, database storage is persistent and doesn't support TTL.
	 *
	 * @template T - The type of the value to store
	 * @param key - The storage key
	 * @param value - The value to store (will be serialized)
	 *
	 * @example
	 * ```typescript
	 * await db.set('user:123', userData);
	 * ```
	 */
	set<T>(key: string, value: T): Promise<void>;

	/**
	 * Removes a value from the database
	 *
	 * @param key - The storage key to delete
	 *
	 * @example
	 * ```typescript
	 * await db.delete('user:123');
	 * ```
	 */
	delete(key: string): Promise<void>;

	// Collection operations

	/**
	 * Lists all keys matching a prefix
	 *
	 * Useful for finding related data or implementing namespaces.
	 *
	 * @param prefix - The key prefix to search for
	 * @returns Array of keys matching the prefix
	 *
	 * @example
	 * ```typescript
	 * // Get all user keys
	 * const userKeys = await db.list('user:');
	 * // Returns: ['user:123', 'user:456', ...]
	 * ```
	 */
	list(prefix: string): Promise<string[]>;

	// List/Array operations

	/**
	 * Appends an item to a list stored at the given key
	 *
	 * Creates the list if it doesn't exist. Useful for logs, history, etc.
	 *
	 * @template T - The type of items in the list
	 * @param key - The storage key for the list
	 * @param item - The item to append
	 *
	 * @example
	 * ```typescript
	 * // Add to user's activity log
	 * await db.append('activity:user:123', {
	 *   action: 'login',
	 *   timestamp: Date.now()
	 * });
	 * ```
	 */
	append<T>(key: string, item: T): Promise<void>;

	/**
	 * Retrieves a range of items from a list
	 *
	 * Supports pagination through stored lists.
	 *
	 * @template T - The type of items in the list
	 * @param key - The storage key for the list
	 * @param start - Starting index (0-based)
	 * @param count - Number of items to retrieve
	 * @returns Array of items in the specified range
	 *
	 * @example
	 * ```typescript
	 * // Get latest 10 activities
	 * const activities = await db.getRange('activity:user:123', 0, 10);
	 * ```
	 */
	getRange<T>(key: string, start: number, count: number): Promise<T[]>;

	// Connection management

	/**
	 * Establishes connection to the database backend
	 *
	 * Should be called before performing any operations.
	 * May create database schema/tables if needed.
	 *
	 * @throws {StorageConnectionError} If connection fails
	 *
	 * @example
	 * ```typescript
	 * const db = new SqliteBackend(config);
	 * await db.connect();
	 * ```
	 */
	connect(): Promise<void>;

	/**
	 * Gracefully closes the database connection
	 *
	 * Should ensure all pending writes are completed before closing.
	 *
	 * @example
	 * ```typescript
	 * await db.disconnect();
	 * ```
	 */
	disconnect(): Promise<void>;

	/**
	 * Checks if the backend is currently connected
	 *
	 * @returns true if connected and operational, false otherwise
	 */
	isConnected(): boolean;

	/**
	 * Returns the backend type identifier
	 *
	 * @returns Backend type string (e.g., 'sqlite', 'postgresql', 'memory')
	 */
	getBackendType(): string;
}
