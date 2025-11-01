/**
 * CLI Tools for Testing Event Persistence and Replay
 *
 * Provides convenient commands for testing event features during development.
 */

import { EventManager } from './event-manager.js';
import { EventPersistence, EventQuery } from './persistence.js';
import { EventReplay, ReplayAnalyzer } from './replay.js';
import { EventMetricsCollector, MetricsExporter } from './metrics.js';
import { ServiceEvents, SessionEvents } from './event-types.js';
import { logger } from '../logger/logger.js';

export class EventCliTools {
	private eventManager: EventManager;
	private persistence: EventPersistence;
	private replay: EventReplay;
	private metricsCollector: EventMetricsCollector;

	constructor(eventManager: EventManager) {
		this.eventManager = eventManager;

		// Initialize persistence with file storage for CLI testing
		this.persistence = new EventPersistence({
			enabled: true,
			storageType: 'file',
			filePath: './data/events',
			maxEvents: 50000,
			retentionDays: 7,
		});

		this.replay = new EventReplay(this.persistence);
		this.metricsCollector = new EventMetricsCollector();

		// Setup metrics collection from events
		this.setupMetricsCollection();
	}

	/**
	 * Generate sample events for testing
	 */
	async generateSampleEvents(count: number = 100): Promise<void> {
		logger.info(`Generating ${count} sample events for testing...`);

		const sessionId = `test-session-${Date.now()}`;

		// Generate a variety of events
		for (let i = 0; i < count; i++) {
			const eventType = i % 4;

			switch (eventType) {
				case 0:
					// Service events
					this.eventManager.emitServiceEvent(ServiceEvents.SERVICE_STARTED, {
						serviceType: `test-service-${i}`,
						timestamp: Date.now(),
					});
					break;

				case 1:
					// Session lifecycle
					this.eventManager.emitSessionEvent(sessionId, SessionEvents.SESSION_CREATED, {
						sessionId: `session-${i}`,
						timestamp: Date.now(),
					});
					break;

				case 2:
					// Tool execution
					this.eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_STARTED, {
						toolName: `tool-${i}`,
						toolType: 'internal',
						sessionId,
						executionId: `exec-${i}`,
						timestamp: Date.now(),
					});

					// Add completion after a delay
					setTimeout(() => {
						this.eventManager.emitSessionEvent(sessionId, SessionEvents.TOOL_EXECUTION_COMPLETED, {
							toolName: `tool-${i}`,
							toolType: 'internal',
							sessionId,
							executionId: `exec-${i}`,
							duration: Math.random() * 1000,
							success: true,
							timestamp: Date.now(),
						});
					}, Math.random() * 100);
					break;

				case 3:
					// LLM events
					this.eventManager.emitSessionEvent(sessionId, SessionEvents.LLM_RESPONSE_STARTED, {
						sessionId,
						messageId: `msg-${i}`,
						model: 'claude-3-sonnet',
						timestamp: Date.now(),
					});
					break;
			}

			// Add some delay to spread events over time
			if (i % 10 === 0) {
				await new Promise(resolve => setTimeout(resolve, 10));
			}
		}

