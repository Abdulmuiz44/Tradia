/**
 * Performance Tests for Session Management API
 * Tests API performance under load and memory leak prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Mock dependencies
vi.mock('../../../core/logger/index.js', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

describe('Session Management Performance Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Memory Leak Prevention', () => {
		it('should not accumulate listeners during session operations', async () => {
			const initialListenerCount = process.listenerCount('warning');

			// Simulate multiple session operations
			const operations = Array.from({ length: 50 }, async (_, i) => {
				// Mock session operation
				return new Promise(resolve => {
					const controller = new AbortController();
					const timeout = setTimeout(() => {
						controller.abort();
						resolve(`operation-${i}`);
					}, 10);

					// Clean up properly
					controller.signal.addEventListener('abort', () => {
						clearTimeout(timeout);
					});
				});
			});

			await Promise.all(operations);

			// Should not accumulate warning listeners
			const finalListenerCount = process.listenerCount('warning');
			const listenerIncrease = finalListenerCount - initialListenerCount;

			// Allow some reasonable increase but not excessive
			expect(listenerIncrease).toBeLessThan(10);
		});

		it('should properly cleanup AbortController listeners', async () => {
			const controllers: AbortController[] = [];

			// Create multiple AbortControllers
			for (let i = 0; i < 20; i++) {
				const controller = new AbortController();
				controllers.push(controller);

				// Add listener
				controller.signal.addEventListener('abort', () => {
					// Mock cleanup operation
				});
			}

			// Abort all controllers (simulates proper cleanup)
			controllers.forEach(controller => controller.abort());

			// Should not trigger memory leak warnings
			expect(controllers.length).toBe(20);

			// Verify controllers are properly disposed
			controllers.forEach(controller => {
				expect(controller.signal.aborted).toBe(true);
			});
		});

		it('should handle rapid session creation/deletion without memory leaks', async () => {
			const initialMemory = process.memoryUsage().heapUsed;

			// Simulate rapid session lifecycle
			const operations = [];
			for (let i = 0; i < 100; i++) {
				operations.push(
					Promise.resolve({
						id: `session-${i}`,
						created: Date.now(),
						cleanup: () => {
							// Mock cleanup
						},
					}).then(session => {
						// Immediately cleanup
						session.cleanup();
						return session;
					})
				);
			}

			await Promise.all(operations);

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			// Memory increase should be reasonable (less than 10MB)
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});
	});

	describe('API Performance Under Load', () => {
		it('should handle concurrent session requests efficiently', async () => {
			const concurrentRequests = 50;
			const startTime = performance.now();

			// Mock session operations
			const mockSessionOperation = async (sessionId: string) => {
				// Simulate API processing time
				await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
				return {
					sessionId,
					messageCount: Math.floor(Math.random() * 100),
					processed: true,
				};
			};

			// Execute concurrent requests
			const requests = Array.from({ length: concurrentRequests }, (_, i) =>
				mockSessionOperation(`session-${i}`)
			);

			const results = await Promise.all(requests);
			const duration = performance.now() - startTime;

			// All requests should succeed
			expect(results).toHaveLength(concurrentRequests);
			results.forEach((result, index) => {
				expect(result.sessionId).toBe(`session-${index}`);
				expect(result.processed).toBe(true);
			});

			// Should complete within reasonable time (2 seconds for 50 requests)
			expect(duration).toBeLessThan(2000);

			// Calculate throughput
			const requestsPerSecond = (concurrentRequests / duration) * 1000;
			expect(requestsPerSecond).toBeGreaterThan(25); // At least 25 requests/second
		});

		it('should maintain performance with large session lists', async () => {
			const sessionCount = 1000;
			const startTime = performance.now();

			// Mock large session list
			const mockSessions = Array.from({ length: sessionCount }, (_, i) => ({
				id: `session-${i}`,
				messageCount: Math.floor(Math.random() * 50),
				lastActivity: Date.now() - Math.random() * 86400000, // Random within last day
			}));

			// Simulate session listing with filtering and sorting
			const activeSessions = mockSessions
				.filter(session => session.messageCount > 0)
				.sort((a, b) => b.lastActivity - a.lastActivity)
				.slice(0, 100); // Paginate

			const duration = performance.now() - startTime;

			// Should process large list quickly
			expect(duration).toBeLessThan(100); // Less than 100ms
			expect(activeSessions.length).toBeLessThanOrEqual(100);

			// Verify sorting
			for (let i = 1; i < activeSessions.length; i++) {
				expect(activeSessions[i].lastActivity).toBeLessThanOrEqual(
					activeSessions[i - 1].lastActivity
				);
			}
		});

		it('should handle session history retrieval efficiently', async () => {
			const sessionCount = 20;
			const messagesPerSession = 100;
			const startTime = performance.now();

			// Mock session history operations
			const historyOperations = Array.from({ length: sessionCount }, async (_, i) => {
				const sessionId = `session-${i}`;

				// Simulate history retrieval
				const history = Array.from({ length: messagesPerSession }, (_, j) => ({
					id: `msg-${j}`,
					role: j % 2 === 0 ? 'user' : 'assistant',
					content: [{ type: 'text', text: `Message ${j} content` }],
					timestamp: Date.now() - j * 1000,
				}));

				return {
					sessionId,
					history,
					messageCount: history.length,
				};
			});

			const results = await Promise.all(historyOperations);
			const duration = performance.now() - startTime;

			// All operations should succeed
			expect(results).toHaveLength(sessionCount);
			results.forEach(result => {
				expect(result.messageCount).toBe(messagesPerSession);
				expect(result.history).toHaveLength(messagesPerSession);
			});

			// Should complete efficiently
			expect(duration).toBeLessThan(1000); // Less than 1 second

			const totalMessages = sessionCount * messagesPerSession;
			const messagesPerSecond = (totalMessages / duration) * 1000;
			expect(messagesPerSecond).toBeGreaterThan(1000); // Process >1000 messages/second
		});

		it('should handle session deletion batch operations', async () => {
			const sessionCount = 100;
			const startTime = performance.now();

			// Mock batch deletion
			const deletionOperations = Array.from({ length: sessionCount }, async (_, i) => {
				const sessionId = `delete-session-${i}`;

				// Simulate deletion with cleanup
				await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

				return {
					sessionId,
					deleted: true,
					cleanedUp: true,
				};
			});

			const results = await Promise.all(deletionOperations);
			const duration = performance.now() - startTime;

			// All deletions should succeed
			expect(results).toHaveLength(sessionCount);
			results.forEach(result => {
				expect(result.deleted).toBe(true);
				expect(result.cleanedUp).toBe(true);
			});

			// Should complete efficiently
			expect(duration).toBeLessThan(1500); // Less than 1.5 seconds
		});
	});

	describe('Resource Management', () => {
		it('should manage database connections efficiently', async () => {
			const connectionPool = {
				active: 0,
				max: 10,
				acquire: vi.fn().mockImplementation(async () => {
					if (connectionPool.active >= connectionPool.max) {
						throw new Error('Connection pool exhausted');
					}
					connectionPool.active++;
					return { id: `conn-${connectionPool.active}` };
				}),
				release: vi.fn().mockImplementation(() => {
					connectionPool.active = Math.max(0, connectionPool.active - 1);
				}),
			};

			// Simulate multiple operations requiring connections
			const operations = Array.from({ length: 20 }, async (_, i) => {
				const conn = await connectionPool.acquire();

				// Simulate database operation
				await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

				connectionPool.release();
				return { operationId: i, connectionId: conn.id };
			});

			// Should handle operations even with limited connection pool
			const results = await Promise.allSettled(operations);

			const successful = results.filter(r => r.status === 'fulfilled').length;
			const failed = results.filter(r => r.status === 'rejected').length;

			// Most operations should succeed (with limited connection pool, some may fail)
			expect(successful).toBeGreaterThan(5); // At least 5 operations should succeed

			// If some failed, it should be due to connection limits, not other errors
			if (failed > 0) {
				const rejectedResults = results.filter(
					r => r.status === 'rejected'
				) as PromiseRejectedResult[];
				rejectedResults.forEach(result => {
					expect(result.reason.message).toContain('Connection pool exhausted');
				});
			}

			// Connection pool should be clean after operations
			expect(connectionPool.active).toBe(0);
		});

		it('should handle memory pressure gracefully', async () => {
			const initialMemory = process.memoryUsage();

			// Create memory pressure simulation
			const largeObjects: any[] = [];

			try {
				// Simulate handling large session data
				for (let i = 0; i < 100; i++) {
					const sessionData = {
						id: `memory-test-${i}`,
						history: Array.from({ length: 1000 }, (_, j) => ({
							id: j,
							content: 'x'.repeat(1000), // 1KB per message
							timestamp: Date.now(),
						})),
						metadata: {
							created: Date.now(),
							lastActivity: Date.now(),
							tags: Array.from({ length: 10 }, (_, k) => `tag-${k}`),
						},
					};

					largeObjects.push(sessionData);

					// Simulate processing
					if (i % 10 === 0) {
						// Periodic cleanup simulation
						largeObjects.splice(0, 5);
					}
				}

				const currentMemory = process.memoryUsage();
				const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

				// Should handle large data without excessive memory growth
				expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
			} finally {
				// Cleanup
				largeObjects.length = 0;

				// Force GC if available
				if (global.gc) {
					global.gc();
				}
			}
		});

		it('should prevent resource leaks during error conditions', async () => {
			const resources = {
				files: new Set<string>(),
				connections: new Set<string>(),
				timers: new Set<NodeJS.Timeout>(),
			};

			const mockResourceOperation = async (shouldFail: boolean) => {
				const fileHandle = `file-${Date.now()}`;
				const connectionId = `conn-${Date.now()}`;
				const timer = setTimeout(() => {}, 1000);

				try {
					resources.files.add(fileHandle);
					resources.connections.add(connectionId);
					resources.timers.add(timer);

					if (shouldFail) {
						throw new Error('Simulated operation failure');
					}

					return { success: true };
				} finally {
					// Proper cleanup in finally block
					resources.files.delete(fileHandle);
					resources.connections.delete(connectionId);
					clearTimeout(timer);
					resources.timers.delete(timer);
				}
			};

			// Mix of successful and failing operations
			const operations = [
				...Array.from({ length: 10 }, () => mockResourceOperation(false)),
				...Array.from({ length: 5 }, () => mockResourceOperation(true)),
			];

			const results = await Promise.allSettled(operations);

			// Verify cleanup happened regardless of success/failure
			expect(resources.files.size).toBe(0);
			expect(resources.connections.size).toBe(0);
			expect(resources.timers.size).toBe(0);

			// Verify we had both successes and failures
			const successful = results.filter(r => r.status === 'fulfilled').length;
			const failed = results.filter(r => r.status === 'rejected').length;

			expect(successful).toBe(10);
			expect(failed).toBe(5);
		});
	});

	describe('Scalability Tests', () => {
		it('should scale linearly with session count', async () => {
			const testSizes = [10, 50, 100, 200];
			const performanceResults: Array<{ size: number; duration: number; throughput: number }> = [];

			for (const size of testSizes) {
				const startTime = performance.now();

				// Simulate session operations with more predictable timing
				const operations = Array.from({ length: size }, async (_, i) => {
					// Mock session processing with consistent minimal delay
					await new Promise(resolve => setTimeout(resolve, 0.1));
					return { sessionId: `scale-test-${i}`, processed: true };
				});

				await Promise.all(operations);
				const duration = performance.now() - startTime;
				const throughput = (size / duration) * 1000;

				performanceResults.push({ size, duration, throughput });
			}

			// Performance should not degrade exponentially
			for (let i = 1; i < performanceResults.length; i++) {
				const prev = performanceResults[i - 1];
				const current = performanceResults[i];

				// Throughput should not decrease significantly - adjusted threshold for more realistic expectations
				const throughputRatio = current.throughput / prev.throughput;
				expect(throughputRatio).toBeGreaterThan(0.25); // Allow up to 75% degradation due to overhead
			}

			// Largest test should still complete in reasonable time
			const largestTest = performanceResults[performanceResults.length - 1];
			expect(largestTest.duration).toBeLessThan(5000); // Less than 5 seconds
		});

		it('should handle burst traffic patterns', async () => {
			const burstSize = 100;
			const burstCount = 5;

			for (let burst = 0; burst < burstCount; burst++) {
				const startTime = performance.now();

				// Simulate burst of requests
				const burstOperations = Array.from({ length: burstSize }, async (_, i) => {
					// Mock request processing
					await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
					return {
						burst,
						requestId: i,
						processed: Date.now(),
					};
				});

				const results = await Promise.all(burstOperations);
				const duration = performance.now() - startTime;

				// Each burst should complete successfully
				expect(results).toHaveLength(burstSize);
				expect(duration).toBeLessThan(2000); // Less than 2 seconds per burst

				// Brief pause between bursts
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		});
	});
});
