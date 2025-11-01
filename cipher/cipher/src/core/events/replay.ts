/**
 * Event Replay System
 *
 * Provides capabilities to replay events for debugging, testing, and analysis.
 */

import { EventEnvelope, ServiceEventMap, SessionEventMap } from './event-types.js';
import { EventPersistence, EventQuery } from './persistence.js';
import { TypedEventEmitter } from './typed-event-emitter.js';
import { logger } from '../logger/logger.js';

export interface ReplayOptions {
	speed?: number; // Replay speed multiplier (1.0 = real-time, 0.5 = half speed, 2.0 = double speed)
	startTime?: number; // Unix timestamp to start replay from
	endTime?: number; // Unix timestamp to end replay at
	sessionId?: string; // Only replay events for specific session
	eventTypes?: string[]; // Only replay specific event types
	skipTimestamps?: boolean; // Skip timing delays and replay as fast as possible
}

export interface ReplayState {
	isReplaying: boolean;
	currentEventIndex: number;
	totalEvents: number;
	startTime: number;
	progress: number; // 0.0 to 1.0
	eventsReplayed: number;
	replayStartedAt: number;
}

/**
 * Event replay manager
 */
export class EventReplay {
	private persistence: EventPersistence;
	private isReplaying = false;
	private currentReplay?: {
		events: EventEnvelope[];
		options: ReplayOptions;
		startTime: number;
		abortController: AbortController;
		currentIndex: number;
	};

	// Event emitters for replayed events
	private serviceEventEmitter = new TypedEventEmitter<ServiceEventMap>();
	private sessionEventEmitter = new TypedEventEmitter<SessionEventMap>();

	constructor(persistence: EventPersistence) {
		this.persistence = persistence;
	}

