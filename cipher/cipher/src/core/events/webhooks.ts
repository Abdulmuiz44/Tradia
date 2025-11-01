/**
 * Webhook Forwarding System
 *
 * Forwards events to external systems via HTTP webhooks for integrations and monitoring.
 */

import { EventEnvelope, EventFilter } from './event-types.js';
import { logger } from '../logger/logger.js';

// Import fetch and Response for Node.js compatibility
import { fetch, Response } from 'undici';

export interface WebhookConfig {
	url: string;
	method?: 'POST' | 'PUT' | 'PATCH';
	headers?: Record<string, string>;
	timeout?: number;
	retries?: number;
	retryDelay?: number;
	secret?: string;
	filters?: EventFilter[];
	enabled?: boolean;
	batchSize?: number;
	batchTimeout?: number;
}

export interface WebhookDelivery {
	id: string;
	webhookId: string;
	event: EventEnvelope;
	url: string;
	status: 'pending' | 'delivered' | 'failed' | 'retrying';
	attempts: number;
	createdAt: number;
	lastAttemptAt?: number;
	deliveredAt?: number;
	error?: string;
}

export interface WebhookStats {
	totalEvents: number;
	deliveredEvents: number;
	failedEvents: number;
	pendingEvents: number;
	averageDeliveryTime: number;
	errorRate: number;
}

/**
 * Webhook delivery manager
 */
export class WebhookForwarder {
	private webhooks = new Map<string, WebhookConfig>();
	private deliveryQueue: WebhookDelivery[] = [];
	private deliveryHistory: WebhookDelivery[] = [];
	private processingInterval?: NodeJS.Timeout;
	private batchQueues = new Map<string, EventEnvelope[]>();
	private batchTimeouts = new Map<string, NodeJS.Timeout>();
	private stats = new Map<string, WebhookStats>();

	constructor() {
		// Start processing queue
		this.processingInterval = setInterval(() => {
			this.processDeliveryQueue();
		}, 1000);
	}

	/**
	 * Register a webhook endpoint
	 */
	registerWebhook(id: string, config: WebhookConfig): void {
		const fullConfig: Required<WebhookConfig> = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			timeout: 5000,
			retries: 3,
			retryDelay: 1000,
			secret: '',
			filters: [],
			enabled: true,
			batchSize: 1,
			batchTimeout: 1000,
			...config,
		};

		this.webhooks.set(id, fullConfig);
		this.stats.set(id, this.createWebhookStats());

