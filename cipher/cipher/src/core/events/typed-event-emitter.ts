import EventEmitter from 'events';
import { logger } from '../logger/logger.js';

export type EventListener<T> = (event: T) => void | Promise<void>;
export type EventListenerOptions = {
	signal?: AbortSignal;
	once?: boolean;
	priority?: 'high' | 'normal' | 'low';
};

export class TypedEventEmitter<EventMap extends Record<string, any>> {
	private emitter = new EventEmitter();
	private readonly maxListeners: number;
	private readonly enableLogging: boolean;
	private listenerCount = new Map<string, number>();

	constructor(options: { maxListeners?: number; enableLogging?: boolean } = {}) {
		this.maxListeners = options.maxListeners ?? 100;
		this.enableLogging = options.enableLogging ?? false;
		this.emitter.setMaxListeners(this.maxListeners);
	}

	/**
	 * Emit an event with type safety
	 */
	emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
		if (this.enableLogging) {
			logger.debug('Event emitted', { event: event as string, data });
		}

		// Emit with error handling for async listeners
		this.emitter.emit(event as string, data);
	}

	/**
	 * Add a typed event listener with AbortController support
	 */
	on<K extends keyof EventMap>(
		event: K,
		listener: EventListener<EventMap[K]>,
		options: EventListenerOptions = {}
	): void {
		const wrappedListener = this.wrapListener(listener, event as string, options);

		if (options.once) {
			this.emitter.once(event as string, wrappedListener);
		} else {
			this.emitter.on(event as string, wrappedListener);
		}

		// Track listener count
		const currentCount = this.listenerCount.get(event as string) || 0;
		this.listenerCount.set(event as string, currentCount + 1);

		// Handle AbortController
		if (options.signal) {
			options.signal.addEventListener('abort', () => {
				this.off(event, listener);
			});
		}
	}

	/**
	 * Add a one-time event listener
	 */
	once<K extends keyof EventMap>(
		event: K,
		listener: EventListener<EventMap[K]>,
		options: Omit<EventListenerOptions, 'once'> = {}
	): void {
		this.on(event, listener, { ...options, once: true });
	}

	/**
	 * Remove an event listener
	 */
	off<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
		this.emitter.off(event as string, listener as any);

		// Update listener count
		const currentCount = this.listenerCount.get(event as string) || 0;
		if (currentCount > 0) {
			this.listenerCount.set(event as string, currentCount - 1);
		}
	}

	/**
	 * Remove all listeners for an event
	 */
	removeAllListeners<K extends keyof EventMap>(event?: K): void {
		if (event) {
			this.emitter.removeAllListeners(event as string);
			this.listenerCount.set(event as string, 0);
		} else {
			this.emitter.removeAllListeners();
			this.listenerCount.clear();
		}
	}

	/**
	 * Get the number of listeners for an event
	 */
	listenerCountFor<K extends keyof EventMap>(event: K): number {
		return this.listenerCount.get(event as string) || 0;
	}

	/**
	 * Get all event names that have listeners
	 */
	eventNames(): (keyof EventMap)[] {
		return this.emitter.eventNames() as (keyof EventMap)[];
	}

	/**
	 * Wait for a specific event to be emitted
	 */
	waitFor<K extends keyof EventMap>(
		event: K,
		options: { timeout?: number; signal?: AbortSignal } = {}
	): Promise<EventMap[K]> {
		return new Promise((resolve, reject) => {
			const timeoutMs = options.timeout ?? 30000; // 30 second default
			let timeoutId: NodeJS.Timeout | undefined;

			const cleanup = () => {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
			};

			const listener = (data: EventMap[K]) => {
				cleanup();
				resolve(data);
			};

			// Set up timeout
			if (timeoutMs > 0) {
				timeoutId = setTimeout(() => {
					this.off(event, listener);
					reject(new Error(`Event '${event as string}' timeout after ${timeoutMs}ms`));
				}, timeoutMs);
			}

			// Handle AbortController
			if (options.signal) {
				options.signal.addEventListener('abort', () => {
					cleanup();
					this.off(event, listener);
					reject(new Error('Event wait aborted'));
				});
			}

			this.once(event, listener);
		});
	}

	/**
	 * Dispose of the event emitter and clean up resources
	 */
	dispose(): void {
		this.removeAllListeners();
		this.emitter.removeAllListeners();
	}

	/**
	 * Wrap listener with error handling and async support
	 */
	private wrapListener<K extends keyof EventMap>(
		listener: EventListener<EventMap[K]>,
		event: string,
		_options: EventListenerOptions
	): (data: EventMap[K]) => void {
		return (data: EventMap[K]) => {
			try {
				const result = listener(data);

				// Handle async listeners
				if (result instanceof Promise) {
					result.catch(error => {
						logger.error('Error in async event listener', {
							event,
							error: error.message,
							stack: error.stack,
						});
					});
				}
			} catch (error) {
				logger.error('Error in event listener', {
					event,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
			}
		};
	}
}
