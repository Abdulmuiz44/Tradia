import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceEventBus } from '../service-event-bus.js';
import { ServiceEvents } from '../event-types.js';

describe('ServiceEventBus', () => {
	let serviceBus: ServiceEventBus;
	let mockListener: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		serviceBus = new ServiceEventBus({
			enableLogging: false,
			enablePersistence: true,
			maxListeners: 100,
		});
		mockListener = vi.fn();
	});

	afterEach(() => {
		serviceBus.dispose();
	});

	describe('Event Emission', () => {
		it('should emit service events with metadata', () => {
			const eventData = { serviceType: 'TestService', timestamp: Date.now() };

			serviceBus.on(ServiceEvents.SERVICE_STARTED, mockListener);
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, eventData);

			expect(mockListener).toHaveBeenCalledWith(eventData);
		});

		it('should emit events with custom metadata', () => {
			const eventData = { serviceType: 'TestService', timestamp: Date.now() };
			const customMetadata = { priority: 'high' as const, tags: ['test'] };

			serviceBus.on(ServiceEvents.SERVICE_STARTED, mockListener);
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, eventData, customMetadata);

			expect(mockListener).toHaveBeenCalledWith(eventData);
		});
	});

	describe('Event Persistence', () => {
		it('should store events in history when persistence is enabled', () => {
			const eventData = { serviceType: 'TestService', timestamp: Date.now() };

			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, eventData);

			const history = serviceBus.getEventHistory();
			expect(history).toHaveLength(1);
			expect(history[0]?.type).toBe(ServiceEvents.SERVICE_STARTED);
			expect(history[0]?.data).toEqual(eventData);
		});

		it('should filter event history by type', () => {
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service1',
				timestamp: Date.now(),
			});
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_ERROR, {
				serviceType: 'Service2',
				error: 'Test error',
				timestamp: Date.now(),
			});
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service3',
				timestamp: Date.now(),
			});

			const startedEvents = serviceBus.getEventHistory({
				eventType: ServiceEvents.SERVICE_STARTED,
			});
			expect(startedEvents).toHaveLength(2);
			expect(startedEvents.every(event => event.type === ServiceEvents.SERVICE_STARTED)).toBe(true);
		});

		it('should filter event history by time', () => {
			const now = Date.now();
			const pastTime = now - 1000;

			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service1',
				timestamp: pastTime,
			});
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service2',
				timestamp: now,
			});

			const recentEvents = serviceBus.getEventHistory({ since: pastTime + 500 });
			expect(recentEvents.length).toBeGreaterThanOrEqual(1);
			expect(recentEvents.some(e => e.data.serviceType === 'Service2')).toBe(true);
		});

		it('should limit event history results', () => {
			for (let i = 0; i < 5; i++) {
				serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
					serviceType: `Service${i}`,
					timestamp: Date.now(),
				});
			}

			const limitedEvents = serviceBus.getEventHistory({ limit: 3 });
			expect(limitedEvents).toHaveLength(3);
		});

		it('should clear event history', () => {
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});
			expect(serviceBus.getEventHistory()).toHaveLength(1);

			serviceBus.clearHistory();
			expect(serviceBus.getEventHistory()).toHaveLength(0);
		});
	});

	describe('Statistics', () => {
		it('should provide comprehensive statistics', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			serviceBus.on(ServiceEvents.SERVICE_STARTED, listener1);
			serviceBus.on(ServiceEvents.SERVICE_ERROR, listener2);

			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service1',
				timestamp: Date.now(),
			});
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'Service2',
				timestamp: Date.now(),
			});
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_ERROR, {
				serviceType: 'Service3',
				error: 'Test error',
				timestamp: Date.now(),
			});

			const stats = serviceBus.getStatistics();

			expect(stats.instanceId).toBeDefined();
			expect(stats.uptime).toBeGreaterThanOrEqual(0);
			expect(stats.totalEvents).toBe(3);
			expect(stats.eventTypes[ServiceEvents.SERVICE_STARTED]).toBe(2);
			expect(stats.eventTypes[ServiceEvents.SERVICE_ERROR]).toBe(1);
			expect(stats.activeListeners[ServiceEvents.SERVICE_STARTED]).toBe(1);
			expect(stats.activeListeners[ServiceEvents.SERVICE_ERROR]).toBe(1);
		});

		it('should track uptime correctly', async () => {
			const initialStats = serviceBus.getStatistics();
			const initialUptime = initialStats.uptime;

			await new Promise(resolve => setTimeout(resolve, 100));

			const laterStats = serviceBus.getStatistics();
			expect(laterStats.uptime).toBeGreaterThanOrEqual(initialUptime);
		});
	});

	describe('Instance Management', () => {
		it('should provide instance ID', () => {
			const instanceId = serviceBus.getInstanceId();
			expect(instanceId).toBeDefined();
			expect(typeof instanceId).toBe('string');
		});

		it('should provide uptime', () => {
			const uptime = serviceBus.getUptime();
			expect(uptime).toBeGreaterThanOrEqual(0);
			expect(typeof uptime).toBe('number');
		});
	});

	describe('Disposal', () => {
		it('should clean up resources on dispose', () => {
			serviceBus.on(ServiceEvents.SERVICE_STARTED, mockListener);
			serviceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});

			expect(serviceBus.getEventHistory()).toHaveLength(1);
			expect(serviceBus.listenerCountFor(ServiceEvents.SERVICE_STARTED)).toBe(1);

			serviceBus.dispose();

			expect(serviceBus.getEventHistory()).toHaveLength(0);
			expect(serviceBus.listenerCountFor(ServiceEvents.SERVICE_STARTED)).toBe(0);
		});
	});

	describe('No Persistence Mode', () => {
		it('should not store events when persistence is disabled', () => {
			const noPersistenceBus = new ServiceEventBus({ enablePersistence: false });

			noPersistenceBus.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
				serviceType: 'TestService',
				timestamp: Date.now(),
			});

			expect(noPersistenceBus.getEventHistory()).toHaveLength(0);

			noPersistenceBus.dispose();
		});
	});
});
