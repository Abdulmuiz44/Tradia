/**
 * Knowledge Graph Constants
 *
 * Centralized constants for the knowledge graph system.
 * Includes defaults, error messages, timeouts, and other configuration values.
 *
 * @module knowledge_graph/constants
 */

/**
 * Supported backend types
 */
export const BACKEND_TYPES = {
	NEO4J: 'neo4j',
	IN_MEMORY: 'in-memory',
} as const;

/**
 * Default values for knowledge graph operations
 */
export const DEFAULTS = {
	// Connection settings
	CONNECTION_TIMEOUT: 30000, // 30 seconds
	MAX_RETRIES: 3,
	POOL_SIZE: 10,

	// Query settings
	QUERY_LIMIT: 100,
	QUERY_TIMEOUT: 60000, // 60 seconds
	BATCH_SIZE: 1000,

	// In-memory backend limits
	MAX_NODES: 10000,
	MAX_EDGES: 50000,

	// Neo4j specific
	NEO4J_PORT: 7687,
	NEO4J_DATABASE: 'neo4j',
	NEO4J_MAX_TRANSACTION_RETRY_TIME: 30000,
	NEO4J_CONNECTION_ACQUISITION_TIMEOUT: 60000,
	NEO4J_MAX_CONNECTION_LIFETIME: 3600000, // 1 hour
	NEO4J_CONNECTION_LIVENESS_CHECK_TIMEOUT: 30000,

	// Cache settings
	QUERY_CACHE_TTL: 300000, // 5 minutes
	SCHEMA_CACHE_TTL: 600000, // 10 minutes

	// Path finding
	MAX_PATH_DEPTH: 10,
	MAX_NEIGHBORS: 50,
} as const;

/**
 * Error messages for different failure scenarios
 */
export const ERROR_MESSAGES = {
	// Connection errors
	NOT_CONNECTED: 'Knowledge graph backend is not connected',
	CONNECTION_FAILED: 'Failed to connect to knowledge graph backend',
	CONNECTION_TIMEOUT: 'Connection to knowledge graph backend timed out',
	AUTHENTICATION_FAILED: 'Authentication failed for knowledge graph backend',

	// Node errors
	NODE_NOT_FOUND: 'Node not found in knowledge graph',
	INVALID_NODE_DATA: 'Invalid node data provided',
	DUPLICATE_NODE_ID: 'Node with this ID already exists',
	NODE_VALIDATION_FAILED: 'Node validation failed',

	// Edge errors
	EDGE_NOT_FOUND: 'Edge not found in knowledge graph',
	INVALID_EDGE_DATA: 'Invalid edge data provided',
	DUPLICATE_EDGE_ID: 'Edge with this ID already exists',
	EDGE_VALIDATION_FAILED: 'Edge validation failed',
	NODES_NOT_FOUND_FOR_EDGE: 'Start or end node not found for edge',

	// Query errors
	INVALID_QUERY: 'Invalid graph query provided',
	QUERY_EXECUTION_FAILED: 'Graph query execution failed',
	QUERY_TIMEOUT: 'Graph query timed out',
	UNSUPPORTED_QUERY_TYPE: 'Unsupported query type',

	// Backend errors
	BACKEND_NOT_SUPPORTED: 'Knowledge graph backend type not supported',
	BACKEND_INITIALIZATION_FAILED: 'Failed to initialize knowledge graph backend',
	BACKEND_OPERATION_FAILED: 'Knowledge graph backend operation failed',

	// Validation errors
	SCHEMA_VALIDATION_FAILED: 'Schema validation failed',
	CONFIGURATION_INVALID: 'Knowledge graph configuration is invalid',
	PROPERTY_VALIDATION_FAILED: 'Property validation failed',

	// Transaction errors
	TRANSACTION_FAILED: 'Graph transaction failed',
	TRANSACTION_TIMEOUT: 'Graph transaction timed out',
	CONCURRENT_MODIFICATION: 'Concurrent modification detected',

	// Memory errors
	MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded for in-memory backend',
	NODE_LIMIT_EXCEEDED: 'Maximum number of nodes exceeded',
	EDGE_LIMIT_EXCEEDED: 'Maximum number of edges exceeded',
} as const;

/**
 * Timeout values for different operations
 */
export const TIMEOUTS = {
	// Connection timeouts
	CONNECTION: 30000, // 30 seconds
	HEALTH_CHECK: 5000, // 5 seconds
	DISCONNECTION: 10000, // 10 seconds

	// Operation timeouts
	QUERY: 60000, // 60 seconds
	TRANSACTION: 30000, // 30 seconds
	BATCH_OPERATION: 120000, // 2 minutes

	// Cache timeouts
	QUERY_CACHE: 300000, // 5 minutes
	SCHEMA_CACHE: 600000, // 10 minutes
	METRICS_CACHE: 60000, // 1 minute
} as const;

/**
 * Log prefixes for consistent logging
 */
export const LOG_PREFIXES = {
	MANAGER: '[KG-Manager]',
	BACKEND: '[KG-Backend]',
	NEO4J: '[KG-Neo4j]',
	IN_MEMORY: '[KG-Memory]',
	QUERY: '[KG-Query]',
	TRANSACTION: '[KG-Tx]',
	FACTORY: '[KG-Factory]',
	VALIDATION: '[KG-Validation]',
} as const;

/**
 * Metrics and monitoring event names
 */
