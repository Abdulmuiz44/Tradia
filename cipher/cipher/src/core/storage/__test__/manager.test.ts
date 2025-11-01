/**
 * Storage Manager Tests
 *
 * Tests for the storage manager implementation including
 * connection logic, fallback mechanisms, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../manager.js';
import { InMemoryBackend } from '../backend/in-memory.js';
import { BACKEND_TYPES } from '../constants.js';
import type { StorageConfig } from '../types.js';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

describe('StorageManager', () => {
	let manager: StorageManager;

	afterEach(async () => {
		// Ensure cleanup after each test
		if (manager && manager.isConnected()) {
			await manager.disconnect();
		}
	});

	describe('Configuration', () => {
		it('should validate configuration on construction', () => {
			expect(() => {
				new StorageManager({} as any);
			}).toThrow('Invalid storage configuration');

			expect(() => {
				new StorageManager({
					cache: { type: 'invalid' as any },
					database: { type: 'in-memory' },
				});
			}).toThrow('Invalid storage configuration');
		});

		it('should accept valid configuration', () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};

			expect(() => {
				manager = new StorageManager(config);
			}).not.toThrow();

			expect(manager.getConfig()).toEqual(config);
		});
	});

	describe('Connection Management', () => {
		beforeEach(() => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};
			manager = new StorageManager(config);
		});

		it('should connect successfully with in-memory backends', async () => {
			expect(manager.isConnected()).toBe(false);

			const backends = await manager.connect();

			expect(manager.isConnected()).toBe(true);
			expect(backends.cache).toBeInstanceOf(InMemoryBackend);
			expect(backends.database).toBeInstanceOf(InMemoryBackend);
			expect(backends.cache.isConnected()).toBe(true);
			expect(backends.database.isConnected()).toBe(true);
		});

		it('should handle multiple connect calls (idempotency)', async () => {
			const backends1 = await manager.connect();
			const backends2 = await manager.connect();

			// Should return the same instances
			expect(backends1.cache).toBe(backends2.cache);
			expect(backends1.database).toBe(backends2.database);
			expect(manager.isConnected()).toBe(true);
		});

		it('should disconnect successfully', async () => {
			await manager.connect();
			expect(manager.isConnected()).toBe(true);

			await manager.disconnect();
			expect(manager.isConnected()).toBe(false);

			const backends = manager.getBackends();
			expect(backends).toBeNull();
		});

		it('should handle multiple disconnect calls', async () => {
			await manager.connect();
			await manager.disconnect();

			// Second disconnect should not throw
			await expect(manager.disconnect()).resolves.not.toThrow();
		});

		it('should clean up on connection failure', async () => {
			// Create a manager with SQLite config (will fail and fallback)
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'sqlite', path: '/root/nonexistent/readonly/test.db' },
			};
			manager = new StorageManager(config);

			// Should still connect successfully with fallback
			const backends = await manager.connect();
			expect(backends.database).toBeInstanceOf(InMemoryBackend);

			const info = manager.getInfo();
			expect(info.backends.database.fallback).toBe(true);
		});
	});

	describe('Backend Fallback', () => {
		it('should fallback to in-memory for SQLite database', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'sqlite', path: '/root/nonexistent/readonly/test2.db' },
			};
			manager = new StorageManager(config);

			const backends = await manager.connect();

			// Should fallback to in-memory
			expect(backends.database).toBeInstanceOf(InMemoryBackend);
			expect(backends.database.getBackendType()).toBe(BACKEND_TYPES.IN_MEMORY);

			const info = manager.getInfo();
			expect(info.backends.database.type).toBe(BACKEND_TYPES.IN_MEMORY);
			expect(info.backends.database.fallback).toBe(true);
		});
	});

	describe('State Management', () => {
		beforeEach(() => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};
			manager = new StorageManager(config);
		});

		it('should track connection attempts', async () => {
			const info1 = manager.getInfo();
			expect(info1.connectionAttempts).toBe(0);

			await manager.connect();

			const info2 = manager.getInfo();
			expect(info2.connectionAttempts).toBe(1);

			// Disconnect and reconnect
			await manager.disconnect();
			await manager.connect();

			const info3 = manager.getInfo();
			expect(info3.connectionAttempts).toBe(2);
		});

		it('should provide accurate info', async () => {
			const info1 = manager.getInfo();
			expect(info1.connected).toBe(false);
			expect(info1.backends.cache.connected).toBe(false);
			expect(info1.backends.database.connected).toBe(false);

			await manager.connect();

			const info2 = manager.getInfo();
			expect(info2.connected).toBe(true);
			expect(info2.backends.cache.connected).toBe(true);
			expect(info2.backends.database.connected).toBe(true);
			expect(info2.backends.cache.type).toBe(BACKEND_TYPES.IN_MEMORY);
			expect(info2.backends.database.type).toBe(BACKEND_TYPES.IN_MEMORY);
		});

		it('should return null backends when not connected', () => {
			expect(manager.getBackends()).toBeNull();
		});

		it('should return backends when connected', async () => {
			await manager.connect();

			const backends = manager.getBackends();
			expect(backends).not.toBeNull();
			expect(backends?.cache).toBeInstanceOf(InMemoryBackend);
			expect(backends?.database).toBeInstanceOf(InMemoryBackend);
		});
	});

	describe('Error Handling', () => {
		it('should handle backend creation errors gracefully', async () => {
			// This test verifies that even with invalid configs,
			// the manager falls back to in-memory backends
			const config: StorageConfig = {
				cache: { type: 'redis', host: 'invalid-host', connectionTimeoutMillis: 1000 },
				database: { type: 'sqlite', path: '/root/nonexistent/readonly/test.db' },
			};
			manager = new StorageManager(config);

			// Should not throw, but use fallbacks
			const backends = await manager.connect();
			expect(backends.cache).toBeInstanceOf(InMemoryBackend);
			expect(backends.database).toBeInstanceOf(InMemoryBackend);

			const info = manager.getInfo();
			expect(info.backends.cache.fallback).toBe(true);
			expect(info.backends.database.fallback).toBe(true);
		}, 10000); // Increase timeout for this test

		it('should reset state on connection failure', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};
			manager = new StorageManager(config);

			// Mock a connection failure
			const originalConnect = InMemoryBackend.prototype.connect;
			let callCount = 0;
			InMemoryBackend.prototype.connect = async function () {
				callCount++;
				if (callCount === 2) {
					// Fail on database connection
					throw new Error('Mock connection failure');
				}
				return originalConnect.call(this);
			};

			try {
				await expect(manager.connect()).rejects.toThrow('Mock connection failure');

				// State should be reset
				expect(manager.isConnected()).toBe(false);
				expect(manager.getBackends()).toBeNull();
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});
	});

	describe('Lifecycle Integration', () => {
		it('should support typical usage pattern', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};

			// Initialize
			manager = new StorageManager(config);
			expect(manager.isConnected()).toBe(false);

			// Connect
			const { cache, database } = await manager.connect();
			expect(manager.isConnected()).toBe(true);

			// Use backends
			await cache.set('test-key', 'test-value', 60);
			const value = await cache.get('test-key');
			expect(value).toBe('test-value');

			await database.set('user:1', { name: 'Alice' });
			const user = await database.get('user:1');
			expect(user).toEqual({ name: 'Alice' });

			// Disconnect
			await manager.disconnect();
			expect(manager.isConnected()).toBe(false);
		});
	});
});
