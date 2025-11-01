/**
 * Storage Configuration Module
 *
 * Defines the configuration schemas for the storage system using Zod for
 * runtime validation and type safety. Supports multiple backend types
 * with different configuration requirements.
 *
 * The storage system uses a dual-backend architecture:
 * - Cache Backend: For fast, ephemeral storage
 * - Database Backend: For persistent, reliable storage
 *
 * Supported backends:
 * - In-Memory: Fast local storage for development/testing
 * - Redis: Distributed cache for production use
 * - SQLite: Lightweight file-based database
 * - PostgreSQL: Full-featured relational database (planned)
 *
 * @module storage/config
 */

import { z } from 'zod';

/**
 * Base Backend Configuration Schema
 *
 * Common configuration options shared by all backend types.
 * These options control connection pooling and timeout behavior.
 */
const BaseBackendSchema = z.object({
	/** Maximum number of concurrent connections to the backend */
	maxConnections: z.number().int().positive().optional().describe('Maximum connections'),

	/** Time in milliseconds before an idle connection is closed */
	idleTimeoutMillis: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Idle timeout in milliseconds'),

	/** Time in milliseconds to wait for a connection to be established */
	connectionTimeoutMillis: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Connection timeout in milliseconds'),

	/** Backend-specific options that vary by implementation */
	options: z.record(z.any()).optional().describe('Backend-specific options'),
});

/**
 * In-Memory Backend Configuration
 *
 * Simple in-memory storage for development and testing.
 * Data is lost when the process exits.
 *
 * @example
 * ```typescript
 * const config: InMemoryBackendConfig = {
 *   type: 'in-memory',
 *   maxConnections: 1,
 *   options: { maxSize: '100mb' }
 * };
 * ```
 */
const InMemoryBackendSchema = BaseBackendSchema.extend({
	type: z.literal('in-memory'),
}).strict();

export type InMemoryBackendConfig = z.infer<typeof InMemoryBackendSchema>;

/**
 * Redis Backend Configuration
 *
 * Configuration for Redis-based cache backend.
 * Supports both direct connection parameters and connection URLs.
 *
 * @example
 * ```typescript
 * // Using connection URL
 * const config: RedisBackendConfig = {
 *   type: 'redis',
 *   url: 'redis://user:pass@localhost:6379/0'
 * };
 *
 * // Using individual parameters
 * const config: RedisBackendConfig = {
 *   type: 'redis',
 *   host: 'localhost',
 *   port: 6379,
 *   password: 'secret',
 *   database: 0
 * };
 * ```
 */
const RedisBackendSchema = BaseBackendSchema.extend({
	type: z.literal('redis'),

	/** Redis connection URL (redis://...) - overrides individual params if provided */
	url: z.string().optional().describe('Redis connection URL (redis://...)'),

	/** Redis server hostname */
	host: z.string().optional().describe('Redis host'),

	/** Redis server port (default: 6379) */
	port: z.number().int().positive().optional().describe('Redis port'),

	/** Redis authentication username */
	username: z.string().optional().describe('Redis username'),

	/** Redis authentication password */
	password: z.string().optional().describe('Redis password'),

	/** Redis database number (0-15, default: 0) */
	database: z.number().int().nonnegative().optional().describe('Redis database number'),
}).strict();

export type RedisBackendConfig = z.infer<typeof RedisBackendSchema>;

/**
 * SQLite Backend Configuration
 *
 * Configuration for SQLite file-based database backend.
 * Supports automatic path resolution if path is not provided.
 *
 * @example
 * ```typescript
 * const config: SqliteBackendConfig = {
 *   type: 'sqlite',
 *   path: './data',           // Directory for database file
 *   database: 'myapp.db',     // Database filename
 *   connectionTimeoutMillis: 5000
 * };
 * ```
 */
const SqliteBackendSchema = BaseBackendSchema.extend({
	type: z.literal('sqlite'),

	/**
	 * SQLite database file path.
	 * If not provided, will auto-detect using the path resolver.
	 */
	path: z
		.string()
		.optional()
		.describe(
			'SQLite database file path (optional, will auto-detect using path resolver if not provided)'
		),

	/** Database filename (default: cipher.db) */
	database: z.string().optional().describe('Database filename (default: cipher.db)'),
}).strict();

export type SqliteBackendConfig = z.infer<typeof SqliteBackendSchema>;