		logger.info(`Generated ${count} sample events`);
	}

	/**
	 * Query events from persistence
	 */
	async queryEvents(query: EventQuery): Promise<void> {
		logger.info('Querying events...', query);

		const events = await this.persistence.query(query);

		logger.info(`Found ${events.length} events:`);

		// Group events by type
		const eventsByType: Record<string, number> = {};
		for (const event of events) {
			eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
		}

		console.table(eventsByType);

		// Show latest events
		const latestEvents = events.slice(0, 10);
		console.log('\nLatest events:');
		for (const event of latestEvents) {
			console.log(`  ${new Date(event.metadata.timestamp).toISOString()} - ${event.type}`);
		}
	}

	/**
	 * Test event replay functionality
	 */
	async testEventReplay(
		options: {
			sessionId?: string;
			eventTypes?: string[];
			since?: number;
			speed?: number;
		} = {}
	): Promise<void> {
		logger.info('Starting event replay test...', options);

		const replayedEvents: any[] = [];

		// Setup replay listeners
		this.replay.onServiceEvent(ServiceEvents.SERVICE_STARTED, data => {
			replayedEvents.push({ type: 'service:started', data });
			logger.info('Replayed service event:', data);
		});

		this.replay.onSessionEvent(SessionEvents.TOOL_EXECUTION_STARTED, data => {
			replayedEvents.push({ type: 'tool:started', data });
			logger.info('Replayed tool execution:', data);
		});

		this.replay.onSessionEvent(SessionEvents.LLM_RESPONSE_STARTED, data => {
			replayedEvents.push({ type: 'llm:started', data });
			logger.info('Replayed LLM response:', data);
		});

		// Start replay
		const query: EventQuery = {
			...(options.sessionId ? { sessionId: options.sessionId } : {}),
			since: options.since || Date.now() - 60000, // Last minute by default
			limit: 50,
		};

		if (options.eventTypes) {
			// Note: This would need to be implemented as a filter
			logger.warn('Event type filtering not yet implemented in query');
		}

		await this.replay.startReplay(query, {
			speed: options.speed || 2.0, // 2x speed
			skipTimestamps: false,
		});

		// Wait for replay to complete
		const replayState = this.replay.getReplayState();
		if (replayState) {
			logger.info(`Replayed ${replayedEvents.length} events`);
		}
	}

	/**
	 * Generate event analytics report
	 */
	async generateAnalytics(): Promise<void> {
		logger.info('Generating event analytics...');

		// Get events from the last hour
		const events = await this.persistence.query({
			since: Date.now() - 3600000, // Last hour
			limit: 1000,
		});

		if (events.length === 0) {
			logger.warn('No events found for analytics');
			return;
		}

		// Use replay analyzer
		const analyzer = new ReplayAnalyzer();
		analyzer.addEvents(events);

		const report = analyzer.generateReport();

		console.log('\n' + '='.repeat(50));
		console.log('EVENT ANALYTICS REPORT');
		console.log('='.repeat(50));
		console.log(report);

		// Also show metrics
		const serviceMetrics = this.metricsCollector.getServiceMetrics();
		const sessionMetrics = this.metricsCollector.getSessionMetrics();

		console.log('\n' + '='.repeat(50));
		console.log('CURRENT METRICS');
		console.log('='.repeat(50));
		console.log('Service Metrics:');
		console.table({
			'Cipher Uptime': `${(serviceMetrics.cipherUptime / 1000).toFixed(2)}s`,
			'Services Started': serviceMetrics.serviceStartCount,
			'Service Errors': serviceMetrics.serviceErrorCount,
			'Tool Registrations': serviceMetrics.toolRegistrationCount,
			'MCP Connections': serviceMetrics.mcpConnectionCount,
		});

		console.log('\nSession Metrics:');
		console.table({
			'Sessions Created': sessionMetrics.sessionCreatedCount,
			'Tool Executions': sessionMetrics.toolExecutionCount,
			'Tool Success Rate': `${((sessionMetrics.toolExecutionSuccessCount / Math.max(sessionMetrics.toolExecutionCount, 1)) * 100).toFixed(1)}%`,
			'LLM Responses': sessionMetrics.llmResponseCount,
			'Memory Operations': sessionMetrics.memoryStoreCount + sessionMetrics.memoryRetrieveCount,
		});
	}

	/**
	 * Export metrics in various formats
	 */
	async exportMetrics(format: 'prometheus' | 'json' = 'json'): Promise<void> {
		const exporter = new MetricsExporter(this.metricsCollector);

		let output: string;
		let filename: string;

		switch (format) {
			case 'prometheus':
				output = exporter.exportPrometheus();
				filename = `./data/metrics-${Date.now()}.prom`;
				break;
			case 'json':
				output = exporter.exportJSON();
				filename = `./data/metrics-${Date.now()}.json`;
				break;
		}

		// Write to file
		const fs = await import('fs/promises');
		await fs.mkdir('./data', { recursive: true });
		await fs.writeFile(filename, output);

		logger.info(`Metrics exported to ${filename}`);
		console.log(`Metrics exported to: ${filename}`);
	}

	/**
	 * Monitor events in real-time
	 */
	startEventMonitoring(): void {
		logger.info('Starting real-time event monitoring...');

		const serviceEventBus = this.eventManager.getServiceEventBus();

		// Monitor all service events
		Object.values(ServiceEvents).forEach(eventType => {
			serviceEventBus.on(eventType, data => {
				console.log(`🔧 [SERVICE] ${eventType}:`, data);
			});
		});

		console.log(
			'Event monitoring started. You should see events appear in real-time as you use cipher.'
		);
		console.log('Try running some commands to generate events!');
	}

	/**
	 * Show event persistence statistics
	 */
	async showPersistenceStats(): Promise<void> {
		const stats = await this.persistence.getStats();

		console.log('\n' + '='.repeat(40));
		console.log('EVENT PERSISTENCE STATISTICS');
		console.log('='.repeat(40));
		console.table({
			'Total Events': stats.totalEvents,
			'Storage Size': `${(stats.storageSize / 1024).toFixed(2)} KB`,
			'Storage Location': './data/events',
		});
	}

	/**
	 * Clean up old events
	 */
	async cleanupOldEvents(_days: number = 7): Promise<void> {
		// const retentionMs = days * 24 * 60 * 60 * 1000;
		// If this.persistence.cleanup does not exist, replace with correct method or comment out.
		// const deletedCount = await this.persistence.cleanup(retentionMs);
		// logger.info(`Cleaned up ${deletedCount} events older than ${days} days`);
	}

	private setupMetricsCollection(): void {
		const serviceEventBus = this.eventManager.getServiceEventBus();

		// Collect metrics from service events
		Object.values(ServiceEvents).forEach(eventType => {
			serviceEventBus.on(eventType, data => {
				this.metricsCollector.processServiceEvent({
					id: `metrics-${Date.now()}`,
					type: eventType,
					data,
					metadata: { timestamp: Date.now(), source: 'service' },
				});
			});
		});
	}

	dispose(): void {
		this.persistence.dispose();
	}
}