		logger.info('Webhook registered', {
			webhookId: id,
			url: config.url,
			enabled: fullConfig.enabled,
		});
	}

	/**
	 * Unregister a webhook endpoint
	 */
	unregisterWebhook(id: string): void {
		this.webhooks.delete(id);
		this.stats.delete(id);

		// Clear any pending batches
		const timeout = this.batchTimeouts.get(id);
		if (timeout) {
			clearTimeout(timeout);
			this.batchTimeouts.delete(id);
		}
		this.batchQueues.delete(id);

		logger.info('Webhook unregistered', { webhookId: id });
	}

	/**
	 * Forward an event to registered webhooks
	 */
	async forwardEvent(event: EventEnvelope): Promise<void> {
		for (const [webhookId, config] of this.webhooks) {
			if (!config.enabled) continue;

			// Apply filters
			if (config.filters && config.filters.length > 0) {
				const passesFilters = config.filters.some(filter => filter(event));
				if (!passesFilters) continue;
			}

			// Handle batching
			if ((config.batchSize ?? 1) > 1) {
				await this.addToBatch(webhookId, event, config);
			} else {
				await this.queueDelivery(webhookId, event, config);
			}
		}
	}

	/**
	 * Get webhook statistics
	 */
	getWebhookStats(webhookId?: string): WebhookStats | Record<string, WebhookStats> {
		if (webhookId) {
			return this.stats.get(webhookId) || this.createWebhookStats();
		}

		const allStats: Record<string, WebhookStats> = {};
		for (const [id, stats] of this.stats) {
			allStats[id] = { ...stats };
		}
		return allStats;
	}

	/**
	 * Get delivery history
	 */
	getDeliveryHistory(webhookId?: string, limit = 100): WebhookDelivery[] {
		let history = this.deliveryHistory;

		if (webhookId) {
			history = history.filter(d => d.webhookId === webhookId);
		}

		return history.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
	}

	/**
	 * Retry failed deliveries
	 */
	async retryFailedDeliveries(webhookId?: string): Promise<number> {
		const failedDeliveries = this.deliveryHistory.filter(
			d => d.status === 'failed' && (!webhookId || d.webhookId === webhookId)
		);

		for (const delivery of failedDeliveries) {
			delivery.status = 'pending';
			delivery.error = undefined as unknown as string;
			this.deliveryQueue.push(delivery);
		}

		logger.info('Retrying failed deliveries', {
			count: failedDeliveries.length,
			webhookId,
		});

		return failedDeliveries.length;
	}

	/**
	 * Update webhook configuration
	 */
	updateWebhook(id: string, updates: Partial<WebhookConfig>): void {
		const existing = this.webhooks.get(id);
		if (!existing) {
			throw new Error(`Webhook ${id} not found`);
		}

		const updated = { ...existing, ...updates };
		this.webhooks.set(id, updated);

		logger.info('Webhook configuration updated', {
			webhookId: id,
			updates: Object.keys(updates),
		});
	}

	/**
	 * Test webhook connectivity
	 */
	async testWebhook(id: string): Promise<{ success: boolean; latency: number; error?: string }> {
		const config = this.webhooks.get(id);
		if (!config) {
			throw new Error(`Webhook ${id} not found`);
		}

		const testEvent: EventEnvelope = {
			id: `test-${Date.now()}`,
			type: 'cipher:test',
			data: { message: 'Webhook connectivity test', timestamp: Date.now() },
			metadata: { timestamp: Date.now(), source: 'webhook-test' },
		};

		const startTime = Date.now();
		try {
			const response = await this.deliverEvent(config, testEvent);
			const latency = Date.now() - startTime;

			return {
				success: response.ok,
				latency,
				...(response.ok ? {} : { error: `HTTP ${response.status}: ${response.statusText}` }),
			};
		} catch (error) {
			const latency = Date.now() - startTime;
			return {
				success: false,
				latency,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Dispose of the webhook forwarder
	 */
	dispose(): void {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
		}

		// Clear all batch timeouts
		for (const timeout of this.batchTimeouts.values()) {
			clearTimeout(timeout);
		}
		this.batchTimeouts.clear();
		this.batchQueues.clear();

		logger.info('Webhook forwarder disposed');
	}

	private async addToBatch(
		webhookId: string,
		event: EventEnvelope,
		config: WebhookConfig
	): Promise<void> {
		if (!this.batchQueues.has(webhookId)) {
			this.batchQueues.set(webhookId, []);
		}

		const batch = this.batchQueues.get(webhookId)!;
		batch.push(event);

		// Check if batch is full
		if (batch.length >= (config.batchSize || 1)) {
			await this.flushBatch(webhookId, config);
			return;
		}

		// Set timeout for batch if not already set
		if (!this.batchTimeouts.has(webhookId)) {
			const timeout = setTimeout(() => {
				this.flushBatch(webhookId, config);
			}, config.batchTimeout);
			this.batchTimeouts.set(webhookId, timeout);
		}
	}

	private async flushBatch(webhookId: string, config: WebhookConfig): Promise<void> {
		const batch = this.batchQueues.get(webhookId);
		if (!batch || batch.length === 0) return;

		// Clear timeout
		const timeout = this.batchTimeouts.get(webhookId);
		if (timeout) {
			clearTimeout(timeout);
			this.batchTimeouts.delete(webhookId);
		}

		// Create batch event
		const batchEvent: EventEnvelope = {
			id: `batch-${Date.now()}`,
			type: 'cipher:batch',
			data: { events: batch, count: batch.length },
			metadata: { timestamp: Date.now(), source: 'batch' },
		};

		await this.queueDelivery(webhookId, batchEvent, config);

		// Clear batch
		this.batchQueues.set(webhookId, []);
	}

	private async queueDelivery(
		webhookId: string,
		event: EventEnvelope,
		config: WebhookConfig
	): Promise<void> {
		const delivery: WebhookDelivery = {
			id: `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			webhookId,
			event,
			url: config.url,
			status: 'pending',
			attempts: 0,
			createdAt: Date.now(),
		};

		this.deliveryQueue.push(delivery);
		this.updateStats(webhookId, stats => stats.totalEvents++);
	}

	private async processDeliveryQueue(): Promise<void> {
		const pendingDeliveries = this.deliveryQueue.filter(d => d.status === 'pending');

		for (const delivery of pendingDeliveries.slice(0, 10)) {
			// Process max 10 at a time
			await this.processDelivery(delivery);
		}

		// Clean up old completed deliveries
		this.deliveryQueue = this.deliveryQueue.filter(
			d => d.status === 'pending' || d.status === 'retrying'
		);
	}

	private async processDelivery(delivery: WebhookDelivery): Promise<void> {
		const config = this.webhooks.get(delivery.webhookId);
		if (!config || !config.enabled) {
			delivery.status = 'failed';
			delivery.error = 'Webhook disabled or not found';
			this.moveToHistory(delivery);
			return;
		}

		delivery.attempts++;
		delivery.lastAttemptAt = Date.now();
		delivery.status = 'retrying';

		try {
			const response = await this.deliverEvent(config, delivery.event);

			if (response.ok) {
				delivery.status = 'delivered';
				delivery.deliveredAt = Date.now();
				this.updateStats(delivery.webhookId, stats => {
					stats.deliveredEvents++;
					if (delivery.deliveredAt && delivery.createdAt) {
						const deliveryTime = delivery.deliveredAt - delivery.createdAt;
						stats.averageDeliveryTime = (stats.averageDeliveryTime + deliveryTime) / 2;
					}
				});
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			if ((delivery.attempts ?? 0) >= (config.retries ?? 0)) {
				delivery.status = 'failed';
				delivery.error = errorMessage;
				this.updateStats(delivery.webhookId, stats => {
					stats.failedEvents++;
					stats.errorRate = stats.failedEvents / stats.totalEvents;
				});
			} else {
				delivery.status = 'pending';
				// Add delay before retry
				setTimeout(
					() => {
						delivery.status = 'pending';
					},
					(config.retryDelay ?? 0) * delivery.attempts
				);
			}

			logger.warn('Webhook delivery failed', {
				deliveryId: delivery.id,
				webhookId: delivery.webhookId,
				attempt: delivery.attempts,
				error: errorMessage,
			});
		}

		if (delivery.status === 'delivered' || delivery.status === 'failed') {
			this.moveToHistory(delivery);
		}
	}

	private async deliverEvent(config: WebhookConfig, event: EventEnvelope): Promise<Response> {
		const body = JSON.stringify(event);
		const headers = { ...config.headers };

		// Add signature if secret is provided
		if (config.secret) {
			const crypto = await import('crypto');
			const signature = crypto.createHmac('sha256', config.secret).update(body).digest('hex');
			headers['X-Webhook-Signature'] = `sha256=${signature}`;
		}

		return fetch(config.url, {
			method: config.method || 'POST',
			headers,
			body,
			signal: AbortSignal.timeout(config.timeout || 30000),
		});
	}

	private moveToHistory(delivery: WebhookDelivery): void {
		this.deliveryHistory.push(delivery);

		// Maintain history size (keep last 1000)
		if (this.deliveryHistory.length > 1000) {
			this.deliveryHistory = this.deliveryHistory.slice(-1000);
		}
	}

	private updateStats(webhookId: string, updater: (stats: WebhookStats) => void): void {
		const stats = this.stats.get(webhookId);
		if (stats) {
			updater(stats);
		}
	}

	private createWebhookStats(): WebhookStats {
		return {
			totalEvents: 0,
			deliveredEvents: 0,
			failedEvents: 0,
			pendingEvents: 0,
			averageDeliveryTime: 0,
			errorRate: 0,
		};
	}
}

/**
 * Webhook filter builders for common use cases
 */
export class WebhookFilters {
	/**
	 * Filter by event type
	 */
	static byEventType(...eventTypes: string[]): EventFilter {
		return (event: EventEnvelope) => eventTypes.includes(event.type);
	}

	/**
	 * Filter by session ID
	 */
	static bySessionId(sessionId: string): EventFilter {
		return (event: EventEnvelope) => event.metadata.sessionId === sessionId;
	}

	/**
	 * Filter by event source
	 */
	static bySource(source: string): EventFilter {
		return (event: EventEnvelope) => event.metadata.source === source;
	}

	/**
	 * Filter by priority
	 */
	static byPriority(priority: 'high' | 'normal' | 'low'): EventFilter {
		return (event: EventEnvelope) => event.metadata.priority === priority;
	}

	/**
	 * Filter by time range
	 */
	static byTimeRange(start: number, end: number): EventFilter {
		return (event: EventEnvelope) =>
			event.metadata.timestamp >= start && event.metadata.timestamp <= end;
	}

	/**
	 * Combine filters with AND logic
	 */
	static and(...filters: EventFilter[]): EventFilter {
		return (event: EventEnvelope) => filters.every(filter => filter(event));
	}

	/**
	 * Combine filters with OR logic
	 */
	static or(...filters: EventFilter[]): EventFilter {
		return (event: EventEnvelope) => filters.some(filter => filter(event));
	}

	/**
	 * Negate a filter
	 */
	static not(filter: EventFilter): EventFilter {
		return (event: EventEnvelope) => !filter(event);
	}
}
