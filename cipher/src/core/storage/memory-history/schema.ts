/**
 * Memory History Database Schema
 *
 * Database schema definitions for storing memory operation history.
 * Supports both SQLite and PostgreSQL backends with proper indexing.
 *
 * @module storage/memory-history/schema
 */

/**
 * SQL schema for memory history table (SQLite)
 */
export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS memory_history (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	memory_id TEXT NOT NULL,
	name TEXT NOT NULL,
	tags TEXT NOT NULL, -- JSON array stored as text
	user_id TEXT,
	operation TEXT NOT NULL CHECK (operation IN ('ADD', 'UPDATE', 'DELETE', 'SEARCH', 'RETRIEVE')),
	timestamp TEXT NOT NULL,
	metadata TEXT NOT NULL, -- JSON object stored as text
	success INTEGER NOT NULL CHECK (success IN (0, 1)), -- Boolean as integer
	error TEXT,
	session_id TEXT,
	duration INTEGER,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_history_project_id ON memory_history(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_user_id ON memory_history(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_memory_id ON memory_history(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_operation ON memory_history(operation);
CREATE INDEX IF NOT EXISTS idx_memory_history_timestamp ON memory_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_history_session_id ON memory_history(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_success ON memory_history(success);
CREATE INDEX IF NOT EXISTS idx_memory_history_project_timestamp ON memory_history(project_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_history_user_timestamp ON memory_history(user_id, timestamp);
`;

/**
 * SQL schema for memory history table (PostgreSQL)
 */
export const POSTGRESQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS memory_history (
	id UUID PRIMARY KEY,
	project_id VARCHAR(255) NOT NULL,
	memory_id VARCHAR(255) NOT NULL,
	name TEXT NOT NULL,
	tags JSONB NOT NULL DEFAULT '[]',
	user_id VARCHAR(255),
	operation VARCHAR(20) NOT NULL CHECK (operation IN ('ADD', 'UPDATE', 'DELETE', 'SEARCH', 'RETRIEVE')),
	timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
	metadata JSONB NOT NULL DEFAULT '{}',
	success BOOLEAN NOT NULL,
	error TEXT,
	session_id VARCHAR(255),
	duration INTEGER,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_history_project_id ON memory_history(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_user_id ON memory_history(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_memory_id ON memory_history(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_operation ON memory_history(operation);
CREATE INDEX IF NOT EXISTS idx_memory_history_timestamp ON memory_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_history_session_id ON memory_history(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_history_success ON memory_history(success);
CREATE INDEX IF NOT EXISTS idx_memory_history_project_timestamp ON memory_history(project_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_history_user_timestamp ON memory_history(user_id, timestamp);

-- JSONB indexes for tags
CREATE INDEX IF NOT EXISTS idx_memory_history_tags_gin ON memory_history USING GIN(tags);
`;

/**
 * Schema creation utilities
 */
export interface SchemaManager {
	/**
	 * Create the memory history table and indexes
	 */
	createSchema(): Promise<void>;

	/**
	 * Drop the memory history table (for testing)
	 */
	dropSchema(): Promise<void>;

	/**
	 * Check if the schema exists
	 */
	schemaExists(): Promise<boolean>;

	/**
	 * Get the current schema version
	 */
	getVersion(): Promise<string>;
}

/**
 * Schema migration utilities
 */
export interface SchemaMigration {
	version: string;
	description: string;
	up: string; // SQL to apply migration
	down: string; // SQL to rollback migration
}

/**
 * Migration history for future schema changes
 */
export const MIGRATIONS: SchemaMigration[] = [
	{
		version: '1.0.0',
		description: 'Initial memory history schema',
		up: SQLITE_SCHEMA,
		down: 'DROP TABLE IF EXISTS memory_history;',
	},
];

/**
 * Query builders for different database backends
 */
export class QueryBuilder {
	/**
	 * Build SELECT query with filters
	 */
	static buildSelectQuery(
		backend: 'sqlite' | 'postgresql',
		filters: {
			projectId?: string;
			userId?: string;
			memoryId?: string;
			operation?: string | string[];
			tags?: string[];
			sessionId?: string;
			success?: boolean;
			startTime?: string;
			endTime?: string;
		},
		options: {
			limit?: number;
			offset?: number;
			sortBy?: string;
			sortOrder?: 'asc' | 'desc';
		} = {}
	): { query: string; params: any[] } {
		const whereClauses: string[] = [];
		const params: any[] = [];
		let paramIndex = 0;

		// Build WHERE conditions
		if (filters.projectId) {
			whereClauses.push(`project_id = $${++paramIndex}`);
			params.push(filters.projectId);
		}

		if (filters.userId) {
			whereClauses.push(`user_id = $${++paramIndex}`);
			params.push(filters.userId);
		}

		if (filters.memoryId) {
			whereClauses.push(`memory_id = $${++paramIndex}`);
			params.push(filters.memoryId);
		}

		if (filters.operation) {
			if (Array.isArray(filters.operation)) {
				const placeholders = filters.operation.map(() => `$${++paramIndex}`).join(', ');
				whereClauses.push(`operation IN (${placeholders})`);
				params.push(...filters.operation);
			} else {
				whereClauses.push(`operation = $${++paramIndex}`);
				params.push(filters.operation);
			}
		}

		if (filters.sessionId) {
			whereClauses.push(`session_id = $${++paramIndex}`);
			params.push(filters.sessionId);
		}

		if (filters.success !== undefined) {
			whereClauses.push(`success = $${++paramIndex}`);
			params.push(backend === 'sqlite' ? (filters.success ? 1 : 0) : filters.success);
		}

		if (filters.startTime) {
			whereClauses.push(`timestamp >= $${++paramIndex}`);
			params.push(filters.startTime);
		}

		if (filters.endTime) {
			whereClauses.push(`timestamp <= $${++paramIndex}`);
			params.push(filters.endTime);
		}

		// Handle tags filtering (JSONB for PostgreSQL, JSON string for SQLite)
		if (filters.tags && filters.tags.length > 0) {
			if (backend === 'postgresql') {
				// Use JSONB contains operator
				whereClauses.push(`tags @> $${++paramIndex}`);
				params.push(JSON.stringify(filters.tags));
			} else {
				// For SQLite, use JSON_EXTRACT or string matching
				const tagConditions = filters.tags.map(() => {
					return `tags LIKE $${++paramIndex}`;
				});
				whereClauses.push(`(${tagConditions.join(' AND ')})`);
				params.push(...filters.tags.map(tag => `%"${tag}"%`));
			}
		}

		// Build base query
		let query = `
			SELECT id, project_id, memory_id, name, tags, user_id, operation, 
			       timestamp, metadata, success, error, session_id, duration, created_at
			FROM memory_history
		`;

		// Add WHERE clause
		if (whereClauses.length > 0) {
			query += ` WHERE ${whereClauses.join(' AND ')}`;
		}

		// Add ORDER BY
		const sortBy = options.sortBy || 'timestamp';
		const sortOrder = options.sortOrder || 'desc';
		query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

		// Add LIMIT and OFFSET
		if (options.limit) {
			query += ` LIMIT $${++paramIndex}`;
			params.push(options.limit);
		}

		if (options.offset) {
			query += ` OFFSET $${++paramIndex}`;
			params.push(options.offset);
		}

		return { query, params };
	}

	/**
	 * Build INSERT query
	 */
	static buildInsertQuery(backend: 'sqlite' | 'postgresql'): { query: string; paramCount: number } {
		if (backend === 'postgresql') {
			return {
				query: `
					INSERT INTO memory_history (
						id, project_id, memory_id, name, tags, user_id, operation,
						timestamp, metadata, success, error, session_id, duration
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
				`,
				paramCount: 13,
			};
		} else {
			return {
				query: `
					INSERT INTO memory_history (
						id, project_id, memory_id, name, tags, user_id, operation,
						timestamp, metadata, success, error, session_id, duration
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				paramCount: 13,
			};
		}
	}

	/**
	 * Build statistics query
	 */
	static buildStatsQuery(
		backend: 'sqlite' | 'postgresql',
		projectId?: string,
		userId?: string
	): { query: string; params: any[] } {
		const whereClauses: string[] = [];
		const params: any[] = [];
		let paramIndex = 0;

		if (projectId) {
			whereClauses.push(`project_id = $${++paramIndex}`);
			params.push(projectId);
		}

		if (userId) {
			whereClauses.push(`user_id = $${++paramIndex}`);
			params.push(userId);
		}

		const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

		const query = `
			SELECT 
				COUNT(*) as total_operations,
				SUM(CASE WHEN success = ${backend === 'sqlite' ? '1' : 'true'} THEN 1 ELSE 0 END) as success_count,
				SUM(CASE WHEN success = ${backend === 'sqlite' ? '0' : 'false'} THEN 1 ELSE 0 END) as error_count,
				AVG(duration) as average_duration,
				MIN(timestamp) as earliest_timestamp,
				MAX(timestamp) as latest_timestamp,
				operation,
				COUNT(*) as operation_count
			FROM memory_history
			${whereClause}
			GROUP BY operation
		`;

		return { query, params };
	}
}
