/**
 * Event Persistence Layer
 *
 * Provides persistent storage for events to enable debugging, monitoring, and replay capabilities.
 */

import { EventEnvelope } from './event-types.js';
import { logger } from '../logger/logger.js';
import { promises as fs } from 'fs';
import path from 'path';

export interface EventPersistenceConfig {
	enabled: boolean;
	storageType: 'file' | 'memory' | 'database';
	maxEvents?: number;
	rotationSize?: number;
	retentionDays?: number;
	filePath?: string;
}

export interface EventQuery {
	sessionId?: string;
	eventType?: string;
	since?: number;
	until?: number;
	limit?: number;
	offset?: number;
}

export interface EventStorageProvider {
	store(event: EventEnvelope): Promise<void>;
	query(query: EventQuery): Promise<EventEnvelope[]>;
	cleanup(retentionMs: number): Promise<number>;
	getStats(): Promise<{ totalEvents: number; storageSize: number }>;
}

/**
 * File-based event storage provider
 */
export class FileEventStorage implements EventStorageProvider {
	private config: Required<EventPersistenceConfig>;
	private currentFile = '';
	private eventCount = 0;

	constructor(config: EventPersistenceConfig) {
		this.config = {
			maxEvents: 100000,
			rotationSize: 10 * 1024 * 1024, // 10MB
			retentionDays: 30,
			filePath: './data/events',
			...config,
			enabled: true,
			storageType: 'file',
		};
	}

	async store(event: EventEnvelope): Promise<void> {
		if (!this.config.enabled) return;

		try {
			await this.ensureDirectory();
			const filename = await this.getCurrentFilename();
			const eventData = JSON.stringify(event) + '\n';

			await fs.appendFile(filename, eventData);
			this.eventCount++;

			// Check if rotation is needed
			if (this.eventCount % 1000 === 0) {
				await this.checkRotation(filename);
			}
		} catch (error) {
			logger.error('Failed to store event', {
				error: error instanceof Error ? error.message : String(error),
				eventId: event.id,
				eventType: event.type,
			});
		}
	}

	async query(query: EventQuery): Promise<EventEnvelope[]> {
		if (!this.config.enabled) return [];

		try {
			const files = await this.getRelevantFiles(query.since, query.until);
			const events: EventEnvelope[] = [];

			for (const file of files) {
				const fileEvents = await this.readEventsFromFile(file, query);
				events.push(...fileEvents);
			}

			// Sort by timestamp
			events.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

			// Apply limit and offset
			const offset = query.offset || 0;
			const limit = query.limit || events.length;

			return events.slice(offset, offset + limit);
		} catch (error) {
			logger.error('Failed to query events', {
				error: error instanceof Error ? error.message : String(error),
				query,
			});
			return [];
		}
	}

	async cleanup(retentionMs: number): Promise<number> {
		if (!this.config.enabled) return 0;

		try {
			await this.ensureDirectory();
			const files = await fs.readdir(this.config.filePath);
			const eventFiles = files.filter(f => f.startsWith('events-') && f.endsWith('.jsonl'));

			let deletedCount = 0;
			const cutoffTime = Date.now() - retentionMs;

			for (const file of eventFiles) {
				const filePath = path.join(this.config.filePath, file);
				const stats = await fs.stat(filePath);

				if (stats.mtime.getTime() < cutoffTime) {
					await fs.unlink(filePath);
					deletedCount++;
				}
			}

			return deletedCount;
		} catch (error) {
			logger.error('Failed to cleanup events', {
				error: error instanceof Error ? error.message : String(error),
			});
			return 0;
		}
	}

	async getStats(): Promise<{ totalEvents: number; storageSize: number }> {
		if (!this.config.enabled) return { totalEvents: 0, storageSize: 0 };

		try {
			await this.ensureDirectory();
			const files = await fs.readdir(this.config.filePath);
			const eventFiles = files.filter(f => f.startsWith('events-') && f.endsWith('.jsonl'));

			let totalEvents = 0;
			let storageSize = 0;

			for (const file of eventFiles) {
				const filePath = path.join(this.config.filePath, file);
				const stats = await fs.stat(filePath);
				storageSize += stats.size;

				// Count lines for event count
				const content = await fs.readFile(filePath, 'utf-8');
				totalEvents += content.split('\n').filter(line => line.trim()).length;
			}

			return { totalEvents, storageSize };
		} catch (error) {
			logger.error('Failed to get storage stats', {
				error: error instanceof Error ? error.message : String(error),
			});
			return { totalEvents: 0, storageSize: 0 };
		}
	}

