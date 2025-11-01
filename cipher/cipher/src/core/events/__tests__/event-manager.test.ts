import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventManager } from '../event-manager.js';
import { ServiceEvents, SessionEvents } from '../event-types.js';

describe('EventManager', () => {
	let eventManager: EventManager;
	let mockServiceListener: ReturnType<typeof vi.fn>;
	let mockSessionListener: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		eventManager = new EventManager({
			enableLogging: false,
			enablePersistence: true,
			maxServiceListeners: 100,
			maxSessionListeners: 50,
			maxSessionHistorySize: 200,
			sessionCleanupInterval: 1000, // 1 second for testing
		});
		mockServiceListener = vi.fn();
		mockSessionListener = vi.fn();
	});

	afterEach(() => {
		eventManager.dispose();
	});

	describe('Service Event Management', () => {
		it('should get service event bus', () => {
			const serviceBus = eventManager.getServiceEventBus();
			expect(serviceBus).toBeDefined();
			expect(serviceBus.getInstanceId()).toBeDefined();
		});

		it('should emit service events', () => {
			const serviceBus = eventManager.getServiceEventBus();
			serviceBus.on(ServiceEvents.SERVICE_STARTED, mockServiceListener);

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});

			expect(mockServiceListener).toHaveBeenCalledWith({
				serviceType: 'TestService',
				timestamp: expect.any(Number),
			});
		});

		it('should not emit service events when disposed', () => {
			const serviceBus = eventManager.getServiceEventBus();
			serviceBus.on(ServiceEvents.SERVICE_STARTED, mockServiceListener);

			eventManager.dispose();

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});

			expect(mockServiceListener).not.toHaveBeenCalled();
		});
	});

	describe('Session Event Management', () => {
		const testSessionId = 'test-session-123';

		it('should create session event bus on demand', () => {
			const sessionBus = eventManager.getSessionEventBus(testSessionId);
			expect(sessionBus).toBeDefined();
			expect(sessionBus.getSessionId()).toBe(testSessionId);
		});

		it('should return same session event bus for same session ID', () => {
			const sessionBus1 = eventManager.getSessionEventBus(testSessionId);
			const sessionBus2 = eventManager.getSessionEventBus(testSessionId);

			expect(sessionBus1).toBe(sessionBus2);
		});

		it('should emit session events', () => {
			const sessionBus = eventManager.getSessionEventBus(testSessionId);
			sessionBus.on(SessionEvents.SESSION_CREATED, mockSessionListener);

			eventManager.emitSessionEvent(testSessionId, SessionEvents.SESSION_CREATED, {
				sessionId: testSessionId,
				timestamp: Date.now(),
			});

			expect(mockSessionListener).toHaveBeenCalledWith({
				sessionId: testSessionId,
				timestamp: expect.any(Number),
			});
		});

		it('should remove session event bus', () => {
			const sessionBus = eventManager.getSessionEventBus(testSessionId);
			expect(eventManager.getActiveSessionIds()).toContain(testSessionId);

			eventManager.removeSessionEventBus(testSessionId);

			expect(eventManager.getActiveSessionIds()).not.toContain(testSessionId);
			expect(sessionBus.isSessionDisposed()).toBe(true);
		});
	});

	describe('Multi-Session Management', () => {
		it('should manage multiple sessions', () => {
			const session1 = 'session-1';
			const session2 = 'session-2';
			const session3 = 'session-3';

			eventManager.getSessionEventBus(session1);
			eventManager.getSessionEventBus(session2);
			eventManager.getSessionEventBus(session3);

			const activeSessionIds = eventManager.getActiveSessionIds();
			expect(activeSessionIds).toHaveLength(3);
			expect(activeSessionIds).toContain(session1);
			expect(activeSessionIds).toContain(session2);
			expect(activeSessionIds).toContain(session3);
		});

		it('should provide correct session count in statistics', () => {
			eventManager.getSessionEventBus('session-1');
			eventManager.getSessionEventBus('session-2');

			const stats = eventManager.getStatistics();
			expect(stats.totalSessions).toBe(2);
			expect(stats.activeSessions).toBe(2);
		});
	});

	describe('Event Search', () => {
		const session1 = 'session-1';
		const session2 = 'session-2';

		beforeEach(() => {
			// Set up test events across multiple sessions
			eventManager.emitSessionEvent(session1, SessionEvents.SESSION_CREATED, {
				sessionId: session1,
				timestamp: Date.now(),
			});
			eventManager.emitSessionEvent(session1, SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId: session1,
				executionId: 'exec-1',
				timestamp: Date.now(),
			});
			eventManager.emitSessionEvent(session2, SessionEvents.SESSION_CREATED, {
				sessionId: session2,
				timestamp: Date.now(),
			});
		});

		it('should search events across all sessions', () => {
			const sessionCreatedEvents = eventManager.searchSessionEvents({
				eventType: SessionEvents.SESSION_CREATED,
			});

			expect(sessionCreatedEvents).toHaveLength(2);
			expect(
				sessionCreatedEvents.every(event => event.type === SessionEvents.SESSION_CREATED)
			).toBe(true);
		});

		it('should search events for specific session', () => {
			const session1Events = eventManager.searchSessionEvents({
				sessionId: session1,
			});

			expect(session1Events).toHaveLength(2);
			expect(session1Events.every(event => event.metadata.sessionId === session1)).toBe(true);
		});

		it('should search events by pattern', () => {
			const sessionEvents = eventManager.searchSessionEvents({
				pattern: /^session:/,
			});

			expect(sessionEvents).toHaveLength(2);
			expect(sessionEvents.every(event => event.type.startsWith('session:'))).toBe(true);
		});

		it('should limit search results', () => {
			const limitedEvents = eventManager.searchSessionEvents({
				limit: 1,
			});

			expect(limitedEvents).toHaveLength(1);
		});

		it('should return empty array when persistence is disabled', () => {
			const noPersistenceManager = new EventManager({
				enablePersistence: false,
			});

			noPersistenceManager.emitSessionEvent(session1, SessionEvents.SESSION_CREATED, {
				sessionId: session1,
				timestamp: Date.now(),
			});

			const events = noPersistenceManager.searchSessionEvents({
				sessionId: session1,
			});

			expect(events).toHaveLength(0);

			noPersistenceManager.dispose();
		});
	});

	describe('Statistics', () => {
		it('should provide comprehensive statistics', () => {
			// Create sessions and emit events
			eventManager.getSessionEventBus('session-1');
			eventManager.getSessionEventBus('session-2');

			eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent('session-1', SessionEvents.SESSION_CREATED, {
				sessionId: 'session-1',
				timestamp: Date.now(),
			});

			const stats = eventManager.getStatistics();

			expect(stats.instanceId).toBeDefined();
			expect(stats.uptime).toBeGreaterThanOrEqual(0);
			expect(stats.totalSessions).toBe(2);
			expect(stats.activeSessions).toBe(2);
			expect(stats.serviceEvents.totalEvents).toBe(1);
			expect(stats.sessionStats).toHaveLength(2);
		});

		it('should track session statistics correctly', () => {
			const sessionId = 'test-session';

			eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
				sessionId,
				timestamp: Date.now(),
			});

			eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
				toolName: 'test-tool',
				toolType: 'internal',
				sessionId,
				executionId: 'exec-1',
				timestamp: Date.now(),
			});

			const stats = eventManager.getStatistics();
			const sessionStats = stats.sessionStats.find(s => s.sessionId === sessionId);

			expect(sessionStats).toBeDefined();
			expect(sessionStats!.totalEvents).toBe(2);
			expect(sessionStats!.age).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Cleanup', () => {
		it('should clean up inactive sessions', async () => {
			const sessionBus = eventManager.getSessionEventBus('test-session');
			expect(eventManager.getActiveSessionIds()).toContain('test-session');

			// Dispose the session bus to simulate inactivity
			sessionBus.dispose();

			// Wait for cleanup interval
			await new Promise(resolve => setTimeout(resolve, 1100));

			expect(eventManager.getActiveSessionIds()).not.toContain('test-session');
		});
	});

	describe('Error Handling', () => {
		it('should throw error when accessing disposed event manager', () => {
			eventManager.dispose();

			expect(() => eventManager.getServiceEventBus()).toThrow('EventManager is disposed');
			expect(() => eventManager.getSessionEventBus('test')).toThrow('EventManager is disposed');
		});

		it('should handle session events for non-existent sessions gracefully', () => {
			// This should not throw
			expect(() => {
				eventManager.emitSessionEvent('non-existent-session', SessionEvents.SESSION_CREATED, {
					sessionId: 'non-existent-session',
					timestamp: Date.now(),
				});
			}).not.toThrow();
		});
	});

	describe('Instance Management', () => {
		it('should provide instance ID', () => {
			const instanceId = eventManager.getInstanceId();
			expect(instanceId).toBeDefined();
			expect(typeof instanceId).toBe('string');
		});

		it('should track disposed state', () => {
			expect(eventManager.isEventManagerDisposed()).toBe(false);

			eventManager.dispose();

			expect(eventManager.isEventManagerDisposed()).toBe(true);
		});
	});

	describe('Forwarding Rules', () => {
		it('should create forwarding rules without errors', () => {
			// This is a placeholder test for future forwarding functionality
			expect(() => {
				eventManager.createForwardingRule(SessionEvents.SESSION_CREATED, true);
			}).not.toThrow();
		});
	});

	describe('Disposal', () => {
		it('should clean up all resources on dispose', () => {
			const session1 = eventManager.getSessionEventBus('session-1');
			const session2 = eventManager.getSessionEventBus('session-2');

			expect(eventManager.getActiveSessionIds()).toHaveLength(2);
			expect(session1.isSessionDisposed()).toBe(false);
			expect(session2.isSessionDisposed()).toBe(false);

			eventManager.dispose();

			expect(eventManager.getActiveSessionIds()).toHaveLength(0);
			expect(session1.isSessionDisposed()).toBe(true);
			expect(session2.isSessionDisposed()).toBe(true);
			expect(eventManager.isEventManagerDisposed()).toBe(true);
		});
	});
});
