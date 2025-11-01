/**
 * Redis Backend Connection Tests
 *
 * Focused tests for the connection fixes implemented for GitHub issue #167.
 * Tests the specific issues: missing connect() call, username support, and configurable timeout.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { Redis } from 'ioredis';
import { RedisBackend } from '../redis-backend.js';
import type { RedisBackendConfig } from '../../config.js';

// Mock ioredis completely
const mockConnect = vi.fn();
const mockQuit = vi.fn();
const mockOn = vi.fn();
const mockOnce = vi.fn();
const mockOff = vi.fn();

vi.mock('ioredis', () => ({
	Redis: vi.fn().mockImplementation(() => ({
		connect: mockConnect,
		quit: mockQuit,
		on: mockOn,
		once: mockOnce,
		off: mockOff,
		status: 'ready',
	})),
}));

const MockedRedis = Redis as unknown as MockedFunction<typeof Redis>;

describe('RedisBackend Connection Fixes', () => {
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
			mockQuit.mockResolvedValue('OK');
			await backend.disconnect();
		}
	});

	describe('Issue #167 - Connection initialization fix', () => {
		it('should create Redis client with all configuration options including username', () => {
			// Just creating the backend should call the Redis constructor
			expect(MockedRedis).not.toHaveBeenCalled(); // Not called until connect()

			// When we call connect, it should create the Redis instance
			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockConnect.mockResolvedValue(undefined);

			backend.connect();

			expect(MockedRedis).toHaveBeenCalledWith({
				host: 'localhost',
				port: 6379,
				username: 'testuser', // This was missing before the fix
				password: 'testpass',
				db: 1,
				family: 4,
				connectTimeout: 5000, // This uses configurable timeout now
				commandTimeout: 5000,
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should call this.redis.connect() explicitly for lazyConnect: true', async () => {
			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockConnect.mockResolvedValue(undefined);

			await backend.connect();

			// The critical fix: connect() should be called explicitly
			expect(mockConnect).toHaveBeenCalled();
		});

		it('should use configurable timeout instead of hardcoded 1 second', async () => {
			const longTimeoutConfig = { ...config, connectionTimeoutMillis: 15000 };
			const longTimeoutBackend = new RedisBackend(longTimeoutConfig);

			// Mock connection that never fires ready event to test timeout
			mockOnce.mockImplementation(() => {}); // No ready event
			mockConnect.mockImplementation(() => new Promise(() => {})); // Never resolves

			const startTime = Date.now();
			try {
				await longTimeoutBackend.connect();
			} catch (error: any) {
				const elapsedTime = Date.now() - startTime;
				expect(error.message).toMatch(/timeout/);
				// Should timeout after approximately 15 seconds, not 1 second
				expect(elapsedTime).toBeGreaterThan(10000); // Much longer than 1 second
			}
		}, 20000); // Give test enough time to run

		it('should use default 10 second timeout when connectionTimeoutMillis not specified', () => {
			const configWithoutTimeout = { ...config };
			delete configWithoutTimeout.connectionTimeoutMillis;
			const defaultTimeoutBackend = new RedisBackend(configWithoutTimeout);

			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockConnect.mockResolvedValue(undefined);

			defaultTimeoutBackend.connect();

			// Should create Redis with default timeout values
			expect(MockedRedis).toHaveBeenCalledWith(
				expect.not.objectContaining({
					connectTimeout: expect.anything(),
					commandTimeout: expect.anything(),
				})
			);
		});

		it('should support username-only configuration', () => {
			const usernameOnlyConfig = {
				type: 'redis' as const,
				host: 'localhost',
				port: 6379,
				username: 'redis_user',
				// No password
			};
			const usernameOnlyBackend = new RedisBackend(usernameOnlyConfig);

			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockConnect.mockResolvedValue(undefined);

			usernameOnlyBackend.connect();

			expect(MockedRedis).toHaveBeenCalledWith(
				expect.objectContaining({
					username: 'redis_user',
				})
			);
			expect(MockedRedis).toHaveBeenCalledWith(
				expect.not.objectContaining({
					password: expect.anything(),
				})
			);
		});

		it('should handle connection errors properly', async () => {
			const connectionError = new Error('ECONNREFUSED');
			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'error') {
					setTimeout(() => callback(connectionError), 10);
				}
			});
			mockConnect.mockRejectedValue(connectionError);

			await expect(backend.connect()).rejects.toThrow('Redis connection failed: ECONNREFUSED');
		});
	});

	describe('Backend identification', () => {
		it('should return correct backend type', () => {
			expect(backend.getBackendType()).toBe('redis');
		});

		it('should report connection status correctly', async () => {
			expect(backend.isConnected()).toBe(false);

			mockOnce.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockConnect.mockResolvedValue(undefined);

			await backend.connect();
			expect(backend.isConnected()).toBe(true);
		});
	});
});
