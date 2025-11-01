/**
 * Knowledge Graph Configuration Schemas
 *
 * Provides Zod schemas for validating knowledge graph backend configurations.
 * These schemas ensure type safety and runtime validation of configuration objects.
 *
 * @module knowledge_graph/config
 */

import { z } from 'zod';

/**
 * Base schema for all knowledge graph backends
 *
 * Contains common configuration options shared across all backend types.
 */
const BaseBackendSchema = z.object({
	/** Backend type identifier */
	type: z.string(),
	/** Connection timeout in milliseconds */
	timeout: z.number().min(1000).max(300000).default(30000),
	/** Maximum number of retry attempts for failed operations */
	maxRetries: z.number().min(0).max(10).default(3),
	/** Whether to enable connection pooling (if supported by backend) */
	enablePooling: z.boolean().default(true),
	/** Pool size for connections (if pooling is enabled) */
	poolSize: z.number().min(1).max(100).default(10),
});

/**
 * In-Memory Backend Configuration Schema
 *
 * Configuration for the in-memory knowledge graph backend.
 * Used for development, testing, and as a fallback option.
 *
 * @example
 * ```typescript
 * const config: InMemoryBackendConfig = {
 *   type: 'in-memory',
 *   maxNodes: 10000,
 *   maxEdges: 50000,
 *   enableIndexing: true
 * };
 * ```
 */
export const InMemoryBackendSchema = BaseBackendSchema.extend({
	type: z.literal('in-memory'),
	/** Maximum number of nodes to store in memory */
	maxNodes: z.number().min(100).max(1000000).default(10000),
	/** Maximum number of edges to store in memory */
	maxEdges: z.number().min(100).max(5000000).default(50000),
	/** Whether to enable indexing for faster lookups */
	enableIndexing: z.boolean().default(true),
	/** Whether to enable automatic garbage collection of orphaned nodes */
	enableGarbageCollection: z.boolean().default(false),
});

/**
 * Neo4j Backend Configuration Schema (without refinement)
 *
 * Configuration for connecting to a Neo4j graph database.
 * Supports both direct connection and URI-based connection.
 *
 * @example
 * ```typescript
 * // Direct connection
 * const config: Neo4jBackendConfig = {
 *   type: 'neo4j',
 *   host: 'localhost',
 *   port: 7687,
 *   username: 'neo4j',
 *   password: 'password',
 *   database: 'neo4j'
 * };
 *
 * // URI-based connection
 * const uriConfig: Neo4jBackendConfig = {
 *   type: 'neo4j',
 *   uri: 'neo4j://localhost:7687',
 *   username: 'neo4j',
 *   password: 'password'
 * };
 * ```
 */
export const Neo4jBackendSchema = BaseBackendSchema.extend({
	type: z.literal('neo4j'),
	/** Neo4j server hostname (alternative to uri) */
	host: z.string().optional(),
	/** Neo4j server port (alternative to uri) */
	port: z.number().min(1).max(65535).optional(),
	/** Complete Neo4j connection URI (alternative to host/port) */
	uri: z.string().url().optional(),
	/** Database username */
	username: z.string().min(1),
	/** Database password */
	password: z.string().min(1),
	/** Database name to connect to */
	database: z.string().min(1).default('neo4j'),
	/** Whether to use encrypted connection */
	encrypted: z.boolean().default(false),
	/** Whether to trust the server certificate (for encrypted connections) */
	trustServerCertificate: z.boolean().default(false),
	/** Maximum transaction retry time in milliseconds */
	maxTransactionRetryTime: z.number().min(1000).max(300000).default(30000),
	/** Connection acquisition timeout in milliseconds */
	connectionAcquisitionTimeout: z.number().min(1000).max(60000).default(60000),
	/** Maximum connection lifetime in milliseconds */
	maxConnectionLifetime: z.number().min(60000).max(3600000).default(3600000),
	/** Connection liveness check timeout in milliseconds */
	connectionLivenessCheckTimeout: z.number().min(1000).max(30000).default(30000),
});

/**
 * Union schema for all supported backend configurations
 */