/**
 * PostgreSQL Backend Configuration
 *
 * Configuration for PostgreSQL database backend.
 * Supports both connection URL and individual connection parameters.
 *
 * @example
 * ```typescript
 * // Using connection URL
 * const config: PostgresBackendConfig = {
 *   type: 'postgres',
 *   url: 'postgresql://user:password@localhost:5432/mydb'
 * };
 *
 * // Using individual parameters
 * const config: PostgresBackendConfig = {
 *   type: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'mydb',
 *   user: 'postgres',
 *   password: 'secret'
 * };
 * ```
 */
const PostgresBackendSchema = BaseBackendSchema.extend({
	type: z.literal('postgres'),

	/** PostgreSQL connection URL (postgresql://...) - overrides individual params if provided */
	url: z.string().optional().describe('PostgreSQL connection URL (postgresql://...)'),

	/** PostgreSQL server hostname */
	host: z.string().optional().describe('PostgreSQL host'),

	/** PostgreSQL server port (default: 5432) */
	port: z.number().int().positive().optional().describe('PostgreSQL port'),

	/** Database name */
	database: z.string().optional().describe('Database name'),

	/** Username for authentication */
	user: z.string().optional().describe('Username'),

	/** Password for authentication */
	password: z.string().optional().describe('Password'),

	/** Enable SSL connection (default: false) */
	ssl: z.boolean().optional().describe('Enable SSL connection'),

	/** Connection pool settings */
	pool: z
		.object({
			/** Minimum number of connections in pool */
			min: z.number().int().nonnegative().optional().describe('Minimum pool size'),
			/** Maximum number of connections in pool */
			max: z.number().int().positive().optional().describe('Maximum pool size'),
			/** Connection idle timeout in ms */
			idleTimeoutMillis: z.number().int().positive().optional().describe('Connection idle timeout'),
			/** Connection acquire timeout in ms */
			acquireTimeoutMillis: z
				.number()
				.int()
				.positive()
				.optional()
				.describe('Connection acquire timeout'),
		})
		.optional()
		.describe('Connection pool settings'),
}).strict();

export type PostgresBackendConfig = z.infer<typeof PostgresBackendSchema>;

/**
 * Backend Configuration Union Schema
 *
 * Discriminated union of all supported backend configurations.
 * Uses the 'type' field to determine which configuration schema to apply.
 *
 * Includes custom validation to ensure Redis backends have required connection info.
 */
const BackendConfigSchema = z
	.discriminatedUnion(
		'type',
		[InMemoryBackendSchema, RedisBackendSchema, SqliteBackendSchema, PostgresBackendSchema],
		{
			errorMap: (issue, ctx) => {
				if (issue.code === z.ZodIssueCode.invalid_union_discriminator) {
					return {
						message: `Invalid backend type. Expected 'in-memory', 'redis', 'sqlite', or 'postgres'.`,
					};
				}
				return { message: ctx.defaultError };
			},
		}
	)
	.describe('Backend configuration for storage system')
	.superRefine((data, ctx) => {
		// Validate Redis backend requirements
		if (data.type === 'redis') {
			// Redis requires either a connection URL or a host
			if (!data.url && !data.host) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Redis backend requires either 'url' or 'host' to be specified",
					path: ['url'],
				});
			}
		}

		// Validate PostgreSQL backend requirements
		if (data.type === 'postgres') {
			// PostgreSQL requires either a connection URL or host + database
			if (!data.url && (!data.host || !data.database)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"PostgreSQL backend requires either 'url' or both 'host' and 'database' to be specified",
					path: ['url'],
				});
			}
		}
	});

export type BackendConfig = z.infer<typeof BackendConfigSchema>;

/**
 * Storage System Configuration Schema
 *
 * Top-level configuration for the dual-backend storage system.
 * Requires configuration for both cache and database backends.
 *
 * @example
 * ```typescript
 * const storageConfig: StorageConfig = {
 *   cache: {
 *     type: 'redis',
 *     host: 'localhost',
 *     port: 6379
 *   },
 *   database: {
 *     type: 'sqlite',
 *     path: './data',
 *     database: 'app.db'
 *   }
 * };
 * ```
 */
export const StorageSchema = z
	.object({
		/** Cache backend for fast, ephemeral storage (Redis, In-Memory) */
		cache: BackendConfigSchema.describe('Cache backend configuration (fast, ephemeral)'),

		/** Database backend for persistent, reliable storage (SQLite, PostgreSQL) */
		database: BackendConfigSchema.describe('Database backend configuration (persistent, reliable)'),
	})
	.strict()
	.describe('Storage configuration with cache and database backends');

export type StorageConfig = z.infer<typeof StorageSchema>;
