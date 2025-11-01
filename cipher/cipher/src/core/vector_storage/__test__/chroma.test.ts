/**
 * ChromaDB Backend Tests
 *
 * Tests for the ChromaDB vector storage backend implementation.
 * Verifies vector operations, similarity search, metadata handling, and payload adapter integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChromaBackend } from '../backend/chroma.js';
import { DefaultChromaPayloadAdapter } from '../backend/chroma-payload-adapter.js';
import { VectorStoreError, VectorDimensionError } from '../backend/types.js';
import type { ChromaBackendConfig } from '../backend/types.js';

// Mock ChromaDB client
const mockCollection = {
	upsert: vi.fn(),
	query: vi.fn(),
	get: vi.fn(),
	delete: vi.fn(),
};

const mockClient = {
	getCollection: vi.fn(),
	createCollection: vi.fn(),
	deleteCollection: vi.fn(),
};

vi.mock('chromadb', () => ({
	ChromaClient: vi.fn(() => mockClient),
}));

// Mock the logger to reduce noise in tests
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

describe('ChromaBackend', () => {
	let backend: ChromaBackend;
	let config: ChromaBackendConfig;

	beforeEach(() => {
		config = {
			type: 'chroma',
			url: 'http://localhost:8000',
			collectionName: 'test_collection',
			dimension: 3,
		};

		// Reset mocks
		vi.clearAllMocks();

		// Setup default mock behavior
		mockClient.getCollection.mockResolvedValue(mockCollection);
		mockClient.createCollection.mockResolvedValue(mockCollection);
		mockCollection.upsert.mockResolvedValue({});
		mockCollection.query.mockResolvedValue({
			ids: [['1', '2']],
			distances: [[0.1, 0.2]],
			metadatas: [[{ text: 'hello' }, { text: 'world' }]],
		});
		mockCollection.get.mockResolvedValue({
			ids: ['1'],
			embeddings: [[1, 2, 3]],
			metadatas: [{ text: 'hello' }],
		});
		mockCollection.delete.mockResolvedValue({});

		backend = new ChromaBackend(config);
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
	});

	describe('Connection Management', () => {
		it('should connect successfully when collection exists', async () => {
			expect(backend.isConnected()).toBe(false);

			await backend.connect();

			expect(backend.isConnected()).toBe(true);
			expect(mockClient.getCollection).toHaveBeenCalledWith({
				name: 'test_collection',
				embeddingFunction: null,
			});
		});

		it('should create collection if it does not exist', async () => {
			mockClient.getCollection.mockRejectedValueOnce(new Error('Collection not found'));

			await backend.connect();

			expect(backend.isConnected()).toBe(true);
			expect(mockClient.createCollection).toHaveBeenCalledWith({
				name: 'test_collection',
				metadata: { 'hnsw:space': 'cosine' },
				embeddingFunction: null,
			});
		});

		it('should handle different distance metrics', async () => {
			mockClient.getCollection.mockRejectedValueOnce(new Error('Collection not found'));
			const euclideanConfig = { ...config, distance: 'euclidean' as const };
			const euclideanBackend = new ChromaBackend(euclideanConfig);

			await euclideanBackend.connect();

			expect(mockClient.createCollection).toHaveBeenCalledWith({
				name: 'test_collection',
				metadata: { 'hnsw:space': 'l2' },
				embeddingFunction: null,
			});

			await euclideanBackend.disconnect();
		});

		it('should handle multiple connect calls', async () => {
			await backend.connect();
			await backend.connect(); // Second call should be no-op

			expect(mockClient.getCollection).toHaveBeenCalledTimes(1);
		});

		it('should disconnect successfully', async () => {
			await backend.connect();
			expect(backend.isConnected()).toBe(true);

			await backend.disconnect();
			expect(backend.isConnected()).toBe(false);
		});
	});

	describe('Payload Adapter Integration', () => {
		it('should use default payload adapter', () => {
			const adapter = backend.getPayloadAdapter();
			expect(adapter).toBeInstanceOf(DefaultChromaPayloadAdapter);
		});

		it('should accept custom payload adapter', () => {
			const customAdapter = new DefaultChromaPayloadAdapter();
			const customBackend = new ChromaBackend(config, customAdapter);

			expect(customBackend.getPayloadAdapter()).toBe(customAdapter);
		});

		it('should serialize payloads before inserting', async () => {
			await backend.connect();

			const vectors = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const ids = [1, 2];
			const payloads = [
				{ tags: ['important', 'reviewed'], nested: { key: 'value' } },
				{ tags: ['draft'], count: 42 },
			];

			await backend.insert(vectors, ids, payloads);

			expect(mockCollection.upsert).toHaveBeenCalledWith({
				ids: ['1', '2'],
				embeddings: vectors,
				metadatas: [
					{ tags: 'important,reviewed', nested_key: 'value' },
					{ tags: 'draft', count: 42 },
				],
			});
		});

		it('should deserialize metadata when searching', async () => {
			await backend.connect();

			mockCollection.query.mockResolvedValue({
				ids: [['1']],
				distances: [[0.1]],
				metadatas: [[{ tags: 'important,reviewed', nested_key: 'value' }]],
			});

			const results = await backend.search([1, 2, 3], 5);

			expect(results).toEqual([
				{
					id: 1,
					score: 0.9, // 1 - 0.1
					payload: {
						tags: ['important', 'reviewed'],
						nested: { key: 'value' },
					},
				},
			]);
		});
	});

	describe('Vector Operations', () => {
		beforeEach(async () => {
			await backend.connect();
		});

		it('should insert vectors successfully', async () => {
			const vectors = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const ids = [1, 2];
			const payloads = [{ text: 'hello' }, { text: 'world' }];

			await backend.insert(vectors, ids, payloads);

			expect(mockCollection.upsert).toHaveBeenCalledWith({
				ids: ['1', '2'],
				embeddings: vectors,
				metadatas: payloads,
			});
		});

		it('should validate vector dimensions', async () => {
			const vectors = [[1, 2]]; // Wrong dimension (should be 3)
			const ids = [1];
			const payloads = [{ text: 'hello' }];

			await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(VectorDimensionError);
		});

		it('should validate input array lengths', async () => {
			const vectors = [[1, 2, 3]];
			const ids = [1, 2]; // Mismatched length
			const payloads = [{ text: 'hello' }];

			await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(VectorStoreError);
		});

		it('should search vectors successfully', async () => {
			const query = [1, 2, 3];
			const limit = 5;

			const results = await backend.search(query, limit);

			expect(mockCollection.query).toHaveBeenCalledWith({
				queryEmbeddings: [query],
				nResults: limit,
			});

			expect(results).toEqual([
				{ id: 1, score: 0.9, payload: { text: 'hello' } },
				{ id: 2, score: 0.8, payload: { text: 'world' } },
			]);
		});

		it('should search with filters', async () => {
			const query = [1, 2, 3];
			const filters = { category: 'test', count: { gte: 10 } };

			await backend.search(query, 5, filters);

			expect(mockCollection.query).toHaveBeenCalledWith({
				queryEmbeddings: [query],
				nResults: 5,
				where: { category: 'test', count: { $gte: 10 } },
			});
		});

		it('should get single vector', async () => {
			const result = await backend.get(1);

			expect(mockCollection.get).toHaveBeenCalledWith({
				ids: ['1'],
				include: ['embeddings', 'metadatas'],
			});

			expect(result).toEqual({
				id: 1,
				vector: [1, 2, 3],
				payload: { text: 'hello' },
				score: 1.0,
			});
		});

		it('should return null for non-existent vector', async () => {
			mockCollection.get.mockResolvedValue({ ids: [] });

			const result = await backend.get(999);

			expect(result).toBeNull();
		});

		it('should update vector successfully', async () => {
			const vector = [7, 8, 9];
			const payload = { text: 'updated', count: 1 };

			await backend.update(1, vector, payload);

			expect(mockCollection.upsert).toHaveBeenCalledWith({
				ids: ['1'],
				embeddings: [vector],
				metadatas: [{ text: 'updated', count: 1 }],
			});
		});

		it('should delete vector successfully', async () => {
			await backend.delete(1);

			expect(mockCollection.delete).toHaveBeenCalledWith({
				ids: ['1'],
			});
		});

		it('should list vectors with metadata', async () => {
			mockCollection.get.mockResolvedValue({
				ids: ['1', '2'],
				embeddings: [
					[1, 2, 3],
					[4, 5, 6],
				],
				metadatas: [{ text: 'hello' }, { text: 'world' }],
			});

			const [results, total] = await backend.list();

			expect(mockCollection.get).toHaveBeenCalledWith({
				include: ['embeddings', 'metadatas'],
				limit: 10000,
			});

			expect(results).toEqual([
				{ id: 1, score: 1.0, payload: { text: 'hello' }, vector: [1, 2, 3] },
				{ id: 2, score: 1.0, payload: { text: 'world' }, vector: [4, 5, 6] },
			]);
			expect(total).toBe(2);
		});

		it('should list vectors with filters', async () => {
			const filters = { category: 'test' };

			await backend.list(filters, 100);

			expect(mockCollection.get).toHaveBeenCalledWith({
				include: ['embeddings', 'metadatas'],
				limit: 100,
				where: { category: 'test' },
			});
		});
	});

	describe('Error Handling', () => {
		it('should throw connection error when not connected', async () => {
			await expect(backend.search([1, 2, 3], 5)).rejects.toThrow(VectorStoreError);
		});

		it('should handle collection creation errors', async () => {
			mockClient.getCollection.mockRejectedValue(new Error('Not found'));
			mockClient.createCollection.mockRejectedValue(new Error('Creation failed'));

			await expect(backend.connect()).rejects.toThrow('Failed to connect to vector store backend');
		});

		it('should handle insert errors', async () => {
			await backend.connect();
			mockCollection.upsert.mockRejectedValue(new Error('Insert failed'));

			await expect(backend.insert([[1, 2, 3]], [1], [{ text: 'test' }])).rejects.toThrow(
				'Failed to insert vectors'
			);
		});

		it('should handle search errors', async () => {
			await backend.connect();
			mockCollection.query.mockRejectedValue(new Error('Search failed'));

			await expect(backend.search([1, 2, 3], 5)).rejects.toThrow('Vector search operation failed');
		});
	});

	describe('Configuration Options', () => {
		it('should handle URL-based configuration', () => {
			const urlConfig = {
				type: 'chroma' as const,
				url: 'https://chroma.example.com:9000',
				collectionName: 'test',
				dimension: 3,
			};

			const urlBackend = new ChromaBackend(urlConfig);
			expect(urlBackend.getCollectionName()).toBe('test');
		});

		it('should handle host/port configuration', () => {
			const hostConfig = {
				type: 'chroma' as const,
				host: 'localhost',
				port: 8000,
				ssl: false,
				collectionName: 'test',
				dimension: 3,
			};

			const hostBackend = new ChromaBackend(hostConfig);
			expect(hostBackend.getBackendType()).toBe('chroma');
		});

		it('should handle headers configuration', () => {
			const headersConfig = {
				type: 'chroma' as const,
				url: 'http://localhost:8000',
				headers: { Authorization: 'Bearer token' },
				collectionName: 'test',
				dimension: 3,
			};

			const headersBackend = new ChromaBackend(headersConfig);
			expect(headersBackend.getDimension()).toBe(3);
		});
	});

	describe('Filter Conversion', () => {
		beforeEach(async () => {
			await backend.connect();
		});

		it('should convert range filters correctly', async () => {
			const filters = {
				score: { gte: 0.5, lte: 1.0 },
				count: { gt: 10, lt: 100 },
			};

			await backend.search([1, 2, 3], 5, filters);

			expect(mockCollection.query).toHaveBeenCalledWith({
				queryEmbeddings: [[1, 2, 3]],
				nResults: 5,
				where: {
					score: { $gte: 0.5, $lte: 1.0 },
					count: { $gt: 10, $lt: 100 },
				},
			});
		});

		it('should convert array filters correctly', async () => {
			const filters = {
				category: { any: ['tech', 'science'] },
				status: { all: ['active'] },
			};

			await backend.search([1, 2, 3], 5, filters);

			expect(mockCollection.query).toHaveBeenCalledWith({
				queryEmbeddings: [[1, 2, 3]],
				nResults: 5,
				where: {
					category: { $in: ['tech', 'science'] },
					status: 'active', // 'all' fallback to first value
				},
			});
		});

		it('should handle exact match filters', async () => {
			const filters = {
				category: 'tech',
				active: true,
				count: 42,
			};

			await backend.search([1, 2, 3], 5, filters);

			expect(mockCollection.query).toHaveBeenCalledWith({
				queryEmbeddings: [[1, 2, 3]],
				nResults: 5,
				where: {
					category: 'tech',
					active: true,
					count: 42,
				},
			});
		});
	});

	describe('Collection Management', () => {
		it('should delete collection successfully', async () => {
			await backend.connect();

			await backend.deleteCollection();

			expect(mockClient.deleteCollection).toHaveBeenCalledWith({
				name: 'test_collection',
			});
		});

		it('should handle delete collection errors', async () => {
			await backend.connect();
			mockClient.deleteCollection.mockRejectedValue(new Error('Delete failed'));

			await expect(backend.deleteCollection()).rejects.toThrow('Failed to delete collection');
		});
	});
});