export const BackendConfigSchema = z.discriminatedUnion('type', [
	InMemoryBackendSchema,
	Neo4jBackendSchema,
]);

/**
 * Knowledge Graph System Configuration Schema
 *
 * Top-level configuration for the knowledge graph system.
 * Includes backend configuration and system-level settings.
 *
 * @example
 * ```typescript
 * const config: KnowledgeGraphConfig = {
 *   type: 'neo4j',
 *   host: 'localhost',
 *   port: 7687,
 *   username: 'neo4j',
 *   password: 'password',
 *   database: 'knowledge',
 *   enableAutoIndexing: true,
 *   enableMetrics: true
 * };
 * ```
 */
export const KnowledgeGraphSchema = z.intersection(
	BackendConfigSchema,
	z.object({
		/** Whether to enable automatic indexing of node properties */
		enableAutoIndexing: z.boolean().default(true),
		/** Whether to enable performance metrics collection */
		enableMetrics: z.boolean().default(false),
		/** Whether to enable query caching (if supported by backend) */
		enableQueryCache: z.boolean().default(true),
		/** Query cache TTL in milliseconds */
		queryCacheTTL: z.number().min(1000).max(3600000).default(300000),
		/** Whether to enable schema validation for nodes and edges */
		enableSchemaValidation: z.boolean().default(true),
		/** Default batch size for bulk operations */
		defaultBatchSize: z.number().min(1).max(10000).default(1000),
	})
);

/**
 * Environment-based configuration schema
 *
 * Defines how to load knowledge graph configuration from environment variables.
 */
export const KnowledgeGraphEnvConfigSchema = z.object({
	/** Whether knowledge graph is enabled */
	KNOWLEDGE_GRAPH_ENABLED: z.boolean().default(false),
	/** Backend type */
	KNOWLEDGE_GRAPH_TYPE: z.enum(['neo4j', 'in-memory']).default('in-memory'),
	/** Neo4j host */
	KNOWLEDGE_GRAPH_HOST: z.string().optional(),
	/** Neo4j port */
	KNOWLEDGE_GRAPH_PORT: z.number().optional(),
	/** Neo4j URI */
	KNOWLEDGE_GRAPH_URI: z.string().optional(),
	/** Neo4j username */
	KNOWLEDGE_GRAPH_USERNAME: z.string().optional(),
	/** Neo4j password */
	KNOWLEDGE_GRAPH_PASSWORD: z.string().optional(),
	/** Neo4j database name */
	KNOWLEDGE_GRAPH_DATABASE: z.string().default('neo4j'),
});

// Export inferred types
export type InMemoryBackendConfig = z.infer<typeof InMemoryBackendSchema>;
export type Neo4jBackendConfig = z.infer<typeof Neo4jBackendSchema>;
export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type KnowledgeGraphConfig = z.infer<typeof KnowledgeGraphSchema>;
export type KnowledgeGraphEnvConfig = z.infer<typeof KnowledgeGraphEnvConfigSchema>;

/**
 * Parse and validate knowledge graph configuration
 *
 * @param config - Raw configuration object to validate
 * @returns Parsed and validated configuration
 * @throws {z.ZodError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const config = parseKnowledgeGraphConfig({
 *   type: 'neo4j',
 *   host: 'localhost',
 *   port: 7687,
 *   username: 'neo4j',
 *   password: 'password'
 * });
 * ```
 */
export function parseKnowledgeGraphConfig(config: unknown): KnowledgeGraphConfig {
	return KnowledgeGraphSchema.parse(config);
}

/**
 * Parse knowledge graph configuration from environment variables
 *
 * @param env - Environment variables object (defaults to process.env)
 * @returns Parsed configuration or null if knowledge graph is disabled
 *
 * @example
 * ```typescript
 * const config = parseKnowledgeGraphConfigFromEnv();
 * if (config) {
 *   // Knowledge graph is enabled
 *   const graph = await createKnowledgeGraph(config);
 * }
 * ```
 */
