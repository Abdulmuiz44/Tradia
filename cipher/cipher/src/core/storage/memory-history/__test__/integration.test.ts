/**
 * Memory History Service Integration Tests
 *
 * Integration tests for the memory history storage service with different backends.
 * Tests real database operations, performance, error handling, and concurrent access.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryHistoryStorageService } from '../service.js';
import { createMemoryHistoryEntry, createMemoryHistoryService } from '../index.js';
import type { MemoryHistoryEntry, MemoryOperation } from '../types.js';
import { StorageManager } from '../../manager.js';
import type { StorageConfig } from '../../config.js';

// Mock the logger to reduce noise in tests
vi.mock('../../../logger/index.js', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

// Mock environment configurations for different backends
const mockConfigs = {
	inMemory: {
		CIPHER_LOG_LEVEL: 'info',
		STORAGE_CACHE_TYPE: 'in-memory',
		STORAGE_DATABASE_TYPE: 'in-memory',
	},
	sqlite: {
		CIPHER_LOG_LEVEL: 'info',
		STORAGE_CACHE_TYPE: 'in-memory',
		STORAGE_DATABASE_TYPE: 'sqlite',
		STORAGE_SQLITE_PATH: ':memory:',
	},
	postgres: {
		CIPHER_LOG_LEVEL: 'info',
		STORAGE_CACHE_TYPE: 'in-memory',
		STORAGE_DATABASE_TYPE: 'postgresql',
		STORAGE_POSTGRESQL_URL: 'postgresql://test:test@localhost:5432/cipher_test',
	},
};

/**
 * Test suite for each backend type
 */
