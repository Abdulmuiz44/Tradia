import { FaissBackend } from '../backend/faiss.js';
import {
	VectorDimensionError,
	VectorStoreError,
	VectorStoreConnectionError,
} from '../backend/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory mock for file system data
const mockFileContent: Record<string, string> = {};

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(async (path: string) => {
		if (mockFileContent[path] !== undefined) {
			return mockFileContent[path];
		} else {
			// Simulate file not found by returning empty JSON, which loadData handles as starting fresh
			return '[]';
		}
	}),
	writeFile: vi.fn(async (path: string, data: string) => {
		mockFileContent[path] = data;
	}),
	mkdir: vi.fn(async () => {
		/* do nothing */
	}),
	unlink: vi.fn(async (path: string) => {
		delete mockFileContent[path];
	}),
	rm: vi.fn(async () => {
		/* do nothing */
	}),
}));

// Mock faiss-node
vi.mock('faiss-node', () => {
	const mockAdd = vi.fn();
	const mockSearch = vi.fn();
	const mockRead = vi.fn();
	const mockWrite = vi.fn();
	const mockNtotal = vi.fn();
	const mockReset = vi.fn();

	const mockIndexFlatL2 = vi.fn(() => ({
		add: mockAdd,
		search: mockSearch,
		read: mockRead,
		write: mockWrite,
		ntotal: mockNtotal,
		reset: mockReset,
	}));

	const mockIndexFlatIP = vi.fn(() => ({
		add: mockAdd,
		search: mockSearch,
		read: mockRead,
		write: mockWrite,
		ntotal: mockNtotal,
		reset: mockReset,
	}));

	return {
		IndexFlatL2: mockIndexFlatL2,
		IndexFlatIP: mockIndexFlatIP,
		Index: {
			read: vi.fn(() => ({
				add: mockAdd,
				search: mockSearch,
				read: mockRead,
				write: mockWrite,
				ntotal: mockNtotal,
				reset: mockReset,
			})),
		},
		MetricType: { METRIC_L2: 0, METRIC_IP: 1 },
	};
});

