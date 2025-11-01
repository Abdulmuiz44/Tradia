/**
 * Vector Storage Manager Tests
 *
 * Tests for the vector storage manager implementation including
 * connection logic, fallback mechanisms, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorStoreManager } from '../manager.js';
import { InMemoryBackend } from '../backend/in-memory.js';
import { BACKEND_TYPES } from '../constants.js';
import type { VectorStoreConfig } from '../types.js';
import type { QdrantBackendConfig } from '../config.js';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

// Mock Qdrant client
const mockQdrantClient = {
	getCollections: vi.fn(),
	createCollection: vi.fn(),
};

vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: vi.fn(() => mockQdrantClient),
}));

describe('VectorStoreManager', () => {
	let manager: VectorStoreManager;

	afterEach(async () => {
		// Ensure cleanup after each test
		if (manager && manager.isConnected()) {
			await manager.disconnect();
		}
		vi.clearAllMocks();
	});

	describe('Configuration', () => {
		it('should validate configuration on construction', () => {
			expect(() => {
				new VectorStoreManager({} as any);
			}).toThrow('Invalid vector store configuration');

			expect(() => {
				new VectorStoreManager({
					type: 'invalid' as any,
					collectionName: 'test',
					dimension: 128,
				});
			}).toThrow('Invalid vector store configuration');
		});

		it('should accept valid in-memory configuration', () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_collection',
				dimension: 768,
				maxVectors: 1000,
			};

			expect(() => {
				manager = new VectorStoreManager(config);
			}).not.toThrow();

			expect(manager.getConfig()).toEqual(config);
		});

		it('should accept valid Qdrant configuration', () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				host: 'localhost',
				port: 6333,
				collectionName: 'test_collection',
				dimension: 1536,
				distance: 'Cosine',
			};

			expect(() => {
				manager = new VectorStoreManager(config);
			}).not.toThrow();

			expect(manager.getConfig()).toEqual(config);
		});
	});

	describe('Connection Management', () => {
		beforeEach(() => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_collection',
				dimension: 768,
				maxVectors: 1000,
			};
			manager = new VectorStoreManager(config);
		});

		it('should connect successfully with in-memory backend', async () => {
			expect(manager.isConnected()).toBe(false);

			const store = await manager.connect();

			expect(manager.isConnected()).toBe(true);
			expect(store).toBeInstanceOf(InMemoryBackend);
			expect(store.isConnected()).toBe(true);
			expect(store.getBackendType()).toBe(BACKEND_TYPES.IN_MEMORY);
		});

		it('should handle multiple connect calls (idempotency)', async () => {
			const store1 = await manager.connect();
			const store2 = await manager.connect();

			// Should return the same instance
			expect(store1).toBe(store2);
			expect(manager.isConnected()).toBe(true);
		});

		it('should disconnect successfully', async () => {
			await manager.connect();
			expect(manager.isConnected()).toBe(true);

			await manager.disconnect();
			expect(manager.isConnected()).toBe(false);

			const store = manager.getStore();
			expect(store).toBeNull();
		});

		it('should handle multiple disconnect calls', async () => {
			await manager.connect();
			await manager.disconnect();

			// Second disconnect should not throw
			await expect(manager.disconnect()).resolves.not.toThrow();
		});

		it('should clean up on connection failure', async () => {
			// Mock in-memory to fail initially
			const originalConnect = InMemoryBackend.prototype.connect;
			InMemoryBackend.prototype.connect = vi
				.fn()
				.mockRejectedValueOnce(new Error('Connection failed'));

			try {
				await expect(manager.connect()).rejects.toThrow('Connection failed');
				expect(manager.isConnected()).toBe(false);
				expect(manager.getStore()).toBeNull();
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});
	});

	describe('Backend Fallback', () => {
		it('should fallback to in-memory for failed Qdrant connection', async () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				host: 'localhost',
				port: 6333,
				collectionName: 'test_collection',
				dimension: 1536,
				distance: 'Cosine',
			};
			manager = new VectorStoreManager(config);

			// Mock Qdrant to fail
			mockQdrantClient.getCollections.mockRejectedValue(new Error('Qdrant connection failed'));

			const store = await manager.connect();

			// Should fallback to in-memory
			expect(store).toBeInstanceOf(InMemoryBackend);
			expect(store.getBackendType()).toBe(BACKEND_TYPES.IN_MEMORY);

			const info = manager.getInfo();
			expect(info.backend.type).toBe(BACKEND_TYPES.IN_MEMORY);
			expect(info.backend.fallback).toBe(true);
			expect(info.backend.dimension).toBe(1536); // Should preserve original dimension
		});

		it('should not fallback if already using in-memory', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_collection',
				dimension: 256,
				maxVectors: 500,
			};
			manager = new VectorStoreManager(config);

			// Mock in-memory to fail
			const originalConnect = InMemoryBackend.prototype.connect;
			InMemoryBackend.prototype.connect = vi.fn().mockRejectedValue(new Error('In-memory failed'));

			try {
				await expect(manager.connect()).rejects.toThrow('In-memory failed');
				expect(manager.isConnected()).toBe(false);
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});

		it('should track connection attempts', async () => {
			// Create a fresh manager for this test
			const freshConfig: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'fresh_test',
				dimension: 128,
				maxVectors: 100,
			};
			const freshManager = new VectorStoreManager(freshConfig);

			try {
				const info1 = freshManager.getInfo();
				expect(info1.connectionAttempts).toBe(0);

				await freshManager.connect();

				const info2 = freshManager.getInfo();
				expect(info2.connectionAttempts).toBe(1);

				// Disconnect and reconnect
				await freshManager.disconnect();
				await freshManager.connect();

				const info3 = freshManager.getInfo();
				expect(info3.connectionAttempts).toBe(2);
			} finally {
				if (freshManager.isConnected()) {
					await freshManager.disconnect();
				}
			}
		});
	});

	describe('State Management', () => {
		beforeEach(() => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_collection',
				dimension: 512,
				maxVectors: 2000,
			};
			manager = new VectorStoreManager(config);
		});

		it('should provide accurate info when disconnected', () => {
			const info = manager.getInfo();

			expect(info.connected).toBe(false);
			expect(info.backend.connected).toBe(false);
			expect(info.backend.type).toBe('unknown');
			expect(info.backend.fallback).toBe(false);
			expect(info.backend.collectionName).toBe('test_collection');
			expect(info.backend.dimension).toBe(512);
			expect(info.connectionAttempts).toBe(0);
			expect(info.lastError).toBeUndefined();
		});

		it('should provide accurate info when connected', async () => {
			await manager.connect();

			const info = manager.getInfo();
			expect(info.connected).toBe(true);
			expect(info.backend.connected).toBe(true);
			expect(info.backend.type).toBe(BACKEND_TYPES.IN_MEMORY);
			expect(info.backend.fallback).toBe(false);
			expect(info.backend.collectionName).toBe('test_collection');
			expect(info.backend.dimension).toBe(512);
			expect(info.connectionAttempts).toBe(1);
		});

		it('should track last error on connection failure', async () => {
			// Mock to fail
			const originalConnect = InMemoryBackend.prototype.connect;
			const testError = new Error('Test connection error');
			InMemoryBackend.prototype.connect = vi.fn().mockRejectedValue(testError);

			try {
				await expect(manager.connect()).rejects.toThrow('Test connection error');

				const info = manager.getInfo();
				expect(info.lastError).toBe('Test connection error');
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});

		it('should return null for getStore when not connected', () => {
			expect(manager.getStore()).toBeNull();
		});

		it('should return store instance when connected', async () => {
			const store = await manager.connect();
			const retrievedStore = manager.getStore();

			expect(retrievedStore).toBe(store);
			expect(retrievedStore).toBeInstanceOf(InMemoryBackend);
		});
	});

	describe('Health Check', () => {
		beforeEach(() => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'health_test',
				dimension: 128,
				maxVectors: 100,
			};
			manager = new VectorStoreManager(config);
		});

		it('should report unhealthy when not connected', async () => {
			const health = await manager.healthCheck();

			expect(health.backend).toBe(false);
			expect(health.overall).toBe(false);
			expect(health.details?.backend?.status).toBe('not_connected');
		});

		it('should report healthy when connected', async () => {
			await manager.connect();

			const health = await manager.healthCheck();

			expect(health.backend).toBe(true);
			expect(health.overall).toBe(true);
			expect(health.details?.backend?.status).toBe('healthy');
			expect(health.details?.backend?.latency).toBeGreaterThanOrEqual(0);
		});

		it('should handle health check errors', async () => {
			await manager.connect();

			// Mock store to report disconnected
			const store = manager.getStore()!;
			const originalIsConnected = store.isConnected;
			store.isConnected = vi.fn().mockReturnValue(false);

			try {
				const health = await manager.healthCheck();

				expect(health.backend).toBe(false);
				expect(health.overall).toBe(false);
				expect(health.details?.backend?.status).toBe('unhealthy');
			} finally {
				// Restore original method
				store.isConnected = originalIsConnected;
			}
		});
	});

	describe('Configuration Variants', () => {
		it('should handle Qdrant URL configuration', () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				url: 'http://localhost:6333',
				collectionName: 'url_test',
				dimension: 384,
				distance: 'Euclidean',
			};

			expect(() => {
				manager = new VectorStoreManager(config);
			}).not.toThrow();

			expect(manager.getConfig()).toEqual(config);
		});

		it('should handle Qdrant with API key', () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				host: 'cloud.qdrant.io',
				port: 443,
				apiKey: 'test-api-key',
				collectionName: 'secure_test',
				dimension: 1024,
				distance: 'Dot',
			};

			expect(() => {
				manager = new VectorStoreManager(config);
			}).not.toThrow();
		});

		it('should handle different distance metrics', () => {
			const distances: Array<'Cosine' | 'Euclidean' | 'Dot' | 'Manhattan'> = [
				'Cosine',
				'Euclidean',
				'Dot',
				'Manhattan',
			];

			distances.forEach(distance => {
				const config: VectorStoreConfig = {
					type: 'qdrant',
					host: 'localhost',
					port: 6333,
					collectionName: `${distance.toLowerCase()}_test`,
					dimension: 512,
					distance,
				};

				expect(() => {
					const testManager = new VectorStoreManager(config);
					expect((testManager.getConfig() as QdrantBackendConfig).distance).toBe(distance);
				}).not.toThrow();
			});
		});
	});

	describe('Lazy Loading', () => {
		it('should lazy load Qdrant backend module', async () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				host: 'localhost',
				port: 6333,
				collectionName: 'lazy_test',
				dimension: 256,
				distance: 'Cosine',
			};
			manager = new VectorStoreManager(config);

			// Mock successful Qdrant connection
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'lazy_test' }],
			});

			const store = await manager.connect();

			// Should create Qdrant backend (or fallback to in-memory)
			expect(store).toBeTruthy();
			expect(manager.isConnected()).toBe(true);
		});

		it('should lazy load in-memory backend module', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'in_memory_lazy_test',
				dimension: 128,
				maxVectors: 100,
			};
			manager = new VectorStoreManager(config);

			const store = await manager.connect();

			expect(store).toBeInstanceOf(InMemoryBackend);
			expect(manager.isConnected()).toBe(true);
		});
	});

	describe('Error Scenarios', () => {
		it('should handle timeout during disconnect', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'timeout_test',
				dimension: 64,
				maxVectors: 50,
			};
			manager = new VectorStoreManager(config);

			await manager.connect();

			// Mock disconnect to hang
			const store = manager.getStore()!;
			const originalDisconnect = store.disconnect;
			store.disconnect = vi.fn().mockImplementation(
				() => new Promise(() => {}) // Never resolves
			);

			try {
				// Should timeout and complete anyway
				await expect(manager.disconnect()).rejects.toThrow('Disconnect timeout');

				// Manager should still consider itself disconnected after timeout
				expect(manager.isConnected()).toBe(false);
			} finally {
				// Restore original method and cleanup
				store.disconnect = originalDisconnect;
				// Force cleanup state
				if (manager.isConnected()) {
					await manager.disconnect();
				}
			}
		}, 10000); // 10 second timeout for this test

		it('should handle backend creation errors', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'error_test',
				dimension: 32,
				maxVectors: 25,
			};
			manager = new VectorStoreManager(config);

			// Mock the InMemoryBackend constructor to throw an error
			const originalConnect = InMemoryBackend.prototype.connect;
			InMemoryBackend.prototype.connect = vi
				.fn()
				.mockRejectedValue(new Error('Backend creation failed'));

			try {
				await expect(manager.connect()).rejects.toThrow('Backend creation failed');
				expect(manager.isConnected()).toBe(false);
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});
	});

	describe('Concurrent Operations', () => {
		beforeEach(() => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'concurrent_test',
				dimension: 256,
				maxVectors: 1000,
			};
			manager = new VectorStoreManager(config);
		});

		it('should handle concurrent connect calls', async () => {
			const connectPromises = [manager.connect(), manager.connect(), manager.connect()];

			const stores = await Promise.all(connectPromises);

			// All should return the same store instance
			expect(stores[0]).toBe(stores[1]);
			expect(stores[1]).toBe(stores[2]);
			expect(manager.isConnected()).toBe(true);
		});

		it('should handle concurrent health checks', async () => {
			await manager.connect();

			const healthPromises = [manager.healthCheck(), manager.healthCheck(), manager.healthCheck()];

			const healthResults = await Promise.all(healthPromises);

			// All should be successful
			healthResults.forEach(health => {
				expect(health.overall).toBe(true);
				expect(health.backend).toBe(true);
			});
		});
	});
});
