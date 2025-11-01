/**
 * Knowledge Graph Backend Types and Error Classes
 *
 * This module defines the core types and error classes for the knowledge graph system.
 * The knowledge graph system provides entity-relationship storage and graph traversal capabilities.
 *
 * @module knowledge_graph/backend/types
 */

import type { KnowledgeGraph } from './knowledge-graph.js';

// Re-export the knowledge graph interface for convenience
export type { KnowledgeGraph };

// Re-export config types for convenience (imported from config module)
export type { BackendConfig, KnowledgeGraphConfig } from '../config.js';

/**
 * Filters for node searches
 *
 * Supports various comparison operations for filtering nodes by properties.
 *
 * @example
 * ```typescript
 * const filters: NodeFilters = {
 *   type: 'Function',
 *   name: { any: ['getData', 'setData'] },
 *   created_at: { gte: Date.now() - 86400000 }
 * };
 * ```
 */
export interface NodeFilters {
	[key: string]:
		| string
		| number
		| boolean
		| { gte?: number; gt?: number; lte?: number; lt?: number }
		| { any?: Array<string | number> }
		| { all?: Array<string | number> };
}

/**
 * Filters for edge searches
 *
 * Similar to NodeFilters but for relationship filtering.
 *
 * @example
 * ```typescript
 * const edgeFilters: EdgeFilters = {
 *   type: 'DEPENDS_ON',
 *   strength: { gte: 0.8 }
 * };
 * ```
 */
export interface EdgeFilters {
	[key: string]:
		| string
		| number
		| boolean
		| { gte?: number; gt?: number; lte?: number; lt?: number }
		| { any?: Array<string | number> }
		| { all?: Array<string | number> };
}

/**
 * Graph node representation
 *
 * Represents an entity in the knowledge graph with properties and metadata.
 *
 * @example
 * ```typescript
 * const functionNode: GraphNode = {
 *   id: 'func_123',
 *   labels: ['Function', 'Code'],
 *   properties: {
 *     name: 'calculateTotal',
 *     language: 'typescript',
 *     file_path: 'src/utils.ts',
 *     created_at: Date.now()
 *   }
 * };
 * ```
 */
export interface GraphNode {
	/** Unique identifier for the node */
	id: string;

	/** Array of labels/types for the node */
	labels: string[];

	/** Properties/attributes of the node */
	properties: Record<string, any>;
}

/**
 * Graph edge/relationship representation
 *
 * Represents a relationship between two nodes in the knowledge graph.
 *
 * @example
 * ```typescript
 * const dependency: GraphEdge = {
 *   id: 'rel_456',
 *   type: 'DEPENDS_ON',
 *   startNodeId: 'func_123',
 *   endNodeId: 'func_456',
 *   properties: {
 *     strength: 0.9,
 *     context: 'function call',
 *     created_at: Date.now()
 *   }
 * };
 * ```
 */
export interface GraphEdge {
	/** Unique identifier for the edge */
	id: string;

	/** Type/label of the relationship */
	type: string;

	/** ID of the source node */
	startNodeId: string;

	/** ID of the target node */
	endNodeId: string;

	/** Properties/attributes of the relationship */
	properties: Record<string, any>;
}

/**
 * Graph query structure
 *
 * Defines different types of queries that can be executed on the knowledge graph.
 *
 * @example
 * ```typescript
 * // Find nodes by pattern
 * const nodeQuery: GraphQuery = {
 *   type: 'node',
 *   pattern: {
 *     labels: ['Function'],
 *     properties: { language: 'typescript' }
 *   },
 *   limit: 10
 * };
 *
 * // Find relationships
 * const edgeQuery: GraphQuery = {
 *   type: 'edge',
 *   pattern: {
 *     type: 'DEPENDS_ON',
 *     properties: { strength: { gte: 0.8 } }
 *   }
 * };
 *
 * // Custom Cypher query for Neo4j
 * const cypherQuery: GraphQuery = {
 *   type: 'cypher',
 *   query: 'MATCH (n:Function)-[r:DEPENDS_ON]->(m:Function) RETURN n, r, m',
 *   parameters: {}
 * };
 * ```
 */
export interface GraphQuery {
	/** Type of query to execute */
	type: 'node' | 'edge' | 'path' | 'cypher';

	/** Query pattern (for structured queries) */
	pattern?: {
		labels?: string[];
		type?: string;
		properties?: Record<string, any>;
		startNode?: Partial<GraphNode>;
		endNode?: Partial<GraphNode>;
	};

