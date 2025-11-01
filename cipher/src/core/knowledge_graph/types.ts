/**
 * Knowledge Graph Module Public API
 *
 * This module re-exports all the necessary types and interfaces for the knowledge graph system.
 * It provides a simplified, clean API surface for consumers of the knowledge graph module.
 *
 * The knowledge graph system architecture:
 * - Single backend design for graph operations and traversal
 * - Multiple backend implementations: Neo4j, In-Memory, etc.
 * - Consistent API across different backend types
 * - Strong type safety with TypeScript and runtime validation with Zod
 *
 * @module knowledge_graph
 *
 * @example
 * ```typescript
 * import type { KnowledgeGraphConfig, KnowledgeGraph } from './knowledge_graph/types.js';
 *
 * // Configure knowledge graph
 * const config: KnowledgeGraphConfig = {
 *   type: 'neo4j',
 *   host: 'localhost',
 *   port: 7687,
 *   username: 'neo4j',
 *   password: 'password',
 *   database: 'neo4j'
 * };
 *
 * // Use knowledge graph
 * const graph: KnowledgeGraph = createKnowledgeGraph(config);
 * ```
 */

/**
 * Re-export simplified knowledge graph types
 *
 * These exports provide the complete type system needed to work with
 * the knowledge graph module without exposing internal implementation details.
 */
export type {
	// Core interfaces
	KnowledgeGraph, // Interface for knowledge graph implementations
	GraphNode, // Node structure in the graph
	GraphEdge, // Edge/relationship structure in the graph
	GraphQuery, // Query structure for graph operations
	GraphResult, // Search/query result structure
	NodeFilters, // Metadata filters for node search
	EdgeFilters, // Metadata filters for edge search

	// Configuration types
	BackendConfig, // Union type for all backend configurations
	KnowledgeGraphConfig, // Top-level knowledge graph system configuration
} from './backend/types.js';

/**
 * Re-export configuration schemas
 */
export {
	// Configuration parsers and validators
	parseKnowledgeGraphConfig,
	validateKnowledgeGraphConfig,
} from './config.js';

/**
 * Re-export factory functions
 */
export {
	createKnowledgeGraph,
	createDefaultKnowledgeGraph,
	createKnowledgeGraphFromEnv,
} from './factory.js';

/**
 * Re-export manager
 */
export { KnowledgeGraphManager } from './manager.js';

/**
 * Re-export constants
 */
export { BACKEND_TYPES, DEFAULTS, ERROR_MESSAGES } from './constants.js';