	private async ensureDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.config.filePath, { recursive: true });
		} catch {
			// Directory might already exist
		}
	}

	private async getCurrentFilename(): Promise<string> {
		if (!this.currentFile) {
			const date = new Date().toISOString().split('T')[0];
			this.currentFile = path.join(this.config.filePath, `events-${date}.jsonl`);
		}
		return this.currentFile;
	}

	private async checkRotation(filename: string): Promise<void> {
		try {
			const stats = await fs.stat(filename);
			if (stats.size > this.config.rotationSize) {
				// Force new file creation
				this.currentFile = '';
			}
		} catch {
			// File might not exist yet
		}
	}

	private async getRelevantFiles(since?: number, until?: number): Promise<string[]> {
		try {
			await this.ensureDirectory();
			const files = await fs.readdir(this.config.filePath);
			const eventFiles = files.filter(f => f.startsWith('events-') && f.endsWith('.jsonl'));

			if (!since && !until) {
				return eventFiles.map(f => path.join(this.config.filePath, f));
			}

			// Filter files by date range if specified
			const relevantFiles: string[] = [];
			for (const file of eventFiles) {
				const filePath = path.join(this.config.filePath, file);
				const stats = await fs.stat(filePath);

				if (since && stats.mtime.getTime() < since) continue;
				if (until && stats.mtime.getTime() > until) continue;

				relevantFiles.push(filePath);
			}

			return relevantFiles;
		} catch {
			return [];
		}
	}

	private async readEventsFromFile(filePath: string, query: EventQuery): Promise<EventEnvelope[]> {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const lines = content.split('\n').filter(line => line.trim());
			const events: EventEnvelope[] = [];

			for (const line of lines) {
				try {
					const event: EventEnvelope = JSON.parse(line);

					// Apply filters
					if (query.sessionId && event.metadata.sessionId !== query.sessionId) continue;
					if (query.eventType && event.type !== query.eventType) continue;
					if (query.since && event.metadata.timestamp < query.since) continue;
					if (query.until && event.metadata.timestamp > query.until) continue;

					events.push(event);
				} catch {
					// Skip invalid JSON lines
				}
			}

			return events;
		} catch {
			return [];
		}
	}
}

/**
 * In-memory event storage provider (for testing/development)
 */
export class MemoryEventStorage implements EventStorageProvider {
	private events: EventEnvelope[] = [];
	private config: Required<EventPersistenceConfig>;

	constructor(config: EventPersistenceConfig) {
		this.config = {
			maxEvents: 10000,
			retentionDays: 7,
			rotationSize: config.rotationSize ?? 0,
			filePath: config.filePath ?? '',
			...config,
			enabled: true,
			storageType: 'memory',
		};
	}

	async store(event: EventEnvelope): Promise<void> {
		if (!this.config.enabled) return;

		this.events.push(event);

		// Maintain max events limit
		if (this.events.length > this.config.maxEvents) {
			this.events = this.events.slice(-this.config.maxEvents);
		}
	}

	async query(query: EventQuery): Promise<EventEnvelope[]> {
		if (!this.config.enabled) return [];

		let filteredEvents = this.events;

		// Apply filters
		if (query.sessionId) {
			filteredEvents = filteredEvents.filter(e => e.metadata.sessionId === query.sessionId);
		}
		if (query.eventType) {
			filteredEvents = filteredEvents.filter(e => e.type === query.eventType);
		}
		if (query.since) {
			filteredEvents = filteredEvents.filter(e => e.metadata.timestamp >= query.since!);
		}
		if (query.until) {
			filteredEvents = filteredEvents.filter(e => e.metadata.timestamp <= query.until!);
		}

		// Sort by timestamp
		filteredEvents.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

		// Apply limit and offset
		const offset = query.offset || 0;
		const limit = query.limit || filteredEvents.length;

		return filteredEvents.slice(offset, offset + limit);
	}

	async cleanup(retentionMs: number): Promise<number> {
		if (!this.config.enabled) return 0;

		const cutoffTime = Date.now() - retentionMs;
		const originalLength = this.events.length;

		this.events = this.events.filter(e => e.metadata.timestamp >= cutoffTime);

		return originalLength - this.events.length;
	}

	async getStats(): Promise<{ totalEvents: number; storageSize: number }> {
		const storageSize = JSON.stringify(this.events).length;
		return {
			totalEvents: this.events.length,
			storageSize,
		};
	}
}

/**
 * Event persistence manager
 */
export class EventPersistence {
	private storage: EventStorageProvider;
	private cleanupInterval?: NodeJS.Timeout;

	constructor(config: EventPersistenceConfig) {
		if (config.storageType === 'file') {
			this.storage = new FileEventStorage(config);
		} else {
			this.storage = new MemoryEventStorage(config);
		}

		// Set up periodic cleanup
		if (config.retentionDays && config.retentionDays > 0) {
			const cleanupIntervalMs = 24 * 60 * 60 * 1000; // Daily cleanup
			const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

			this.cleanupInterval = setInterval(async () => {
				try {
					const deletedCount = await this.storage.cleanup(retentionMs);
					if (deletedCount > 0) {
						logger.info('Event persistence cleanup completed', { deletedCount });
					}
				} catch (error) {
					logger.error('Event persistence cleanup failed', { error });
				}
			}, cleanupIntervalMs);
		}
	}

	async store(event: EventEnvelope): Promise<void> {
		return this.storage.store(event);
	}

	async query(query: EventQuery): Promise<EventEnvelope[]> {
		return this.storage.query(query);
	}

	async getStats(): Promise<{ totalEvents: number; storageSize: number }> {
		return this.storage.getStats();
	}

	dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}