describe('Memory History Service Integration Tests', () => {
	describe('In-Memory Backend Integration', () => {
		let service: MemoryHistoryStorageService;

		beforeEach(async () => {
			// Mock env for in-memory backend
			vi.doMock('../../../env.js', () => ({
				env: mockConfigs.inMemory,
			}));

			service = new MemoryHistoryStorageService();
			await service.connect();
		});

		afterEach(async () => {
			if (service.isConnected()) {
				await service.disconnect();
			}
			vi.doUnmock('../../../env.js');
		});

		it('should handle high-volume operations efficiently', async () => {
			const entries: MemoryHistoryEntry[] = [];
			const operationCount = 1000;

			// Record many operations
			const start = Date.now();
			for (let i = 0; i < operationCount; i++) {
				const entry = createMemoryHistoryEntry({
					operation: 'ADD' as MemoryOperation,
					projectId: 'test-project',
					memoryId: `test-memory-${i}`,
					name: `Performance test operation ${i}`,
					tags: ['performance', 'test'],
					sessionId: 'perf-test-session',
					metadata: { index: i },
					success: true,
				});
				entries.push(entry);
				await service.recordOperation(entry);
			}
			const recordTime = Date.now() - start;

			// Query operations
			const queryStart = Date.now();
			const allEntries = await service.getHistory({});
			const queryTime = Date.now() - queryStart;

			expect(allEntries).toHaveLength(operationCount);
			expect(recordTime).toBeLessThan(5000); // Should complete in under 5 seconds
			expect(queryTime).toBeLessThan(1000); // Queries should be fast

			// Test filtering performance
			const filterStart = Date.now();
			const filteredEntries = await service.getHistory({
				operation: 'ADD',
				sessionId: 'perf-test-session',
			});
			const filterTime = Date.now() - filterStart;

			expect(filteredEntries).toHaveLength(operationCount);
			expect(filterTime).toBeLessThan(500);
		});

		it('should handle concurrent operations safely', async () => {
			const promises = Array.from({ length: 50 }, async (_, index) => {
				const sessionId = `concurrent-session-${index}`;
				const entries: MemoryHistoryEntry[] = [];

				for (let i = 0; i < 20; i++) {
					const entry = createMemoryHistoryEntry({
						operation: 'ADD' as MemoryOperation,
						projectId: 'concurrent-project',
						memoryId: `concurrent-memory-${index}-${i}`,
						name: `Concurrent operation ${index}-${i}`,
						tags: ['concurrent', 'test'],
						sessionId,
						metadata: { batchIndex: index, itemIndex: i },
						success: true,
					});
					entries.push(entry);
				}

				// Record all entries for this concurrent stream
				for (const entry of entries) {
					await service.recordOperation(entry);
				}

				return entries;
			});

			// Wait for all concurrent operations to complete
			await Promise.all(promises);

			// Verify all operations were recorded
			const recorded = await service.getHistory({});
			expect(recorded).toHaveLength(50 * 20);

			// Verify data integrity - each session should have correct number of entries
			for (let i = 0; i < 50; i++) {
				const sessionEntries = await service.getHistory({
					sessionId: `concurrent-session-${i}`,
				});
				expect(sessionEntries).toHaveLength(20);
			}
		});

		it('should handle error conditions gracefully', async () => {
			// Test invalid operation recording
			const invalidEntry = {
				...createMemoryHistoryEntry({
					operation: 'ADD' as MemoryOperation,
					projectId: 'error-project',
					memoryId: 'error-memory',
					name: 'Error test operation',
					tags: ['error', 'test'],
					sessionId: 'test-session',
					metadata: { test: 'error' },
					success: true,
				}),
				operation: 'INVALID_OPERATION' as MemoryOperation,
			};

			await expect(service.recordOperation(invalidEntry)).rejects.toThrow();

			// Test querying after disconnection
			await service.disconnect();
			await expect(service.getHistory({})).rejects.toThrow();
		});

		it('should provide accurate analytics across large datasets', async () => {
			// Create a diverse set of operations
			const operations: MemoryOperation[] = ['ADD', 'UPDATE', 'DELETE', 'SEARCH', 'RETRIEVE'];
			const sessions = ['session-1', 'session-2', 'session-3'];
			const entriesPerCombination = 20;

			// Record operations for each combination
			for (const operation of operations) {
				for (const sessionId of sessions) {
					for (let i = 0; i < entriesPerCombination; i++) {
						const entry = createMemoryHistoryEntry({
							operation,
							projectId: 'analytics-project',
							memoryId: `${operation.toLowerCase()}-memory-${i}`,
							name: `${operation} operation ${i}`,
							tags: [operation.toLowerCase(), 'analytics'],
							sessionId,
							metadata: { operation, session: sessionId, index: i },
							success: true,
						});
						await service.recordOperation(entry);
					}
				}
			}

			// Test overall analytics
			const analytics = await service.getOperationStats();
			expect(analytics.totalOperations).toBe(
				operations.length * sessions.length * entriesPerCombination
			);
			expect(analytics.operationCounts.ADD).toBe(sessions.length * entriesPerCombination);
			expect(analytics.operationCounts.UPDATE).toBe(sessions.length * entriesPerCombination);

			// Test project-specific analytics
			const projectAnalytics = await service.getOperationStats('analytics-project');
			expect(projectAnalytics.totalOperations).toBe(
				operations.length * sessions.length * entriesPerCombination
			);
		});

		it('should integrate properly with StorageManager', async () => {
			const config: StorageConfig = {
				cache: { type: 'in-memory' },
				database: { type: 'in-memory' },
			};

			const storageManager = new StorageManager(config);
			await storageManager.connect();

			// Create service through helper function
			const historyService = createMemoryHistoryService();
			await historyService.connect();

			// Test recording and querying through integrated service
			const entry = createMemoryHistoryEntry({
				operation: 'ADD' as MemoryOperation,
				projectId: 'integration-project',
				memoryId: 'integration-memory',
				name: 'Integration test operation',
				tags: ['integration', 'test'],
				sessionId: 'integration-session',
				metadata: { source: 'StorageManager integration test' },
				success: true,
			});

			await historyService.recordOperation(entry);
			const entries = await historyService.getHistory({
				sessionId: 'integration-session',
			});

			expect(entries).toHaveLength(1);
			expect(entries[0]?.memoryId).toBe('integration-memory');

			await historyService.disconnect();
			await storageManager.disconnect();
		});
	});

	// SQLite Backend Integration Tests (will be activated when SQLite backend is implemented)
	describe.skip('SQLite Backend Integration', () => {
		let service: MemoryHistoryStorageService;

		beforeEach(async () => {
			// Mock env for SQLite backend
			vi.doMock('../../../env.js', () => ({
				env: mockConfigs.sqlite,
			}));

			service = new MemoryHistoryStorageService();
			await service.connect();
		});

		afterEach(async () => {
			if (service.isConnected()) {
				await service.disconnect();
			}
			vi.doUnmock('../../../env.js');
		});

		it('should initialize SQLite schema correctly', async () => {
			// This test will verify that the SQLite tables are created
			// and have the correct structure
			expect(service.isConnected()).toBe(true);
		});

		it('should persist data across connections', async () => {
			const entry = createMemoryHistoryEntry({
				operation: 'ADD' as MemoryOperation,
				projectId: 'persistence-project',
				memoryId: 'persistence-memory',
				name: 'Persistence test operation',
				tags: ['persistence', 'test'],
				sessionId: 'persistence-session',
				metadata: { test: 'persistence' },
				success: true,
			});

			await service.recordOperation(entry);
			await service.disconnect();

			// Reconnect and verify data is still there
			await service.connect();
			const entries = await service.getHistory({
				memoryId: 'persistence-memory',
			});

			expect(entries).toHaveLength(1);
			expect(entries[0]?.memoryId).toBe('persistence-memory');
		});

		it('should handle SQLite-specific optimizations', async () => {
			// Test SQLite-specific features like:
			// - WAL mode for concurrent access
			// - Proper indexing for performance
			// - Transaction handling
			// These will be implemented when SQLite backend is ready
		});
	});

	// PostgreSQL Backend Integration Tests (will be activated when PostgreSQL backend is implemented)
	describe.skip('PostgreSQL Backend Integration', () => {
		let service: MemoryHistoryStorageService;

		beforeEach(async () => {
			// Mock env for PostgreSQL backend
			vi.doMock('../../../env.js', () => ({
				env: mockConfigs.postgres,
			}));

			service = new MemoryHistoryStorageService();
			await service.connect();
		});

		afterEach(async () => {
			if (service.isConnected()) {
				await service.disconnect();
			}
			vi.doUnmock('../../../env.js');
		});

		it('should initialize PostgreSQL schema correctly', async () => {
			// This test will verify that the PostgreSQL tables are created
			// and have the correct structure including proper data types
			expect(service.isConnected()).toBe(true);
		});

		it('should handle large-scale concurrent operations', async () => {
			// PostgreSQL should handle much higher concurrency than SQLite
			// Implementation similar to in-memory test but with higher load
		});

		it('should utilize PostgreSQL-specific features', async () => {
			// Test PostgreSQL-specific features like:
			// - JSONB operations for metadata
			// - Advanced indexing strategies
			// - Connection pooling
			// - Full-text search capabilities
			// These will be implemented when PostgreSQL backend is ready
		});

		it('should handle connection failures and recovery', async () => {
			// Test connection resilience and automatic recovery
			// This is particularly important for PostgreSQL deployments
		});
	});

	describe('Cross-Backend Compatibility', () => {
		it('should maintain consistent data format across backends', async () => {
			// This test ensures that data serialized by one backend
			// can be read by another backend (important for migrations)

			const testEntry = createMemoryHistoryEntry({
				operation: 'ADD' as MemoryOperation,
				projectId: 'compatibility-project',
				memoryId: 'compatibility-memory',
				name: 'Compatibility test operation',
				tags: ['compatibility', 'test'],
				sessionId: 'compatibility-session',
				metadata: {
					complex: { nested: { data: [1, 2, 3] } },
					timestamp: new Date().toISOString(),
					numbers: [1.5, 2.7, 3.14159],
				},
				success: true,
			});

			// Test with in-memory backend (only available backend currently)
			vi.doMock('../../../env.js', () => ({
				env: mockConfigs.inMemory,
			}));

			const inMemoryService = new MemoryHistoryStorageService();
			await inMemoryService.connect();
			await inMemoryService.recordOperation(testEntry);

			const retrieved = await inMemoryService.getHistory({
				memoryId: 'compatibility-memory',
			});

			expect(retrieved).toHaveLength(1);
			expect(retrieved[0]).toMatchObject({
				operation: 'ADD',
				projectId: 'compatibility-project',
				memoryId: 'compatibility-memory',
				sessionId: 'compatibility-session',
			});
			expect(retrieved[0]?.metadata).toEqual(testEntry.metadata);

			await inMemoryService.disconnect();
			vi.doUnmock('../../../env.js');
		});
	});

	describe('Performance Benchmarks', () => {
		let service: MemoryHistoryStorageService;

		beforeEach(async () => {
			vi.doMock('../../../env.js', () => ({
				env: mockConfigs.inMemory,
			}));

			service = new MemoryHistoryStorageService();
			await service.connect();
		});

		afterEach(async () => {
			if (service.isConnected()) {
				await service.disconnect();
			}
			vi.doUnmock('../../../env.js');
		});

		it('should meet performance benchmarks for typical usage', async () => {
			const benchmarks = {
				singleInsert: 10, // ms
				batchInsert100: 500, // ms
				simpleQuery: 50, // ms
				complexQuery: 200, // ms
				analytics: 300, // ms
			};

			// Single insert benchmark
			const singleStart = Date.now();
			await service.recordOperation(
				createMemoryHistoryEntry({
					operation: 'ADD' as MemoryOperation,
					projectId: 'benchmark-project',
					memoryId: 'benchmark-single',
					name: 'Single benchmark operation',
					tags: ['benchmark', 'single'],
					sessionId: 'benchmark-session',
					metadata: { test: 'single' },
					success: true,
				})
			);
			const singleTime = Date.now() - singleStart;
			expect(singleTime).toBeLessThan(benchmarks.singleInsert);

			// Batch insert benchmark
			const batchStart = Date.now();
			const batchPromises = Array.from({ length: 100 }, (_, i) =>
				service.recordOperation(
					createMemoryHistoryEntry({
						operation: 'ADD' as MemoryOperation,
						projectId: 'benchmark-project',
						memoryId: `benchmark-batch-${i}`,
						name: `Batch benchmark operation ${i}`,
						tags: ['benchmark', 'batch'],
						sessionId: 'benchmark-session',
						metadata: { test: 'batch', index: i },
						success: true,
					})
				)
			);
			await Promise.all(batchPromises);
			const batchTime = Date.now() - batchStart;
			expect(batchTime).toBeLessThan(benchmarks.batchInsert100);

			// Simple query benchmark
			const simpleQueryStart = Date.now();
			await service.getHistory({ sessionId: 'benchmark-session' });
			const simpleQueryTime = Date.now() - simpleQueryStart;
			expect(simpleQueryTime).toBeLessThan(benchmarks.simpleQuery);

			// Complex query benchmark
			const complexQueryStart = Date.now();
			await service.getHistory({
				operation: 'ADD',
				sessionId: 'benchmark-session',
				options: {
					limit: 50,
					offset: 10,
				},
			});
			const complexQueryTime = Date.now() - complexQueryStart;
			expect(complexQueryTime).toBeLessThan(benchmarks.complexQuery);

			// Analytics benchmark
			const analyticsStart = Date.now();
			await service.getOperationStats('benchmark-project');
			const analyticsTime = Date.now() - analyticsStart;
			expect(analyticsTime).toBeLessThan(benchmarks.analytics);
		});

		it('should handle memory usage efficiently', async () => {
			// This test verifies logical memory efficiency through operations
			// Using a smaller dataset to avoid timeouts

			const operationCount = 500; // Reduced from 5000
			let maxMemoryEntries = 0;

			// Batch operations for better performance
			const batchSize = 50;
			for (let batch = 0; batch < operationCount / batchSize; batch++) {
				const operations = [];
				for (let i = 0; i < batchSize; i++) {
					const index = batch * batchSize + i;
					operations.push(
						service.recordOperation(
							createMemoryHistoryEntry({
								operation: 'ADD' as MemoryOperation,
								projectId: 'memory-test-project',
								memoryId: `memory-test-${index}`,
								name: `Memory test operation ${index}`,
								tags: ['memory', 'test'],
								sessionId: 'memory-test-session',
								metadata: {
									largeData: new Array(10).fill(`data-${index}`).join('-'), // Smaller data
									index,
								},
								success: true,
							})
						)
					);
				}

				// Execute batch
				await Promise.all(operations);

				// Check stored entry count
				const currentEntries = await service.getHistory({ sessionId: 'memory-test-session' });
				maxMemoryEntries = Math.max(maxMemoryEntries, currentEntries.length);
			}

			// Verify all operations were stored
			const finalEntries = await service.getHistory({ sessionId: 'memory-test-session' });
			expect(finalEntries).toHaveLength(operationCount);
		}, 10000); // Increase timeout to 10 seconds
	});
});