export function parseKnowledgeGraphConfigFromEnv(
	env: Record<string, string | undefined> = process.env
): KnowledgeGraphConfig | null {
	// Parse environment configuration
	const envConfig = KnowledgeGraphEnvConfigSchema.parse({
		KNOWLEDGE_GRAPH_ENABLED: env.KNOWLEDGE_GRAPH_ENABLED === 'true',
		KNOWLEDGE_GRAPH_TYPE: env.KNOWLEDGE_GRAPH_TYPE || 'in-memory',
		KNOWLEDGE_GRAPH_HOST: env.KNOWLEDGE_GRAPH_HOST,
		KNOWLEDGE_GRAPH_PORT: env.KNOWLEDGE_GRAPH_PORT
			? parseInt(env.KNOWLEDGE_GRAPH_PORT, 10)
			: undefined,
		KNOWLEDGE_GRAPH_URI: env.KNOWLEDGE_GRAPH_URI,
		KNOWLEDGE_GRAPH_USERNAME: env.KNOWLEDGE_GRAPH_USERNAME,
		KNOWLEDGE_GRAPH_PASSWORD: env.KNOWLEDGE_GRAPH_PASSWORD,
		KNOWLEDGE_GRAPH_DATABASE: env.KNOWLEDGE_GRAPH_DATABASE || 'neo4j',
	});

	// Return null if knowledge graph is disabled
	if (!envConfig.KNOWLEDGE_GRAPH_ENABLED) {
		return null;
	}

	// Build configuration based on type
	if (envConfig.KNOWLEDGE_GRAPH_TYPE === 'neo4j') {
		const neo4jConfig: Partial<Neo4jBackendConfig> = {
			type: 'neo4j',
			database: envConfig.KNOWLEDGE_GRAPH_DATABASE,
		};

		// Add connection details
		if (envConfig.KNOWLEDGE_GRAPH_URI) {
			neo4jConfig.uri = envConfig.KNOWLEDGE_GRAPH_URI;
		} else if (envConfig.KNOWLEDGE_GRAPH_HOST && envConfig.KNOWLEDGE_GRAPH_PORT) {
			neo4jConfig.host = envConfig.KNOWLEDGE_GRAPH_HOST;
			neo4jConfig.port = envConfig.KNOWLEDGE_GRAPH_PORT;
		} else {
			throw new Error(
				'For Neo4j backend, either KNOWLEDGE_GRAPH_URI or both KNOWLEDGE_GRAPH_HOST and KNOWLEDGE_GRAPH_PORT must be provided'
			);
		}

		// Add authentication
		if (!envConfig.KNOWLEDGE_GRAPH_USERNAME || !envConfig.KNOWLEDGE_GRAPH_PASSWORD) {
			throw new Error(
				'For Neo4j backend, both KNOWLEDGE_GRAPH_USERNAME and KNOWLEDGE_GRAPH_PASSWORD must be provided'
			);
		}

		neo4jConfig.username = envConfig.KNOWLEDGE_GRAPH_USERNAME;
		neo4jConfig.password = envConfig.KNOWLEDGE_GRAPH_PASSWORD;

		// Validate the connection requirements
		if (!neo4jConfig.uri && (!neo4jConfig.host || !neo4jConfig.port)) {
			throw new Error(
				'For Neo4j backend, either KNOWLEDGE_GRAPH_URI or both KNOWLEDGE_GRAPH_HOST and KNOWLEDGE_GRAPH_PORT must be provided'
			);
		}

		return parseKnowledgeGraphConfig(neo4jConfig);
	} else {
		// In-memory configuration
		return parseKnowledgeGraphConfig({
			type: 'in-memory',
		});
	}
}

/**
 * Validate knowledge graph configuration without throwing
 *
 * @param config - Configuration object to validate
 * @returns Validation result with success flag and errors
 *
 * @example
 * ```typescript
 * const { success, data, errors } = validateKnowledgeGraphConfig(config);
 * if (success) {
 *   // Use data
 * } else {
 *   console.error('Configuration errors:', errors);
 * }
 * ```
 */
export function validateKnowledgeGraphConfig(config: unknown): {
	success: boolean;
	data?: KnowledgeGraphConfig;
	errors?: z.ZodError;
} {
	try {
		const data = parseKnowledgeGraphConfig(config);
		return { success: true, data };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, errors: error };
		}
		throw error;
	}
}
