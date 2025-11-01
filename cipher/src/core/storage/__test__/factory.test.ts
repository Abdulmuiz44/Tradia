/**
 * Storage Factory Tests
 *
 * Tests for the factory functions that create and initialize storage systems.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
	createStorageBackends,
	createDefaultStorage,
	createStorageFromEnv,
	isStorageFactory,
} from '../factory.js';
import { StorageManager } from '../manager.js';
import { InMemoryBackend } from '../backend/in-memory.js';
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

// Mock Redis to prevent actual network connections during tests
vi.mock('ioredis', () => {
	const mockRedis = vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockRejectedValue(new Error('Mock Redis connection error')),
		disconnect: vi.fn().mockResolvedValue(undefined),
		quit: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue('OK'),
		del: vi.fn().mockResolvedValue(1),
		exists: vi.fn().mockResolvedValue(0),
		expire: vi.fn().mockResolvedValue(1),
		mget: vi.fn().mockResolvedValue([]),
		mset: vi.fn().mockResolvedValue('OK'),
		pipeline: vi.fn().mockReturnValue({
			set: vi.fn(),
			exec: vi.fn().mockResolvedValue([]),
		}),
		on: vi.fn(),
		status: 'disconnected',
		isConnected: () => false,
	}));

	return {
		Redis: mockRedis,
		default: mockRedis,
	};
});

describe('Storage Factory', () => {
	// Store original env vars
	const originalEnv = { ...process.env };

	afterEach(() => {
		// Restore environment variables
		process.env = { ...originalEnv };
	});

	describe('createStorageBackends', () => {
		it('should create and connect storage backends', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};

			const result = await createStorageBackends(config);

			// Verify structure
			expect(result).toHaveProperty('manager');
			expect(result).toHaveProperty('backends');
			expect(result.manager).toBeInstanceOf(StorageManager);
			expect(result.backends.cache).toBeInstanceOf(InMemoryBackend);
			expect(result.backends.database).toBeInstanceOf(InMemoryBackend);

			// Verify connected
			expect(result.manager.isConnected()).toBe(true);
			expect(result.backends.cache.isConnected()).toBe(true);
			expect(result.backends.database.isConnected()).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should handle connection failures gracefully', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};

			// Mock connection failure
			const originalConnect = StorageManager.prototype.connect;
			StorageManager.prototype.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

			try {
				await expect(createStorageBackends(config)).rejects.toThrow('Connection failed');
			} finally {
				// Restore original method
				StorageManager.prototype.connect = originalConnect;
			}
		});

		it('should work with fallback backends', async () => {
			const config: StorageConfig = {
				cache: { type: 'redis', host: 'invalid-host', connectionTimeoutMillis: 1000 },
				database: { type: 'sqlite', path: '/root/nonexistent/readonly/test.db' },
			};

			const result = await createStorageBackends(config);

			// Should fallback to in-memory
			expect(result.backends.cache).toBeInstanceOf(InMemoryBackend);
			expect(result.backends.database).toBeInstanceOf(InMemoryBackend);

			const info = result.manager.getInfo();
			expect(info.backends.cache.fallback).toBe(true);
			expect(info.backends.database.fallback).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		}, 10000); // Increase timeout for this test
	});

	describe('createDefaultStorage', () => {
		it('should create storage with in-memory backends', async () => {
			const result = await createDefaultStorage();

			expect(result.manager).toBeInstanceOf(StorageManager);
			expect(result.backends.cache).toBeInstanceOf(InMemoryBackend);
			expect(result.backends.database).toBeInstanceOf(InMemoryBackend);

			const info = result.manager.getInfo();
			expect(info.backends.cache.type).toBe('in-memory');
			expect(info.backends.database.type).toBe('in-memory');
			expect(info.backends.cache.fallback).toBe(false);
			expect(info.backends.database.fallback).toBe(false);

			// Cleanup
			await result.manager.disconnect();
		});
	});

	describe('createStorageFromEnv', () => {
		it('should create default storage when no env vars are set', async () => {
			// Clear relevant env vars
			delete process.env.STORAGE_CACHE_TYPE;
			delete process.env.STORAGE_DATABASE_TYPE;

			const result = await createStorageFromEnv();

			const info = result.manager.getInfo();
			expect(info.backends.cache.type).toBe('in-memory');
			expect(info.backends.database.type).toBe('in-memory');

			// Cleanup
			await result.manager.disconnect();
		});

		it('should create SQLite database from env vars', async () => {
			process.env.STORAGE_DATABASE_TYPE = 'sqlite';
			process.env.STORAGE_DATABASE_PATH = '/root/nonexistent/readonly';
			process.env.STORAGE_DATABASE_NAME = 'test.db';

			const result = await createStorageFromEnv();

			// Will fallback to in-memory due to connection failure
			const info = result.manager.getInfo();
			expect(info.backends.database.fallback).toBe(true);
			expect(info.backends.database.type).toBe('in-memory');

			// Cleanup
			await result.manager.disconnect();
		});

		it('should handle postgres type with fallback', async () => {
			process.env.STORAGE_DATABASE_TYPE = 'postgres';

			const result = await createStorageFromEnv();

			// Should use in-memory since postgres is not implemented
			const info = result.manager.getInfo();
			expect(info.backends.database.type).toBe('in-memory');
			expect(info.backends.database.fallback).toBe(false);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should handle invalid Redis port configuration', async () => {
			// Test invalid port handling without actual connection
			process.env.STORAGE_CACHE_TYPE = 'redis';
			process.env.STORAGE_CACHE_PORT = 'invalid';
			process.env.STORAGE_CACHE_CONNECTION_TIMEOUT_MILLIS = '1000';

			// The factory should handle invalid config gracefully and fall back to in-memory
			const result = await createStorageFromEnv();

			// Should still create storage (with fallback due to invalid port)
			expect(result.manager).toBeInstanceOf(StorageManager);
			const info = result.manager.getInfo();
			expect(info.backends.cache.type).toBe('in-memory');

			// Cleanup
			await result.manager.disconnect();
		});

		it('should parse Redis cache config from env vars', async () => {
			// Test Redis config parsing - this will fail to connect and fallback to in-memory
			// but that's the expected behavior we want to test
			process.env.STORAGE_CACHE_TYPE = 'redis';
			process.env.STORAGE_CACHE_HOST = 'nonexistent-host-12345';
			process.env.STORAGE_CACHE_PORT = '6380';
			process.env.STORAGE_CACHE_PASSWORD = 'test-pass';
			process.env.STORAGE_CACHE_DATABASE = '1';
			process.env.STORAGE_CACHE_CONNECTION_TIMEOUT_MILLIS = '100'; // Very short timeout

			const result = await createStorageFromEnv();

			// Should fallback to in-memory due to connection failure
			const info = result.manager.getInfo();
			expect(info.backends.cache.fallback).toBe(true);
			expect(info.backends.cache.type).toBe('in-memory');

			// Cleanup
			await result.manager.disconnect();
		}, 15000); // Increase timeout to 15 seconds
	});

	describe('isStorageFactory', () => {
		it('should return true for valid StorageFactory objects', async () => {
			const result = await createDefaultStorage();

			expect(isStorageFactory(result)).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should return false for invalid objects', () => {
			expect(isStorageFactory(null)).toBe(false);
			expect(isStorageFactory(undefined)).toBe(false);
			expect(isStorageFactory({})).toBe(false);
			expect(isStorageFactory({ manager: {} })).toBe(false);
			expect(isStorageFactory({ backends: {} })).toBe(false);
			expect(isStorageFactory({ manager: {}, backends: {} })).toBe(false);
		});
	});

	describe('Integration', () => {
		it('should support typical usage pattern', async () => {
			// Create storage
			const { manager, backends } = await createStorageBackends({
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			});

			// Use cache backend
			await backends.cache.set('session:123', { userId: 'user1' }, 300);
			const session = await backends.cache.get('session:123');
			expect(session).toEqual({ userId: 'user1' });

			// Use database backend
			await backends.database.set('user:1', { name: 'Alice', email: 'alice@example.com' });
			const user = await backends.database.get('user:1');
			expect(user).toEqual({ name: 'Alice', email: 'alice@example.com' });

			// List operations
			await backends.database.append('log:user:1', { action: 'login', timestamp: Date.now() });
			const logs = await backends.database.getRange('log:user:1', 0, 10);
			expect(logs).toHaveLength(1);

			// Get info
			const info = manager.getInfo();
			expect(info.connected).toBe(true);
			expect(info.backends.cache.connected).toBe(true);
			expect(info.backends.database.connected).toBe(true);

			// Cleanup
			await manager.disconnect();
			expect(manager.isConnected()).toBe(false);
		});

		it('should handle lifecycle correctly on error', async () => {
			// Create storage that will use fallbacks
			const { manager, backends } = await createStorageBackends({
				cache: { type: 'redis', host: 'nonexistent', connectionTimeoutMillis: 1000 },
				database: { type: 'sqlite', path: '/root/nonexistent/readonly/test.db' },
			});

			// Should still be usable with fallbacks
			await backends.cache.set('key', 'value');
			const value = await backends.cache.get('key');
			expect(value).toBe('value');

			// Info should show fallbacks
			const info = manager.getInfo();
			expect(info.backends.cache.fallback).toBe(true);
			expect(info.backends.database.fallback).toBe(true);

			// Cleanup should work
			await manager.disconnect();
			expect(manager.isConnected()).toBe(false);
		}, 10000); // Increase timeout for this test
	});
});
