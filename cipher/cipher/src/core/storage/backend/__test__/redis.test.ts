/**
 * Redis Backend Tests
 *
 * Tests for the Redis storage backend implementation.
 * Tests both connection management and cache operations.
 *
 * Note: These tests use a mock Redis implementation to avoid
 * requiring an actual Redis server for testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Redis } from 'ioredis';
import { RedisBackend } from '../redis-backend.js';
import type { RedisBackendConfig } from '../../config.js';

// Mock pipeline methods
const mockPipeline = {
	set: vi.fn().mockReturnThis(),
	exec: vi.fn(),
};

// Mock Redis instance methods
const mockRedisInstance = {
	connect: vi.fn(),
	quit: vi.fn(),
	get: vi.fn(),
	set: vi.fn(),
	setex: vi.fn(),
	del: vi.fn(),
	mget: vi.fn(),
	pipeline: vi.fn(() => mockPipeline),
	exists: vi.fn(),
	expire: vi.fn(),
	incrby: vi.fn(),
	decrby: vi.fn(),
	rpush: vi.fn(),
	lrange: vi.fn(),
	keys: vi.fn(),
	flushdb: vi.fn(),
	info: vi.fn(),
	once: vi.fn(),
	on: vi.fn(),
	off: vi.fn(),
	status: 'ready',
};

// Mock ioredis
vi.mock('ioredis', () => ({
	Redis: vi.fn(() => mockRedisInstance),
}));

describe('RedisBackend', () => {
	let backend: RedisBackend;
	let config: RedisBackendConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		config = {
			type: 'redis',
			host: 'localhost',
			port: 6379,
			username: 'testuser',
			password: 'testpass',
			database: 1,
			connectionTimeoutMillis: 5000,
		};
		backend = new RedisBackend(config);
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
		vi.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create RedisBackend with config', () => {
			expect(backend.getBackendType()).toBe('redis');
			expect(backend.isConnected()).toBe(false);
		});
	});

	describe('Connection Management', () => {
		it('should connect successfully with all configuration options', async () => {
			// Mock successful connection
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);

			await backend.connect();

			expect(Redis).toHaveBeenCalledWith({
				host: 'localhost',
				port: 6379,
				username: 'testuser',
				password: 'testpass',
				db: 1,
				family: 4,
				connectTimeout: 5000,
				commandTimeout: 5000,
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
			expect(mockRedisInstance.connect).toHaveBeenCalled();
			expect(backend.isConnected()).toBe(true);
		});

		it('should use default values for optional config', async () => {
			const minimalConfig: RedisBackendConfig = {
				type: 'redis',
				host: 'localhost',
			};
			const minimalBackend = new RedisBackend(minimalConfig);

			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);

			await minimalBackend.connect();

			expect(Redis).toHaveBeenCalledWith({
				host: 'localhost',
				db: 0, // default database
				family: 4,
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should handle connection timeout using configurable timeout', async () => {
			// Mock connection that never fires ready event
			mockRedisInstance.once.mockImplementation(() => {});
			mockRedisInstance.connect.mockImplementation(() => new Promise(() => {})); // Never resolves

			const shortTimeoutConfig = { ...config, connectionTimeoutMillis: 100 };
			const shortTimeoutBackend = new RedisBackend(shortTimeoutConfig);

			await expect(shortTimeoutBackend.connect()).rejects.toThrow(
				'Redis connection failed: timeout'
			);
		});

		it('should handle connection timeout with default timeout', async () => {
			const configWithoutTimeout = { ...config };
			delete configWithoutTimeout.connectionTimeoutMillis;
			const backendWithoutTimeout = new RedisBackend(configWithoutTimeout);

			// Mock connection that never fires ready event
			mockRedisInstance.once.mockImplementation(() => {});
			mockRedisInstance.connect.mockImplementation(() => new Promise(() => {})); // Never resolves

			await expect(backendWithoutTimeout.connect()).rejects.toThrow(
				'Redis connection failed: timeout'
			);
		}, 15000); // Increase timeout for this test

		it('should handle connection error', async () => {
			const connectionError = new Error('Connection refused');
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'error') {
					setTimeout(() => callback(connectionError), 10);
				}
			});
			mockRedisInstance.connect.mockRejectedValue(connectionError);

			await expect(backend.connect()).rejects.toThrow(
				'Redis connection failed: Connection refused'
			);
		});

		it('should handle multiple connect calls', async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);

			await backend.connect();
			await backend.connect(); // Should not throw

			expect(mockRedisInstance.connect).toHaveBeenCalledTimes(1); // Only called once due to already connected check
		});

		it('should disconnect successfully', async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			mockRedisInstance.quit.mockResolvedValue('OK');

			await backend.connect();
			await backend.disconnect();

			expect(mockRedisInstance.quit).toHaveBeenCalled();
			expect(backend.isConnected()).toBe(false);
		});
	});

	describe('Basic Operations', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			await backend.connect();
		});

		it('should get and set values', async () => {
			const testValue = { data: 'test' };
			mockRedisInstance.set.mockResolvedValue('OK');
			mockRedisInstance.get.mockResolvedValue(JSON.stringify(testValue));

			await backend.set('test-key', testValue);
			expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', JSON.stringify(testValue));

			const result = await backend.get('test-key');
			expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
			expect(result).toEqual(testValue);
		});

		it('should set values with TTL', async () => {
			const testValue = { data: 'test' };
			mockRedisInstance.setex.mockResolvedValue('OK');

			await backend.set('test-key', testValue, 3600);
			expect(mockRedisInstance.setex).toHaveBeenCalledWith(
				'test-key',
				3600,
				JSON.stringify(testValue)
			);
		});

		it('should return undefined for missing keys', async () => {
			mockRedisInstance.get.mockResolvedValue(null);

			const result = await backend.get('missing-key');
			expect(result).toBeUndefined();
		});

		it('should delete keys', async () => {
			mockRedisInstance.del.mockResolvedValue(1);

			await backend.delete('test-key');
			expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
		});

		it('should check if keys exist', async () => {
			mockRedisInstance.exists.mockResolvedValue(1);

			const result = await backend.exists('test-key');
			expect(result).toBe(true);
			expect(mockRedisInstance.exists).toHaveBeenCalledWith('test-key');
		});

		it('should set expiration', async () => {
			mockRedisInstance.expire.mockResolvedValue(1);

			await backend.expire('test-key', 3600);
			expect(mockRedisInstance.expire).toHaveBeenCalledWith('test-key', 3600);
		});
	});

	describe('Batch Operations', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			await backend.connect();
		});

		it('should mget multiple values', async () => {
			const values = ['"value1"', '{"data":"value2"}', null];
			mockRedisInstance.mget.mockResolvedValue(values);

			const result = await backend.mget(['key1', 'key2', 'key3']);
			expect(mockRedisInstance.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
			expect(result).toEqual(['value1', { data: 'value2' }, undefined]);
		});

		it('should mset multiple values', async () => {
			const entries: [string, any][] = [
				['key1', 'value1'],
				['key2', { data: 'value2' }],
			];
			mockPipeline.exec.mockResolvedValue([]);

			await backend.mset(entries);
			expect(mockRedisInstance.pipeline).toHaveBeenCalled();
			expect(mockPipeline.set).toHaveBeenCalledWith('key1', '"value1"');
			expect(mockPipeline.set).toHaveBeenCalledWith('key2', '{"data":"value2"}');
			expect(mockPipeline.exec).toHaveBeenCalled();
		});

		it('should handle empty batch operations', async () => {
			const result = await backend.mget([]);
			expect(result).toEqual([]);

			await backend.mset([]);
			expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
		});
	});

	describe('Numeric Operations', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			await backend.connect();
		});

		it('should increment values', async () => {
			mockRedisInstance.incrby.mockResolvedValue(5);

			const result = await backend.increment('counter', 2);
			expect(mockRedisInstance.incrby).toHaveBeenCalledWith('counter', 2);
			expect(result).toBe(5);
		});

		it('should decrement values', async () => {
			mockRedisInstance.decrby.mockResolvedValue(3);

			const result = await backend.decrement('counter', 2);
			expect(mockRedisInstance.decrby).toHaveBeenCalledWith('counter', 2);
			expect(result).toBe(3);
		});
	});

	describe('List Operations', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			await backend.connect();
		});

		it('should append items to list', async () => {
			const item = { data: 'test' };
			mockRedisInstance.rpush.mockResolvedValue(1);

			await backend.append('list-key', item);
			expect(mockRedisInstance.rpush).toHaveBeenCalledWith('list-key', JSON.stringify(item));
		});

		it('should get range from list', async () => {
			const items = ['{"data":"item1"}', '{"data":"item2"}'];
			mockRedisInstance.lrange.mockResolvedValue(items);

			const result = await backend.getRange('list-key', 0, 2);
			expect(mockRedisInstance.lrange).toHaveBeenCalledWith('list-key', 0, 1);
			expect(result).toEqual([{ data: 'item1' }, { data: 'item2' }]);
		});

		it('should list keys with pattern', async () => {
			const keys = ['prefix:key1', 'prefix:key2'];
			mockRedisInstance.keys.mockResolvedValue(keys);

			const result = await backend.list('prefix:');
			expect(mockRedisInstance.keys).toHaveBeenCalledWith('prefix:*');
			expect(result).toEqual(keys);
		});
	});

	describe('Connection State Validation', () => {
		it('should throw error when not connected', async () => {
			await expect(backend.get('key')).rejects.toThrow('RedisBackend not connected');
			await expect(backend.set('key', 'value')).rejects.toThrow('RedisBackend not connected');
			await expect(backend.delete('key')).rejects.toThrow('RedisBackend not connected');
		});

		it('should throw error when redis status is not ready', async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			await backend.connect();

			// Simulate Redis not being ready
			mockRedisInstance.status = 'connecting';

			await expect(backend.get('key')).rejects.toThrow('RedisBackend not connected');
		});
	});

	describe('Administrative Operations', () => {
		beforeEach(async () => {
			// Reset mocks completely
			vi.clearAllMocks();

			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.connect.mockResolvedValue(undefined);
			mockRedisInstance.status = 'ready'; // Ensure status is ready after connection

			await backend.connect();
		});

		it('should flush database', async () => {
			mockRedisInstance.flushdb.mockResolvedValue('OK');

			await backend.flushdb();
			expect(mockRedisInstance.flushdb).toHaveBeenCalled();
		});

		it('should get server info', async () => {
			const infoString = 'redis_version:7.0.0\nuptime_in_seconds:3600';
			mockRedisInstance.info.mockResolvedValue(infoString);

			const result = await backend.info();
			expect(mockRedisInstance.info).toHaveBeenCalled();
			expect(result).toBe(infoString);
		});
	});
});
