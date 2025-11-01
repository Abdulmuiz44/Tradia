import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionEventBus } from '../session-event-bus.js';
import { SessionEvents } from '../event-types.js';

describe('SessionEventBus', () => {
	let sessionBus: SessionEventBus;
	let mockListener: ReturnType<typeof vi.fn>;
	const testSessionId = 'test-session-123';

	beforeEach(() => {
		sessionBus = new SessionEventBus({
			sessionId: testSessionId,
			enableLogging: false,
			enablePersistence: true,
			maxListeners: 50,
			maxHistorySize: 100,
		});
		mockListener = vi.fn();
	});

	afterEach(() => {
		sessionBus.dispose();
	});

	describe('Session Management', () => {
		it('should initialize with correct session ID', () => {
			expect(sessionBus.getSessionId()).toBe(testSessionId);
			expect(sessionBus.getAge()).toBeGreaterThanOrEqual(0);
			expect(sessionBus.isSessionDisposed()).toBe(false);
		});

		it('should track session age correctly', async () => {
			const initialAge = sessionBus.getAge();

			await new Promise(resolve => setTimeout(resolve, 50));

			const laterAge = sessionBus.getAge();
			expect(laterAge).toBeGreaterThan(initialAge);
		});
	});

	describe('Event Emission', () => {
		it('should emit session events with metadata', () => {
			const eventData = { sessionId: testSessionId, timestamp: Date.now() };

			sessionBus.on(SessionEvents.SESSION_CREATED, mockListener);
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, eventData);

			expect(mockListener).toHaveBeenCalledWith(eventData);
		});

		it('should not emit events when disposed', () => {
			sessionBus.dispose();

			sessionBus.on(SessionEvents.SESSION_CREATED, mockListener);
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});

			expect(mockListener).not.toHaveBeenCalled();
		});
	});

	describe('Event Persistence', () => {
		it('should store events in history when persistence is enabled', () => {
			const eventData = { sessionId: testSessionId, timestamp: Date.now() };

			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, eventData);

			const history = sessionBus.getEventHistory();
			expect(history).toHaveLength(1);
			expect(history[0]?.type).toBe(SessionEvents.SESSION_CREATED);
			expect(history[0]?.data).toEqual(eventData);
			expect(history[0]?.metadata.sessionId).toBe(testSessionId);
		});

		it('should filter event history by type', () => {
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
			sessionBus.emitSessionEvent(SessionEvents.SESSION_ACTIVATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});

			const createdEvents = sessionBus.getEventHistory({
				eventType: SessionEvents.SESSION_CREATED,
			});
			expect(createdEvents).toHaveLength(2);
			expect(createdEvents.every(event => event.type === SessionEvents.SESSION_CREATED)).toBe(true);
		});

		it('should maintain maximum history size', () => {
			const maxSize = 5;
			const smallHistoryBus = new SessionEventBus({
				sessionId: testSessionId,
				enablePersistence: true,
				maxHistorySize: maxSize,
			});

			// Emit more events than max size
			for (let i = 0; i < maxSize + 3; i++) {
				smallHistoryBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
					sessionId: testSessionId,
					timestamp: Date.now() + i,
				});
			}

			const history = smallHistoryBus.getEventHistory();
			expect(history).toHaveLength(maxSize);

			smallHistoryBus.dispose();
		});
	});

	describe('Event Queries', () => {
		beforeEach(() => {
			// Set up test events
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
			sessionBus.emitSessionEvent(SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId: testSessionId,
				executionId: 'exec-1',
				timestamp: Date.now(),
			});
			sessionBus.emitSessionEvent(SessionEvents.SESSION_ACTIVATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
		});

		it('should get events by pattern', () => {
			const sessionEvents = sessionBus.getEventsByPattern(/^session:/);
			expect(sessionEvents).toHaveLength(2);
			expect(sessionEvents.every(event => event.type.startsWith('session:'))).toBe(true);
		});

		it('should get last event of specific type', () => {
			const lastSessionEvent = sessionBus.getLastEvent(SessionEvents.SESSION_CREATED);
			expect(lastSessionEvent).toBeDefined();
			expect(lastSessionEvent!.type).toBe(SessionEvents.SESSION_CREATED);
		});

		it('should count events of specific type', () => {
			const sessionEventCount = sessionBus.countEvents(SessionEvents.SESSION_CREATED);
			expect(sessionEventCount).toBe(1);

			const toolEventCount = sessionBus.countEvents(SessionEvents.TOOL_EXECUTION_STARTED);
			expect(toolEventCount).toBe(1);
		});

		it('should return undefined for non-existent event type', () => {
			const nonExistentEvent = sessionBus.getLastEvent(SessionEvents.SESSION_EXPIRED);
			expect(nonExistentEvent).toBeUndefined();
		});
	});

	describe('Statistics', () => {
		it('should provide comprehensive statistics', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			sessionBus.on(SessionEvents.SESSION_CREATED, listener1);
			sessionBus.on(SessionEvents.TOOL_EXECUTION_STARTED, listener2);

			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
			sessionBus.emitSessionEvent(SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId: testSessionId,
				executionId: 'exec-1',
				timestamp: Date.now(),
			});

			const stats = sessionBus.getStatistics();

			expect(stats.sessionId).toBe(testSessionId);
			expect(stats.age).toBeGreaterThanOrEqual(0);
			expect(stats.totalEvents).toBe(2);
			expect(stats.eventTypes[SessionEvents.SESSION_CREATED]).toBe(1);
			expect(stats.eventTypes[SessionEvents.TOOL_EXECUTION_STARTED]).toBe(1);
			expect(stats.activeListeners[SessionEvents.SESSION_CREATED]).toBe(1);
			expect(stats.activeListeners[SessionEvents.TOOL_EXECUTION_STARTED]).toBe(1);
		});

		it('should track recent activity', async () => {
			const now = Date.now();

			// Emit events in different time windows
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: now - 120000,
			}); // 2 minutes ago
			sessionBus.emitSessionEvent(SessionEvents.SESSION_ACTIVATED, {
				sessionId: testSessionId,
				timestamp: now - 30000,
			}); // 30 seconds ago
			sessionBus.emitSessionEvent(SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId: testSessionId,
				executionId: 'exec-1',
				timestamp: now - 5000, // 5 seconds ago
			});

			const stats = sessionBus.getStatistics();

			expect(stats.recentActivity.lastEventTime).toBeDefined();
			expect(stats.recentActivity.eventsInLastHour).toBe(3);
			expect(stats.recentActivity.eventsInLastMinute).toBeGreaterThanOrEqual(2);
		});
	});

	describe('History Management', () => {
		it('should clear event history', () => {
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});
			expect(sessionBus.getEventHistory()).toHaveLength(1);

			sessionBus.clearHistory();
			expect(sessionBus.getEventHistory()).toHaveLength(0);
		});
	});

	describe('Disposal', () => {
		it('should mark session as disposed', () => {
			expect(sessionBus.isSessionDisposed()).toBe(false);

			sessionBus.dispose();

			expect(sessionBus.isSessionDisposed()).toBe(true);
		});

		it('should clean up resources on dispose', () => {
			sessionBus.on(SessionEvents.SESSION_CREATED, mockListener);
			sessionBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});

			expect(sessionBus.getEventHistory()).toHaveLength(1);
			expect(sessionBus.listenerCountFor(SessionEvents.SESSION_CREATED)).toBe(1);

			sessionBus.dispose();

			expect(sessionBus.getEventHistory()).toHaveLength(0);
			expect(sessionBus.listenerCountFor(SessionEvents.SESSION_CREATED)).toBe(0);
		});
	});

	describe('No Persistence Mode', () => {
		it('should not store events when persistence is disabled', () => {
			const noPersistenceBus = new SessionEventBus({
				sessionId: testSessionId,
				enablePersistence: false,
			});

			noPersistenceBus.emitSessionEvent(SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});

			expect(noPersistenceBus.getEventHistory()).toHaveLength(0);
			expect(noPersistenceBus.getLastEvent(SessionEvents.SESSION_CREATED)).toBeUndefined();
			expect(noPersistenceBus.countEvents(SessionEvents.SESSION_CREATED)).toBe(0);

			noPersistenceBus.dispose();
		});
	});
});
