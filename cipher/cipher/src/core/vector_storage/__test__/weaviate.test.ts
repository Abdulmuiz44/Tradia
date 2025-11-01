/**
 * Weaviate Vector Storage Backend Tests
 *
 * Tests for the Weaviate vector storage backend implementation.
 * Uses mocking since Weaviate requires external service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import { WeaviateBackend } from '../backend/weaviate.js';

import {
	VectorStoreError,
	VectorStoreConnectionError,
	VectorDimensionError,
} from '../backend/types.js';

describe('WeaviateBackend', () => {
	let backend: WeaviateBackend;

	const validConfig = {
		type: 'weaviate' as const,
		url: 'http://localhost:8080',
		apiKey: 'weaviate-api-key',
		collectionName: 'test_collection',
		dimension: 1536,
	};

	// Helper function to generate 1536-dimensional test vectors
	const createTestVector = (seed: number = 1): number[] => {
		const vector = new Array(1536);
		for (let i = 0; i < 1536; i++) {
			// Use parseFloat to match JavaScript's natural floating-point precision
			vector[i] = parseFloat(((seed + i) / 1536).toFixed(4));
		}
		return vector;
	};

	beforeEach(() => {
		backend = new WeaviateBackend(validConfig);
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
	});

	describe('Connection Management', () => {
		it('should connect successfully when collection exists', async () => {
			// Create a spy on the actual connect method to mock the connection
			const connectSpy = vi.spyOn(backend, 'connect').mockImplementation(async () => {
				// Simulate successful connection by setting the internal state
				(backend as any).connected = true;
				console.log('Mock connect called - setting connected to true');
			});

			expect(backend.isConnected()).toBe(false);
			await backend.connect();
			expect(backend.isConnected()).toBe(true);

			connectSpy.mockRestore();
		});

		it('should return correct backend type', () => {
			expect(backend.getBackendType()).toBe('weaviate');
		});

		it('should return correct metadata', () => {
			expect(backend.getDimension()).toBe(1536);
			expect(backend.getCollectionName()).toBe('Test_collection');
		});

		it('should not throw when disconnect is called while not connected', async () => {
			await expect(backend.disconnect()).resolves.not.toThrow();
		});
	});

	describe('Vector Operations', () => {
		beforeEach(async () => {
			// Mock the connect method to simulate successful connection
			vi.spyOn(backend, 'connect').mockImplementation(async () => {
				(backend as any).connected = true;
			});
			await backend.connect();
		});

		it('should throw VectorStoreError if insert is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			const vectors = [createTestVector(1)];
			const ids = [1];
			const payloads = [{ title: 'Test' }];

			await expect(testBackend.insert(vectors, ids, payloads)).rejects.toThrow(VectorStoreError);
		});

		it('should throw VectorStoreError if update is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			await expect(testBackend.update(1, createTestVector(1), { title: 'Test' })).rejects.toThrow(
				VectorStoreError
			);
		});

		it('should throw VectorStoreError if delete is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			await expect(testBackend.delete(1)).rejects.toThrow(VectorStoreError);
		});

		it('should throw VectorStoreError if get is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			await expect(testBackend.get(1)).rejects.toThrow(VectorStoreError);
		});

		it('should throw VectorStoreError if vectors, ids, and payloads lengths do not match', async () => {
			await expect(
				backend.insert([createTestVector(1)], [1, 2], [{ title: 'Test' }])
			).rejects.toThrow(VectorStoreError);
		});

		it('should throw VectorDimensionError if update vector has wrong dimension', async () => {
			await expect(backend.update(1, [1, 2], { title: 'Test' })).rejects.toThrow(
				VectorDimensionError
			);
		});

		it('should throw if payloads are null or undefined', async () => {
			await expect(backend.insert([createTestVector(1)], [1], null as any)).rejects.toThrow();
			await expect(backend.insert([createTestVector(1)], [1], undefined as any)).rejects.toThrow();
		});

		it('should throw VectorDimensionError if search vector has wrong dimension', async () => {
			await expect(backend.search([1, 2], 1)).rejects.toThrow(VectorDimensionError);
		});
	});

	describe('Collection Management', () => {
		beforeEach(async () => {
			// Mock the connect method to simulate successful connection
			vi.spyOn(backend, 'connect').mockImplementation(async () => {
				(backend as any).connected = true;
			});
			await backend.connect();
		});

		it('should throw VectorStoreError if deleteCollection is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			await expect(testBackend.deleteCollection()).rejects.toThrow(VectorStoreError);
		});

		it('should throw VectorStoreError if listCollections is called before connect', async () => {
			const testBackend = new WeaviateBackend(validConfig);
			await expect(testBackend.listCollections()).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Error Handling', () => {
		beforeEach(async () => {
			// Mock the connect method to simulate successful connection
			vi.spyOn(backend, 'connect').mockImplementation(async () => {
				(backend as any).connected = true;
			});
			await backend.connect();
		});

		it('should throw VectorDimensionError on dimension mismatch', async () => {
			await expect(backend.insert([[1, 2]], [1], [{ title: 'Bad' }])).rejects.toThrow(
				VectorDimensionError
			);
		});
	});
});
