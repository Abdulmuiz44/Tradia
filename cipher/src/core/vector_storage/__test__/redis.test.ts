import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Redis } from 'ioredis';
import { RedisBackend } from '../backend/redis.js';
import type { RedisBackendConfig } from '../config.js';
import {
	VectorStoreError,
	VectorDimensionError,
	VectorStoreConnectionError,
} from '../backend/types.js';

// Mock pipeline methods
const mockPipeline = {
	call: vi.fn().mockReturnThis(),
	exec: vi.fn(),
};

// Mock Redis instance methods
const mockRedisInstance = {
	call: vi.fn(),
	del: vi.fn(),
	scan: vi.fn(),
	quit: vi.fn(),
	pipeline: vi.fn(() => mockPipeline),
	once: vi.fn(),
	on: vi.fn(),
	off: vi.fn(),
	status: 'ready',
};

// Mock ioredis
vi.mock('ioredis', () => ({
	Redis: vi.fn(() => mockRedisInstance),
}));

// Mock logger
vi.mock('../../../logger/index.js', () => ({
	createLogger: vi.fn(() => ({
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	})),
}));

describe('RedisBackend Vector Storage', () => {
	let backend: RedisBackend;
	let config: RedisBackendConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		config = {
			host: 'localhost',
			port: 6379,
			password: 'testpass',
			username: 'testuser',
			dimension: 384,
			collectionName: 'test_vectors',
			distance: 'COSINE',
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
		it('should create RedisBackend with full config', () => {
			expect(backend.getDimension()).toBe(384);
			expect(backend.getCollectionName()).toBe('test_vectors');
			expect(backend.isConnected()).toBe(false);
		});

		it('should use defaults for missing config values', () => {
			const minimalConfig: RedisBackendConfig = {
				host: 'localhost',
			};
			const minimalBackend = new RedisBackend(minimalConfig);

			expect(minimalBackend.getDimension()).toBe(1536); // DEFAULTS.DIMENSION
			expect(minimalBackend.getCollectionName()).toBe('vectors');
		});

		it('should create client with URL configuration', () => {
			const urlConfig: RedisBackendConfig = {
				url: 'redis://localhost:6379',
				dimension: 128,
			};
			new RedisBackend(urlConfig);

			expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');
		});

		it('should create client with individual parameters', () => {
			new RedisBackend(config);

			expect(Redis).toHaveBeenCalledWith({
				host: 'localhost',
				port: 6379,
				password: 'testpass',
				username: 'testuser',
				enableOfflineQueue: false,
				maxRetriesPerRequest: 3,
			});
		});

		it('should handle different distance metrics', () => {
			const euclideanConfig = { ...config, distance: 'L2' as const };
			const euclideanBackend = new RedisBackend(euclideanConfig);
			expect(euclideanBackend).toBeDefined();

			const ipConfig = { ...config, distance: 'IP' as const };
			const ipBackend = new RedisBackend(ipConfig);
			expect(ipBackend).toBeDefined();
		});
	});

	describe('Connection Management', () => {
		it('should connect successfully and create index', async () => {
			// Mock successful connection
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});

			// Mock index creation - first call fails (doesn't exist), second succeeds
			mockRedisInstance.call
				.mockRejectedValueOnce(new Error('Index not found'))
				.mockResolvedValueOnce('OK');

			await backend.connect();

			expect(mockRedisInstance.call).toHaveBeenCalledWith('FT.INFO', 'test_vectors_idx');
			expect(mockRedisInstance.call).toHaveBeenCalledWith(
				'FT.CREATE',
				'test_vectors_idx',
				'ON',
				'JSON',
				'PREFIX',
				'1',
				'test_vectors:',
				'SCHEMA',
				'$.vector',
				'AS',
				'vector',
				'VECTOR',
				'FLAT',
				'6',
				'TYPE',
				'FLOAT32',
				'DIM',
				'384',
				'DISTANCE_METRIC',
				'COSINE'
			);
			expect(backend.isConnected()).toBe(true);
		});

		it('should handle existing index during connection', async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});

			// Mock existing index
			mockRedisInstance.call.mockResolvedValueOnce('index info');

			await backend.connect();

			expect(mockRedisInstance.call).toHaveBeenCalledWith('FT.INFO', 'test_vectors_idx');
			expect(mockRedisInstance.call).not.toHaveBeenCalledWith('FT.CREATE', expect.any(String));
			expect(backend.isConnected()).toBe(true);
		});

		it('should handle connection error', async () => {
			const connectionError = new Error('Connection refused');
			mockRedisInstance.status = 'connecting';
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'error') {
					setTimeout(() => callback(connectionError), 10);
				}
			});

			await expect(backend.connect()).rejects.toThrow(VectorStoreConnectionError);
		});

		it('should handle index creation failure', async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});

			// Mock index check failure and creation failure
			mockRedisInstance.call
				.mockRejectedValueOnce(new Error('Index not found'))
				.mockRejectedValueOnce(new Error('Index creation failed'));

			await expect(backend.connect()).rejects.toThrow(VectorStoreError);
		});

		it('should skip connection if already connected', async () => {
			// First connection
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');

			await backend.connect();
			vi.clearAllMocks();

			// Second connection attempt
			await backend.connect();

			expect(mockRedisInstance.call).not.toHaveBeenCalled();
		});

		it('should disconnect successfully', async () => {
			// Connect first
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			mockRedisInstance.quit.mockResolvedValue('OK');

			await backend.connect();
			await backend.disconnect();

			expect(mockRedisInstance.quit).toHaveBeenCalled();
			expect(backend.isConnected()).toBe(false);
		});

		it('should handle disconnect when not connected', async () => {
			await backend.disconnect(); // Should not throw
			expect(mockRedisInstance.quit).not.toHaveBeenCalled();
		});
	});

	describe('Vector Operations - Insert', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			mockPipeline.exec.mockResolvedValue([]);
			await backend.connect();
		});

		it('should insert single vector successfully', async () => {
			const vector = Array(384).fill(0.1);
			const id = 1;
			const payload = { text: 'test document' };

			await backend.insert([vector], [id], [payload]);

			expect(mockRedisInstance.pipeline).toHaveBeenCalled();
			expect(mockPipeline.call).toHaveBeenCalledWith(
				'JSON.SET',
				'test_vectors:1',
				'$',
				expect.stringContaining('"id":1')
			);
			expect(mockPipeline.exec).toHaveBeenCalled();
		});

		it('should insert multiple vectors successfully', async () => {
			const vectors = [Array(384).fill(0.1), Array(384).fill(0.2), Array(384).fill(0.3)];
			const ids = [1, 2, 3];
			const payloads = [{ text: 'doc1' }, { text: 'doc2' }, { text: 'doc3' }];

			await backend.insert(vectors, ids, payloads);

			expect(mockPipeline.call).toHaveBeenCalledTimes(3);
			expect(mockPipeline.exec).toHaveBeenCalled();
		});

		it('should handle empty arrays', async () => {
			await backend.insert([], [], []);

			expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
		});

		it('should validate vector dimensions', async () => {
			const wrongVector = Array(200).fill(0.1); // Wrong dimension
			const id = 1;
			const payload = {};

			await expect(backend.insert([wrongVector], [id], [payload])).rejects.toThrow(
				VectorDimensionError
			);
		});

		it('should validate array lengths match', async () => {
			const vectors = [Array(384).fill(0.1)];
			const ids = [1, 2]; // Mismatched length
			const payloads = [{}];

			await expect(backend.insert(vectors, ids, payloads)).rejects.toThrow(VectorStoreError);
		});

		it('should validate ID format', async () => {
			const vector = Array(384).fill(0.1);
			const invalidId = 1.5; // Not an integer
			const payload = {};

			await expect(backend.insert([vector], [invalidId], [payload])).rejects.toThrow(
				VectorStoreError
			);
		});

		it('should throw error when not connected', async () => {
			await backend.disconnect();

			const vector = Array(384).fill(0.1);
			await expect(backend.insert([vector], [1], [{}])).rejects.toThrow(VectorStoreError);
		});

		it('should handle Redis insertion errors', async () => {
			const error = new Error('Redis insertion failed');
			mockPipeline.exec.mockRejectedValue(error);

			const vector = Array(384).fill(0.1);
			await expect(backend.insert([vector], [1], [{}])).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Vector Operations - Search', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			await backend.connect();
		});

		it('should search vectors successfully', async () => {
			const queryVector = Array(384).fill(0.5);
			const mockSearchResult = [
				2, // Total results
				'test_vectors:1',
				[
					'$',
					JSON.stringify({ id: 1, vector: Array(384).fill(0.1), text: 'doc1' }),
					'score',
					'0.1',
				],
				'test_vectors:2',
				[
					'$',
					JSON.stringify({ id: 2, vector: Array(384).fill(0.2), text: 'doc2' }),
					'score',
					'0.2',
				],
			];

			mockRedisInstance.call.mockResolvedValue(mockSearchResult);

			const results = await backend.search(queryVector, 10);

			expect(mockRedisInstance.call).toHaveBeenCalledWith(
				'FT.SEARCH',
				'test_vectors_idx',
				'* => [KNN 10 @vector $query_vec AS score]',
				'PARAMS',
				'2',
				'query_vec',
				expect.any(Buffer),
				'RETURN',
				'2',
				'$',
				'score',
				'SORTBY',
				'score',
				'DIALECT',
				'2'
			);
			expect(results).toHaveLength(2);
			expect(results[0].id).toBe(1);
			expect(results[0].score).toBe(0.9); // 1 - 0.1
		});

		it('should search with filters', async () => {
			const queryVector = Array(384).fill(0.5);
			const filters = {
				category: 'tech',
				score: { gte: 0.5, lte: 1.0 },
				tags: { any: ['ai', 'ml'] },
			};

			mockRedisInstance.call.mockResolvedValue([0]); // No results

			await backend.search(queryVector, 5, filters);

			const expectedQuery =
				'@category:"tech" @score:[0.5 1] @tags:("ai"|"ml") => [KNN 5 @vector $query_vec AS score]';
			expect(mockRedisInstance.call).toHaveBeenCalledWith(
				'FT.SEARCH',
				'test_vectors_idx',
				expectedQuery,
				'PARAMS',
				'2',
				'query_vec',
				expect.any(Buffer),
				'RETURN',
				'2',
				'$',
				'score',
				'SORTBY',
				'score',
				'DIALECT',
				'2'
			);
		});

		it('should validate query vector dimensions', async () => {
			const wrongVector = Array(200).fill(0.5);

			await expect(backend.search(wrongVector, 10)).rejects.toThrow(VectorDimensionError);
		});

		it('should validate search limit', async () => {
			const queryVector = Array(384).fill(0.5);

			await expect(backend.search(queryVector, 0)).rejects.toThrow(VectorStoreError);

			await expect(backend.search(queryVector, -1)).rejects.toThrow(VectorStoreError);
		});

		it('should handle search errors', async () => {
			const queryVector = Array(384).fill(0.5);
			mockRedisInstance.call.mockRejectedValue(new Error('Search failed'));

			await expect(backend.search(queryVector, 10)).rejects.toThrow(VectorStoreError);
		});

		it('should handle empty search results', async () => {
			const queryVector = Array(384).fill(0.5);
			mockRedisInstance.call.mockResolvedValue([0]); // No results

			const results = await backend.search(queryVector, 10);

			expect(results).toEqual([]);
		});
	});

	describe('Vector Operations - Get', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			await backend.connect();
		});

		it('should get vector by ID successfully', async () => {
			// Mock JSON.GET to return array with JSON string as first element
			mockRedisInstance.call.mockResolvedValue([
				JSON.stringify([
					{
						id: 1,
						vector: Array(384).fill(0.1),
						text: 'test document',
					},
				]),
			]);

			const result = await backend.get(1);

			expect(mockRedisInstance.call).toHaveBeenCalledWith('JSON.GET', 'test_vectors:1', '$');
			expect(result).toBeDefined();
			expect(result?.id).toBe(1);
			expect(result?.payload.text).toBe('test document');
		});

		it('should return null for non-existent vector', async () => {
			mockRedisInstance.call.mockResolvedValue(null);

			const result = await backend.get(999);

			expect(result).toBeNull();
		});

		it('should validate ID format', async () => {
			await expect(backend.get(1.5)).rejects.toThrow(VectorStoreError);

			await expect(backend.get(null as any)).rejects.toThrow(VectorStoreError);
		});

		it('should handle Redis get errors', async () => {
			mockRedisInstance.call.mockRejectedValue(new Error('Get failed'));

			await expect(backend.get(1)).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Vector Operations - Update', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			await backend.connect();
		});

		it('should update vector successfully', async () => {
			const newVector = Array(384).fill(0.8);
			const newPayload = { text: 'updated document' };

			// Mock existing document check
			mockRedisInstance.call
				.mockResolvedValueOnce(['{"id":1,"vector":[...],"text":"old"}']) // GET
				.mockResolvedValueOnce('OK'); // SET

			await backend.update(1, newVector, newPayload);

			expect(mockRedisInstance.call).toHaveBeenCalledWith('FT.INFO', 'test_vectors_idx');
			expect(mockRedisInstance.call).toHaveBeenCalledWith(
				'JSON.SET',
				'test_vectors:1',
				'$',
				expect.stringContaining('"text":"updated document"')
			);
		});

		it('should throw error for non-existent vector', async () => {
			mockRedisInstance.call.mockResolvedValue(null);

			const vector = Array(384).fill(0.8);
			await expect(backend.update(999, vector, {})).rejects.toThrow(VectorStoreError);
		});

		it('should validate vector dimensions', async () => {
			const wrongVector = Array(200).fill(0.8);

			await expect(backend.update(1, wrongVector, {})).rejects.toThrow(VectorDimensionError);
		});
	});

	describe('Vector Operations - Delete', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			await backend.connect();
		});

		it('should delete vector successfully', async () => {
			mockRedisInstance.del.mockResolvedValue(1);

			await backend.delete(1);

			expect(mockRedisInstance.del).toHaveBeenCalledWith('test_vectors:1');
		});

		it('should handle non-existent vector deletion', async () => {
			mockRedisInstance.del.mockResolvedValue(0);

			await backend.delete(999); // Should not throw
		});

		it('should validate ID format', async () => {
			await expect(backend.delete(1.5)).rejects.toThrow(VectorStoreError);
		});
	});

	describe('Collection Operations', () => {
		beforeEach(async () => {
			mockRedisInstance.once.mockImplementation((event: string, callback: Function) => {
				if (event === 'ready') {
					setTimeout(callback, 10);
				}
			});
			mockRedisInstance.call.mockResolvedValue('index info');
			await backend.connect();
		});

		it('should list vectors with pagination', async () => {
			const mockSearchResult = [
				3, // total count
				'test_vectors:1',
				['$', JSON.stringify({ id: 1, vector: Array(384).fill(0.1), text: 'document 1' })],
				'test_vectors:2',
				['$', JSON.stringify({ id: 2, vector: Array(384).fill(0.2), text: 'document 2' })],
				'test_vectors:3',
				['$', JSON.stringify({ id: 3, vector: Array(384).fill(0.3), text: 'document 3' })],
			];
			mockRedisInstance.call.mockResolvedValue(mockSearchResult);

			const results = await backend.list({}, 10);

			expect(mockRedisInstance.call).toHaveBeenCalledWith(
				'FT.SEARCH',
				'test_vectors_idx',
				'*',
				'LIMIT',
				'0',
				'10',
				'RETURN',
				'1',
				'$'
			);
			expect(results[0]).toHaveLength(3);
			expect(results[0][0].id).toBe(1);
			expect(results[0][1].id).toBe(2);
			expect(results[0][2].id).toBe(3);
			expect(results[1]).toBe(3); // Total count
		});

		it('should delete entire collection', async () => {
			const mockKeys = ['test_vectors:1', 'test_vectors:2'];
			mockRedisInstance.scan.mockResolvedValue(['0', mockKeys]);
			mockRedisInstance.del.mockResolvedValue(2);
			mockRedisInstance.call.mockResolvedValue('OK'); // For index deletion

			await backend.deleteCollection();

			expect(mockRedisInstance.del).toHaveBeenCalledWith(...mockKeys);
			expect(mockRedisInstance.call).toHaveBeenCalledWith('FT.DROPINDEX', 'test_vectors_idx');
		});
	});

	describe('Utility Methods', () => {
		it('should convert vector to buffer correctly', () => {
			const vector = [0.1, 0.2, 0.3, 0.4];
			const backend = new RedisBackend(config);

			// Access private method via any cast for testing
			const buffer = (backend as any).vectorToBuffer(vector);

			expect(buffer).toBeInstanceOf(Buffer);
			expect(buffer.length).toBe(16); // 4 floats * 4 bytes each
		});

		it('should convert buffer to vector correctly', () => {
			const originalVector = [0.1, 0.2, 0.3, 0.4];
			const backend = new RedisBackend(config);

			const buffer = (backend as any).vectorToBuffer(originalVector);
			const convertedVector = (backend as any).bufferToVector(buffer);

			expect(convertedVector).toHaveLength(4);
			convertedVector.forEach((val: number, idx: number) => {
				expect(val).toBeCloseTo(originalVector[idx], 5);
			});
		});

		it('should build filter queries correctly', () => {
			const backend = new RedisBackend(config);

			// Test exact match
			let filters = { category: 'tech' };
			let query = (backend as any).buildFilterQuery(filters);
			expect(query).toBe('@category:"tech"');

			// Test range query
			filters = { score: { gte: 0.5, lte: 1.0 } } as any;
			query = (backend as any).buildFilterQuery(filters);
			expect(query).toBe('@score:[0.5 1]');

			// Test array filter
			filters = { tags: { any: ['ai', 'ml'] } } as any;
			query = (backend as any).buildFilterQuery(filters);
			expect(query).toBe('@tags:("ai"|"ml")');

			// Test empty filters
			query = (backend as any).buildFilterQuery({});
			expect(query).toBe('*');

			// Test multiple filters combined
			const multiFilters = {
				category: 'tech',
				score: { gte: 0.5, lte: 1.0 },
				tags: { any: ['ai', 'ml'] },
			} as any;
			query = (backend as any).buildFilterQuery(multiFilters);
			expect(query).toBe('@category:"tech" @score:[0.5 1] @tags:("ai"|"ml")');
		});

		it('should generate correct document keys', () => {
			const backend = new RedisBackend(config);
			const key = (backend as any).getDocumentKey(123);
			expect(key).toBe('test_vectors:123');
		});
	});

	describe('Error Handling', () => {
		it('should throw error when not connected for operations', async () => {
			const vector = Array(384).fill(0.1);

			await expect(backend.insert([vector], [1], [{}])).rejects.toThrow(
				'Vector store is not connected'
			);

			await expect(backend.search(vector)).rejects.toThrow('Vector store is not connected');

			await expect(backend.get(1)).rejects.toThrow('Vector store is not connected');

			await expect(backend.update(1, vector, {})).rejects.toThrow('Vector store is not connected');

			await expect(backend.delete(1)).rejects.toThrow('Vector store is not connected');
		});

		it('should handle Redis connection events', () => {
			const backend = new RedisBackend(config);

			// Test event handlers were registered
			expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
			expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
			expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
			expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
		});
	});
});
