/**
 * In-Memory Backend Implementation
 *
 * Provides a memory-based storage backend that implements both CacheBackend
 * and DatabaseBackend interfaces. Useful for development, testing, and as
 * a fallback when external backends are unavailable.
 *
 * Features:
 * - TTL support for cache operations
 * - List/collection operations for database functionality
 * - Automatic cleanup of expired entries
 * - No external dependencies
 *
 * @module storage/backend/in-memory
 */

import type { CacheBackend } from './cache-backend.js';
import type { DatabaseBackend } from './database-backend.js';
import { StorageError } from './types.js';
import { BACKEND_TYPES, ERROR_MESSAGES } from '../constants.js';
import { Logger, createLogger } from '../../logger/index.js';

/**
 * Storage entry with optional expiration
 */
interface StorageEntry<T = any> {
	value: T;
	expires?: number; // Timestamp when entry expires (undefined = never expires)
}

/**
 * In-Memory Storage Backend
 *
 * Implements both CacheBackend and DatabaseBackend interfaces using
 * JavaScript Maps for storage. All data is lost when the process exits.
 *
 * @example
 * ```typescript
 * // As cache backend
 * const cache = new InMemoryBackend();
 * await cache.connect();
 * await cache.set('key', value, 300); // 5 minute TTL
 *
 * // As database backend
 * const db = new InMemoryBackend();
 * await db.connect();
 * await db.append('log', { message: 'Hello' });
 * ```
 */
export class InMemoryBackend implements CacheBackend, DatabaseBackend {
	// Storage maps
	private store = new Map<string, StorageEntry>();
	private lists = new Map<string, any[]>();

	// Connection state
	private connected = false;

	// Cleanup interval
	private cleanupInterval: NodeJS.Timeout | undefined;
	private readonly cleanupIntervalMs = 60000; // 1 minute

	// Logger
	private readonly logger: Logger;

	// Statistics
	private stats = {
		hits: 0,
		misses: 0,
		sets: 0,
		deletes: 0,
		expirations: 0,
	};