	/**
	 * Start replaying events based on query and options
	 */
	async startReplay(query: EventQuery, options: ReplayOptions = {}): Promise<void> {
		if (this.isReplaying) {
			throw new Error('Replay is already in progress');
		}

		logger.info('Starting event replay', { query, options });

		try {
			// Fetch events to replay
			const events = await this.persistence.query(query);

			if (events.length === 0) {
				logger.warn('No events found for replay query', { query });
				return;
			}

			// Sort events by timestamp to ensure correct order
			events.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

			// Set up replay state
			this.isReplaying = true;
			this.currentReplay = {
				events,
				options,
				startTime: Date.now(),
				abortController: new AbortController(),
				currentIndex: 0,
			};

			logger.info('Event replay started', {
				eventCount: events.length,
				timeRange: {
					start: events[0] ? new Date(events[0].metadata.timestamp).toISOString() : 'unknown',
					end: events[events.length - 1]
						? new Date(events[events.length - 1]!.metadata.timestamp).toISOString()
						: 'unknown',
				},
				options,
			});

			// Start the replay process
			await this.executeReplay();
		} catch (error) {
			this.isReplaying = false;
			this.currentReplay = undefined as unknown as {
				events: EventEnvelope<any>[];
				options: ReplayOptions;
				startTime: number;
				abortController: AbortController;
				currentIndex: number;
			};
			logger.error('Failed to start event replay', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Stop the current replay
	 */
	stopReplay(): void {
		if (!this.isReplaying || !this.currentReplay) {
			return;
		}

		logger.info('Stopping event replay');
		this.currentReplay.abortController.abort();
		this.isReplaying = false;
		this.currentReplay = undefined as unknown as {
			events: EventEnvelope<any>[];
			options: ReplayOptions;
			startTime: number;
			abortController: AbortController;
			currentIndex: number;
		};
	}

	/**
	 * Get current replay state
	 */
	getReplayState(): ReplayState | null {
		if (!this.isReplaying || !this.currentReplay) {
			return null;
		}

		const progress = this.currentReplay.currentIndex / this.currentReplay.events.length;

		return {
			isReplaying: this.isReplaying,
			currentEventIndex: this.currentReplay.currentIndex,
			totalEvents: this.currentReplay.events.length,
			startTime: this.currentReplay.startTime,
			progress,
			eventsReplayed: this.currentReplay.currentIndex,
			replayStartedAt: this.currentReplay.startTime,
		};
	}

	/**
	 * Subscribe to replayed service events
	 */
	onServiceEvent<K extends keyof ServiceEventMap>(
		event: K,
		listener: (data: ServiceEventMap[K]) => void,
		options?: { signal?: AbortSignal }
	): void {
		this.serviceEventEmitter.on(event, listener, options);
	}

	/**
	 * Subscribe to replayed session events
	 */
	onSessionEvent<K extends keyof SessionEventMap>(
		event: K,
		listener: (data: SessionEventMap[K]) => void,
		options?: { signal?: AbortSignal }
	): void {
		this.sessionEventEmitter.on(event, listener, options);
	}

	/**
	 * Wait for a specific replayed event
	 */
	async waitForReplayedEvent<K extends keyof ServiceEventMap>(
		event: K,
		options?: { timeout?: number; signal?: AbortSignal }
	): Promise<ServiceEventMap[K]> {
		return this.serviceEventEmitter.waitFor(event, options);
	}

	/**
	 * Get replay statistics
	 */
	getReplayStats(): {
		totalReplays: number;
		lastReplayDuration?: number;
		lastReplayEventCount?: number;
	} {
		// This could be enhanced to track replay history
		const result: {
			totalReplays: number;
			lastReplayDuration?: number;
			lastReplayEventCount?: number;
		} = {
			totalReplays: 0, // Would track in persistent state
		};

		if (this.currentReplay) {
			result.lastReplayDuration = Date.now() - this.currentReplay.startTime;
			result.lastReplayEventCount = this.currentReplay.events.length;
		}

		return result;
	}

	private async executeReplay(): Promise<void> {
		const replay = this.currentReplay!;
		const { events, options, abortController } = replay;

		try {
			let lastEventTime = events[0]?.metadata.timestamp || Date.now();

			for (let i = 0; i < events.length; i++) {
				// Check if replay was aborted
				if (abortController.signal.aborted) {
					logger.info('Event replay was aborted');
					break;
				}

				const event = events[i];
				replay.currentIndex = i;

				// Calculate delay if not skipping timestamps
				if (!options.skipTimestamps && i > 0) {
					const realTimeDelta =
						event?.metadata.timestamp !== undefined ? event.metadata.timestamp - lastEventTime : 0;
					const speed = options.speed || 1.0;
					const adjustedDelay = realTimeDelta / speed;

					if (adjustedDelay > 0) {
						await this.sleep(adjustedDelay, abortController.signal);
					}
				}

				// Emit the replayed event
				if (event) {
					await this.emitReplayedEvent(event);
					lastEventTime = event.metadata.timestamp;
				}

				// Log progress occasionally
				if (i % 100 === 0 || i === events.length - 1) {
					const progress = (((i + 1) / events.length) * 100).toFixed(1);
					logger.debug(`Event replay progress: ${progress}% (${i + 1}/${events.length})`);
				}
			}

			if (!abortController.signal.aborted) {
				logger.info('Event replay completed successfully', {
					eventsReplayed: events.length,
					duration: Date.now() - replay.startTime,
				});
			}
		} catch (error) {
			logger.error('Error during event replay', {
				error: error instanceof Error ? error.message : String(error),
				currentIndex: replay.currentIndex,
			});
			throw error;
		} finally {
			this.isReplaying = false;
			this.currentReplay = undefined as unknown as {
				events: EventEnvelope<any>[];
				options: ReplayOptions;
				startTime: number;
				abortController: AbortController;
				currentIndex: number;
			};
		}
	}

	private async emitReplayedEvent(event: EventEnvelope): Promise<void> {
		try {
			// Determine if this is a service or session event and emit accordingly
			if (this.isServiceEvent(event.type)) {
				this.serviceEventEmitter.emit(event.type as keyof ServiceEventMap, event.data);
			} else if (this.isSessionEvent(event.type)) {
				this.sessionEventEmitter.emit(event.type as keyof SessionEventMap, event.data);
			}

			logger.silly('Replayed event', {
				type: event.type,
				id: event.id,
				originalTimestamp: new Date(event.metadata.timestamp).toISOString(),
			});
		} catch (error) {
			logger.warn('Failed to emit replayed event', {
				eventType: event.type,
				eventId: event.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private isServiceEvent(eventType: string): boolean {
		// Service events typically start with 'cipher:' prefix
		return eventType.startsWith('cipher:');
	}

	private isSessionEvent(eventType: string): boolean {
		// Session events have various prefixes: session:, tool:, llm:, memory:, conversation:, context:
		return !this.isServiceEvent(eventType);
	}

	private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
		return new Promise((resolve, reject) => {
			if (signal?.aborted) {
				reject(new Error('Sleep aborted'));
				return;
			}

			const timeout = setTimeout(resolve, ms);

			signal?.addEventListener('abort', () => {
				clearTimeout(timeout);
				reject(new Error('Sleep aborted'));
			});
		});
	}
}

/**
 * Event replay analyzer for extracting insights from replayed events
 */
export class ReplayAnalyzer {
	private events: EventEnvelope[] = [];
	private analysis: any = null;

	/**
	 * Add events for analysis
	 */
	addEvents(events: EventEnvelope[]): void {
		this.events.push(...events);
		this.analysis = null; // Reset analysis cache
	}

	/**
	 * Analyze the events and generate insights
	 */
	analyze(): {
		summary: {
			totalEvents: number;
			timeSpan: { start: string; end: string; duration: number };
			eventTypes: Record<string, number>;
			sessionsInvolved: string[];
		};
		patterns: {
			mostActiveSession?: string;
			commonEventSequences: Array<{ sequence: string[]; count: number }>;
			averageEventRate: number; // events per second
		};
		performance: {
			slowestOperations: Array<{ type: string; duration: number; timestamp: string }>;
			errorEvents: Array<{ type: string; error: string; timestamp: string }>;
		};
	} {
		if (this.analysis) {
			return this.analysis;
		}

		if (this.events.length === 0) {
			throw new Error('No events to analyze');
		}

		// Sort events by timestamp
		const sortedEvents = [...this.events].sort(
			(a, b) => a.metadata.timestamp - b.metadata.timestamp
		);

		// Calculate summary
		const eventTypes: Record<string, number> = {};
		const sessionsInvolved = new Set<string>();

		for (const event of sortedEvents) {
			eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
			if (event.metadata.sessionId) {
				sessionsInvolved.add(event.metadata.sessionId);
			}
		}

		const timeSpan = {
			start: new Date(
				sortedEvents[0]?.metadata.timestamp ? sortedEvents[0].metadata.timestamp : Date.now()
			).toISOString(),
			end: new Date(
				sortedEvents[sortedEvents.length - 1]?.metadata.timestamp
					? sortedEvents[sortedEvents.length - 1]!.metadata.timestamp
					: Date.now()
			).toISOString(),
			duration:
				sortedEvents[sortedEvents.length - 1] && sortedEvents[0]
					? sortedEvents[sortedEvents.length - 1]!.metadata.timestamp -
						sortedEvents[0]!.metadata.timestamp
					: 0,
		};

		// Analyze patterns
		const sessionEventCounts: Record<string, number> = {};
		const slowOperations: Array<{ type: string; duration: number; timestamp: string }> = [];
		const errorEvents: Array<{ type: string; error: string; timestamp: string }> = [];

		for (const event of sortedEvents) {
			if (event.metadata.sessionId) {
				sessionEventCounts[event.metadata.sessionId] =
					(sessionEventCounts[event.metadata.sessionId] || 0) + 1;
			}

			// Check for slow operations (those with duration > 1000ms)
			if (event.data && typeof event.data === 'object' && 'duration' in event.data) {
				const duration = event.data.duration as number;
				if (duration > 1000) {
					slowOperations.push({
						type: event.type,
						duration,
						timestamp: new Date(event.metadata.timestamp).toISOString(),
					});
				}
			}

			// Check for error events
			if (event.data && typeof event.data === 'object' && 'error' in event.data) {
				errorEvents.push({
					type: event.type,
					error: event.data.error as string,
					timestamp: new Date(event.metadata.timestamp).toISOString(),
				});
			}
		}

		const mostActiveSession = Object.entries(sessionEventCounts).sort(
			([, a], [, b]) => b - a
		)[0]?.[0];

		const averageEventRate = sortedEvents.length / (timeSpan.duration / 1000);

		this.analysis = {
			summary: {
				totalEvents: sortedEvents.length,
				timeSpan,
				eventTypes,
				sessionsInvolved: Array.from(sessionsInvolved),
			},
			patterns: {
				mostActiveSession,
				commonEventSequences: [], // Could implement sequence detection
				averageEventRate,
			},
			performance: {
				slowestOperations: slowOperations.sort((a, b) => b.duration - a.duration).slice(0, 10),
				errorEvents,
			},
		};

		return this.analysis;
	}

	/**
	 * Generate a human-readable report
	 */
	generateReport(): string {
		const analysis = this.analyze();

		let report = `# Event Replay Analysis Report\n\n`;

		report += `## Summary\n`;
		report += `- **Total Events**: ${analysis.summary.totalEvents}\n`;
		report += `- **Time Span**: ${analysis.summary.timeSpan.start} to ${analysis.summary.timeSpan.end}\n`;
		report += `- **Duration**: ${(analysis.summary.timeSpan.duration / 1000).toFixed(2)} seconds\n`;
		report += `- **Sessions Involved**: ${analysis.summary.sessionsInvolved.length}\n`;
		report += `- **Average Event Rate**: ${analysis.patterns.averageEventRate.toFixed(2)} events/sec\n\n`;

		report += `## Event Types\n`;
		const sortedEventTypes = Object.entries(analysis.summary.eventTypes).sort(
			([, a], [, b]) => b - a
		);
		for (const [type, count] of sortedEventTypes) {
			report += `- **${type}**: ${count}\n`;
		}
		report += `\n`;

		if (analysis.patterns.mostActiveSession) {
			report += `## Most Active Session\n`;
			report += `- **Session ID**: ${analysis.patterns.mostActiveSession}\n\n`;
		}

		if (analysis.performance.slowestOperations.length > 0) {
			report += `## Slowest Operations\n`;
			for (const op of analysis.performance.slowestOperations.slice(0, 5)) {
				report += `- **${op.type}**: ${op.duration}ms at ${op.timestamp}\n`;
			}
			report += `\n`;
		}

		if (analysis.performance.errorEvents.length > 0) {
			report += `## Error Events\n`;
			for (const error of analysis.performance.errorEvents.slice(0, 5)) {
				report += `- **${error.type}**: ${error.error} at ${error.timestamp}\n`;
			}
			report += `\n`;
		}

		return report;
	}
}
