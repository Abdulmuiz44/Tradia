import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PineconeBackend } from '../backend/pinecone.js';
import {
	VectorStoreError,
	VectorStoreConnectionError,
	VectorDimensionError,
} from '../backend/types.js';
import type { PineconeBackendConfig, SearchFilters } from '../backend/types.js';

// Mock Pinecone client
const mockIndex = {
	upsert: vi.fn(),
	query: vi.fn(),
	fetch: vi.fn(),
	delete: vi.fn(),
};

const mockPineconeClient = {
	listIndexes: vi.fn(),
	createIndex: vi.fn(),
	index: vi.fn().mockReturnValue(mockIndex),
};

vi.mock('@pinecone-database/pinecone', () => ({
	Pinecone: vi.fn().mockImplementation(() => mockPineconeClient),
}));

describe('PineconeBackend', () => {
	let backend: PineconeBackend;
	let config: PineconeBackendConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		config = {
			apiKey: 'test-api-key',
			collectionName: 'test-index',
			dimension: 384,
			metric: 'cosine',
		};

		backend = new PineconeBackend(config);
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
	});

	describe('Constructor', () => {
		it('should initialize with provided config', () => {
			expect(backend.getDimension()).toBe(384);
			expect(backend.getCollectionName()).toBe('test-index');
			expect(backend.getBackendType()).toBe('pinecone');
			expect(backend.isConnected()).toBe(false);
		});
	});

	describe('Connection Management', () => {
		it('should connect successfully when index exists', async () => {
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [{ name: 'test-index' }],
			});

			await backend.connect();

			expect(backend.isConnected()).toBe(true);
			expect(mockPineconeClient.listIndexes).toHaveBeenCalled();
			expect(mockPineconeClient.index).toHaveBeenCalledWith('test-index');
		});

		it('should create index if it does not exist', async () => {
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [],
			});
			mockPineconeClient.createIndex.mockResolvedValue(undefined);

			await backend.connect();

			expect(backend.isConnected()).toBe(true);
			expect(mockPineconeClient.createIndex).toHaveBeenCalledWith({
				name: 'test-index',
				dimension: 384,
				metric: 'cosine',
				spec: {
					serverless: {
						cloud: 'aws',
						region: 'us-east-1',
					},
				},
			});
		});

		it('should handle connection errors gracefully', async () => {
			const error = new Error('Connection failed');
			mockPineconeClient.listIndexes.mockRejectedValue(error);

			await expect(backend.connect()).rejects.toThrow(VectorStoreConnectionError);
		});

		it('should handle 404 errors (index not found)', async () => {
			const error = new Error('Index not found (404)');
			mockPineconeClient.listIndexes.mockRejectedValue(error);

			await expect(backend.connect()).rejects.toThrow(
				/Pinecone index 'test-index' not found \(HTTP 404\)/
			);
		});

		it('should handle authentication errors', async () => {
			const error = new Error('Unauthorized (401)');
			mockPineconeClient.listIndexes.mockRejectedValue(error);

			await expect(backend.connect()).rejects.toThrow(/Pinecone authentication failed/);
		});

		it('should handle rate limiting errors', async () => {
			const error = new Error('Rate limit exceeded (429)');
			mockPineconeClient.listIndexes.mockRejectedValue(error);

			await expect(backend.connect()).rejects.toThrow(/Pinecone rate limit exceeded/);
		});

		it('should disconnect successfully', async () => {
			// First connect
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [{ name: 'test-index' }],
			});
			await backend.connect();
			expect(backend.isConnected()).toBe(true);

			// Then disconnect
			await backend.disconnect();
			expect(backend.isConnected()).toBe(false);
		});

		it('should handle disconnect when not connected', async () => {
			expect(backend.isConnected()).toBe(false);
			await expect(backend.disconnect()).resolves.not.toThrow();
		});

		it('should not reconnect if already connected', async () => {
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [{ name: 'test-index' }],
			});

			await backend.connect();
			expect(mockPineconeClient.listIndexes).toHaveBeenCalledTimes(1);

			await backend.connect(); // Second call
			expect(mockPineconeClient.listIndexes).toHaveBeenCalledTimes(1); // Should not be called again
		});
	});

	describe('Vector Operations', () => {
		beforeEach(async () => {
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [{ name: 'test-index' }],
			});
			await backend.connect();
		});

		describe('Insert', () => {
			it('should insert vectors successfully', async () => {
				// Create test vectors with correct dimension (384)
				const testVector1 = new Array(384).fill(0);
				testVector1[0] = 1; // [1, 0, 0, ...]
				const testVector2 = new Array(384).fill(0);
				testVector2[1] = 1; // [0, 1, 0, ...]

				const vectors = [testVector1, testVector2];
				const ids = [1, 2];
				const payloads = [{ label: 'A' }, { label: 'B' }];

				mockIndex.upsert.mockResolvedValue(undefined);

				await backend.insert(vectors, ids, payloads);

				expect(mockIndex.upsert).toHaveBeenCalledWith([
					{ id: '1', values: testVector1, metadata: { label: 'A' } },
					{ id: '2', values: testVector2, metadata: { label: 'B' } },
				]);
			});

			it('should validate input dimensions', async () => {
				const invalidVectors = [[1, 0, 0]]; // Wrong dimension (3 instead of 384)
				const ids = [1];
				const payloads = [{}];

				await expect(backend.insert(invalidVectors, ids, payloads)).rejects.toThrow(
					VectorDimensionError
				);
			});

			it('should validate input array lengths', async () => {
				const testVector = new Array(384).fill(0);
				const vectors = [testVector];
				const ids = [1, 2]; // Different length
				const payloads = [{}];

				await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(
					/must have the same length/
				);
			});

			it('should handle empty input arrays', async () => {
				await expect(backend.insert([], [], [])).resolves.not.toThrow();
				expect(mockIndex.upsert).not.toHaveBeenCalled();
			});

			it('should handle insert errors', async () => {
				const testVector = new Array(384).fill(0);
				const vectors = [testVector];
				const ids = [1];
				const payloads = [{}];

				mockIndex.upsert.mockRejectedValue(new Error('Insert failed'));

				await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(VectorStoreError);
			});

			it('should throw error when not connected', async () => {
				const disconnectedBackend = new PineconeBackend(config);
				const testVector = new Array(384).fill(0);

				await expect(disconnectedBackend.insert([testVector], [1], [{}])).rejects.toThrow(
					/not connected/
				);
			});
		});

		describe('Search', () => {
			it('should search vectors successfully', async () => {
				const testQuery = new Array(384).fill(0);
				testQuery[0] = 1; // [1, 0, 0, ...]

				const testVector1 = new Array(384).fill(0);
				testVector1[0] = 1;
				const testVector2 = new Array(384).fill(0);
				testVector2[0] = 0.9;
				testVector2[1] = 0.1;

				const limit = 5;

				mockIndex.query.mockResolvedValue({
					matches: [
						{
							id: '1',
							score: 0.95,
							metadata: { label: 'A' },
							values: testVector1,
						},
						{
							id: '2',
							score: 0.85,
							metadata: { label: 'B' },
							values: testVector2,
						},
					],
				});

				const results = await backend.search(testQuery, limit);

				expect(mockIndex.query).toHaveBeenCalledWith({
					vector: testQuery,
					topK: limit,
					includeMetadata: true,
					includeValues: false,
				});

				expect(results).toHaveLength(2);
				expect(results[0]).toEqual({
					id: 1,
					score: 0.95,
					payload: { label: 'A' },
					vector: testVector1,
				});
			});

			it('should search with filters', async () => {
				const testQuery = new Array(384).fill(0);
				testQuery[0] = 1;
				const filters: SearchFilters = { category: 'test' };

				mockIndex.query.mockResolvedValue({ matches: [] });

				await backend.search(testQuery, 5, filters);

				expect(mockIndex.query).toHaveBeenCalledWith({
					vector: testQuery,
					topK: 5,
					includeMetadata: true,
					includeValues: false,
					filter: { category: { $eq: 'test' } },
				});
			});

			it('should handle range filters', async () => {
				const testQuery = new Array(384).fill(0);
				testQuery[0] = 1;
				const filters: SearchFilters = {
					timestamp: { gte: 1000, lte: 2000 },
				};

				mockIndex.query.mockResolvedValue({ matches: [] });

				await backend.search(testQuery, 5, filters);

				expect(mockIndex.query).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: {
							timestamp: { $gte: 1000, $lte: 2000 },
						},
					})
				);
			});

			it('should handle array filters', async () => {
				const testQuery = new Array(384).fill(0);
				testQuery[0] = 1;
				const filters: SearchFilters = {
					tags: { any: ['tag1', 'tag2'] },
				};

				mockIndex.query.mockResolvedValue({ matches: [] });

				await backend.search(testQuery, 5, filters);

				expect(mockIndex.query).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: {
							tags: { $in: ['tag1', 'tag2'] },
						},
					})
				);
			});

			it('should validate search query dimension', async () => {
				const invalidQuery = [1, 0, 0]; // Wrong dimension (3 instead of 384)

				await expect(backend.search(invalidQuery, 5)).rejects.toThrow(VectorDimensionError);
			});

			it('should validate search limit', async () => {
				const testQuery = new Array(384).fill(0);

				await expect(backend.search(testQuery, 0)).rejects.toThrow(/Search limit must be positive/);
			});

			it('should limit search results to Pinecone maximum', async () => {
				const testQuery = new Array(384).fill(0);
				mockIndex.query.mockResolvedValue({ matches: [] });

				await backend.search(testQuery, 20000); // Exceeds Pinecone limit

				expect(mockIndex.query).toHaveBeenCalledWith(
					expect.objectContaining({
						topK: 10000, // Pinecone maximum
					})
				);
			});

			it('should handle search errors', async () => {
				const testQuery = new Array(384).fill(0);
				mockIndex.query.mockRejectedValue(new Error('Search failed'));

				await expect(backend.search(testQuery, 5)).rejects.toThrow(VectorStoreError);
			});
		});

		describe('Get', () => {
			it('should get vector by ID successfully', async () => {
				const vectorId = 1;
				const testVector = new Array(384).fill(0);
				testVector[0] = 1;

				mockIndex.fetch.mockResolvedValue({
					vectors: {
						'1': {
							values: testVector,
							metadata: { label: 'A' },
						},
					},
				});

				const result = await backend.get(vectorId);

				expect(mockIndex.fetch).toHaveBeenCalledWith({ ids: ['1'] });

				expect(result).toEqual({
					id: 1,
					vector: testVector,
					payload: { label: 'A' },
					score: 1.0,
				});
			});

			it('should return null for non-existent vector', async () => {
				mockIndex.fetch.mockResolvedValue({
					vectors: {},
				});

				const result = await backend.get(999);

				expect(result).toBeNull();
			});

			it('should handle get errors', async () => {
				mockIndex.fetch.mockRejectedValue(new Error('Fetch failed'));

				await expect(backend.get(1)).rejects.toThrow(VectorStoreError);
			});

			it('should validate vector ID', async () => {
				await expect(backend.get(null as any)).rejects.toThrow(VectorStoreError);
				await expect(backend.get(undefined as any)).rejects.toThrow(VectorStoreError);
				await expect(backend.get(1.5)).rejects.toThrow(VectorStoreError);
			});
		});

		describe('Update', () => {
			it('should update vector successfully', async () => {
				const vectorId = 1;
				const testVector = new Array(384).fill(0);
				testVector[0] = 1;
				const payload = { label: 'Updated' };

				mockIndex.upsert.mockResolvedValue(undefined);

				await backend.update(vectorId, testVector, payload);

				expect(mockIndex.upsert).toHaveBeenCalledWith([
					{
						id: '1',
						values: testVector,
						metadata: payload,
					},
				]);
			});

			it('should validate update vector dimension', async () => {
				const invalidVector = [1, 0, 0]; // Wrong dimension (3 instead of 384)

				await expect(backend.update(1, invalidVector, {})).rejects.toThrow(VectorDimensionError);
			});

			it('should handle update errors', async () => {
				const testVector = new Array(384).fill(0);
				mockIndex.upsert.mockRejectedValue(new Error('Update failed'));

				await expect(backend.update(1, testVector, {})).rejects.toThrow(VectorStoreError);
			});
		});

		describe('Delete', () => {
			it('should delete vector successfully', async () => {
				const vectorId = 1;

				mockIndex.delete.mockResolvedValue(undefined);

				await backend.delete(vectorId);

				expect(mockIndex.delete).toHaveBeenCalledWith({ ids: ['1'] });
			});

			it('should handle delete errors', async () => {
				mockIndex.delete.mockRejectedValue(new Error('Delete failed'));

				await expect(backend.delete(1)).rejects.toThrow(VectorStoreError);
			});

			it('should validate delete vector ID', async () => {
				await expect(backend.delete(null as any)).rejects.toThrow(VectorStoreError);
			});
		});

		describe('Delete Collection', () => {
			it('should delete all vectors', async () => {
				mockIndex.delete.mockResolvedValue(undefined);

				await backend.deleteCollection();

				expect(mockIndex.delete).toHaveBeenCalledWith({
					deleteAll: true,
				});
			});

			it('should handle delete collection errors', async () => {
				mockIndex.delete.mockRejectedValue(new Error('Delete collection failed'));

				await expect(backend.deleteCollection()).rejects.toThrow(VectorStoreError);
			});
		});

		describe('List Operation', () => {
			it('should throw error for list operation', async () => {
				await expect(backend.list()).rejects.toThrow(
					/Pinecone does not support listing all vectors directly/
				);
			});
		});
	});

	describe('Error Handling', () => {
		it('should throw error when operations called without connection', async () => {
			const disconnectedBackend = new PineconeBackend(config);
			const testVector = new Array(384).fill(0);

			await expect(disconnectedBackend.search(testVector, 5)).rejects.toThrow(/not connected/);
			await expect(disconnectedBackend.get(1)).rejects.toThrow(/not connected/);
			await expect(disconnectedBackend.update(1, testVector, {})).rejects.toThrow(/not connected/);
			await expect(disconnectedBackend.delete(1)).rejects.toThrow(/not connected/);
			await expect(disconnectedBackend.deleteCollection()).rejects.toThrow(/not connected/);
		});
	});

	describe('Filter Conversion', () => {
		beforeEach(async () => {
			mockPineconeClient.listIndexes.mockResolvedValue({
				indexes: [{ name: 'test-index' }],
			});
			await backend.connect();
		});

		it('should handle empty filters', async () => {
			const testQuery = new Array(384).fill(0);
			mockIndex.query.mockResolvedValue({ matches: [] });

			await backend.search(testQuery, 5, {});

			expect(mockIndex.query).toHaveBeenCalledWith(
				expect.not.objectContaining({
					filter: expect.anything(),
				})
			);
		});

		it('should handle null and undefined filter values', async () => {
			const testQuery = new Array(384).fill(0);
			const filters = {
				nullValue: null,
				undefinedValue: undefined,
				validValue: 'test',
			};

			mockIndex.query.mockResolvedValue({ matches: [] });

			await backend.search(testQuery, 5, filters);

			expect(mockIndex.query).toHaveBeenCalledWith(
				expect.objectContaining({
					filter: {
						validValue: { $eq: 'test' },
					},
				})
			);
		});
	});
});
