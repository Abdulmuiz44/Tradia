/**
 * PostgreSQL Database Backend Implementation
 *
 * High-performance PostgreSQL backend for persistent, reliable storage.
 * Supports connection pooling, prepared statements, and comprehensive error handling.
 *
 * Features:
 * - Connection pooling with configurable settings
 * - Prepared statements for SQL injection protection
 * - Schema creation and management
 * - Comprehensive error handling
 * - Performance monitoring and logging
 * - Support for both connection URLs and individual parameters
 *
 * @module storage/backend/postgresql
 */

import { Pool, type PoolConfig } from 'pg';
import type { DatabaseBackend } from './database-backend.js';
import type { PostgresBackendConfig } from '../config.js';
import { StorageError, StorageConnectionError } from './types.js';
import { createLogger, type Logger } from '../../logger/index.js';

/**
 * PostgreSQL Database Backend
 *
 * Implements the DatabaseBackend interface using PostgreSQL as the underlying storage.
 * Provides ACID compliance, strong consistency, and enterprise-grade reliability.
 *
 * Key Features:
 * - Connection pooling for high concurrency
 * - Prepared statements for performance and security
 * - Automatic schema creation and management
 * - Full CRUD operations with atomic transactions
 * - Comprehensive error handling and logging
 *
 * @example
 * ```typescript
 * const backend = new PostgresBackend({
 *   type: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'myapp',
 *   user: 'postgres',
 *   password: 'secret'
 * });
 *
 * await backend.connect();
 * await backend.set('user:123', userData);
 * const user = await backend.get('user:123');
 * await backend.disconnect();
 * ```
 */
export class PostgresBackend implements DatabaseBackend {
	private pool: Pool | undefined;
	private connected = false;
	private readonly config: PostgresBackendConfig;
	private readonly logger: Logger;

	// Prepared statement cache
	private statements: Map<string, string> = new Map();

	constructor(config: PostgresBackendConfig) {
		this.config = config;
		this.logger = createLogger();
		this.initializeStatements();
	}

	/**
	 * Initialize prepared statement definitions
	 */
	private initializeStatements(): void {
		this.statements.set('get', 'SELECT value FROM cipher_store WHERE key = $1');
		this.statements.set(
			'set',
			`
			INSERT INTO cipher_store (key, value, created_at, updated_at)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (key) DO UPDATE SET
				value = EXCLUDED.value,
				updated_at = EXCLUDED.updated_at
		`
		);
		this.statements.set('delete', 'DELETE FROM cipher_store WHERE key = $1');
		this.statements.set('list', 'SELECT key FROM cipher_store WHERE key LIKE $1 ORDER BY key');
		this.statements.set(
			'listAppend',
			`
			INSERT INTO cipher_lists (key, value, position, created_at)
			VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM cipher_lists WHERE key = $1), 0), $3)
		`
		);
		this.statements.set(
			'getRange',
			`
			SELECT value FROM cipher_lists
			WHERE key = $1
			ORDER BY position
			LIMIT $2 OFFSET $3
		`
		);
		this.statements.set('deleteList', 'DELETE FROM cipher_lists WHERE key = $1');
		this.statements.set(
			'updateListMetadata',
			`
			INSERT INTO cipher_list_metadata (key, count, created_at, updated_at)
			VALUES ($1, (SELECT COUNT(*) FROM cipher_lists WHERE key = $1), $2, $3)
			ON CONFLICT (key) DO UPDATE SET
				count = (SELECT COUNT(*) FROM cipher_lists WHERE key = $1),
				updated_at = EXCLUDED.updated_at
		`
		);
	}