	constructor() {
		this.logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });
	}

	// Connection Management

	/**
	 * Connect to the in-memory backend
	 *
	 * For in-memory backend, this just sets the connected flag and
	 * starts the cleanup interval for expired entries.
	 */
	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug('InMemoryBackend already connected');
			return;
		}

		this.connected = true;
		this.startCleanupInterval();

		this.logger.info('InMemoryBackend connected', {
			cleanupInterval: `${this.cleanupIntervalMs}ms`,
		});
	}

	/**
	 * Disconnect from the in-memory backend
	 *
	 * Clears all data and stops the cleanup interval.
	 */
	async disconnect(): Promise<void> {
		if (!this.connected) {
			return;
		}

		this.stopCleanupInterval();
		this.clear();
		this.connected = false;

		this.logger.info('InMemoryBackend disconnected', {
			stats: this.stats,
		});
	}

	/**
	 * Check if backend is connected
	 */
	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Get backend type identifier
	 */
	getBackendType(): string {
		return BACKEND_TYPES.IN_MEMORY;
	}

	// Basic Operations (shared by both interfaces)

	/**
	 * Get a value by key
	 *
	 * Checks expiration and removes expired entries.
	 */
	async get<T>(key: string): Promise<T | undefined> {
		this.checkConnection();

		const entry = this.store.get(key);

		if (!entry) {
			this.stats.misses++;
			return undefined;
		}

		// Check expiration
		if (entry.expires && Date.now() > entry.expires) {
			this.store.delete(key);
			this.stats.expirations++;
			this.stats.misses++;
			this.logger.debug('Entry expired', { key });
			return undefined;
		}

		this.stats.hits++;
		return this.cloneValue(entry.value);
	}

	/**
	 * Set a value with optional TTL (for CacheBackend)
	 */
	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		this.checkConnection();

		const entry: StorageEntry<T> = {
			value: this.cloneValue(value),
		};

		if (ttlSeconds && ttlSeconds > 0) {
			entry.expires = Date.now() + ttlSeconds * 1000;
		}

		this.store.set(key, entry);
		this.stats.sets++;

		this.logger.debug('Value set', {
			key,
			ttl: ttlSeconds,
			expires: entry.expires,
		});
	}

	/**
	 * Delete a value by key
	 */
	async delete(key: string): Promise<void> {
		this.checkConnection();

		const deleted = this.store.delete(key);
		// Also delete from lists if it exists
		this.lists.delete(key);

		if (deleted) {
			this.stats.deletes++;
		}

		this.logger.debug('Value deleted', { key, deleted });
	}

	// DatabaseBackend specific methods

	/**
	 * List all keys matching a prefix
	 */
	async list(prefix: string): Promise<string[]> {
		this.checkConnection();

		const keys: string[] = [];
		const now = Date.now();

		for (const [key, entry] of Array.from(this.store.entries())) {
			// Skip expired entries
			if (entry.expires && now > entry.expires) {
				continue;
			}

			if (key.startsWith(prefix)) {
				keys.push(key);
			}
		}

		// Also check list keys
		for (const key of Array.from(this.lists.keys())) {
			if (key.startsWith(prefix) && !keys.includes(key)) {
				keys.push(key);
			}
		}

		this.logger.debug('Listed keys', { prefix, count: keys.length });
		return keys;
	}

	/**
	 * Append an item to a list
	 */
	async append<T>(key: string, item: T): Promise<void> {
		this.checkConnection();

		let list = this.lists.get(key);
		if (!list) {
			list = [];
			this.lists.set(key, list);
		}

		list.push(this.cloneValue(item));

		this.logger.debug('Item appended to list', {
			key,
			listSize: list.length,
		});
	}

	/**
	 * Get a range of items from a list
	 */
	async getRange<T>(key: string, start: number, count: number): Promise<T[]> {
		this.checkConnection();

		const list = this.lists.get(key);
		if (!list) {
			return [];
		}

		// Handle negative indices (Python-style)
		if (start < 0) {
			start = Math.max(0, list.length + start);
		}

		const end = Math.min(start + count, list.length);
		const items = list.slice(start, end);

		this.logger.debug('Retrieved range from list', {
			key,
			start,
			count,
			returned: items.length,
			totalSize: list.length,
		});

		return items.map(item => this.cloneValue(item));
	}

	// Helper Methods

	/**
	 * Check if backend is connected
	 * @throws {StorageError} If not connected
	 */
	private checkConnection(): void {
		if (!this.connected) {
			throw new StorageError(
				ERROR_MESSAGES.NOT_CONNECTED,
				'operation',
				new Error('InMemoryBackend is not connected')
			);
		}
	}

	/**
	 * Clone a value to prevent reference issues
	 *
	 * Uses JSON serialization for deep cloning.
	 * This also ensures consistency with network-based backends
	 * that serialize data.
	 */
	private cloneValue<T>(value: T): T {
		try {
			return JSON.parse(JSON.stringify(value));
		} catch (error) {
			throw new StorageError(ERROR_MESSAGES.SERIALIZATION_ERROR, 'clone', error as Error);
		}
	}

	/**
	 * Clear all stored data
	 */
	private clear(): void {
		this.store.clear();
		this.lists.clear();
		this.logger.debug('All data cleared');
	}

	/**
	 * Start the cleanup interval for expired entries
	 */
	private startCleanupInterval(): void {
		if (this.cleanupInterval) {
			return;
		}

		this.cleanupInterval = setInterval(() => {
			this.cleanupExpired();
		}, this.cleanupIntervalMs);

		// Don't prevent process exit
		if (this.cleanupInterval.unref) {
			this.cleanupInterval.unref();
		}
	}

	/**
	 * Stop the cleanup interval
	 */
	private stopCleanupInterval(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
	}

	/**
	 * Remove expired entries from the store
	 */
	private cleanupExpired(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [key, entry] of Array.from(this.store.entries())) {
			if (entry.expires && now > entry.expires) {
				this.store.delete(key);
				cleaned++;
				this.stats.expirations++;
			}
		}

		if (cleaned > 0) {
			this.logger.debug('Cleaned up expired entries', {
				cleaned,
				remaining: this.store.size,
			});
		}
	}

	// Additional utility methods

	/**
	 * Get storage statistics
	 */
	getStats(): Readonly<typeof this.stats> {
		return { ...this.stats };
	}

	/**
	 * Get current storage size
	 */
	getSize(): { keys: number; lists: number; total: number } {
		return {
			keys: this.store.size,
			lists: this.lists.size,
			total: this.store.size + this.lists.size,
		};
	}

	/**
	 * Manually trigger cleanup of expired entries
	 */
	async cleanup(): Promise<number> {
		const before = this.store.size;
		this.cleanupExpired();
		const after = this.store.size;
		return before - after;
	}
}
