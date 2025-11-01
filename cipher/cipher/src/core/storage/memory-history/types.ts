/**
 * Memory History Types
 *
 * Type definitions for the memory history storage service.
 * Defines interfaces for memory operation tracking and audit trails.
 *
 * @module storage/memory-history/types
 */

/**
 * Memory operation types
 */
export type MemoryOperation = 'ADD' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'RETRIEVE';

/**
 * Memory history entry interface
 */
export interface MemoryHistoryEntry {
	/** Unique identifier (UUID) */
	id: string;
	/** Project scope identifier */
	projectId: string;
	/** Reference to memory entry */
	memoryId: string;
	/** Descriptive operation name */
	name: string;
	/** Categorization tags */
	tags: string[];
	/** User identifier (optional) */
	userId?: string;
	/** Operation type */
	operation: MemoryOperation;
	/** ISO timestamp */
	timestamp: string;
	/** Flexible metadata storage */
	metadata: Record<string, any>;
	/** Operation success status */
	success: boolean;
	/** Error details if failed */
	error?: string;
	/** Session correlation */
	sessionId?: string;
	/** Operation duration in ms */
	duration?: number;
}

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
	/** Maximum number of results to return */
	limit?: number;
	/** Number of results to skip */
	offset?: number;
	/** Sort order (asc/desc) */
	sortOrder?: 'asc' | 'desc';
	/** Field to sort by */
	sortBy?: keyof MemoryHistoryEntry;
	/** Include only successful operations */
	successOnly?: boolean;
	/** Include only failed operations */
	errorsOnly?: boolean;
}

/**
 * History filters for querying
 */
export interface HistoryFilters {
	/** Filter by project ID */
	projectId?: string;
	/** Filter by user ID */
	userId?: string;
	/** Filter by memory ID */
	memoryId?: string;
	/** Filter by operation type */
	operation?: MemoryOperation | MemoryOperation[];
	/** Filter by tags (must include all specified tags) */
	tags?: string[];
	/** Filter by session ID */
	sessionId?: string;
	/** Filter by success status */
	success?: boolean;
	/** Filter by time range - start time (ISO string) */
	startTime?: string;
	/** Filter by time range - end time (ISO string) */
	endTime?: string;
	/** Additional query options */
	options?: QueryOptions;
}

/**
 * Operation statistics
 */
export interface OperationStats {
	/** Total number of operations */
	totalOperations: number;
	/** Count by operation type */
	operationCounts: Record<MemoryOperation, number>;
	/** Success count */
	successCount: number;
	/** Error count */
	errorCount: number;
	/** Average operation duration */
	averageDuration?: number;
	/** Most common tags */
	topTags: Array<{ tag: string; count: number }>;
	/** Date range of data */
	dateRange: {
		earliest: string;
		latest: string;
	};
}

/**
 * Memory history service interface
 */
export interface MemoryHistoryService {
	// Core operations
	recordOperation(entry: MemoryHistoryEntry): Promise<void>;
	getHistory(filters: HistoryFilters): Promise<MemoryHistoryEntry[]>;

	// Query operations
	getByProjectId(projectId: string, options?: QueryOptions): Promise<MemoryHistoryEntry[]>;
	getByUserId(userId: string, options?: QueryOptions): Promise<MemoryHistoryEntry[]>;
	getByTags(tags: string[], options?: QueryOptions): Promise<MemoryHistoryEntry[]>;
	getByTimeRange(
		startTime: string,
		endTime: string,
		options?: QueryOptions
	): Promise<MemoryHistoryEntry[]>;

	// Analytics
	getOperationStats(projectId?: string, userId?: string): Promise<OperationStats>;
	getSuccessRate(projectId?: string, userId?: string): Promise<number>;

	// Connection management
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;
}