	/**
	 * Connect to PostgreSQL database
	 */
	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug('PostgreSQL backend already connected');
			return;
		}

		try {
			this.logger.info('Connecting to PostgreSQL database');

			// Build connection configuration
			const poolConfig = this.buildPoolConfig();

			// Create connection pool
			this.pool = new Pool(poolConfig);

			// Test connection
			const client = await this.pool.connect();
			try {
				await client.query('SELECT 1');
				this.logger.debug('PostgreSQL connection test successful');
			} finally {
				client.release();
			}

			// Create tables if they don't exist
			await this.createTables();

			this.connected = true;
			this.logger.info('PostgreSQL backend connected successfully', {
				host: this.config.host || 'localhost',
				database: this.config.database,
				pool: {
					max: poolConfig.max,
					min: poolConfig.min,
				},
			});
		} catch (error) {
			this.logger.error('Failed to connect to PostgreSQL database', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageConnectionError(
				'Failed to connect to PostgreSQL database',
				'postgres',
				error as Error
			);
		}
	}

	/**
	 * Disconnect from PostgreSQL database
	 */
	async disconnect(): Promise<void> {
		if (!this.connected || !this.pool) {
			return;
		}

		try {
			await this.pool.end();
			this.connected = false;
			this.pool = undefined;
			this.logger.info('PostgreSQL backend disconnected');
		} catch (error) {
			this.logger.error('Error disconnecting from PostgreSQL', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to disconnect from PostgreSQL', 'disconnect', error as Error);
		}
	}

	/**
	 * Check if backend is connected
	 */
	isConnected(): boolean {
		return this.connected && this.pool !== undefined;
	}

	/**
	 * Get backend type identifier
	 */
	getBackendType(): string {
		return 'postgres';
	}

	/**
	 * Get value by key
	 */
	async get<T>(key: string): Promise<T | undefined> {
		this.checkConnection();

		try {
			const result = await this.pool!.query(this.statements.get('get')!, [key]);

			if (result.rows.length === 0) {
				return undefined;
			}

			const serialized = result.rows[0].value;
			return JSON.parse(serialized) as T;
		} catch (error) {
			this.logger.error('Error getting value from PostgreSQL', {
				key,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to get value from PostgreSQL', 'get', error as Error);
		}
	}

	/**
	 * Set key-value pair
	 */
	async set<T>(key: string, value: T): Promise<void> {
		this.checkConnection();

		try {
			const serialized = JSON.stringify(value);
			const now = new Date();
			await this.pool!.query(this.statements.get('set')!, [key, serialized, now, now]);
		} catch (error) {
			this.logger.error('Error setting value in PostgreSQL', {
				key,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to set value in PostgreSQL', 'set', error as Error);
		}
	}

	/**
	 * Delete key
	 */
	async delete(key: string): Promise<void> {
		this.checkConnection();

		try {
			// Use transaction to delete from both key-value store and lists
			const client = await this.pool!.connect();
			try {
				await client.query('BEGIN');
				await client.query(this.statements.get('delete')!, [key]);
				await client.query(this.statements.get('deleteList')!, [key]);
				await client.query('COMMIT');
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		} catch (error) {
			this.logger.error('Error deleting value from PostgreSQL', {
				key,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to delete value from PostgreSQL', 'delete', error as Error);
		}
	}

	/**
	 * List keys by prefix
	 */
	async list(prefix: string): Promise<string[]> {
		this.checkConnection();

		try {
			const result = await this.pool!.query(this.statements.get('list')!, [prefix + '%']);
			return result.rows.map(row => row.key);
		} catch (error) {
			this.logger.error('Error listing keys from PostgreSQL', {
				prefix,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to list keys from PostgreSQL', 'list', error as Error);
		}
	}

	/**
	 * Append item to list
	 */
	async append<T>(key: string, item: T): Promise<void> {
		this.checkConnection();

		try {
			const client = await this.pool!.connect();
			try {
				await client.query('BEGIN');

				const serialized = JSON.stringify(item);
				const now = new Date();

				await client.query(this.statements.get('listAppend')!, [key, serialized, now]);
				await client.query(this.statements.get('updateListMetadata')!, [key, now, now]);

				await client.query('COMMIT');
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		} catch (error) {
			this.logger.error('Error appending to list in PostgreSQL', {
				key,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to append to list in PostgreSQL', 'append', error as Error);
		}
	}

	/**
	 * Get range of items from list
	 */
	async getRange<T>(key: string, start: number, count: number): Promise<T[]> {
		this.checkConnection();

		try {
			const result = await this.pool!.query(this.statements.get('getRange')!, [key, count, start]);
			return result.rows.map(row => JSON.parse(row.value) as T);
		} catch (error) {
			this.logger.error('Error getting range from PostgreSQL', {
				key,
				start,
				count,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('Failed to get range from PostgreSQL', 'getRange', error as Error);
		}
	}

	/**
	 * Get database information
	 */
	getInfo(): Record<string, any> {
		const baseInfo = {
			type: 'postgres',
			connected: this.connected,
		};

		if (!this.connected || !this.pool) {
			return baseInfo;
		}

		return {
			...baseInfo,
			pool: {
				totalCount: this.pool.totalCount,
				idleCount: this.pool.idleCount,
				waitingCount: this.pool.waitingCount,
			},
			config: {
				host: this.config.host || 'localhost',
				port: this.config.port || 5432,
				database: this.config.database,
				ssl: this.config.ssl || false,
			},
		};
	}

	/**
	 * Perform database maintenance
	 */
	async maintenance(): Promise<void> {
		this.checkConnection();

		try {
			this.logger.info('Running PostgreSQL maintenance');

			// Analyze tables for query optimization
			await this.pool!.query('ANALYZE cipher_store');
			await this.pool!.query('ANALYZE cipher_lists');
			await this.pool!.query('ANALYZE cipher_list_metadata');

			this.logger.info('PostgreSQL maintenance completed successfully');
		} catch (error) {
			this.logger.error('Error during PostgreSQL maintenance', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new StorageError('PostgreSQL maintenance failed', 'maintenance', error as Error);
		}
	}

	// Private helper methods

	/**
	 * Build connection pool configuration
	 */
	private buildPoolConfig(): PoolConfig {
		// If URL is provided, use it
		if (this.config.url) {
			return {
				connectionString: this.config.url,
				max: this.config.pool?.max || this.config.maxConnections || 10,
				min: this.config.pool?.min || 2,
				idleTimeoutMillis:
					this.config.pool?.idleTimeoutMillis || this.config.idleTimeoutMillis || 30000,
				connectionTimeoutMillis:
					this.config.pool?.acquireTimeoutMillis || this.config.connectionTimeoutMillis || 10000,
				ssl: this.config.ssl,
			};
		}

		// Build from individual parameters
		return {
			host: this.config.host || 'localhost',
			port: this.config.port || 5432,
			database: this.config.database,
			user: this.config.user,
			password: this.config.password,
			max: this.config.pool?.max || this.config.maxConnections || 10,
			min: this.config.pool?.min || 2,
			idleTimeoutMillis:
				this.config.pool?.idleTimeoutMillis || this.config.idleTimeoutMillis || 30000,
			connectionTimeoutMillis:
				this.config.pool?.acquireTimeoutMillis || this.config.connectionTimeoutMillis || 10000,
			ssl: this.config.ssl,
		};
	}

	/**
	 * Create database tables
	 */
	private async createTables(): Promise<void> {
		if (!this.pool) {
			throw new StorageError('Database not connected', 'createTables');
		}

		// Key-value store table
		await this.pool.query(`
			CREATE TABLE IF NOT EXISTS cipher_store (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL,
				updated_at TIMESTAMP WITH TIME ZONE NOT NULL
			)
		`);

		// Lists table for list operations
		await this.pool.query(`
			CREATE TABLE IF NOT EXISTS cipher_lists (
				key TEXT NOT NULL,
				value TEXT NOT NULL,
				position INTEGER NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL,
				PRIMARY KEY (key, position)
			)
		`);

		// List metadata table
		await this.pool.query(`
			CREATE TABLE IF NOT EXISTS cipher_list_metadata (
				key TEXT PRIMARY KEY,
				count INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL,
				updated_at TIMESTAMP WITH TIME ZONE NOT NULL
			)
		`);

		// Create indexes for performance
		await this.pool.query(
			'CREATE INDEX IF NOT EXISTS idx_cipher_store_updated_at ON cipher_store(updated_at)'
		);
		await this.pool.query('CREATE INDEX IF NOT EXISTS idx_cipher_lists_key ON cipher_lists(key)');
		await this.pool.query(
			'CREATE INDEX IF NOT EXISTS idx_cipher_lists_created_at ON cipher_lists(created_at)'
		);

		this.logger.debug('PostgreSQL tables and indexes created');
	}

	/**
	 * Check if backend is connected
	 */
	private checkConnection(): void {
		if (!this.connected || !this.pool) {
			throw new StorageError('PostgreSQL backend not connected', 'checkConnection');
		}
	}
}
