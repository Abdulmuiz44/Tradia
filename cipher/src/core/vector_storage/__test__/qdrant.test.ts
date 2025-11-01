/**
 * Qdrant Vector Storage Backend Tests
 *
 * Tests for the Qdrant vector storage backend implementation.
 * Uses mocking since Qdrant requires external service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QdrantBackend } from '../backend/qdrant.js';
import {
	VectorStoreError,
	VectorStoreConnectionError,
	VectorDimensionError,
} from '../backend/types.js';
import { BACKEND_TYPES } from '../constants.js';

// Mock the Qdrant client
const mockQdrantClient = {
	getCollections: vi.fn(),
	getCollection: vi.fn(),
	createCollection: vi.fn(),
	deleteCollection: vi.fn(),
	upsert: vi.fn(),
	retrieve: vi.fn(),
	search: vi.fn(),
	delete: vi.fn(),
	scroll: vi.fn(),
	count: vi.fn(),
};

vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: vi.fn(() => mockQdrantClient),
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

describe('QdrantBackend', () => {
	let backend: QdrantBackend;

	const validConfig = {
		type: 'qdrant' as const,
		host: 'localhost',
		port: 6333,
		collectionName: 'test_collection',
		dimension: 3,
		distance: 'Cosine' as const,
	};

	beforeEach(() => {
		backend = new QdrantBackend(validConfig);
		// Clear all mock calls before each test
		vi.clearAllMocks();
	});

	afterEach(async () => {
		if (backend.isConnected()) {
			await backend.disconnect();
		}
	});

	describe('Connection Management', () => {
		it('should connect successfully when collection exists', async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});

			expect(backend.isConnected()).toBe(false);
			await backend.connect();
			expect(backend.isConnected()).toBe(true);

			expect(mockQdrantClient.getCollections).toHaveBeenCalled();
		});

		it('should create collection if it does not exist', async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [],
			});
			mockQdrantClient.createCollection.mockResolvedValue({ result: true });

			await backend.connect();

			expect(mockQdrantClient.getCollections).toHaveBeenCalled();
			expect(mockQdrantClient.createCollection).toHaveBeenCalledWith('test_collection', {
				vectors: {
					size: 3,
					distance: 'Cosine',
				},
			});
		});

		it('should handle connection failures', async () => {
			mockQdrantClient.getCollections.mockRejectedValue(new Error('Connection failed'));

			await expect(backend.connect()).rejects.toThrow(VectorStoreConnectionError);
			expect(backend.isConnected()).toBe(false);
		});

		it('should disconnect successfully', async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});

			await backend.connect();
			await backend.disconnect();
			expect(backend.isConnected()).toBe(false);
		});

		it('should return correct backend type', () => {
			expect(backend.getBackendType()).toBe(BACKEND_TYPES.QDRANT);
		});

		it('should return correct metadata', () => {
			expect(backend.getDimension()).toBe(3);
			expect(backend.getCollectionName()).toBe('test_collection');
		});
	});

	describe('Vector Operations', () => {
		beforeEach(async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});
			await backend.connect();
		});

		it('should insert vectors successfully', async () => {
			mockQdrantClient.upsert.mockResolvedValue({ status: 'ok' });

			const vectors = [
				[1, 2, 3],
				[4, 5, 6],
			];
			const ids = [1, 2];
			const payloads = [{ title: 'First' }, { title: 'Second' }];
			await backend.insert(vectors, ids, payloads);

			expect(mockQdrantClient.upsert).toHaveBeenCalledWith('test_collection', {
				points: [
					{
						id: 1,
						vector: [1, 2, 3],
						payload: { title: 'First' },
					},
					{
						id: 2,
						vector: [4, 5, 6],
						payload: { title: 'Second' },
					},
				],
			});
		});

		it('should retrieve vectors by ID', async () => {
			mockQdrantClient.retrieve.mockResolvedValue({
				result: [
					{
						id: 1,
						vector: [1, 2, 3],
						payload: { title: 'Test' },
					},
				],
			});

			const result = await backend.get(1);

			expect(result).toBeTruthy();
			expect(result!.id).toBe(1);
			expect(result!.vector).toEqual([1, 2, 3]);
			expect(result!.payload).toEqual({ title: 'Test' });
			expect(result!.score).toBe(1.0);

			expect(mockQdrantClient.retrieve).toHaveBeenCalledWith('test_collection', {
				ids: [1],
				with_vector: true,
				with_payload: true,
			});
		});

		it('should return null for non-existent vectors', async () => {
			mockQdrantClient.retrieve.mockResolvedValue({
				result: [],
			});

			const result = await backend.get(999);
			expect(result).toBeNull();
		});

		it('should update vectors', async () => {
			mockQdrantClient.upsert.mockResolvedValue({ status: 'ok' });

			await backend.update(1, [7, 8, 9], { title: 'Updated' });

			expect(mockQdrantClient.upsert).toHaveBeenCalledWith('test_collection', {
				points: [
					{
						id: 1,
						vector: [7, 8, 9],
						payload: { title: 'Updated' },
					},
				],
			});
		});

		it('should delete vectors', async () => {
			mockQdrantClient.delete.mockResolvedValue({ status: 'ok' });

			await backend.delete(1);

			expect(mockQdrantClient.delete).toHaveBeenCalledWith('test_collection', {
				points: [1],
			});
		});

		it('should delete entire collection', async () => {
			mockQdrantClient.deleteCollection.mockResolvedValue({ result: true });

			await backend.deleteCollection();

			expect(mockQdrantClient.deleteCollection).toHaveBeenCalledWith('test_collection');
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

		it('should throw error when not connected', async () => {
			await backend.disconnect();

			await expect(backend.get(1)).rejects.toThrow(VectorStoreError);
			await expect(backend.insert([[1, 2, 3]], [1], [{}])).rejects.toThrow(VectorStoreError);
			await expect(backend.search([1, 2, 3])).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Similarity Search', () => {
		beforeEach(async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});
			await backend.connect();
		});

		it('should search for similar vectors', async () => {
			mockQdrantClient.search.mockResolvedValue({
				result: [
					{
						id: 1,
						version: 1,
						score: 0.95,
						payload: { title: 'First' },
						vector: [1, 2, 3],
					},
					{
						id: 2,
						version: 1,
						score: 0.85,
						payload: { title: 'Second' },
						vector: [4, 5, 6],
					},
				],
			});

			const query = [1, 0, 0];
			const results = await backend.search(query, 2);

			expect(results).toHaveLength(2);
			expect(results[0]?.id).toBe(1);
			expect(results[0]?.score).toBe(0.95);
			expect(results[0]?.payload).toEqual({ title: 'First' });
			expect(results[1]?.id).toBe(2);
			expect(results[1]?.score).toBe(0.85);

			expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
				vector: [1, 0, 0],
				limit: 2,
				with_vector: true,
				with_payload: true,
			});
		});

		it('should search with metadata filters', async () => {
			mockQdrantClient.search.mockResolvedValue({
				result: [
					{
						id: 1,
						version: 1,
						score: 0.95,
						payload: { category: 'A', title: 'First' },
						vector: [1, 2, 3],
					},
				],
			});

			const query = [1, 0, 0];
			const results = await backend.search(query, 5, { category: 'A' });

			expect(results).toHaveLength(1);

			expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
				vector: [1, 0, 0],
				limit: 5,
				with_vector: true,
				with_payload: true,
				filter: {
					must: [
						{
							key: 'category',
							match: { value: 'A' },
						},
					],
				},
			});
		});

		it('should handle complex metadata filters', async () => {
			mockQdrantClient.search.mockResolvedValue({ result: [] });

			const query = [1, 0, 0];
			const filters = {
				category: 'A',
				score: 0.8,
				active: true,
			};

			await backend.search(query, 5, filters);

			expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
				vector: [1, 0, 0],
				limit: 5,
				with_vector: true,
				with_payload: true,
				filter: {
					must: [
						{
							key: 'category',
							match: { value: 'A' },
						},
						{
							key: 'score',
							match: { value: 0.8 },
						},
						{
							key: 'active',
							match: { value: true },
						},
					],
				},
			});
		});

		it('should validate query vector dimension', async () => {
			const wrongDimQuery = [1, 0]; // Should be 3 dimensions

			await expect(backend.search(wrongDimQuery)).rejects.toThrow(VectorDimensionError);
		});

		it('should handle empty search results', async () => {
			mockQdrantClient.search.mockResolvedValue({ result: [] });

			const query = [1, 0, 0];
			const results = await backend.search(query, 5);

			expect(results).toHaveLength(0);
		});
	});

	describe('List Operations', () => {
		beforeEach(async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});
			mockQdrantClient.count.mockResolvedValue({ count: 2 });
			await backend.connect();
		});

		it('should list all vectors without filters', async () => {
			mockQdrantClient.scroll.mockResolvedValue({
				result: {
					points: [
						{
							id: 1,
							version: 1,
							payload: { title: 'First' },
							vector: [1, 2, 3],
						},
						{
							id: 2,
							version: 1,
							payload: { title: 'Second' },
							vector: [4, 5, 6],
						},
					],
					next_page_offset: null,
				},
			});

			const [results, total] = await backend.list();

			expect(results).toHaveLength(2);
			expect(total).toBe(2);
			expect(results[0]?.id).toBe(1);
			expect(results[1]?.id).toBe(2);

			expect(mockQdrantClient.scroll).toHaveBeenCalledWith('test_collection', {
				with_vector: true,
				with_payload: true,
				limit: 10000,
			});
		});

		it('should list vectors with metadata filters', async () => {
			mockQdrantClient.scroll.mockResolvedValue({
				result: {
					points: [
						{
							id: 1,
							version: 1,
							payload: { category: 'A', title: 'First' },
							vector: [1, 2, 3],
						},
					],
					next_page_offset: null,
				},
			});
			mockQdrantClient.count.mockResolvedValue({ count: 1 });

			const [results, total] = await backend.list({ category: 'A' });

			expect(results).toHaveLength(1);
			expect(total).toBe(1);
			expect(results[0]?.payload?.category).toBe('A');

			expect(mockQdrantClient.scroll).toHaveBeenCalledWith('test_collection', {
				with_vector: true,
				with_payload: true,
				limit: 10000,
				filter: {
					must: [
						{
							key: 'category',
							match: { value: 'A' },
						},
					],
				},
			});
		});

		it('should respect limit parameter', async () => {
			mockQdrantClient.scroll.mockResolvedValue({
				result: {
					points: [
						{
							id: 1,
							version: 1,
							payload: { title: 'First' },
							vector: [1, 2, 3],
						},
					],
					next_page_offset: null,
				},
			});
			mockQdrantClient.count.mockResolvedValue({ count: 1 });

			const [results, total] = await backend.list(undefined, 1);

			expect(results).toHaveLength(1);
			expect(total).toBe(1);

			expect(mockQdrantClient.scroll).toHaveBeenCalledWith('test_collection', {
				with_vector: true,
				with_payload: true,
				limit: 1,
			});
		});
	});

	describe('Error Handling', () => {
		beforeEach(async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});
			await backend.connect();
		});

		it('should handle Qdrant API errors gracefully', async () => {
			mockQdrantClient.upsert.mockRejectedValue(new Error('Qdrant API error'));

			await expect(backend.insert([[1, 2, 3]], [1], [{}])).rejects.toThrow(VectorStoreError);
		});

		it('should handle search errors', async () => {
			mockQdrantClient.search.mockRejectedValue(new Error('Search failed'));

			await expect(backend.search([1, 2, 3])).rejects.toThrow(VectorStoreError);
		});

		it('should handle retrieve errors', async () => {
			mockQdrantClient.retrieve.mockRejectedValue(new Error('Retrieve failed'));

			await expect(backend.get(1)).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Configuration Variants', () => {
		it('should handle URL-based configuration', async () => {
			const urlConfig = {
				type: 'qdrant' as const,
				url: 'http://localhost:6333',
				collectionName: 'test_collection',
				dimension: 3,
			};

			const urlBackend = new QdrantBackend(urlConfig);
			expect(urlBackend.getBackendType()).toBe(BACKEND_TYPES.QDRANT);
		});

		it('should handle API key authentication', async () => {
			const authConfig = {
				type: 'qdrant' as const,
				host: 'cloud.qdrant.io',
				port: 443,
				apiKey: 'test-api-key',
				collectionName: 'test_collection',
				dimension: 3,
			};

			const authBackend = new QdrantBackend(authConfig);
			expect(authBackend.getBackendType()).toBe(BACKEND_TYPES.QDRANT);
		});

		it('should handle different distance metrics', async () => {
			const euclideanConfig = {
				type: 'qdrant' as const,
				host: 'localhost',
				port: 6333,
				collectionName: 'test_collection',
				dimension: 3,
				distance: 'Euclidean' as const,
			};

			const euclideanBackend = new QdrantBackend(euclideanConfig);
			expect(euclideanBackend.getDimension()).toBe(3);
		});
	});

	describe('Update Operations', () => {
		beforeEach(async () => {
			mockQdrantClient.getCollections.mockResolvedValue({
				collections: [{ name: 'test_collection' }],
			});
			mockQdrantClient.getCollection.mockResolvedValue({
				config: {
					params: {
						vectors: {
							size: 3,
							distance: 'Cosine',
						},
					},
				},
			});
			await backend.connect();
		});

		it('should update a vector successfully', async () => {
			const id = 123;
			const updatedVector = [7, 8, 9];
			const updatedPayload = { title: 'Updated' };

			mockQdrantClient.upsert.mockResolvedValue({
				operation_id: 1,
				status: 'completed',
			});

			await backend.update(id, updatedVector, updatedPayload);

			expect(mockQdrantClient.upsert).toHaveBeenCalledWith('test_collection', {
				points: [
					{
						id,
						vector: updatedVector,
						payload: updatedPayload,
					},
				],
			});
		});

		it('should handle update errors gracefully', async () => {
			const id = 123;
			const vector = [1, 2, 3];
			const payload = { title: 'Test' };

			mockQdrantClient.upsert.mockRejectedValue(new Error('Update failed'));

			await expect(backend.update(id, vector, payload)).rejects.toThrow(VectorStoreError);
		});
	});
});
