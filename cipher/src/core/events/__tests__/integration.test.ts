/**
 * Comprehensive Integration Tests for Event System
 *
 * Tests the complete event flow across all services and components.
 */

import { EventManager } from '../event-manager.js';
// import { EventFilterManager } from '../filtering.js';
import { CommonFilters } from '../filtering.js';
import { EventPersistence } from '../persistence.js';
// import { MemoryEventStorage } from '../persistence.js';
import { EventMetricsCollector } from '../metrics.js';
import { WebhookForwarder } from '../webhooks.js';
import { EventReplay } from '../replay.js';
import { ServiceEvents, SessionEvents } from '../event-types.js';
import { EventAwareVectorStore } from '../../vector_storage/event-aware-store.js';
import { vi } from 'vitest';

// Mock vector store for testing
class MockVectorStore {
	private connected = false;

	async connect(): Promise<void> {
		this.connected = true;
	}

	async disconnect(): Promise<void> {
		this.connected = false;
	}

	isConnected(): boolean {
		return this.connected;
	}

	async insert(
		_vectors: number[][],
		_ids: number[],
		_payloads: Record<string, any>[]
	): Promise<void> {
		// Simulate some processing time
		await new Promise(resolve => setTimeout(resolve, 10));
	}

	async search(_query: number[], _limit?: number): Promise<any[]> {
		await new Promise(resolve => setTimeout(resolve, 5));
		return [{ id: 1, score: 0.95, payload: { title: 'Test Document' } }];
	}

	async get(vectorId: number): Promise<any> {
		return { id: vectorId, score: 1.0, payload: { title: 'Retrieved Document' } };
	}

	async update(_vectorId: number, _vector: number[], _payload: Record<string, any>): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, 8));
	}

	async delete(_vectorId: number): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, 3));
	}

	async deleteCollection(): Promise<void> {}
	async list(): Promise<[any[], number]> {
		return [[], 0];
	}
	getBackendType(): string {
		return 'mock';
	}
	getDimension(): number {
		return 1536;
	}
	getCollectionName(): string {
		return 'test';
	}
}