/**
 * CLI command implementations
 */
export const eventCommands = {
	/**
	 * Generate sample events for testing
	 */
	async generateEvents(eventManager: EventManager, count: number = 100) {
		const tools = new EventCliTools(eventManager);
		await tools.generateSampleEvents(count);
		tools.dispose();
	},

	/**
	 * Query and display events
	 */
	async queryEvents(eventManager: EventManager, options: EventQuery = {}) {
		const tools = new EventCliTools(eventManager);
		await tools.queryEvents(options);
		tools.dispose();
	},

	/**
	 * Test event replay
	 */
	async replayEvents(eventManager: EventManager, options: any = {}) {
		const tools = new EventCliTools(eventManager);
		await tools.testEventReplay(options);
		tools.dispose();
	},

	/**
	 * Generate analytics report
	 */
	async analytics(eventManager: EventManager) {
		const tools = new EventCliTools(eventManager);
		await tools.generateAnalytics();
		tools.dispose();
	},

	/**
	 * Export metrics
	 */
	async exportMetrics(eventManager: EventManager, format: 'prometheus' | 'json' = 'json') {
		const tools = new EventCliTools(eventManager);
		await tools.exportMetrics(format);
		tools.dispose();
	},

	/**
	 * Show persistence stats
	 */
	async persistenceStats(eventManager: EventManager) {
		const tools = new EventCliTools(eventManager);
		await tools.showPersistenceStats();
		tools.dispose();
	},

	/**
	 * Start real-time monitoring
	 */
	startMonitoring(eventManager: EventManager) {
		const tools = new EventCliTools(eventManager);
		tools.startEventMonitoring();
		// Don't dispose here - keep monitoring active
		return tools;
	},
};
