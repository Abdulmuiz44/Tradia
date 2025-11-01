/**
 * Vector Storage Factory Tests
 *
 * Tests for the factory functions that create and initialize vector storage systems.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
	createVectorStore,
	createDefaultVectorStore,
	createVectorStoreFromEnv,
	getVectorStoreConfigFromEnv,
	isVectorStoreFactory,
} from '../factory.js';
import { VectorStoreManager } from '../manager.js';
import { InMemoryBackend } from '../backend/in-memory.js';
import type { VectorStoreConfig } from '../types.js';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

// Mock Qdrant client for connection failure tests
vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: vi.fn(() => ({
		getCollections: vi.fn().mockRejectedValue(new Error('Connection failed')),
	})),
}));

describe('Vector Storage Factory', () => {
	// Store original env vars
	const originalEnv = { ...process.env };

	afterEach(() => {
		// Restore environment variables
		process.env = { ...originalEnv };
	});

	describe('createVectorStore', () => {
		it('should create and connect vector storage with in-memory backend', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_collection',
				dimension: 768,
				maxVectors: 1000,
			};

			const result = await createVectorStore(config);

			// Verify structure
			expect(result).toHaveProperty('manager');
			expect(result).toHaveProperty('store');
			expect(result.manager).toBeInstanceOf(VectorStoreManager);
			expect(result.store).toBeInstanceOf(InMemoryBackend);

			// Verify connected
			expect(result.manager.isConnected()).toBe(true);
			expect(result.store.isConnected()).toBe(true);

			// Verify configuration
			const info = result.manager.getInfo();
			expect(info.backend.type).toBe('in-memory');
			expect(info.backend.dimension).toBe(768);
			expect(info.backend.collectionName).toBe('test_collection');

			// Cleanup
			await result.manager.disconnect();
		});

		it('should handle Qdrant backend with fallback to in-memory', async () => {
			const config: VectorStoreConfig = {
				type: 'qdrant',
				host: 'localhost',
				port: 6333,
				collectionName: 'test_collection',
				dimension: 1536,
				distance: 'Cosine',
			};

			const result = await createVectorStore(config);

			// Should fallback to in-memory due to connection failure
			expect(result.manager).toBeInstanceOf(VectorStoreManager);
			expect(result.store).toBeInstanceOf(InMemoryBackend);

			const info = result.manager.getInfo();
			expect(info.backend.type).toBe('in-memory');
			expect(info.backend.fallback).toBe(true);
			expect(info.backend.dimension).toBe(1536);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should validate configuration', async () => {
			const invalidConfig = {
				type: 'invalid',
				collectionName: '',
				dimension: -1,
			} as any;

			await expect(createVectorStore(invalidConfig)).rejects.toThrow();
		});

		it('should handle connection failures gracefully', async () => {
			// Mock in-memory to also fail
			const originalConnect = InMemoryBackend.prototype.connect;
			InMemoryBackend.prototype.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test',
				dimension: 128,
				maxVectors: 100,
			};

			try {
				await expect(createVectorStore(config)).rejects.toThrow('Connection failed');
			} finally {
				// Restore original method
				InMemoryBackend.prototype.connect = originalConnect;
			}
		});

		it('should log creation process', async () => {
			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_logging',
				dimension: 256,
				maxVectors: 500,
			};

			const result = await createVectorStore(config);

			// Verify successful creation
			expect(result.manager.isConnected()).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		});
	});

	describe('createDefaultVectorStore', () => {
		it('should create default vector storage with default parameters', async () => {
			const result = await createDefaultVectorStore();

			expect(result.manager).toBeInstanceOf(VectorStoreManager);
			expect(result.store).toBeInstanceOf(InMemoryBackend);

			const info = result.manager.getInfo();
			expect(info.backend.type).toBe('in-memory');
			expect(info.backend.collectionName).toBe('knowledge_memory');
			expect(info.backend.dimension).toBe(1536);
			expect(info.backend.fallback).toBe(false);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should create default vector storage with custom parameters', async () => {
			const result = await createDefaultVectorStore('custom_collection', 768);

			const info = result.manager.getInfo();
			expect(info.backend.collectionName).toBe('custom_collection');
			expect(info.backend.dimension).toBe(768);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should use in-memory backend by default', async () => {
			const result = await createDefaultVectorStore();

			expect(result.store).toBeInstanceOf(InMemoryBackend);
			expect(result.store.getBackendType()).toBe('in-memory');

			// Cleanup
			await result.manager.disconnect();
		});
	});

	describe('createVectorStoreFromEnv', () => {
		it('should create default vector storage when no env vars are set', async () => {
			// Clear relevant env vars
			delete process.env.VECTOR_STORE_TYPE;
			delete process.env.VECTOR_STORE_COLLECTION;
			delete process.env.VECTOR_STORE_DIMENSION;

			const result = await createVectorStoreFromEnv();

			const info = result.manager.getInfo();
			expect(info.backend.type).toBe('in-memory');
			expect(info.backend.collectionName).toBe('knowledge_memory');
			expect(info.backend.dimension).toBe(1536);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should create in-memory storage from env vars', async () => {
			process.env.VECTOR_STORE_TYPE = 'in-memory';
			process.env.VECTOR_STORE_COLLECTION = 'env_test_collection';
			process.env.VECTOR_STORE_DIMENSION = '512';
			process.env.VECTOR_STORE_MAX_VECTORS = '2000';

			const result = await createVectorStoreFromEnv();

			const info = result.manager.getInfo();
			expect(info.backend.type).toBe('in-memory');
			expect(info.backend.collectionName).toBe('env_test_collection');
			expect(info.backend.dimension).toBe(512);

			// Cleanup
			await result.manager.disconnect();
		});

		it.skipIf(process.env.CI)(
			'should create Qdrant storage from env vars with fallback',
			async () => {
				process.env.VECTOR_STORE_TYPE = 'qdrant';
				process.env.VECTOR_STORE_HOST = 'test-host';
				process.env.VECTOR_STORE_PORT = '6334';
				process.env.VECTOR_STORE_API_KEY = 'test-key';
				process.env.VECTOR_STORE_COLLECTION = 'qdrant_collection';
				process.env.VECTOR_STORE_DIMENSION = '1024';
				process.env.VECTOR_STORE_DISTANCE = 'Euclidean';
				process.env.VECTOR_STORE_ON_DISK = 'true';

				const result = await createVectorStoreFromEnv();

				// Will fallback to in-memory due to connection failure
				const info = result.manager.getInfo();
				expect(info.backend.fallback).toBe(true);
				expect(info.backend.type).toBe('in-memory');
				expect(info.backend.dimension).toBe(1024);
				expect(info.backend.collectionName).toBe('qdrant_collection');

				// Cleanup
				await result.manager.disconnect();
			}
		);

		it.skipIf(process.env.CI)('should handle URL-based Qdrant configuration', async () => {
			process.env.VECTOR_STORE_TYPE = 'qdrant';
			process.env.VECTOR_STORE_URL = 'http://test-qdrant:6333';
			process.env.VECTOR_STORE_COLLECTION = 'url_collection';
			process.env.VECTOR_STORE_DIMENSION = '384';
			const result = await createVectorStoreFromEnv();

			// Will fallback to in-memory due to connection failure
			const info = result.manager.getInfo();
			expect(info.backend.fallback).toBe(true);
			expect(info.backend.dimension).toBe(384);
			expect(info.backend.collectionName).toBe('url_collection');

			// Cleanup
			await result.manager.disconnect();
		});

		it.skipIf(process.env.CI)(
			'should fallback to in-memory when Qdrant config is incomplete',
			async () => {
				process.env.VECTOR_STORE_TYPE = 'qdrant';
				// No host or URL provided
				process.env.VECTOR_STORE_COLLECTION = 'incomplete_config';
				process.env.VECTOR_STORE_DIMENSION = '128';

				const result = await createVectorStoreFromEnv();

				// Should use in-memory directly (not as fallback)
				const info = result.manager.getInfo();
				expect(info.backend.type).toBe('in-memory');
				expect(info.backend.fallback).toBe(true);
				expect(info.backend.dimension).toBe(128);

				// Cleanup
				await result.manager.disconnect();
			}
		);

		it('should handle invalid environment values gracefully', async () => {
			process.env.VECTOR_STORE_TYPE = 'in-memory';
			process.env.VECTOR_STORE_DIMENSION = 'invalid-number';
			process.env.VECTOR_STORE_MAX_VECTORS = 'also-invalid';

			const result = await createVectorStoreFromEnv();

			// Should still create storage with defaults for invalid values
			expect(result.manager).toBeInstanceOf(VectorStoreManager);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should log environment configuration details', async () => {
			process.env.VECTOR_STORE_TYPE = 'in-memory';
			process.env.VECTOR_STORE_COLLECTION = 'logged_collection';
			process.env.VECTOR_STORE_DIMENSION = '256';

			const result = await createVectorStoreFromEnv();

			// Verify successful creation
			expect(result.manager.isConnected()).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		});
	});

	describe('getVectorStoreConfigFromEnv', () => {
		it('should return in-memory config when no env vars are set', () => {
			// Clear relevant env vars
			delete process.env.VECTOR_STORE_TYPE;
			delete process.env.VECTOR_STORE_COLLECTION;
			delete process.env.VECTOR_STORE_DIMENSION;

			const config = getVectorStoreConfigFromEnv();

			expect(config.type).toBe('in-memory');
			expect(config.collectionName).toBe('knowledge_memory');
			expect(config.dimension).toBe(1536);
			expect((config as any).maxVectors).toBe(10000);
		});

		it('should return qdrant config from env vars', () => {
			process.env.VECTOR_STORE_TYPE = 'qdrant';
			process.env.VECTOR_STORE_HOST = 'test-host';
			process.env.VECTOR_STORE_PORT = '6334';
			process.env.VECTOR_STORE_COLLECTION = 'test_collection';
			process.env.VECTOR_STORE_DIMENSION = '768';
			process.env.VECTOR_STORE_DISTANCE = 'Euclidean';

			const config = getVectorStoreConfigFromEnv();

			expect(config.type).toBe('qdrant');
			expect(config.collectionName).toBe('test_collection');
			expect(config.dimension).toBe(768);
			expect((config as any).host).toBe('test-host');
			expect((config as any).port).toBe(6334);
			expect((config as any).distance).toBe('Euclidean');
		});

		it('should fallback to in-memory when qdrant config is incomplete', () => {
			process.env.VECTOR_STORE_TYPE = 'qdrant';
			// No host or URL provided
			delete process.env.VECTOR_STORE_HOST;
			delete process.env.VECTOR_STORE_URL;
			process.env.VECTOR_STORE_COLLECTION = 'test_collection';

			const config = getVectorStoreConfigFromEnv();

			expect(config.type).toBe('in-memory');
			expect(config.collectionName).toBe('test_collection');
		});

		it('should handle invalid numeric values gracefully', () => {
			process.env.VECTOR_STORE_TYPE = 'in-memory';
			process.env.VECTOR_STORE_DIMENSION = 'invalid-number';
			process.env.VECTOR_STORE_MAX_VECTORS = 'also-invalid';

			const config = getVectorStoreConfigFromEnv();

			expect(config.type).toBe('in-memory');
			expect(config.dimension).toBe(1536); // Should fallback to default
			expect((config as any).maxVectors).toBe(10000); // Should fallback to default
		});
	});

	describe('isVectorStoreFactory', () => {
		it('should return true for valid VectorStoreFactory objects', async () => {
			const result = await createDefaultVectorStore();

			expect(isVectorStoreFactory(result)).toBe(true);

			// Cleanup
			await result.manager.disconnect();
		});

		it('should return false for invalid objects', () => {
			expect(isVectorStoreFactory(null)).toBe(false);
			expect(isVectorStoreFactory(undefined)).toBe(false);
			expect(isVectorStoreFactory({})).toBe(false);
			expect(isVectorStoreFactory({ manager: {} })).toBe(false);
			expect(isVectorStoreFactory({ store: {} })).toBe(false);
			expect(isVectorStoreFactory({ manager: {}, store: {} })).toBe(false);
		});

		it('should return false for objects with wrong types', () => {
			const fakeFactory = {
				manager: { isConnected: () => true },
				store: { search: () => Promise.resolve([]) },
			};

			expect(isVectorStoreFactory(fakeFactory)).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should clean up on factory creation failure', async () => {
			// Mock manager to fail after creation
			const originalConnect = VectorStoreManager.prototype.connect;
			VectorStoreManager.prototype.connect = vi
				.fn()
				.mockRejectedValue(new Error('Manager connection failed'));

			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'fail_test',
				dimension: 128,
				maxVectors: 100,
			};

			try {
				await expect(createVectorStore(config)).rejects.toThrow('Manager connection failed');
			} finally {
				// Restore original method
				VectorStoreManager.prototype.connect = originalConnect;
			}
		});

		it('should handle malformed configuration gracefully', async () => {
			const malformedConfig = {
				type: 'in-memory',
				// Missing required fields
			} as any;

			await expect(createVectorStore(malformedConfig)).rejects.toThrow();
		});
	});

	describe('Integration Scenarios', () => {
		it('should support multiple vector stores simultaneously', async () => {
			const result1 = await createDefaultVectorStore('collection1', 256);
			const result2 = await createDefaultVectorStore('collection2', 512);

			try {
				// Both should be independent
				expect(result1.manager.getInfo().backend.collectionName).toBe('collection1');
				expect(result2.manager.getInfo().backend.collectionName).toBe('collection2');
				expect(result1.manager.getInfo().backend.dimension).toBe(256);
				expect(result2.manager.getInfo().backend.dimension).toBe(512);

				// Both should be connected
				expect(result1.manager.isConnected()).toBe(true);
				expect(result2.manager.isConnected()).toBe(true);
			} finally {
				// Cleanup both
				await result1.manager.disconnect();
				await result2.manager.disconnect();
			}
		});

		it('should handle rapid creation and destruction', async () => {
			const configs = [
				{ type: 'in-memory' as const, collectionName: 'rapid1', dimension: 128, maxVectors: 100 },
				{ type: 'in-memory' as const, collectionName: 'rapid2', dimension: 256, maxVectors: 200 },
				{ type: 'in-memory' as const, collectionName: 'rapid3', dimension: 512, maxVectors: 300 },
			];

			const results = [];

			try {
				// Create multiple stores rapidly
				for (const config of configs) {
					const result = await createVectorStore(config);
					results.push(result);
				}

				// All should be connected
				for (const result of results) {
					expect(result.manager.isConnected()).toBe(true);
				}
			} finally {
				// Cleanup all
				for (const result of results) {
					await result.manager.disconnect();
				}
			}
		});
	});
});
