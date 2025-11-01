/**
 * Storage Module Constants
 *
 * Central location for all storage-related constants including
 * error messages, log prefixes, timeouts, and configuration defaults.
 *
 * @module storage/constants
 */

/**
 * Log prefixes for consistent logging across the storage module
 */
export const LOG_PREFIXES = {
	MANAGER: '[StorageManager]',
	CACHE: '[StorageManager:Cache]',
	DATABASE: '[StorageManager:Database]',
	HEALTH: '[StorageManager:Health]',
	FACTORY: '[StorageFactory]',
	BACKEND: '[StorageBackend]',
} as const;

/**
 * Error messages for the storage module
 */
export const ERROR_MESSAGES = {
	// Connection errors
	CACHE_CONNECTION_FAILED: 'Failed to connect to cache backend',
	DATABASE_CONNECTION_FAILED: 'Failed to connect to database backend',
	ALREADY_CONNECTED: 'Storage manager is already connected',
	NOT_CONNECTED: 'Storage manager is not connected',

	// Backend errors
	BACKEND_NOT_FOUND: 'Storage backend not found',
	INVALID_BACKEND_TYPE: 'Invalid backend type specified',
	MODULE_LOAD_FAILED: 'Failed to load backend module',

	// Operation errors
	HEALTH_CHECK_FAILED: 'Health check failed',
	OPERATION_TIMEOUT: 'Storage operation timed out',
	SERIALIZATION_ERROR: 'Failed to serialize/deserialize data',

	// Configuration errors
	INVALID_CONFIG: 'Invalid storage configuration',
	MISSING_REQUIRED_CONFIG: 'Missing required configuration',
} as const;

/**
 * Storage operation timeouts (in milliseconds)
 */
export const TIMEOUTS = {
	CONNECTION: 10000, // 10 seconds
	HEALTH_CHECK: 5000, // 5 seconds
	OPERATION: 30000, // 30 seconds
	SHUTDOWN: 5000, // 5 seconds
} as const;

/**
 * Health check constants
 */
export const HEALTH_CHECK = {
	KEY: 'storage_manager_health_check',
	VALUE: 'ok',
	TTL_SECONDS: 10,
} as const;

/**
 * Backend type identifiers
 */
export const BACKEND_TYPES = {
	// Cache backends
	REDIS: 'redis',
	MEMCACHED: 'memcached',
	IN_MEMORY: 'in-memory',

	// Database backends
	SQLITE: 'sqlite',
	POSTGRES: 'postgres',
	MYSQL: 'mysql',
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
	MAX_RETRIES: 3,
	RETRY_DELAY: 1000, // 1 second
	CACHE_TTL: 3600, // 1 hour in seconds
	MAX_CONNECTIONS: 10,
	IDLE_TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * Storage metrics event names
 */
export const METRICS_EVENTS = {
	CONNECTION_ATTEMPT: 'storage.connection.attempt',
	CONNECTION_SUCCESS: 'storage.connection.success',
	CONNECTION_FAILURE: 'storage.connection.failure',
	OPERATION_START: 'storage.operation.start',
	OPERATION_SUCCESS: 'storage.operation.success',
	OPERATION_FAILURE: 'storage.operation.failure',
	HEALTH_CHECK: 'storage.health.check',
	FALLBACK_USED: 'storage.fallback.used',
} as const;