	/** Raw query string (for cypher queries) */
	query?: string;

	/** Query parameters */
	parameters?: Record<string, any>;

	/** Maximum number of results to return */
	limit?: number;

	/** Number of results to skip (for pagination) */
	skip?: number;
}

/**
 * Graph query result
 *
 * Contains the results of a graph query operation.
 *
 * @example
 * ```typescript
 * const result: GraphResult = {
 *   nodes: [functionNode],
 *   edges: [dependency],
 *   paths: [],
 *   metadata: {
 *     totalCount: 1,
 *     executionTime: 15,
 *     queryType: 'node'
 *   }
 * };
 * ```
 */
export interface GraphResult {
	/** Nodes returned by the query */
	nodes: GraphNode[];

	/** Edges returned by the query */
	edges: GraphEdge[];

	/** Paths returned by the query (for path queries) */
	paths?: Array<{
		nodes: GraphNode[];
		edges: GraphEdge[];
		length: number;
	}>;

	/** Query execution metadata */
	metadata: {
		/** Total count of available results */
		totalCount?: number;
		/** Query execution time in milliseconds */
		executionTime?: number;
		/** Type of query that was executed */
		queryType: string;
		/** Additional backend-specific metadata */
		[key: string]: any;
	};
}

/**
 * Knowledge graph error base class
 *
 * Base error class for all knowledge graph related errors.
 */
export class KnowledgeGraphError extends Error {
	constructor(
		override message: string,
		/** The operation that failed (e.g., 'addNode', 'query', 'connect') */
		public readonly operation: string,
		/** The underlying error that caused this error, if any */
		public override readonly cause?: Error
	) {
		super(message);
		this.name = 'KnowledgeGraphError';

		// Maintain proper stack trace for where the error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, KnowledgeGraphError);
		}

		// Include cause in the error message if available
		if (cause) {
			this.message = `${message}: ${cause.message}`;
		}
	}
}

/**
 * Knowledge graph connection error
 *
 * Thrown when connection to the knowledge graph backend fails.
 */
export class KnowledgeGraphConnectionError extends KnowledgeGraphError {
	constructor(
		override message: string,
		/** The type of backend that failed to connect (e.g., 'neo4j', 'in-memory') */
		public readonly backendType: string,
		/** The underlying connection error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'connection', cause);
		this.name = 'KnowledgeGraphConnectionError';

		// Update message to include backend type
		this.message = `${backendType} connection failed: ${message}`;
	}
}

/**
 * Node not found error
 *
 * Thrown when a requested node cannot be found in the knowledge graph.
 */
export class NodeNotFoundError extends KnowledgeGraphError {
	constructor(
		override message: string,
		/** The ID of the node that was not found */
		public readonly nodeId: string,
		/** The underlying error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'get', cause);
		this.name = 'NodeNotFoundError';

		// Update message to include node ID
		this.message = `Node not found: ${nodeId} - ${message}`;
	}
}

/**
 * Edge not found error
 *
 * Thrown when a requested edge cannot be found in the knowledge graph.
 */
export class EdgeNotFoundError extends KnowledgeGraphError {
	constructor(
		override message: string,
		/** The ID of the edge that was not found */
		public readonly edgeId: string,
		/** The underlying error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'get', cause);
		this.name = 'EdgeNotFoundError';

		// Update message to include edge ID
		this.message = `Edge not found: ${edgeId} - ${message}`;
	}
}

/**
 * Invalid query error
 *
 * Thrown when a graph query is malformed or invalid.
 */
export class InvalidQueryError extends KnowledgeGraphError {
	constructor(
		override message: string,
		/** The invalid query that caused the error */
		public readonly query: string | GraphQuery,
		/** The underlying error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'query', cause);
		this.name = 'InvalidQueryError';

		// Update message to include query info
		this.message = `Invalid query: ${message}`;
	}
}

/**
 * Graph validation error
 *
 * Thrown when graph data fails validation (e.g., duplicate nodes, invalid relationships).
 */
export class GraphValidationError extends KnowledgeGraphError {
	constructor(
		override message: string,
		/** The type of validation that failed */
		public readonly validationType: 'node' | 'edge' | 'schema',
		/** The underlying error, if any */
		public override readonly cause?: Error
	) {
		super(message, 'validation', cause);
		this.name = 'GraphValidationError';

		// Update message to include validation type
		this.message = `${validationType} validation failed: ${message}`;
	}
}
