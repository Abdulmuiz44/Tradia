/**
 * Memory History Storage Service
 *
 * Core service implementation for tracking memory operations history.
 * Integrates with the existing dual-backend storage architecture.
 *
 * @module storage/memory-history/service
 */

import { StorageManager } from '../manager.js';
import { StorageError, StorageConnectionError } from '../backend/types.js';
import { Logger, createLogger } from '../../logger/index.js';
import { LOG_PREFIXES } from '../constants.js';
import { env } from '../../env.js';
import {
	MemoryHistoryEntry,
	MemoryHistoryService,
	HistoryFilters,
	QueryOptions,
	OperationStats,
	MemoryOperation,
} from './types.js';

/**
 * Memory History Service Implementation
 *
 * Provides persistence for memory operation audit trails with support for
 * multi-tenant and project-scoped storage using the existing storage infrastructure.
 */
export class MemoryHistoryStorageService implements MemoryHistoryService {
	private readonly logger: Logger;
	private storageManager: StorageManager | undefined;
	private connected = false;
	private schemaInitialized = false;

	constructor() {
		this.logger = createLogger({ level: env.CIPHER_LOG_LEVEL || 'info' });
	}

	/**
	 * Initialize connection to storage backend
	 */
	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug(`${LOG_PREFIXES.BACKEND} Memory history service already connected`);
			return;
		}

		try {
			this.logger.info(`${LOG_PREFIXES.BACKEND} Connecting memory history service`);

			// Import storage factory to avoid circular dependencies
			const { createStorageFromEnv } = await import('../factory.js');
			const storageFactory = await createStorageFromEnv();
			this.storageManager = storageFactory.manager;

			// Initialize database schema
			await this.initializeSchema();

			this.connected = true;
			this.logger.info(`${LOG_PREFIXES.BACKEND} Memory history service connected successfully`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Failed to connect memory history service`, {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageConnectionError(
				`Failed to connect memory history service: ${error instanceof Error ? error.message : String(error)}`,
				'memory-history'
			);
		}
	}

	/**
	 * Disconnect from storage backend
	 */
	async disconnect(): Promise<void> {
		if (!this.connected) {
			return;
		}

		try {
			if (this.storageManager) {
				await this.storageManager.disconnect();
				this.storageManager = undefined;
			}
			this.connected = false;
			this.schemaInitialized = false;
			this.logger.info(`${LOG_PREFIXES.BACKEND} Memory history service disconnected`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Error disconnecting memory history service`, {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Check if service is connected
	 */
	isConnected(): boolean {
		return this.connected && this.storageManager?.isConnected() === true;
	}

	/**
	 * Record a memory operation in history
	 */
	async recordOperation(entry: MemoryHistoryEntry): Promise<void> {
		if (!this.isConnected()) {
			throw new StorageError('Memory history service not connected', 'recordOperation');
		}

		try {
			const startTime = Date.now();
			await this.ensureSchemaInitialized();

			// Validate entry
			this.validateEntry(entry);
			// Store in database backend for persistence
			const key = `memory_history:${entry.id}`;
			const backends = await this.storageManager!.getBackends();

			if (!backends) {
				throw new Error('Storage backends not available');
			}

			// Use database backend for persistent storage
			await backends.database.set(key, entry);

			// Also store in recent history cache (last 1000 entries)
			await this.updateRecentHistoryCache(entry);

			const duration = Date.now() - startTime;
			this.logger.debug(`${LOG_PREFIXES.BACKEND} Recorded memory operation`, {
				id: entry.id,
				operation: entry.operation,
				projectId: entry.projectId,
				success: entry.success,
				duration: `${duration}ms`,
			});
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Failed to record memory operation`, {
				id: entry.id,
				operation: entry.operation,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError(
				`Failed to record memory operation: ${error instanceof Error ? error.message : String(error)}`,
				'recordOperation'
			);
		}
	}

	/**
	 * Get memory operation history with filters
	 */
	async getHistory(filters: HistoryFilters): Promise<MemoryHistoryEntry[]> {
		if (!this.isConnected()) {
			throw new StorageError('Memory history service not connected', 'getHistory');
		}

		try {
			await this.ensureSchemaInitialized();

			// Build query based on filters
			const results = await this.queryHistory(filters);

			this.logger.debug(`${LOG_PREFIXES.BACKEND} Retrieved memory history`, {
				count: results.length,
				filters: this.sanitizeFilters(filters),
			});

			return results;
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Failed to get memory history`, {
				filters: this.sanitizeFilters(filters),
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError(
				`Failed to get memory history: ${error instanceof Error ? error.message : String(error)}`,
				'getHistory'
			);
		}
	}

	/**
	 * Get history by project ID
	 */
	async getByProjectId(
		projectId: string,
		options: QueryOptions = {}
	): Promise<MemoryHistoryEntry[]> {
		return this.getHistory({ projectId, options });
	}

	/**
	 * Get history by user ID
	 */
	async getByUserId(userId: string, options: QueryOptions = {}): Promise<MemoryHistoryEntry[]> {
		return this.getHistory({ userId, options });
	}

	/**
	 * Get history by tags
	 */
	async getByTags(tags: string[], options: QueryOptions = {}): Promise<MemoryHistoryEntry[]> {
		return this.getHistory({ tags, options });
	}

	/**
	 * Get history by time range
	 */
	async getByTimeRange(
		startTime: string,
		endTime: string,
		options: QueryOptions = {}
	): Promise<MemoryHistoryEntry[]> {
		return this.getHistory({ startTime, endTime, options });
	}

	/**
	 * Get operation statistics
	 */
	async getOperationStats(projectId?: string, userId?: string): Promise<OperationStats> {
		if (!this.isConnected()) {
			throw new StorageError('Memory history service not connected', 'getOperationStats');
		}

		try {
			await this.ensureSchemaInitialized();

			// const backends = await this.storageManager!.getBackends();

			// Get all matching entries
			const filters: HistoryFilters = {};
			if (projectId) filters.projectId = projectId;
			if (userId) filters.userId = userId;

			const entries = await this.queryHistory(filters);

			// Calculate statistics
			const stats = this.calculateStats(entries);

			this.logger.debug(`${LOG_PREFIXES.BACKEND} Retrieved operation statistics`, {
				projectId,
				userId,
				totalOperations: stats.totalOperations,
			});

			return stats;
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Failed to get operation statistics`, {
				projectId,
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError(
				`Failed to get operation statistics: ${error instanceof Error ? error.message : String(error)}`,
				'getOperationStats'
			);
		}
	}

	/**
	 * Get success rate for operations
	 */
	async getSuccessRate(projectId?: string, userId?: string): Promise<number> {
		const stats = await this.getOperationStats(projectId, userId);

		if (stats.totalOperations === 0) {
			return 0;
		}

		return stats.successCount / stats.totalOperations;
	}

	// Private helper methods

	/**
	 * Initialize database schema
	 */
	private async initializeSchema(): Promise<void> {
		if (this.schemaInitialized) {
			return;
		}

		try {
			// Check if we're using in-memory storage (schema not needed)
			const backends = await this.storageManager!.getBackends();
			if (!backends) {
				throw new Error('Storage backends not available');
			}
			const backendType = backends.database.getBackendType();

			if (backendType === 'in-memory') {
				// In-memory storage doesn't need schema initialization
				this.schemaInitialized = true;
				return;
			}

			// For SQLite/PostgreSQL, we would initialize the schema here
			// For now, we'll use the key-value storage pattern
			this.schemaInitialized = true;

			this.logger.info(
				`${LOG_PREFIXES.BACKEND} Memory history schema initialized for ${backendType}`
			);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.BACKEND} Failed to initialize schema`, {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Ensure schema is initialized
	 */
	private async ensureSchemaInitialized(): Promise<void> {
		if (!this.schemaInitialized) {
			await this.initializeSchema();
		}
	}

	/**
	 * Validate memory history entry
	 */
	private validateEntry(entry: MemoryHistoryEntry): void {
		const required = ['id', 'projectId', 'memoryId', 'name', 'operation', 'timestamp', 'success'];
		for (const field of required) {
			if (!(field in entry) || entry[field as keyof MemoryHistoryEntry] === undefined) {
				throw new StorageError(`Missing required field: ${field}`, 'validateEntry');
			}
		}

		// Validate operation type
		const validOperations: MemoryOperation[] = ['ADD', 'UPDATE', 'DELETE', 'SEARCH', 'RETRIEVE'];
		if (!validOperations.includes(entry.operation)) {
			throw new StorageError(`Invalid operation type: ${entry.operation}`, 'validateEntry');
		}

		// Validate timestamp format
		if (isNaN(Date.parse(entry.timestamp))) {
			throw new StorageError(`Invalid timestamp format: ${entry.timestamp}`, 'validateEntry');
		}

		// Validate tags array
		if (!Array.isArray(entry.tags)) {
			throw new StorageError('Tags must be an array', 'validateEntry');
		}
	}

	/**
	 * Query history with filters
	 */
	private async queryHistory(filters: HistoryFilters): Promise<MemoryHistoryEntry[]> {
		const backends = await this.storageManager!.getBackends();
		if (!backends) {
			throw new Error('Storage backends not available');
		}

		// Get all history entries matching the project pattern
		const keyPrefix = 'memory_history:';
		const keys = await backends.database.list(keyPrefix);

		// Fetch all entries
		const entries: MemoryHistoryEntry[] = [];
		for (const key of keys) {
			const entry = await backends.database.get<MemoryHistoryEntry>(key);
			if (entry) {
				entries.push(entry);
			}
		}

		// Apply filters
		let filteredEntries = entries;

		if (filters.projectId) {
			filteredEntries = filteredEntries.filter(entry => entry.projectId === filters.projectId);
		}

		if (filters.userId) {
			filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
		}

		if (filters.memoryId) {
			filteredEntries = filteredEntries.filter(entry => entry.memoryId === filters.memoryId);
		}

		if (filters.operation) {
			const operations = Array.isArray(filters.operation) ? filters.operation : [filters.operation];
			filteredEntries = filteredEntries.filter(entry => operations.includes(entry.operation));
		}

		if (filters.tags && filters.tags.length > 0) {
			filteredEntries = filteredEntries.filter(entry =>
				filters.tags!.every(tag => entry.tags.includes(tag))
			);
		}

		if (filters.sessionId) {
			filteredEntries = filteredEntries.filter(entry => entry.sessionId === filters.sessionId);
		}

		if (filters.success !== undefined) {
			filteredEntries = filteredEntries.filter(entry => entry.success === filters.success);
		}

		if (filters.startTime) {
			filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filters.startTime!);
		}

		if (filters.endTime) {
			filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filters.endTime!);
		}

		// Apply sorting
		const sortBy = filters.options?.sortBy || 'timestamp';
		const sortOrder = filters.options?.sortOrder || 'desc';

		filteredEntries.sort((a, b) => {
			const aValue = a[sortBy as keyof MemoryHistoryEntry];
			const bValue = b[sortBy as keyof MemoryHistoryEntry];

			if (aValue === undefined && bValue === undefined) return 0;
			if (aValue === undefined) return sortOrder === 'asc' ? -1 : 1;
			if (bValue === undefined) return sortOrder === 'asc' ? 1 : -1;

			let comparison = 0;
			if (aValue < bValue) comparison = -1;
			if (aValue > bValue) comparison = 1;

			return sortOrder === 'asc' ? comparison : -comparison;
		});

		// Apply pagination
		const offset = filters.options?.offset || 0;
		const limit = filters.options?.limit;

		if (limit) {
			filteredEntries = filteredEntries.slice(offset, offset + limit);
		} else if (offset > 0) {
			filteredEntries = filteredEntries.slice(offset);
		}

		return filteredEntries;
	}

	/**
	 * Update recent history cache
	 */
	private async updateRecentHistoryCache(entry: MemoryHistoryEntry): Promise<void> {
		try {
			const backends = await this.storageManager!.getBackends();
			if (!backends) {
				throw new Error('Storage backends not available');
			}

			// Get current recent history
			const recentKey = 'memory_history:recent';
			const recentEntries = (await backends.cache.get<MemoryHistoryEntry[]>(recentKey)) || [];

			// Add new entry at the beginning
			recentEntries.unshift(entry);

			// Keep only last 1000 entries
			const trimmedEntries = recentEntries.slice(0, 1000);

			// Store back in cache with 1 hour TTL
			await backends.cache.set(recentKey, trimmedEntries, 3600);
		} catch (error) {
			// Log error but don't throw - cache update failure shouldn't fail the operation
			this.logger.warn(`${LOG_PREFIXES.BACKEND} Failed to update recent history cache`, {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Calculate statistics from entries
	 */
	private calculateStats(entries: MemoryHistoryEntry[]): OperationStats {
		const operationCounts: Record<MemoryOperation, number> = {
			ADD: 0,
			UPDATE: 0,
			DELETE: 0,
			SEARCH: 0,
			RETRIEVE: 0,
		};

		let successCount = 0;
		let errorCount = 0;
		let totalDuration = 0;
		let durationCount = 0;
		const tagCounts: Record<string, number> = {};

		let earliest = entries[0]?.timestamp;
		let latest = entries[0]?.timestamp;

		for (const entry of entries) {
			// Count operations
			operationCounts[entry.operation]++;

			// Count success/errors
			if (entry.success) {
				successCount++;
			} else {
				errorCount++;
			}

			// Calculate average duration
			if (entry.duration !== undefined) {
				totalDuration += entry.duration;
				durationCount++;
			}

			// Count tags
			for (const tag of entry.tags) {
				tagCounts[tag] = (tagCounts[tag] || 0) + 1;
			}

			// Track date range
			if (earliest === undefined || entry.timestamp < earliest) earliest = entry.timestamp;
			if (latest === undefined || entry.timestamp > latest) latest = entry.timestamp;
		}

		// Get top tags
		const topTags = Object.entries(tagCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([tag, count]) => ({ tag, count }));

		return {
			totalOperations: entries.length,
			operationCounts,
			successCount,
			errorCount,
			averageDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
			topTags,
			dateRange: {
				earliest: earliest || new Date().toISOString(),
				latest: latest || new Date().toISOString(),
			},
		};
	}

	/**
	 * Sanitize filters for logging (remove sensitive data)
	 */
	private sanitizeFilters(filters: HistoryFilters): any {
		const sanitized = { ...filters };
		// Remove or mask sensitive fields if needed
		return sanitized;
	}
}
