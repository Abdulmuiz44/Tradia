/**
 * Memory History Storage Module
 *
 * Main export point for the memory history storage service.
 * Provides tracking and audit trails for memory operations.
 *
 * @module storage/memory-history
 */

// Core exports
export { MemoryHistoryStorageService } from './service.js';

// Type exports
export type {
	MemoryHistoryEntry,
	MemoryHistoryService,
	HistoryFilters,
	QueryOptions,
	OperationStats,
	MemoryOperation,
} from './types.js';

// Import types for internal use
import type { MemoryHistoryEntry } from './types.js';
import { MemoryHistoryStorageService } from './service.js';

// Schema exports
export { SQLITE_SCHEMA, POSTGRESQL_SCHEMA, MIGRATIONS, QueryBuilder } from './schema.js';
export type { SchemaManager, SchemaMigration } from './schema.js';

/**
 * Create a new memory history service instance
 *
 * @returns A new MemoryHistoryStorageService instance
 *
 * @example
 * ```typescript
 * import { createMemoryHistoryService } from './storage/memory-history';
 *
 * const historyService = createMemoryHistoryService();
 * await historyService.connect();
 *
 * await historyService.recordOperation({
 *   id: 'op-123',
 *   projectId: 'project-1',
 *   memoryId: 'mem-456',
 *   name: 'Add knowledge about React hooks',
 *   tags: ['react', 'hooks', 'javascript'],
 *   operation: 'ADD',
 *   timestamp: new Date().toISOString(),
 *   metadata: { source: 'cli' },
 *   success: true
 * });
 * ```
 */
export function createMemoryHistoryService(): MemoryHistoryStorageService {
	return new MemoryHistoryStorageService();
}

/**
 * Helper function to create a memory history entry
 *
 * @param params - Partial entry parameters
 * @returns Complete memory history entry with generated ID and timestamp
 *
 * @example
 * ```typescript
 * import { createMemoryHistoryEntry } from './storage/memory-history';
 *
 * const entry = createMemoryHistoryEntry({
 *   projectId: 'project-1',
 *   memoryId: 'mem-456',
 *   name: 'Search for React patterns',
 *   operation: 'SEARCH',
 *   tags: ['react', 'patterns'],
 *   success: true,
 *   metadata: { query: 'react hooks patterns' }
 * });
 * ```
 */
export function createMemoryHistoryEntry(
	params: Omit<MemoryHistoryEntry, 'id' | 'timestamp'> & {
		id?: string;
		timestamp?: string;
	}
): MemoryHistoryEntry {
	return {
		id: params.id || `mh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: params.timestamp || new Date().toISOString(),
		...params,
	} as MemoryHistoryEntry;
}
