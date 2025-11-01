/**
 * Phase 1 Test: Reflection Memory Infrastructure
 *
 * Tests dual collection vector storage
 */

import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { DualCollectionVectorManager } from '../dual-collection-manager.js';
import type { VectorStoreConfig } from '../types.js';

// Mock Qdrant client to prevent actual connections during tests
const mockQdrantClient = {
	getCollections: vi.fn(),
	getCollection: vi.fn(),
	createCollection: vi.fn(),
	upsert: vi.fn(),
	search: vi.fn(),
	retrieve: vi.fn(),
	delete: vi.fn(),
	deleteCollection: vi.fn(),
	count: vi.fn(),
	scroll: vi.fn(),
};

vi.mock('@qdrant/js-client-rest', () => ({
	QdrantClient: vi.fn(() => mockQdrantClient),
}));

// Mock logger to reduce test noise
vi.mock('../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

describe('Phase 1: Reflection Memory Infrastructure', () => {
	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Mock Qdrant to fail connections (to trigger fallback to in-memory)
		mockQdrantClient.getCollections.mockRejectedValue(new Error('Qdrant connection failed'));
	});

	describe('DualCollectionVectorManager', () => {
		let manager: DualCollectionVectorManager;

		beforeEach(async () => {
			// Enable reflection memory for these tests by setting both collection names
			process.env.REFLECTION_VECTOR_STORE_COLLECTION = 'reflection_memory';

			const config: VectorStoreConfig = {
				type: 'in-memory',
				collectionName: 'test_knowledge',
				dimension: 1536,
				maxVectors: 10000,
			};

			manager = new DualCollectionVectorManager(config);
			await manager.connect();
		});

		afterEach(async () => {
			if (manager) {
				await manager.disconnect();
			}
			delete process.env.REFLECTION_VECTOR_STORE_COLLECTION;
		});

		test('should create dual collection manager with reflection enabled', async () => {
			expect(manager).toBeInstanceOf(DualCollectionVectorManager);
			expect(manager.isConnected('knowledge')).toBe(true);
			expect(manager.isConnected('reflection')).toBe(true);
			expect(manager.getStore('knowledge')).not.toBeNull();
			expect(manager.getStore('reflection')).not.toBeNull();
		});

		test('should provide individual managers for advanced usage', async () => {
			const knowledgeManager = manager.getManager('knowledge');
			const reflectionManager = manager.getManager('reflection');

			expect(knowledgeManager).not.toBeNull();
			expect(reflectionManager).not.toBeNull();
			expect(knowledgeManager?.isConnected()).toBe(true);
			expect(reflectionManager?.isConnected()).toBe(true);
		});
	});

	describe('Collection Type Validation', () => {
		it('should throw error for invalid collection types', async () => {
			process.env.VECTOR_STORE_TYPE = 'in-memory';

			const manager = new DualCollectionVectorManager({
				type: 'in-memory',
				collectionName: 'test',
				dimension: 1536,
				maxVectors: 1000,
			});

			await manager.connect();

			// Testing invalid collection type
			expect(() => manager.getStore('invalid' as any)).toThrow('Unknown collection type');

			// Testing invalid collection type
			expect(() => manager.isConnected('invalid' as any)).toThrow('Unknown collection type');

			// Testing invalid collection type
			expect(() => manager.getManager('invalid' as any)).toThrow('Unknown collection type');

			await manager.disconnect();
		});
	});
});
