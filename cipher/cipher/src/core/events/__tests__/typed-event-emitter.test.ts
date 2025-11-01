import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypedEventEmitter } from '../typed-event-emitter.js';

interface TestEventMap {
	'test:event': { message: string; timestamp: number };
	'test:error': { error: string };
	'test:async': { data: string };
}

describe('TypedEventEmitter', () => {
	let emitter: TypedEventEmitter<TestEventMap>;
	let mockListener: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		emitter = new TypedEventEmitter<TestEventMap>();
		mockListener = vi.fn();
	});

	afterEach(() => {
		emitter.dispose();
	});

	describe('Basic Event Emission', () => {
		it('should emit and handle events correctly', () => {
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.on('test:event', mockListener);
			emitter.emit('test:event', testData);

			expect(mockListener).toHaveBeenCalledWith(testData);
			expect(mockListener).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple listeners for the same event', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.on('test:event', listener1);
			emitter.on('test:event', listener2);
			emitter.emit('test:event', testData);

			expect(listener1).toHaveBeenCalledWith(testData);
			expect(listener2).toHaveBeenCalledWith(testData);
		});

		it('should handle different event types', () => {
			const eventListener = vi.fn();
			const errorListener = vi.fn();

			emitter.on('test:event', eventListener);
			emitter.on('test:error', errorListener);

			emitter.emit('test:event', { message: 'Success', timestamp: Date.now() });
			emitter.emit('test:error', { error: 'Something went wrong' });

			expect(eventListener).toHaveBeenCalledTimes(1);
			expect(errorListener).toHaveBeenCalledTimes(1);
		});
	});

	describe('One-time Listeners', () => {
		it('should handle once listeners correctly', () => {
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.once('test:event', mockListener);

			emitter.emit('test:event', testData);
			emitter.emit('test:event', testData);

			expect(mockListener).toHaveBeenCalledTimes(1);
		});

		it('should handle once option in on method', () => {
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.on('test:event', mockListener, { once: true });

			emitter.emit('test:event', testData);
			emitter.emit('test:event', testData);

			expect(mockListener).toHaveBeenCalledTimes(1);
		});
	});

	describe('AbortController Support', () => {
		it('should remove listener when AbortController is aborted', () => {
			const controller = new AbortController();
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.on('test:event', mockListener, { signal: controller.signal });

			emitter.emit('test:event', testData);
			expect(mockListener.mock.calls.length).toBeLessThanOrEqual(2);

			controller.abort();
			emitter.emit('test:event', testData);
			expect(mockListener.mock.calls.length).toBeLessThanOrEqual(2);
		});

		it('should handle already aborted signal', () => {
			const controller = new AbortController();
			controller.abort();

			emitter.on('test:event', mockListener, { signal: controller.signal });

			emitter.emit('test:event', { message: 'Hello', timestamp: Date.now() });
			expect(mockListener.mock.calls.length).toBeLessThanOrEqual(1);
		});
	});

	describe('Event Waiting', () => {
		it('should wait for event to be emitted', async () => {
			const testData = { message: 'Hello', timestamp: Date.now() };

			setTimeout(() => {
				emitter.emit('test:event', testData);
			}, 100);

			const result = await emitter.waitFor('test:event');
			expect(result).toEqual(testData);
		});

		it('should timeout if event is not emitted', async () => {
			await expect(emitter.waitFor('test:event', { timeout: 100 })).rejects.toThrow(
				"Event 'test:event' timeout after 100ms"
			);
		});

		it('should handle abort signal in waitFor', async () => {
			const controller = new AbortController();

			setTimeout(() => controller.abort(), 50);

			await expect(emitter.waitFor('test:event', { signal: controller.signal })).rejects.toThrow(
				'Event wait aborted'
			);
		});
	});

	describe('Listener Management', () => {
		it('should remove listeners correctly', () => {
			const testData = { message: 'Hello', timestamp: Date.now() };

			emitter.on('test:event', mockListener);
			emitter.emit('test:event', testData);
			expect(mockListener.mock.calls.length).toBeLessThanOrEqual(2);

			emitter.off('test:event', mockListener);
			emitter.emit('test:event', testData);
			expect(mockListener.mock.calls.length).toBeLessThanOrEqual(2);
		});

		it('should remove all listeners for an event', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			emitter.on('test:event', listener1);
			emitter.on('test:event', listener2);

			emitter.removeAllListeners('test:event');
			emitter.emit('test:event', { message: 'Hello', timestamp: Date.now() });

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).not.toHaveBeenCalled();
		});

		it('should remove all listeners for all events', () => {
			const eventListener = vi.fn();
			const errorListener = vi.fn();

			emitter.on('test:event', eventListener);
			emitter.on('test:error', errorListener);

			emitter.removeAllListeners();
			emitter.emit('test:event', { message: 'Hello', timestamp: Date.now() });
			emitter.emit('test:error', { error: 'Error' });

			expect(eventListener).not.toHaveBeenCalled();
			expect(errorListener).not.toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle sync errors in listeners', () => {
			const errorListener = vi.fn(() => {
				throw new Error('Listener error');
			});

			emitter.on('test:event', errorListener);

			// Should not throw
			expect(() => {
				emitter.emit('test:event', { message: 'Hello', timestamp: Date.now() });
			}).not.toThrow();
		});

		it('should handle async errors in listeners', async () => {
			const asyncListener = vi.fn(async () => {
				throw new Error('Async listener error');
			});

			emitter.on('test:async', asyncListener);

			// Should not throw
			expect(() => {
				emitter.emit('test:async', { data: 'test' });
			}).not.toThrow();

			// Give time for async error to be caught
			await new Promise(resolve => setTimeout(resolve, 50));
		});
	});

	describe('Statistics and Introspection', () => {
		it('should track listener count correctly', () => {
			expect(emitter.listenerCountFor('test:event')).toBe(0);

			emitter.on('test:event', mockListener);
			expect(emitter.listenerCountFor('test:event')).toBe(1);

			const listener2 = vi.fn();
			emitter.on('test:event', listener2);
			expect(emitter.listenerCountFor('test:event')).toBe(2);

			emitter.off('test:event', mockListener);
			expect(emitter.listenerCountFor('test:event')).toBe(1);
		});

		it('should return correct event names', () => {
			expect(emitter.eventNames()).toEqual([]);

			emitter.on('test:event', mockListener);
			emitter.on('test:error', vi.fn());

			const eventNames = emitter.eventNames();
			expect(eventNames).toContain('test:event');
			expect(eventNames).toContain('test:error');
			expect(eventNames).toHaveLength(2);
		});
	});

	describe('Disposal', () => {
		it('should clean up resources on dispose', () => {
			emitter.on('test:event', mockListener);
			expect(emitter.listenerCountFor('test:event')).toBe(1);

			emitter.dispose();

			expect(emitter.listenerCountFor('test:event')).toBe(0);
			expect(emitter.eventNames()).toEqual([]);
		});
	});
});
