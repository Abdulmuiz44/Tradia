import { TypedEventEmitter } from './typed-event-emitter.js';
import { SessionEventMap, EventEnvelope, EventMetadata } from './event-types.js';
import { logger } from '../logger/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { EventPersistence } from './persistence.js';

export interface SessionEventBusOptions {
	sessionId: string;
	enableLogging?: boolean;
	maxListeners?: number;
	enablePersistence?: boolean;
	maxHistorySize?: number;
	eventPersistence?: EventPersistence;
}

export class SessionEventBus extends TypedEventEmitter<SessionEventMap> {
	private readonly sessionId: string;
	private readonly createdAt: number;
	private eventHistory: EventEnvelope[] = [];
	private readonly enablePersistence: boolean;
	private readonly maxHistorySize: number;
	private readonly eventPersistence?: EventPersistence;
	private isDisposed = false;

	constructor(options: SessionEventBusOptions) {
		super({
			maxListeners: options.maxListeners ?? 100,
			enableLogging: options.enableLogging ?? true,
		});

		this.sessionId = options.sessionId;
		this.createdAt = Date.now();
		this.enablePersistence = options.enablePersistence ?? false;
		this.maxHistorySize = options.maxHistorySize ?? 1000;
		this.eventPersistence = options.eventPersistence!;

		logger.debug('SessionEventBus initialized', {
			sessionId: this.sessionId,
			maxListeners: options.maxListeners ?? 100,
			enablePersistence: this.enablePersistence,
		});
	}

	/**
	 * Emit a session event with metadata and optional persistence
	 */
	emitSessionEvent<K extends keyof SessionEventMap>(
		event: K,
		data: SessionEventMap[K],
		metadata: Partial<EventMetadata> = {}
	): void {
		if (this.isDisposed) {
			logger.warn('Attempted to emit event on disposed SessionEventBus', {
				sessionId: this.sessionId,
				eventType: event,
			});
			return;
		}

		const envelope: EventEnvelope<SessionEventMap[K]> = {
			id: uuidv4(),
			type: event as string,
			data,
			metadata: {
				timestamp: Date.now(),
				sessionId: this.sessionId,
				source: 'session',
				priority: 'normal',
				...metadata,
			},
		};

		// Store in history if persistence is enabled
		if (this.enablePersistence) {
			this.addToHistory(envelope);
		}

		// Persist event if eventPersistence is provided
		if (this.eventPersistence) {
			void this.eventPersistence.store(envelope);
		}

		// Emit the event
		this.emit(event, data);

		// Log important session events
		if (this.shouldLogEvent(event)) {
			logger.info('Session event emitted', {
				sessionId: this.sessionId,
				eventType: event,
				eventId: envelope.id,
			});
		}
	}

	/**
	 * Get session event history (if persistence is enabled)
	 */
	getEventHistory(filter?: {
		eventType?: keyof SessionEventMap;
		since?: number;
		limit?: number;
	}): EventEnvelope[] {
		if (!this.enablePersistence) {
			return [];
		}

		let history = this.eventHistory;

		if (filter) {
			if (filter.eventType) {
				history = history.filter(event => event.type === filter.eventType);
			}

			if (filter.since) {
				history = history.filter(event => event.metadata.timestamp >= filter.since!);
			}

			if (filter.limit) {
				history = history.slice(-filter.limit);
			}
		}

		return history;
	}

	/**
	 * Get session event bus statistics
	 */
	getStatistics(): {
		sessionId: string;
		age: number;
		totalEvents: number;
		eventTypes: Record<string, number>;
		activeListeners: Record<string, number>;
		recentActivity: {
			lastEventTime?: number;
			eventsInLastMinute: number;
			eventsInLastHour: number;
		};
	} {
		const eventTypes: Record<string, number> = {};
		const activeListeners: Record<string, number> = {};
		const now = Date.now();
		const oneMinuteAgo = now - 60000;
		const oneHourAgo = now - 3600000;

		// Count events by type
		this.eventHistory.forEach(event => {
			eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
		});

		// Count active listeners by event type
		this.eventNames().forEach(eventName => {
			activeListeners[eventName as string] = this.listenerCountFor(eventName);
		});

		// Calculate recent activity
		const recentEvents = this.eventHistory.filter(event => event.metadata.timestamp >= oneHourAgo);
		const eventsInLastMinute = recentEvents.filter(
			event => event.metadata.timestamp >= oneMinuteAgo
		).length;
		const eventsInLastHour = recentEvents.length;
		const lastEvent =
			this.eventHistory.length > 0 ? this.eventHistory[this.eventHistory.length - 1] : undefined;
		const lastEventTime = lastEvent ? lastEvent.metadata.timestamp : undefined;

		return {
			sessionId: this.sessionId,
			age: now - this.createdAt,
			totalEvents: this.eventHistory.length,
			eventTypes,
			activeListeners,
			recentActivity: {
				...(lastEventTime !== undefined ? { lastEventTime } : {}),
				eventsInLastMinute,
				eventsInLastHour,
			},
		};
	}

	/**
	 * Clear event history
	 */
	clearHistory(): void {
		this.eventHistory = [];
		logger.debug('Session event history cleared', {
			sessionId: this.sessionId,
		});
	}

	/**
	 * Get session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	/**
	 * Get session age in milliseconds
	 */
	getAge(): number {
		return Date.now() - this.createdAt;
	}

	/**
	 * Check if session event bus is disposed
	 */
	isSessionDisposed(): boolean {
		return this.isDisposed;
	}

	/**
	 * Dispose of the session event bus
	 */
	public override dispose(): void {
		if (this.isDisposed) {
			return;
		}

		this.isDisposed = true;
		this.clearHistory();
		super.dispose();

		logger.debug('SessionEventBus disposed', {
			sessionId: this.sessionId,
			age: this.getAge(),
		});
	}

	/**
	 * Add event to history with size management
	 */
	private addToHistory(envelope: EventEnvelope): void {
		this.eventHistory.push(envelope);

		// Maintain maximum history size
		if (this.eventHistory.length > this.maxHistorySize) {
			this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
		}
	}

	/**
	 * Determine if an event should be logged based on its importance
	 */
	private shouldLogEvent(event: keyof SessionEventMap): boolean {
		const importantEvents = [
			'session:created',
			'session:expired',
			'session:deleted',
			'tool:executionFailed',
			'llm:responseError',
		];

		return importantEvents.includes(event as string);
	}

	/**
	 * Get events matching a pattern
	 */
	getEventsByPattern(pattern: RegExp): EventEnvelope[] {
		if (!this.enablePersistence) {
			return [];
		}

		return this.eventHistory.filter(event => pattern.test(event.type));
	}

	/**
	 * Get the most recent event of a specific type
	 */
	getLastEvent<K extends keyof SessionEventMap>(
		eventType: K
	): EventEnvelope<SessionEventMap[K]> | undefined {
		if (!this.enablePersistence) {
			return undefined;
		}

		const events = this.eventHistory.filter(event => event.type === eventType);
		return events.length > 0
			? (events[events.length - 1] as EventEnvelope<SessionEventMap[K]>)
			: undefined;
	}

	/**
	 * Count events of a specific type
	 */
	countEvents<K extends keyof SessionEventMap>(eventType: K): number {
		if (!this.enablePersistence) {
			return 0;
		}

		return this.eventHistory.filter(event => event.type === eventType).length;
	}
}
