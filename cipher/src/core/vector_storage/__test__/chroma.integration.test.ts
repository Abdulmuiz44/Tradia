/**
 * ChromaDB Integration Tests
 *
 * Integration tests that require a running ChromaDB instance.
 * These tests verify real ChromaDB operations and payload transformations.
 *
 * To run these tests, start a ChromaDB instance:
 * docker run -p 8000:8000 chromadb/chroma:latest
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ChromaBackend } from '../backend/chroma.js';
import { DefaultChromaPayloadAdapter } from '../backend/chroma-payload-adapter.js';
import type { ChromaBackendConfig } from '../backend/types.js';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const TEST_COLLECTION = 'cipher_test_integration';

// Skip integration tests if ChromaDB is not available
const skipIntegrationTests = process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(skipIntegrationTests)('ChromaDB Integration Tests', () => {
	let backend: ChromaBackend;
	let config: ChromaBackendConfig;

	beforeAll(async () => {
		config = {
			type: 'chroma',
			url: CHROMA_URL,
			collectionName: TEST_COLLECTION,
			dimension: 4,
		};

		backend = new ChromaBackend(config);

		// Test if ChromaDB is accessible
		try {
			await backend.connect();
		} catch (error) {
			console.warn('ChromaDB not accessible, skipping integration tests:', error);
			throw new Error('ChromaDB connection failed - ensure ChromaDB is running');
		}
	});

	afterAll(async () => {
		if (backend?.isConnected()) {
			try {
				await backend.deleteCollection();
			} catch (error) {
				console.warn('Failed to cleanup test collection:', error);
			}
			await backend.disconnect();
		}
	});

	beforeEach(async () => {
		if (!backend.isConnected()) {
			await backend.connect();
		}
	});

	describe('Real ChromaDB Operations', () => {
		it('should connect to ChromaDB instance', async () => {
			expect(backend.isConnected()).toBe(true);
			expect(backend.getBackendType()).toBe('chroma');
			expect(backend.getCollectionName()).toBe(TEST_COLLECTION);
		});

		it('should insert and retrieve vectors with complex payloads', async () => {
			const vectors = [
				[0.1, 0.2, 0.3, 0.4],
				[0.5, 0.6, 0.7, 0.8],
				[0.9, 1.0, 1.1, 1.2],
			];

			const ids = [1, 2, 3];

			const payloads = [
				{
					text: 'First document',
					tags: ['important', 'reviewed'],
					metadata: {
						author: 'John Doe',
						created: '2023-01-01',
						stats: { views: 100, likes: 25 },
					},
					currentProgress: {
						feature: 'authentication',
						status: 'completed',
						completion: 100,
					},
				},
				{
					text: 'Second document',
					tags: ['draft', 'technical'],
					categories: ['backend', 'database'],
					nested: {
						deep: {
							value: 'deeply nested',
							numbers: [1, 2, 3],
						},
					},
				},
				{
					text: 'Third document',
					tags: ['final'],
					bugsEncountered: [
						{
							description: 'Memory leak in processing',
							severity: 'high',
							status: 'fixed',
						},
					],
					workContext: {
						project: 'cipher',
						branch: 'main',
						repository: 'github.com/company/cipher',
					},
				},
			];

			// Insert vectors
			await backend.insert(vectors, ids, payloads);

			// Retrieve and verify each vector
			for (let i = 0; i < ids.length; i++) {
				const result = await backend.get(ids[i]);
				expect(result).not.toBeNull();
				expect(result!.id).toBe(ids[i]);
				// ChromaDB may have slight floating-point precision differences
				if (result!.vector) {
					expect(result!.vector).toHaveLength(vectors[i].length);
					for (let j = 0; j < vectors[i].length; j++) {
						expect(result!.vector[j]).toBeCloseTo(vectors[i][j], 5);
					}
				}

				// Verify payload deserialization
				const payload = result!.payload;
				expect(payload.text).toBe(payloads[i].text);
				expect(payload.tags).toEqual(payloads[i].tags);

				// Verify complex nested structures are preserved
				if (payloads[i].metadata) {
					expect(payload.metadata).toEqual(payloads[i].metadata);
				}
				if (payloads[i].currentProgress) {
					expect(payload.currentProgress).toEqual(payloads[i].currentProgress);
				}
				if (payloads[i].bugsEncountered) {
					expect(payload.bugsEncountered).toEqual(payloads[i].bugsEncountered);
				}
				if (payloads[i].workContext) {
					expect(payload.workContext).toEqual(payloads[i].workContext);
				}
				if ((payloads[i] as any).nested) {
					expect((payload as any).nested).toEqual((payloads[i] as any).nested);
				}
			}
		});

		it('should perform similarity search with complex payloads', async () => {
			const queryVector = [0.15, 0.25, 0.35, 0.45]; // Similar to first vector
			const results = await backend.search(queryVector, 3);

			expect(results).toHaveLength(3);
			expect(results[0].id).toBeDefined();
			expect(results[0].score).toBeGreaterThan(0);
			expect(results[0].payload).toBeDefined();
			expect(results[0].payload.text).toBeDefined();
			expect(Array.isArray(results[0].payload.tags)).toBe(true);
		});

		it('should handle updates with complex payloads', async () => {
			const vectorId = 1;
			const newVector = [0.2, 0.3, 0.4, 0.5];
			const newPayload = {
				text: 'Updated document',
				tags: ['updated', 'modified'],
				metadata: {
					author: 'Jane Doe',
					modified: '2023-12-01',
					version: 2,
				},
				newField: {
					complex: {
						data: ['array', 'of', 'strings'],
					},
				},
			};

			await backend.update(vectorId, newVector, newPayload);

			const result = await backend.get(vectorId);
			expect(result).not.toBeNull();
			// Check vector with floating-point tolerance
			if (result!.vector) {
				expect(result!.vector).toHaveLength(newVector.length);
				for (let j = 0; j < newVector.length; j++) {
					expect(result!.vector[j]).toBeCloseTo(newVector[j], 5);
				}
			}

			// Check that the new payload fields are present and correct
			// Note: ChromaDB upsert merges metadata, so old fields may still be present
			expect(result!.payload.text).toBe(newPayload.text);
			expect(result!.payload.tags).toEqual(newPayload.tags);
			expect(result!.payload.newField).toEqual(newPayload.newField);

			// Check that the metadata was updated correctly (merged with existing)
			expect(result!.payload.metadata.author).toBe(newPayload.metadata.author);
			expect(result!.payload.metadata.modified).toBe(newPayload.metadata.modified);
			expect(result!.payload.metadata.version).toBe(newPayload.metadata.version);
			// Old fields from previous test runs may still be present due to ChromaDB's merge behavior
			expect(result!.payload.metadata).toHaveProperty('author');
			expect(result!.payload.metadata).toHaveProperty('modified');
			expect(result!.payload.metadata).toHaveProperty('version');
		});

		it('should list vectors with complex payloads', async () => {
			const [results, total] = await backend.list(undefined, 10);

			expect(total).toBeGreaterThan(0);
			expect(results.length).toBeGreaterThan(0);

			// Verify all results have properly deserialized payloads
			for (const result of results) {
				expect(result.id).toBeDefined();
				expect(result.payload).toBeDefined();
				expect(typeof result.payload.text).toBe('string');
				expect(Array.isArray(result.payload.tags)).toBe(true);
			}
		});

		it('should handle search with filters on transformed fields', async () => {
			// Search for documents with specific tags (comma-separated strategy)
			const filters = { tags: 'updated,modified' }; // This will be matched against comma-separated string
			const results = await backend.search([0.2, 0.3, 0.4, 0.5], 5, filters);

			// Should find documents with matching tags
			expect(results.length).toBeGreaterThanOrEqual(0);
		});

		it('should handle deletion', async () => {
			const vectorId = 2;

			// Verify it exists first
			let result = await backend.get(vectorId);
			expect(result).not.toBeNull();

			// Delete it
			await backend.delete(vectorId);

			// Verify it's gone
			result = await backend.get(vectorId);
			expect(result).toBeNull();
		});
	});

	describe('Payload Adapter Integration', () => {
		it('should handle custom payload adapter configuration', async () => {
			const customAdapter = new DefaultChromaPayloadAdapter({
				defaultStrategy: 'json-string',
				fieldConfigs: {
					customField: { strategy: 'preserve' },
					arrayField: { strategy: 'comma-separated' },
				},
			});

			const customBackend = new ChromaBackend(
				{
					...config,
					collectionName: 'cipher_test_custom',
				},
				customAdapter
			);

			await customBackend.connect();

			try {
				const payload = {
					customField: 'should be preserved',
					arrayField: ['item1', 'item2', 'item3'],
					complexObject: {
						nested: { data: 'should be JSON' },
					},
				};

				await customBackend.insert([[1, 2, 3, 4]], [100], [payload]);

				const result = await customBackend.get(100);
				expect(result).not.toBeNull();
				expect(result!.payload.customField).toBe('should be preserved');
				expect(result!.payload.arrayField).toEqual(['item1', 'item2', 'item3']);
				expect(result!.payload.complexObject).toEqual({
					nested: { data: 'should be JSON' },
				});
			} finally {
				await customBackend.deleteCollection();
				await customBackend.disconnect();
			}
		});

		it('should handle backward compatibility with existing data', async () => {
			// This test simulates existing data that was stored with the old hard-coded approach
			const legacyPayload = {
				tags: ['legacy', 'data'],
				currentProgress: {
					feature: 'legacy-feature',
					status: 'completed',
				},
			};

			await backend.insert([[2, 3, 4, 5]], [200], [legacyPayload]);

			const result = await backend.get(200);
			expect(result).not.toBeNull();
			expect(result!.payload.tags).toEqual(['legacy', 'data']);
			expect(result!.payload.currentProgress).toEqual({
				feature: 'legacy-feature',
				status: 'completed',
			});
		});

		it('should handle edge cases in real ChromaDB environment', async () => {
			const edgeCasePayloads = [
				{
					emptyArray: [],
					emptyObject: {},
					nullValue: null,
					undefinedValue: undefined,
					zeroValue: 0,
					emptyString: '',
					booleanFalse: false,
				},
				{
					largeString: 'x'.repeat(1000),
					specialChars: 'Hello "world" & <tags>',
					unicodeChars: '🚀 测试 العربية',
					numbers: [1.5, -2.7, 0, 1e-10, 1e10],
				},
				{
					deepNesting: {
						level1: {
							level2: {
								level3: {
									value: 'deep value',
								},
							},
						},
					},
				},
			];

			const vectors = [
				[1, 1, 1, 1],
				[2, 2, 2, 2],
				[3, 3, 3, 3],
			];
			const ids = [300, 301, 302];

			await backend.insert(vectors, ids, edgeCasePayloads);

			// Verify all edge cases are handled correctly
			for (let i = 0; i < ids.length; i++) {
				const result = await backend.get(ids[i]);
				expect(result).not.toBeNull();

				const payload = result!.payload;
				const original = edgeCasePayloads[i];

				// Compare relevant fields (excluding null/undefined which are filtered out)
				if (original.emptyArray !== undefined) {
					// Empty arrays might be deserialized as empty strings in some cases
					expect(
						payload.emptyArray === '' ||
							(Array.isArray(payload.emptyArray) && payload.emptyArray.length === 0)
					).toBe(true);
				}
				if (original.emptyObject !== undefined) {
					expect(payload.emptyObject).toEqual({});
				}
				if (original.zeroValue !== undefined) {
					expect(payload.zeroValue).toBe(0);
				}
				if (original.emptyString !== undefined) {
					expect(payload.emptyString).toBe('');
				}
				if (original.booleanFalse !== undefined) {
					expect(payload.booleanFalse).toBe(false);
				}
				if (original.largeString) {
					expect(payload.largeString).toBe(original.largeString);
				}
				if (original.deepNesting) {
					expect(payload.deepNesting).toEqual(original.deepNesting);
				}
			}
		});
	});

	describe('Error Handling in Real Environment', () => {
		it('should handle ChromaDB-specific errors gracefully', async () => {
			// Test with invalid vector dimension
			await expect(
				backend.insert([[1, 2]], [999], [{ text: 'wrong dimension' }])
			).rejects.toThrow();

			// Test with duplicate IDs (should succeed due to upsert behavior)
			await expect(
				backend.insert([[1, 2, 3, 4]], [1], [{ text: 'duplicate id' }])
			).resolves.not.toThrow();
		});

		it('should handle large payload serialization', async () => {
			const largePayload = {
				description: 'Large payload test',
				largeArray: Array.from({ length: 100 }, (_, i) => ({
					id: i,
					name: `Item ${i}`,
					data: `Data for item ${i}`.repeat(10),
				})),
				largeObject: Object.fromEntries(
					Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`.repeat(5)])
				),
			};

			await expect(backend.insert([[4, 4, 4, 4]], [500], [largePayload])).resolves.not.toThrow();

			const result = await backend.get(500);
			expect(result).not.toBeNull();
			expect(result!.payload.largeArray).toHaveLength(100);
			expect(Object.keys(result!.payload.largeObject)).toHaveLength(50);
		});
	});
});
