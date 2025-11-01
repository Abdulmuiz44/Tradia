/**
 * In-Memory Vector Storage Backend Tests
 *
 * Tests for the in-memory vector storage backend implementation.
 * Verifies vector operations, similarity search, and metadata handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryBackend } from '../backend/in-memory.js';
import { VectorStoreError, VectorDimensionError } from '../backend/types.js';
import { BACKEND_TYPES } from '../constants.js';

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

describe('InMemoryBackend', () => {
	let backend: InMemoryBackend;

	const validConfig = {
		type: 'in-memory' as const,
		collectionName: 'test_collection',
		dimension: 3,
		maxVectors: 100,
	};

	beforeEach(() => {
		backend = new InMemoryBackend(validConfig);
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
	});

	describe('Connection Management', () => {
		it('should connect successfully', async () => {
			expect(backend.isConnected()).toBe(false);
			await backend.connect();
			expect(backend.isConnected()).toBe(true);
		});

		it('should handle multiple connect calls', async () => {
			await backend.connect();
			await backend.connect(); // Should not throw
			expect(backend.isConnected()).toBe(true);
		});

		it('should disconnect successfully', async () => {
			await backend.connect();
			await backend.disconnect();
			expect(backend.isConnected()).toBe(false);
		});

		it('should clear data on disconnect', async () => {
			await backend.connect();
			await backend.insert([[1, 2, 3]], [123], [{ data: 'test' }]);
			await backend.disconnect();
			await backend.connect();
			const results = await backend.list();
			expect(results[0]).toHaveLength(0);
		});

		it('should return correct backend type', () => {
			expect(backend.getBackendType()).toBe(BACKEND_TYPES.IN_MEMORY);
		});

		it('should return correct metadata', () => {
			expect(backend.getDimension()).toBe(3);
			expect(backend.getCollectionName()).toBe('test_collection');
		});
	});

	describe('Vector Operations', () => {
		beforeEach(async () => {
			await backend.connect();
		});

		it('should insert and retrieve vectors', async () => {
			const vectors = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const ids = [1, 2];
			const payloads = [{ title: 'First' }, { title: 'Second' }];

			await backend.insert(vectors, ids, payloads);

			const result1 = await backend.get(1);
			expect(result1).toBeTruthy();
			expect(result1!.id).toBe(1);
			expect(result1!.vector).toEqual([1, 2, 3]);
			expect(result1!.payload).toEqual({ title: 'First' });

			const result2 = await backend.get(2);
			expect(result2).toBeTruthy();
			expect(result2!.id).toBe(2);
			expect(result2!.vector).toEqual([4, 5, 6]);
			expect(result2!.payload).toEqual({ title: 'Second' });
		});

		it('should return null for non-existent vectors', async () => {
			const result = await backend.get(999);
			expect(result).toBeNull();
		});

		it('should validate vector dimensions', async () => {
			const wrongDimVector = [[1, 2]]; // Should be 3 dimensions
			const ids = [1];
			const payloads = [{}];

			await expect(backend.insert(wrongDimVector, ids, payloads)).rejects.toThrow(
				VectorDimensionError
			);
		});

		it('should require equal array lengths', async () => {
			const vectors = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const ids = [1]; // Mismatched length
			const payloads = [{ title: 'First' }, { title: 'Second' }];

			await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(VectorStoreError);
		});

		it('should update vectors', async () => {
			await backend.insert([[1, 2, 3]], [1], [{ title: 'Original' }]);

			await backend.update(1, [7, 8, 9], { title: 'Updated' });

			const result = await backend.get(1);
			expect(result!.vector).toEqual([7, 8, 9]);
			expect(result!.payload).toEqual({ title: 'Updated' });
		});

		it('should delete vectors', async () => {
			await backend.insert([[1, 2, 3]], [1], [{ title: 'Test' }]);

			const beforeDelete = await backend.get(1);
			expect(beforeDelete).toBeTruthy();

			await backend.delete(1);

			const afterDelete = await backend.get(1);
			expect(afterDelete).toBeNull();
		});

		it('should delete entire collection', async () => {
			await backend.insert(
				[
					[1, 2, 3],
					[4, 5, 6],
				],
				[1, 2],
				[{ title: 'First' }, { title: 'Second' }]
			);

			const [beforeDelete] = await backend.list();
			expect(beforeDelete).toHaveLength(2);

			await backend.deleteCollection();

			const [afterDelete] = await backend.list();
			expect(afterDelete).toHaveLength(0);
		});

		it('should throw error when not connected', async () => {
			await backend.disconnect();

			await expect(backend.get(1)).rejects.toThrow(VectorStoreError);
			await expect(backend.insert([[1, 2, 3]], [1], [{}])).rejects.toThrow(VectorStoreError);
			await expect(backend.search([1, 2, 3])).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Similarity Search', () => {
		beforeEach(async () => {
			await backend.connect();

			// Insert test vectors with known similarities
			const vectors = [
				[1, 0, 0], // Vector A
				[0.9, 0.1, 0], // Similar to A
				[0, 1, 0], // Vector B
				[0, 0.9, 0.1], // Similar to B
				[0, 0, 1], // Vector C
			];
			const ids = [1, 2, 3, 4, 5];
			const payloads = [
				{ category: 'A' },
				{ category: 'A' },
				{ category: 'B' },
				{ category: 'B' },
				{ category: 'C' },
			];

			await backend.insert(vectors, ids, payloads);
		});

		it('should return most similar vectors', async () => {
			const query = [1, 0, 0]; // Should be most similar to ID 1
			const results = await backend.search(query, 2);

			expect(results).toHaveLength(2);
			expect(results[0]?.id).toBe(1);
			expect(results[0]?.score).toBeCloseTo(1.0, 5); // Perfect match
			expect(results[1]?.id).toBe(2);
			expect(results[1]?.score).toBeGreaterThan(0.9);
		});

		it('should respect limit parameter', async () => {
			const query = [1, 0, 0];
			const results = await backend.search(query, 1);

			expect(results).toHaveLength(1);
			expect(results[0]?.id).toBe(1);
		});

		it('should filter by metadata', async () => {
			const query = [0, 1, 0]; // Should match B category
			const results = await backend.search(query, 5, { category: 'B' });

			expect(results).toHaveLength(2);
			expect(results.every(r => r.payload.category === 'B')).toBe(true);
			expect(results[0]?.id).toBe(3);
			expect(results[1]?.id).toBe(4);
		});

		it('should handle empty filter results', async () => {
			const query = [1, 0, 0];
			const results = await backend.search(query, 5, { category: 'NONEXISTENT' });

			expect(results).toHaveLength(0);
		});

		it('should validate query vector dimension', async () => {
			const wrongDimQuery = [1, 0]; // Should be 3 dimensions

			await expect(backend.search(wrongDimQuery)).rejects.toThrow(VectorDimensionError);
		});

		it('should handle empty collection', async () => {
			await backend.deleteCollection();

			const query = [1, 0, 0];
			const results = await backend.search(query, 5);

			expect(results).toHaveLength(0);
		});
	});

	describe('List Operations', () => {
		beforeEach(async () => {
			await backend.connect();

			// Insert test data
			const vectors = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
				[1, 1, 0],
				[1, 0, 1],
			];
			const ids = [10, 20, 30, 40, 50];
			const payloads = [
				{ type: 'A', value: 1 },
				{ type: 'B', value: 2 },
				{ type: 'A', value: 3 },
				{ type: 'C', value: 4 },
				{ type: 'A', value: 5 },
			];

			await backend.insert(vectors, ids, payloads);
		});

		it('should list all vectors without filters', async () => {
			const [results, total] = await backend.list();

			expect(results).toHaveLength(5);
			expect(total).toBe(5);
			expect(results.map(r => r.id).sort()).toEqual([10, 20, 30, 40, 50]);
		});

		it('should filter by metadata', async () => {
			const [results, total] = await backend.list({ type: 'A' });

			expect(results).toHaveLength(3);
			expect(total).toBe(3);
			expect(results.every(r => r.payload.type === 'A')).toBe(true);
		});

		it('should respect limit parameter', async () => {
			const [results, total] = await backend.list(undefined, 2);

			expect(results).toHaveLength(2);
			expect(total).toBe(5); // Total count should still be accurate
		});

		it('should combine filters and limits', async () => {
			const [results, total] = await backend.list({ type: 'A' }, 2);

			expect(results).toHaveLength(2);
			expect(total).toBe(3); // Total A type vectors
			expect(results.every(r => r.payload.type === 'A')).toBe(true);
		});
	});

	describe('Memory Limits', () => {
		it('should enforce maximum vector limit', async () => {
			const smallConfig = {
				type: 'in-memory' as const,
				collectionName: 'test',
				dimension: 3,
				maxVectors: 2,
			};

			const smallBackend = new InMemoryBackend(smallConfig);
			await smallBackend.connect();

			try {
				// Insert up to limit
				await smallBackend.insert(
					[
						[1, 2, 3],
						[4, 5, 6],
					],
					[1, 2],
					[{}, {}]
				);

				// Try to insert beyond limit
				await expect(smallBackend.insert([[7, 8, 9]], [3], [{}])).rejects.toThrow(VectorStoreError);
			} finally {
				await smallBackend.disconnect();
			}
		});
	});

	describe('Data Isolation', () => {
		beforeEach(async () => {
			await backend.connect();
		});

		it('should clone payloads to prevent reference issues', async () => {
			const payload = { nested: { value: 42 } };
			await backend.insert([[1, 2, 3]], [100], [payload]);

			// Modify original
			payload.nested.value = 100;

			// Retrieved payload should be unchanged
			const result = await backend.get(100);
			expect(result!.payload.nested.value).toBe(42);
		});

		it('should clone vectors to prevent modification', async () => {
			const vector = [1, 2, 3];
			await backend.insert([vector], [200], [{}]);

			// Modify original
			vector[0] = 999;

			// Retrieved vector should be unchanged
			const result = await backend.get(200);
			expect(result!.vector).toEqual([1, 2, 3]);
		});
	});
});