export const METRICS_EVENTS = {
	// Connection events
	CONNECTION_ESTABLISHED: 'kg.connection.established',
	CONNECTION_FAILED: 'kg.connection.failed',
	CONNECTION_CLOSED: 'kg.connection.closed',

	// Operation events
	NODE_CREATED: 'kg.node.created',
	NODE_UPDATED: 'kg.node.updated',
	NODE_DELETED: 'kg.node.deleted',
	EDGE_CREATED: 'kg.edge.created',
	EDGE_UPDATED: 'kg.edge.updated',
	EDGE_DELETED: 'kg.edge.deleted',

	// Query events
	QUERY_EXECUTED: 'kg.query.executed',
	QUERY_FAILED: 'kg.query.failed',
	QUERY_CACHED: 'kg.query.cached',

	// Performance events
	OPERATION_DURATION: 'kg.operation.duration',
	BATCH_OPERATION_DURATION: 'kg.batch.duration',
	QUERY_DURATION: 'kg.query.duration',

	// Health events
	HEALTH_CHECK_SUCCESS: 'kg.health.success',
	HEALTH_CHECK_FAILURE: 'kg.health.failure',
} as const;

/**
 * Graph schema constants
 */
export const SCHEMA = {
	// Common node labels
	NODE_LABELS: {
		FUNCTION: 'Function',
		CLASS: 'Class',
		VARIABLE: 'Variable',
		MODULE: 'Module',
		FILE: 'File',
		CONCEPT: 'Concept',
		ENTITY: 'Entity',
	},

	// Common edge types
	EDGE_TYPES: {
		DEPENDS_ON: 'DEPENDS_ON',
		CALLS: 'CALLS',
		USES: 'USES',
		BELONGS_TO: 'BELONGS_TO',
		EXTENDS: 'EXTENDS',
		IMPLEMENTS: 'IMPLEMENTS',
		CONTAINS: 'CONTAINS',
		REFERENCES: 'REFERENCES',
		RELATES_TO: 'RELATES_TO',
	},

	// Property names
	PROPERTIES: {
		// Common properties
		ID: 'id',
		NAME: 'name',
		TYPE: 'type',
		CREATED_AT: 'created_at',
		UPDATED_AT: 'updated_at',
		SOURCE: 'source',
		CONFIDENCE: 'confidence',

		// Code-specific properties
		LANGUAGE: 'language',
		FILE_PATH: 'file_path',
		LINE_NUMBER: 'line_number',
		FUNCTION_NAME: 'function_name',
		CLASS_NAME: 'class_name',
		MODULE_NAME: 'module_name',

		// Relationship properties
		STRENGTH: 'strength',
		CONTEXT: 'context',
		FREQUENCY: 'frequency',
		WEIGHT: 'weight',
	},
} as const;

/**
 * Query templates for common operations
 */
export const QUERY_TEMPLATES = {
	// Node operations
	CREATE_NODE: 'CREATE (n:{labels} {properties}) RETURN n',
	GET_NODE: 'MATCH (n) WHERE n.id = $id RETURN n',
	UPDATE_NODE: 'MATCH (n) WHERE n.id = $id SET n += $properties RETURN n',
	DELETE_NODE: 'MATCH (n) WHERE n.id = $id DETACH DELETE n',

	// Edge operations
	CREATE_EDGE:
		'MATCH (a), (b) WHERE a.id = $startId AND b.id = $endId CREATE (a)-[r:{type} {properties}]->(b) RETURN r',
	GET_EDGE: 'MATCH ()-[r]-() WHERE r.id = $id RETURN r',
	UPDATE_EDGE: 'MATCH ()-[r]-() WHERE r.id = $id SET r += $properties RETURN r',
	DELETE_EDGE: 'MATCH ()-[r]-() WHERE r.id = $id DELETE r',

	// Search operations
	FIND_NODES: 'MATCH (n:{labels}) WHERE {filters} RETURN n LIMIT $limit',
	FIND_EDGES: 'MATCH ()-[r:{type}]-() WHERE {filters} RETURN r LIMIT $limit',

	// Graph traversal
	GET_NEIGHBORS: 'MATCH (n)-[r:{types}]-(m) WHERE n.id = $id RETURN m, r LIMIT $limit',
	FIND_PATH:
		'MATCH path = shortestPath((a)-[*..{maxDepth}]-(b)) WHERE a.id = $startId AND b.id = $endId RETURN path',

	// Statistics
	COUNT_NODES: 'MATCH (n) RETURN count(n) as count',
	COUNT_EDGES: 'MATCH ()-[r]-() RETURN count(r) as count',
	GET_LABELS: 'CALL db.labels() YIELD label RETURN collect(label) as labels',
	GET_RELATIONSHIP_TYPES:
		'CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types',
} as const;

/**
 * Index templates for performance optimization
 */
export const INDEX_TEMPLATES = {
	// Node indexes
	NODE_ID_INDEX: 'CREATE INDEX node_id_index IF NOT EXISTS FOR (n:{label}) ON (n.id)',
	NODE_NAME_INDEX: 'CREATE INDEX node_name_index IF NOT EXISTS FOR (n:{label}) ON (n.name)',
	NODE_TYPE_INDEX: 'CREATE INDEX node_type_index IF NOT EXISTS FOR (n:{label}) ON (n.type)',

	// Edge indexes
	EDGE_ID_INDEX: 'CREATE INDEX edge_id_index IF NOT EXISTS FOR ()-[r:{type}]-() ON (r.id)',
	EDGE_TYPE_INDEX: 'CREATE INDEX edge_type_index IF NOT EXISTS FOR ()-[r:{type}]-() ON (r.type)',

	// Composite indexes
	NODE_COMPOUND_INDEX:
		'CREATE INDEX node_compound_index IF NOT EXISTS FOR (n:{label}) ON (n.id, n.type)',
	EDGE_COMPOUND_INDEX:
		'CREATE INDEX edge_compound_index IF NOT EXISTS FOR ()-[r:{type}]-() ON (r.id, r.type)',
} as const;