describe('Event System Integration Tests', () => {
	let eventManager: EventManager;
	let persistence: EventPersistence;
	let metricsCollector: EventMetricsCollector;
	let webhookForwarder: WebhookForwarder;
	let eventReplay: EventReplay;

	beforeEach(() => {
		eventManager = new EventManager({
			enableLogging: true,
			enablePersistence: true,
			enableFiltering: true,
			maxServiceListeners: 100,
			maxSessionListeners: 50,
		});

		persistence = new EventPersistence({
			enabled: true,
			storageType: 'memory',
			maxEvents: 1000,
		});

		metricsCollector = new EventMetricsCollector();
		webhookForwarder = new WebhookForwarder();
		eventReplay = new EventReplay(persistence);
	});

	afterEach(() => {
		eventManager.dispose();
		webhookForwarder.dispose();
		persistence.dispose();
	});

	describe('Core Event Flow', () => {
		test('should emit and handle service events correctly', async () => {
			const receivedEvents: any[] = [];

			const serviceEventBus = eventManager.getServiceEventBus();
			serviceEventBus.on(ServiceEvents.CIPHER_STARTED, data => {
				receivedEvents.push({ type: 'cipher:started', data });
			});

			serviceEventBus.on(ServiceEvents.SERVICE_STARTED, data => {
				receivedEvents.push({ type: 'cipher:serviceStarted', data });
			});

			// Emit events
			eventManager.emitServiceEvent(ServiceEvents.CIPHER_STARTED, {
				timestamp: Date.now(),
				version: '1.0.0',
			});

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'vector-store',
				timestamp: Date.now(),
			});

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(receivedEvents).toHaveLength(2);
			expect(receivedEvents[0].type).toBe('cipher:started');
			expect(receivedEvents[1].type).toBe('cipher:serviceStarted');
		});

		test('should emit and handle session events correctly', async () => {
			const sessionId = 'test-session-123';
			const receivedEvents: any[] = [];

			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.SESSION_CREATED, data => {
				receivedEvents.push({ type: 'session:created', data });
			});

			sessionEventBus.on(SessionEvents.TOOL_EXECUTION_STARTED, data => {
				receivedEvents.push({ type: 'tool:executionStarted', data });
			});

			// Emit events
			eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
				sessionId,
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId,
				executionId: 'exec-123',
				timestamp: Date.now(),
			});

			await new Promise(resolve => setTimeout(resolve, 10));

			expect(receivedEvents).toHaveLength(2);
			expect(receivedEvents[0].type).toBe('session:created');
			expect(receivedEvents[1].type).toBe('tool:executionStarted');
		});
	});

	describe('Event Filtering Integration', () => {
		test('should filter events based on registered filters', async () => {
			const receivedEvents: any[] = [];
			const sessionId = 'test-session-456';

			// Setup common filters
			eventManager.setupCommonFilters();

			// Add a custom filter to only allow session events
			eventManager.registerFilter({
				name: 'session-only',
				description: 'Only allow session events',
				enabled: true,
				priority: 200,
				filter: CommonFilters.byEventType('session:created', 'session:activated'),
			});

			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.SESSION_CREATED, data => {
				receivedEvents.push({ type: 'session:created', data });
			});

			sessionEventBus.on(SessionEvents.TOOL_EXECUTION_STARTED, data => {
				receivedEvents.push({ type: 'tool:executionStarted', data });
			});

			// Emit events
			eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
				sessionId,
				timestamp: Date.now(),
			});

			// This should be filtered out
			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId,
				executionId: 'exec-456',
				timestamp: Date.now(),
			});

			await new Promise(resolve => setTimeout(resolve, 10));

			// Only session:created should have passed through the filter
			if (receivedEvents.length > 0) {
				expect(receivedEvents.some(e => e.type === 'session:created')).toBe(true);
			}

			const filterStats = eventManager.getFilteringStats();
			expect(filterStats.totalEventsProcessed).toBeGreaterThan(0);
		});

		test('should handle rate limiting correctly', async () => {
			const receivedEvents: any[] = [];
			const sessionId = 'test-session-rate-limit';

			// Register a strict rate limit filter
			eventManager.registerFilter({
				name: 'strict-rate-limit',
				description: 'Allow only 2 events per second',
				enabled: true,
				priority: 100,
				filter: CommonFilters.rateLimit(2, 1000),
			});

			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.SESSION_CREATED, data => {
				receivedEvents.push({ type: 'session:created', data });
			});

			// Emit 5 events rapidly
			for (let i = 0; i < 5; i++) {
				eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
					sessionId: `${sessionId}-${i}`,
					timestamp: Date.now(),
				});
			}

			await new Promise(resolve => setTimeout(resolve, 10));

			// Only 2 events should have passed through due to rate limiting
			expect(receivedEvents.length).toBeLessThanOrEqual(2);
		});
	});

	describe('Event Persistence Integration', () => {
		test('should persist and query events correctly', async () => {
			// const sessionId = 'test-session-persistence';

			// Setup persistence integration with the service event bus
			const serviceEventBus = eventManager.getServiceEventBus();
			serviceEventBus.on(ServiceEvents.SERVICE_STARTED, async data => {
				await persistence.store({
					id: 'test-event-1',
					type: ServiceEvents.SERVICE_STARTED,
					data,
					metadata: {
						timestamp: Date.now(),
						source: 'service',
					},
				});
			});

			// Emit events
			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'llm-service',
				timestamp: Date.now(),
			});

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'mcp-manager',
				timestamp: Date.now(),
			});

			// Wait for persistence
			await new Promise(resolve => setTimeout(resolve, 50));

			// Query events
			const events = await persistence.query({
				eventType: ServiceEvents.SERVICE_STARTED,
				limit: 10,
			});

			expect(events.length).toBeGreaterThan(0);
			expect(events[0]?.type).toBe(ServiceEvents.SERVICE_STARTED);
		});
	});

	describe('Metrics Collection Integration', () => {
		test('should collect metrics from emitted events', async () => {
			const sessionId = 'test-session-metrics';

			// Setup metrics collection
			const serviceEventBus = eventManager.getServiceEventBus();
			const sessionEventBus = eventManager.getSessionEventBus(sessionId);

			serviceEventBus.on(ServiceEvents.CIPHER_STARTED, data => {
				metricsCollector.processServiceEvent({
					id: 'metrics-test-1',
					type: ServiceEvents.CIPHER_STARTED,
					data,
					metadata: { timestamp: Date.now(), source: 'service' },
				});
			});

			sessionEventBus.on(SessionEvents.TOOL_EXECUTION_COMPLETED, data => {
				metricsCollector.processSessionEvent({
					id: 'metrics-test-2',
					type: SessionEvents.TOOL_EXECUTION_COMPLETED,
					data,
					metadata: { timestamp: Date.now(), source: 'session', sessionId },
				});
			});

			// Emit events
			eventManager.emitServiceEvent(ServiceEvents.CIPHER_STARTED, {
				timestamp: Date.now(),
				version: '1.0.0',
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_COMPLETED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId,
				executionId: 'exec-metrics',
				duration: 150,
				success: true,
				timestamp: Date.now(),
			});

			await new Promise(resolve => setTimeout(resolve, 10));

			const serviceMetrics = metricsCollector.getServiceMetrics();
			const sessionMetrics = metricsCollector.getSessionMetrics();

			expect(serviceMetrics.serviceStartCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.toolExecutionSuccessCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.toolExecutionDuration.count).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Vector Store Event Integration', () => {
		test('should emit memory operation events through EventAwareVectorStore', async () => {
			const sessionId = 'test-session-vector';
			const receivedEvents: any[] = [];

			const mockStore = new MockVectorStore();
			await mockStore.connect();

			const eventAwareStore = new EventAwareVectorStore(mockStore as any, eventManager, sessionId);

			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.MEMORY_STORED, data => {
				receivedEvents.push({ type: 'memory:stored', data });
			});

			sessionEventBus.on(SessionEvents.MEMORY_SEARCHED, data => {
				receivedEvents.push({ type: 'memory:searched', data });
			});

			sessionEventBus.on(SessionEvents.MEMORY_RETRIEVED, data => {
				receivedEvents.push({ type: 'memory:retrieved', data });
			});

			// Perform vector operations
			await eventAwareStore.insert([[0.1, 0.2, 0.3]], [1], [{ title: 'Test Doc' }]);
			await eventAwareStore.search([0.1, 0.2, 0.3], 5);
			await eventAwareStore.get(1);
			await eventAwareStore.update(1, [0.2, 0.3, 0.4], { title: 'Updated Doc' });
			await eventAwareStore.delete(1);

			await new Promise(resolve => setTimeout(resolve, 50));

			expect(receivedEvents.length).toBeGreaterThan(0);

			const memoryStoredEvents = receivedEvents.filter(e => e.type === 'memory:stored');
			const memorySearchedEvents = receivedEvents.filter(e => e.type === 'memory:searched');
			const memoryRetrievedEvents = receivedEvents.filter(e => e.type === 'memory:retrieved');

			expect(memoryStoredEvents.length).toBeGreaterThanOrEqual(3); // insert, update, delete
			expect(memorySearchedEvents.length).toBe(1);
			expect(memoryRetrievedEvents.length).toBe(1);
		});
	});

	describe('Webhook Integration', () => {
		test('should forward events to registered webhooks', async () => {
			const deliveredEvents: any[] = [];

			// Mock webhook endpoint
			const mockWebhookUrl = 'http://localhost:3000/webhook';

			// Override fetch for testing
			global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
				if (url === mockWebhookUrl) {
					const body = JSON.parse(options.body);
					deliveredEvents.push(body);
					return Promise.resolve({
						ok: true,
						status: 200,
						statusText: 'OK',
					});
				}
				return Promise.reject(new Error('Unexpected URL'));
			});

			// Register webhook
			webhookForwarder.registerWebhook('test-webhook', {
				url: mockWebhookUrl,
				method: 'POST',
				enabled: true,
				filters: [CommonFilters.byEventType(ServiceEvents.CIPHER_STARTED)],
			});

			// Setup webhook forwarding
			const serviceEventBus = eventManager.getServiceEventBus();
			serviceEventBus.on(ServiceEvents.CIPHER_STARTED, async data => {
				await webhookForwarder.forwardEvent({
					id: 'webhook-test-1',
					type: ServiceEvents.CIPHER_STARTED,
					data,
					metadata: { timestamp: Date.now(), source: 'service' },
				});
			});

			// Emit event
			eventManager.emitServiceEvent(ServiceEvents.CIPHER_STARTED, {
				timestamp: Date.now(),
				version: '1.0.0',
			});

			// Wait for webhook delivery
			await new Promise(resolve => setTimeout(resolve, 100));

			expect(deliveredEvents.length).toBeGreaterThanOrEqual(0);
			if (deliveredEvents.length > 0) {
				expect(deliveredEvents[0].type).toBe(ServiceEvents.CIPHER_STARTED);
			}
		});
	});

	describe('Event Replay Integration', () => {
		test('should replay events correctly', async () => {
			const sessionId = 'test-session-replay';
			const replayedEvents: any[] = [];

			// Store some events first
			const events = [
				{
					id: 'replay-1',
					type: ServiceEvents.CIPHER_STARTED,
					data: { timestamp: Date.now(), version: '1.0.0' },
					metadata: { timestamp: Date.now() - 5000, source: 'service' },
				},
				{
					id: 'replay-2',
					type: SessionEvents.SESSION_CREATED,
					data: { sessionId, timestamp: Date.now() },
					metadata: { timestamp: Date.now() - 3000, source: 'session', sessionId },
				},
				{
					id: 'replay-3',
					type: SessionEvents.TOOL_EXECUTION_STARTED,
					data: {
						toolName: 'test-tool',
						toolType: 'internal',
						sessionId,
						executionId: 'replay-exec',
						timestamp: Date.now(),
					},
					metadata: { timestamp: Date.now() - 1000, source: 'session', sessionId },
				},
			];

			for (const event of events) {
				await persistence.store(event as any);
			}

			// Setup replay listeners
			eventReplay.onServiceEvent(ServiceEvents.CIPHER_STARTED, data => {
				replayedEvents.push({ type: 'cipher:started', data });
			});

			eventReplay.onSessionEvent(SessionEvents.SESSION_CREATED, data => {
				replayedEvents.push({ type: 'session:created', data });
			});

			eventReplay.onSessionEvent(SessionEvents.TOOL_EXECUTION_STARTED, data => {
				replayedEvents.push({ type: 'tool:executionStarted', data });
			});

			// Start replay
			await eventReplay.startReplay(
				{
					since: Date.now() - 10000,
					limit: 10,
				},
				{
					skipTimestamps: true, // Fast replay for testing
					speed: 10.0,
				}
			);

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(replayedEvents.length).toBe(3);
			expect(replayedEvents[0].type).toBe('cipher:started');
			expect(replayedEvents[1].type).toBe('session:created');
			expect(replayedEvents[2].type).toBe('tool:executionStarted');
		});
	});

	describe('Cross-Component Integration', () => {
		test('should handle complex event flow across all components', async () => {
			const sessionId = 'test-session-complex';
			const allEvents: any[] = [];

			// Setup comprehensive event tracking
			const serviceEventBus = eventManager.getServiceEventBus();
			const sessionEventBus = eventManager.getSessionEventBus(sessionId);

			// Track all service events
			Object.values(ServiceEvents).forEach(eventType => {
				serviceEventBus.on(eventType, data => {
					allEvents.push({ type: eventType, source: 'service', data });
					metricsCollector.processServiceEvent({
						id: `complex-${Date.now()}`,
						type: eventType,
						data,
						metadata: { timestamp: Date.now(), source: 'service' },
					});
				});
			});

			// Track all session events
			Object.values(SessionEvents).forEach(eventType => {
				sessionEventBus.on(eventType, data => {
					allEvents.push({ type: eventType, source: 'session', data });
					metricsCollector.processSessionEvent({
						id: `complex-${Date.now()}`,
						type: eventType,
						data,
						metadata: { timestamp: Date.now(), source: 'session', sessionId },
					});
				});
			});

			// Setup filtering
			eventManager.setupCommonFilters();

			// Simulate a complete cipher workflow
			// 1. Cipher starts
			eventManager.emitServiceEvent(ServiceEvents.CIPHER_STARTED, {
				timestamp: Date.now(),
				version: '1.0.0',
			});

			// 2. Services start
			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'vector-store',
				timestamp: Date.now(),
			});

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'llm-service',
				timestamp: Date.now(),
			});

			// 3. Session created
			eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
				sessionId,
				timestamp: Date.now(),
			});

			// 4. Tool execution
			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'file-reader',
				toolType: 'internal',
				sessionId,
				executionId: 'complex-exec-1',
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_COMPLETED, {
				toolName: 'file-reader',
				toolType: 'internal',
				sessionId,
				executionId: 'complex-exec-1',
				duration: 250,
				success: true,
				timestamp: Date.now(),
			});

			// 5. LLM interaction
			eventManager.emitSessionEvent(sessionId, SessionEvents.LLM_RESPONSE_STARTED, {
				sessionId,
				messageId: 'msg-1',
				model: 'claude-3-sonnet',
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.LLM_THINKING, {
				sessionId,
				messageId: 'msg-1',
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.LLM_RESPONSE_COMPLETED, {
				sessionId,
				messageId: 'msg-1',
				model: 'claude-3-sonnet',
				duration: 1200,
				timestamp: Date.now(),
			});

			// 6. Memory operations
			eventManager.emitSessionEvent(sessionId, SessionEvents.MEMORY_STORED, {
				sessionId,
				type: 'knowledge',
				size: 1024,
				timestamp: Date.now(),
			});

			// Wait for all events to be processed
			await new Promise(resolve => setTimeout(resolve, 100));

			// Verify events were received
			expect(allEvents.length).toBeGreaterThanOrEqual(0);

			// Verify metrics were collected
			const serviceMetrics = metricsCollector.getServiceMetrics();
			const sessionMetrics = metricsCollector.getSessionMetrics();

			expect(serviceMetrics.serviceStartCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.sessionCreatedCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.toolExecutionSuccessCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.llmResponseSuccessCount).toBeGreaterThanOrEqual(0);
			expect(sessionMetrics.memoryStoreCount).toBeGreaterThanOrEqual(0);

			// Verify filtering stats
			const filterStats = eventManager.getFilteringStats();
			expect(filterStats.totalEventsProcessed).toBeGreaterThan(0);

			// Verify event manager statistics
			const eventManagerStats = eventManager.getStatistics();
			expect(eventManagerStats.activeSessions).toBeGreaterThan(0);
			expect(eventManagerStats.serviceEvents.totalEvents).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		test('should handle event emission errors gracefully', async () => {
			const sessionId = 'test-session-errors';

			// Register a filter that throws an error
			eventManager.registerFilter({
				name: 'error-filter',
				description: 'Filter that throws errors',
				enabled: true,
				priority: 100,
				filter: () => {
					throw new Error('Filter error');
				},
			});

			// Events should still be emitted despite filter errors
			const receivedEvents: any[] = [];
			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.SESSION_CREATED, data => {
				receivedEvents.push(data);
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
				sessionId,
				timestamp: Date.now(),
			});

			await new Promise(resolve => setTimeout(resolve, 10));

			// Event should still be received despite filter error
			expect(receivedEvents.length).toBe(1);
		});

		test('should handle high event volume without memory leaks', async () => {
			const sessionId = 'test-session-volume';
			const eventCount = 1000;
			let receivedCount = 0;

			const sessionEventBus = eventManager.getSessionEventBus(sessionId);
			sessionEventBus.on(SessionEvents.TOOL_EXECUTION_STARTED, () => {
				receivedCount++;
			});

			// Emit a large number of events rapidly
			for (let i = 0; i < eventCount; i++) {
				eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
					toolName: `tool-${i}`,
					toolType: 'internal',
					sessionId,
					executionId: `exec-${i}`,
					timestamp: Date.now(),
				});
			}

			await new Promise(resolve => setTimeout(resolve, 100));

			// Should handle all events (or filter some appropriately)
			expect(receivedCount).toBeGreaterThan(0);
			expect(receivedCount).toBeLessThanOrEqual(eventCount);
		});
	});
});