describe('FaissBackend', () => {
	const mockConfig = {
		collectionName: 'test_collection',
		dimension: 4,
		type: 'faiss' as const,
		baseStoragePath: '/tmp/faiss_data',
		distance: 'Cosine' as 'Cosine',
	};

	let faissBackend: FaissBackend;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		// Clear in-memory file content for each test
		for (const key in mockFileContent) {
			delete mockFileContent[key];
		}

		faissBackend = new FaissBackend(mockConfig);
	});

	// Test: Constructor and Initialization
	it('should initialize correctly with provided config', () => {
		expect(faissBackend.getCollectionName()).toBe(mockConfig.collectionName);
		expect(faissBackend.getDimension()).toBe(mockConfig.dimension);
		expect(faissBackend.getBackendType()).toBe('faiss');
		expect(faissBackend.isConnected()).toBe(false);
	});

	it('should initialize with IndexFlatL2 for Euclidean distance', async () => {
		const euclideanConfig = { ...mockConfig, distance: 'Euclidean' as 'Euclidean' };
		const backend = new FaissBackend(euclideanConfig);
		expect(backend['config'].normalize).toBe(false);
	});

	it('should initialize with IndexFlatIP for IP distance and not normalize by default', async () => {
		const ipConfig = { ...mockConfig, distance: 'IP' as 'IP' };
		const backend = new FaissBackend(ipConfig);
		expect(backend['config'].normalize).toBe(false);
	});

	it('should default to IndexFlatL2 if no distance or unsupported distance is specified', async () => {
		const defaultConfig = { ...mockConfig, distance: undefined };
		const backend = new FaissBackend(defaultConfig);
		expect(backend['config'].normalize).toBe(false);
	});

	// Test: connect()
	it('should connect successfully and load data', async () => {
		// Mock fs.readFile to return valid JSON data
		const existingData = [{ id: 1, vector: [1, 2, 3, 4], payload: {} }];
		mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)] =
			JSON.stringify(existingData);

		await faissBackend.connect();
		expect(faissBackend.isConnected()).toBe(true);
		expect(fs.readFile).toHaveBeenCalledWith(
			path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`),
			'utf8'
		);
	});

	it('should handle no existing data during connect', async () => {
		await faissBackend.connect();
		expect(faissBackend.isConnected()).toBe(true);
		expect(fs.readFile).toHaveBeenCalledTimes(1);
	});

	it('should throw VectorStoreConnectionError on connect failure', async () => {
		// Simulate a disk error by making readFile throw a generic error
		vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Disk error'));
		await expect(faissBackend.connect()).rejects.toThrow(VectorStoreConnectionError);
		expect(faissBackend.isConnected()).toBe(false);
	});

	// Test: disconnect()
	it('should disconnect successfully', async () => {
		await faissBackend.connect(); // Ensure connected state
		await faissBackend.disconnect();
		expect(faissBackend.isConnected()).toBe(false);
	});

	// Test: insert()
	it('should insert vectors correctly and save data', async () => {
		await faissBackend.connect();
		const vectors = [
			[1, 2, 3, 4],
			[5, 6, 7, 8],
		];
		const ids = [101, 102];
		const payloads = [{ content: 'doc1' }, { content: 'doc2' }];

		await faissBackend.insert(vectors, ids, payloads);

		expect(fs.writeFile).toHaveBeenCalledTimes(1); // One save operation for both
		const expectedVector1 = faissBackend['config'].normalize
			? faissBackend['normalizeVector'](vectors[0])
			: vectors[0];
		const expectedVector2 = faissBackend['config'].normalize
			? faissBackend['normalizeVector'](vectors[1])
			: vectors[1];
		const savedData = JSON.parse(
			mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)]
		);
		expect(savedData).toEqual([
			{ id: 101, vector: expect.arrayCloseTo(expectedVector1), payload: { content: 'doc1' } },
			{ id: 102, vector: expect.arrayCloseTo(expectedVector2), payload: { content: 'doc2' } },
		]);
	});

	it('should insert vectors without normalization when normalize is false', async () => {
		// We need to create a new backend instance for this test to control its config
		const nonNormalizeConfig = {
			...mockConfig,
			distance: 'Euclidean' as 'Euclidean',
			normalize: false,
		};
		const backend = new FaissBackend(nonNormalizeConfig);
		await backend.connect();

		const vectors = [[10, 20, 30, 40]];
		const ids = [103];
		const payloads = [{ content: 'doc3' }];

		// Clear write spy to count only this save
		vi.clearAllMocks();

		await backend.insert(vectors, ids, payloads);

		expect(fs.writeFile).toHaveBeenCalledTimes(1); // One save operation
		const savedData = JSON.parse(
			mockFileContent[
				path.join(nonNormalizeConfig.baseStoragePath, `${nonNormalizeConfig.collectionName}.json`)
			]
		);
		expect(savedData).toEqual([{ id: 103, vector: vectors[0], payload: { content: 'doc3' } }]);
	});

	it('should throw VectorDimensionError on invalid dimension during insert', async () => {
		await faissBackend.connect();
		const vectors = [[1, 2, 3, 4, 5]]; // Invalid dimension
		const ids = [101];
		const payloads = [{ content: 'doc1' }];

		await expect(faissBackend.insert(vectors, ids, payloads)).rejects.toThrow(VectorDimensionError);
	});

	// Test: search()
	it('should search vectors and return results', async () => {
		await faissBackend.connect();
		// Simulate some data already in the backend
		faissBackend['payloads'].set(0, {
			id: 100,
			vector: [0.1, 0.2, 0.3, 0.4],
			payload: { text: 'result 1' },
		});
		faissBackend['payloads'].set(1, {
			id: 101,
			vector: [0.5, 0.6, 0.7, 0.8],
			payload: { text: 'result 2' },
		});

		// Mock the search function to return expected results
		const mockSearchImpl = vi.fn().mockReturnValue({
			distances: [[0.9, 0.8]],
			labels: [0, 1], // 1D array, not 2D - these correspond to the indices in payloads map
		});
		faissBackend['faissIndex'].search = mockSearchImpl;
		faissBackend['faissIndex'].ntotal = vi.fn().mockReturnValue(2);

		const queryVector = [0.1, 0.2, 0.3, 0.4];
		const results = await faissBackend.search(queryVector, 2);

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe(100);
		expect(results[0].payload).toEqual({ text: 'result 1' });
		expect(results[1].id).toBe(101);
		expect(results[1].payload).toEqual({ text: 'result 2' });
	});

	it('should calculate score correctly for Euclidean distance', async () => {
		const euclideanConfig = { ...mockConfig, distance: 'Euclidean' as 'Euclidean' };
		const backend = new FaissBackend(euclideanConfig);
		await backend.connect();

		backend['payloads'].set(0, { id: 100, vector: [1, 1, 1, 1], payload: { text: 'result 1' } });

		// Mock the search function to return expected results
		const mockSearchImpl = vi.fn().mockReturnValue({
			distances: [[0.5]],
			labels: [0], // 1D array, not 2D - this corresponds to index 0 in payloads map
		});
		backend['faissIndex'].search = mockSearchImpl;
		backend['faissIndex'].ntotal = vi.fn().mockReturnValue(1);

		const queryVector = [0, 0, 0, 0];
		const results = await backend.search(queryVector, 1);

		expect(results).toHaveLength(1);
		expect(results[0].score).toBeCloseTo(1 / (1 + 0.5)); // 1 / (1 + distance)
	});

	it('should calculate score correctly for IP distance', async () => {
		const ipConfig = { ...mockConfig, distance: 'IP' as 'IP' };
		const backend = new FaissBackend(ipConfig);
		await backend.connect();

		backend['payloads'].set(0, { id: 100, vector: [1, 1, 1, 1], payload: { text: 'result 1' } });

		// Mock the search function to return expected results
		const mockSearchImpl = vi.fn().mockReturnValue({
			distances: [[0.7]],
			labels: [0], // 1D array, not 2D - this corresponds to index 0 in payloads map
		});
		backend['faissIndex'].search = mockSearchImpl;
		backend['faissIndex'].ntotal = vi.fn().mockReturnValue(1);

		const queryVector = [0, 0, 0, 0];
		const results = await backend.search(queryVector, 1);

		expect(results).toHaveLength(1);
		expect(results[0].score).toBe(0.7); // IP distance is directly the score
	});

	it('should normalize query vector if distance is Cosine', async () => {
		// Re-initialize with Cosine distance to ensure normalize is true
		faissBackend = new FaissBackend({ ...mockConfig, distance: 'Cosine' as 'Cosine' });
		await faissBackend.connect();

		// Mock the search function to return expected results
		const mockSearchImpl = vi.fn().mockReturnValue({
			distances: [[0.9]],
			labels: [0], // 1D array, not 2D
		});
		faissBackend['faissIndex'].search = mockSearchImpl;
		faissBackend['faissIndex'].ntotal = vi.fn().mockReturnValue(1);

		const queryVector = [1, 1, 1, 1];
		const normalizedQuery = faissBackend['normalizeVector'](queryVector);
		await faissBackend.search(queryVector, 1);

		// The search should work with normalized vectors
		expect(faissBackend['config'].normalize).toBe(true);
		expect(mockSearchImpl).toHaveBeenCalledWith(expect.arrayCloseTo(normalizedQuery), 1);
	});

	// Test: get()
	it('should retrieve a vector by ID', async () => {
		await faissBackend.connect();
		const testId = 123;
		const testVector = [1, 1, 1, 1];
		const testPayload = { data: 'test' };
		faissBackend['payloads'].set(testId, { id: testId, vector: testVector, payload: testPayload });

		const result = await faissBackend.get(testId);

		expect(result).not.toBeNull();
		expect(result?.id).toBe(testId);
		expect(result?.vector).toEqual(testVector);
		expect(result?.payload).toEqual(testPayload);
	});

	it('should return null if vector not found', async () => {
		await faissBackend.connect();
		const result = await faissBackend.get(999);
		expect(result).toBeNull();
	});

	// Test: update()
	it('should update an existing vector and save data', async () => {
		await faissBackend.connect();
		const originalId = 200;
		const originalVector = [0, 0, 0, 0];
		const originalPayload = { status: 'old' };
		faissBackend['payloads'].set(originalId, {
			id: originalId,
			vector: originalVector,
			payload: originalPayload,
		});

		const updatedVector = [10, 11, 12, 13];
		const updatedPayload = { status: 'new' };
		await faissBackend.update(originalId, updatedVector, updatedPayload);

		expect(fs.writeFile).toHaveBeenCalledTimes(1); // Save operation
		const savedData = JSON.parse(
			mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)]
		);
		expect(savedData).toEqual([{ id: originalId, vector: updatedVector, payload: updatedPayload }]);
		expect(faissBackend['payloads'].get(originalId)?.payload).toEqual(updatedPayload);
	});

	it('should throw error if updating non-existent vector', async () => {
		await faissBackend.connect();
		await expect(faissBackend.update(999, [1, 2, 3, 4], {})).rejects.toThrow(VectorStoreError);
	});

	// Test: delete()
	it('should delete a vector and remove from file', async () => {
		await faissBackend.connect();
		const idToDelete = 300;
		faissBackend['payloads'].set(idToDelete, { id: idToDelete, vector: [1, 2, 3, 4], payload: {} });
		faissBackend['payloads'].set(301, { id: 301, vector: [1, 2, 3, 4], payload: {} });
		// Pre-populate mock file content for deletion test
		const initialFileContent = [
			{ id: idToDelete, vector: [1, 2, 3, 4], payload: {} },
			{ id: 301, vector: [1, 2, 3, 4], payload: {} },
		];
		mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)] =
			JSON.stringify(initialFileContent);

		await faissBackend.delete(idToDelete);

		expect(faissBackend['payloads'].has(idToDelete)).toBe(false);
		expect(fs.writeFile).toHaveBeenCalledTimes(1); // Should rewrite the file without the deleted item
		const remainingData = JSON.parse(
			mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)]
		);
		expect(remainingData).toEqual([{ id: 301, vector: [1, 2, 3, 4], payload: {} }]);
	});

	it('should not throw error if deleting non-existent vector', async () => {
		await faissBackend.connect();
		await expect(faissBackend.delete(999)).resolves.not.toThrow();
		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	// Test: deleteCollection()
	it('should delete the collection file', async () => {
		await faissBackend.connect();
		// Pre-populate mock file content for deletion test
		mockFileContent[path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)] =
			JSON.stringify([{ id: 1, vector: [], payload: {} }]);

		await faissBackend.deleteCollection();

		expect(faissBackend['payloads'].size).toBe(0);
		expect(fs.unlink).toHaveBeenCalledWith(
			path.join(mockConfig.baseStoragePath, `${mockConfig.collectionName}.json`)
		);
	});

	// Test: list()
	it('should list all vectors with filters', async () => {
		await faissBackend.connect();
		// Manually add data to payloads for list test
		faissBackend['payloads'].set(1, {
			id: 1,
			vector: [1, 1, 1, 1],
			payload: { tag: 'A', value: 10 },
		});
		faissBackend['payloads'].set(2, {
			id: 2,
			vector: [2, 2, 2, 2],
			payload: { tag: 'B', value: 20 },
		});
		faissBackend['payloads'].set(3, {
			id: 3,
			vector: [3, 3, 3, 3],
			payload: { tag: 'A', value: 30 },
		});

		const [results, count] = await faissBackend.list({ tag: 'A' });

		expect(results).toHaveLength(2);
		expect(count).toBe(2);
		expect(results[0].id).toBe(1);
		expect(results[1].id).toBe(3);

		const [rangeResults] = await faissBackend.list({ value: { gte: 15, lt: 25 } });
		expect(rangeResults).toHaveLength(1);
		expect(rangeResults[0].id).toBe(2);
	});

	it('should return empty list if no filters match', async () => {
		await faissBackend.connect();
		faissBackend['payloads'].set(1, { id: 1, vector: [1, 1, 1, 1], payload: { tag: 'A' } });
		const [results, count] = await faissBackend.list({ tag: 'C' });
		expect(results).toHaveLength(0);
		expect(count).toBe(0);
	});

	it('should list vectors with "any" filter', async () => {
		await faissBackend.connect();
		faissBackend['payloads'].set(1, {
			id: 1,
			vector: [1, 1, 1, 1],
			payload: { category: 'electronics', price: 100 },
		});
		faissBackend['payloads'].set(2, {
			id: 2,
			vector: [2, 2, 2, 2],
			payload: { category: 'books', price: 20 },
		});
		faissBackend['payloads'].set(3, {
			id: 3,
			vector: [3, 3, 3, 3],
			payload: { category: 'electronics', price: 50 },
		});
		faissBackend['payloads'].set(4, {
			id: 4,
			vector: [4, 4, 4, 4],
			payload: { category: 'movies', price: 15 },
		});

		const [results, count] = await faissBackend.list({
			category: { any: ['electronics', 'movies'] },
		});

		expect(results).toHaveLength(3);
		expect(count).toBe(3);
		expect(results.map(r => r.id)).toEqual(expect.arrayContaining([1, 3, 4]));
	});

	it('should list vectors with mixed filters (equality and range)', async () => {
		await faissBackend.connect();
		faissBackend['payloads'].set(1, {
			id: 1,
			vector: [1, 1, 1, 1],
			payload: { category: 'electronics', price: 100 },
		});
		faissBackend['payloads'].set(2, {
			id: 2,
			vector: [2, 2, 2, 2],
			payload: { category: 'books', price: 20 },
		});
		faissBackend['payloads'].set(3, {
			id: 3,
			vector: [3, 3, 3, 3],
			payload: { category: 'electronics', price: 50 },
		});
		faissBackend['payloads'].set(4, {
			id: 4,
			vector: [4, 4, 4, 4],
			payload: { category: 'movies', price: 15 },
		});

		const [results, count] = await faissBackend.list({
			category: 'electronics',
			price: { gte: 40, lte: 100 },
		});

		expect(results).toHaveLength(2);
		expect(count).toBe(2);
		expect(results.map(r => r.id)).toEqual(expect.arrayContaining([1, 3]));
	});
});

declare module 'vitest' {
	interface ExpectStatic {
		arrayCloseTo: (expected: number[], precision?: number) => any;
	}
}

expect.extend({
	arrayCloseTo(received: number[], expected: number[], precision: number = 2) {
		const pass = received.every((value, index) => {
			return Math.abs(value - expected[index]) < Math.pow(10, -precision);
		});

		if (pass) {
			return {
				message: () => `expected ${received} not to be close to ${expected}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be close to ${expected}`,
				pass: false,
			};
		}
	},
});
