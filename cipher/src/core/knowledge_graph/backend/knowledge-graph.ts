/**
 * Knowledge Graph Interface
 *
 * Defines the contract for knowledge graph implementations.
 * Knowledge graphs are optimized for entity-relationship storage and graph traversal operations.
 *
 * Implementations can include:
 * - Neo4j: Production-grade graph database
 * - ArangoDB: Multi-model database with graph capabilities
 * - In-Memory: Fast local storage for development/testing
 *
 * @module knowledge_graph/backend/knowledge-graph
 */

import type {
	GraphNode,
	GraphEdge,
	GraphQuery,
	GraphResult,
	NodeFilters,
	EdgeFilters,
} from './types.js';

/**
 * KnowledgeGraph Interface
 *
 * Provides a unified API for different knowledge graph implementations.
 * All methods are asynchronous to support both local and network-based backends.
 *
 * @example
 * ```typescript
 * class Neo4jBackend implements KnowledgeGraph {
 *   async addNode(node: GraphNode): Promise<void> {
 *     const session = this.driver.session();
 *     await session.run(
 *       'CREATE (n:' + node.labels.join(':') + ' {properties})',
 *       { properties: node.properties }
 *     );
 *     await session.close();
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface KnowledgeGraph {
	// Basic node operations

	/**
	 * Add a new node to the knowledge graph
	 *
	 * @param node - The node to add with labels and properties
	 * @throws {GraphValidationError} If node data is invalid
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.addNode({
	 *   id: 'func_123',
	 *   labels: ['Function', 'Code'],
	 *   properties: {
	 *     name: 'calculateTotal',
	 *     language: 'typescript'
	 *   }
	 * });
	 * ```
	 */
	addNode(node: GraphNode): Promise<void>;

	/**
	 * Add multiple nodes to the knowledge graph in batch
	 *
	 * @param nodes - Array of nodes to add
	 * @throws {GraphValidationError} If any node data is invalid
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.addNodes([node1, node2, node3]);
	 * ```
	 */
	addNodes(nodes: GraphNode[]): Promise<void>;

	/**
	 * Get a node by its ID
	 *
	 * @param nodeId - The unique identifier of the node
	 * @returns The node if found, null otherwise
	 *
	 * @example
	 * ```typescript
	 * const node = await graph.getNode('func_123');
	 * if (node) {
	 *   console.log(node.properties.name);
	 * }
	 * ```
	 */
	getNode(nodeId: string): Promise<GraphNode | null>;

	/**
	 * Update a node's properties
	 *
	 * @param nodeId - The unique identifier of the node
	 * @param properties - New properties to set (merged with existing)
	 * @param labels - Optional new labels to set
	 * @throws {NodeNotFoundError} If node doesn't exist
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.updateNode('func_123', {
	 *   updated_at: Date.now(),
	 *   complexity: 'high'
	 * }, ['Function', 'Code', 'Complex']);
	 * ```
	 */
	updateNode(nodeId: string, properties: Record<string, any>, labels?: string[]): Promise<void>;

	/**
	 * Delete a node and all its relationships
	 *
	 * @param nodeId - The unique identifier of the node to delete
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.deleteNode('func_123');
	 * ```
	 */
	deleteNode(nodeId: string): Promise<void>;

	/**
	 * Find nodes matching the given filters
	 *
	 * @param filters - Property filters to apply
	 * @param labels - Optional labels to filter by
	 * @param limit - Maximum number of results to return
	 * @returns Array of matching nodes
	 *
	 * @example
	 * ```typescript
	 * const functions = await graph.findNodes(
	 *   { language: 'typescript' },
	 *   ['Function'],
	 *   10
	 * );
	 * ```
	 */
	findNodes(filters?: NodeFilters, labels?: string[], limit?: number): Promise<GraphNode[]>;

	// Basic edge operations

	/**
	 * Add a new edge (relationship) to the knowledge graph
	 *
	 * @param edge - The edge to add with type and properties
	 * @throws {GraphValidationError} If edge data is invalid
	 * @throws {NodeNotFoundError} If start or end node doesn't exist
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.addEdge({
	 *   id: 'rel_456',
	 *   type: 'DEPENDS_ON',
	 *   startNodeId: 'func_123',
	 *   endNodeId: 'func_456',
	 *   properties: { strength: 0.9 }
	 * });
	 * ```
	 */
	addEdge(edge: GraphEdge): Promise<void>;

	/**
	 * Add multiple edges to the knowledge graph in batch
	 *
	 * @param edges - Array of edges to add
	 * @throws {GraphValidationError} If any edge data is invalid
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.addEdges([edge1, edge2, edge3]);
	 * ```
	 */
	addEdges(edges: GraphEdge[]): Promise<void>;

	/**
	 * Get an edge by its ID
	 *
	 * @param edgeId - The unique identifier of the edge
	 * @returns The edge if found, null otherwise
	 *
	 * @example
	 * ```typescript
	 * const edge = await graph.getEdge('rel_456');
	 * if (edge) {
	 *   console.log(edge.properties.strength);
	 * }
	 * ```
	 */
	getEdge(edgeId: string): Promise<GraphEdge | null>;

	/**
	 * Update an edge's properties
	 *
	 * @param edgeId - The unique identifier of the edge
	 * @param properties - New properties to set (merged with existing)
	 * @throws {EdgeNotFoundError} If edge doesn't exist
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.updateEdge('rel_456', {
	 *   updated_at: Date.now(),
	 *   strength: 0.95
	 * });
	 * ```
	 */
	updateEdge(edgeId: string, properties: Record<string, any>): Promise<void>;

	/**
	 * Delete an edge
	 *
	 * @param edgeId - The unique identifier of the edge to delete
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * await graph.deleteEdge('rel_456');
	 * ```
	 */
	deleteEdge(edgeId: string): Promise<void>;

	/**
	 * Find edges matching the given filters
	 *
	 * @param filters - Property filters to apply
	 * @param edgeType - Optional edge type to filter by
	 * @param limit - Maximum number of results to return
	 * @returns Array of matching edges
	 *
	 * @example
	 * ```typescript
	 * const dependencies = await graph.findEdges(
	 *   { strength: { gte: 0.8 } },
	 *   'DEPENDS_ON',
	 *   20
	 * );
	 * ```
	 */
	findEdges(filters?: EdgeFilters, edgeType?: string, limit?: number): Promise<GraphEdge[]>;

	// Advanced graph operations

	/**
	 * Execute a complex graph query
	 *
	 * @param query - The graph query to execute
	 * @returns Query results containing nodes, edges, and metadata
	 * @throws {InvalidQueryError} If query is malformed
	 * @throws {KnowledgeGraphError} If the operation fails
	 *
	 * @example
	 * ```typescript
	 * const result = await graph.query({
	 *   type: 'cypher',
	 *   query: 'MATCH (n:Function)-[r:DEPENDS_ON]->(m:Function) RETURN n, r, m',
	 *   limit: 100
	 * });
	 * ```
	 */
	query(query: GraphQuery): Promise<GraphResult>;

	/**
	 * Get neighbors of a node (nodes connected by edges)
	 *
	 * @param nodeId - The node to get neighbors for
	 * @param direction - Direction of relationships ('in', 'out', 'both')
	 * @param edgeTypes - Optional edge types to filter by
	 * @param limit - Maximum number of neighbors to return
	 * @returns Array of neighbor nodes with their connecting edges
	 *
	 * @example
	 * ```typescript
	 * const neighbors = await graph.getNeighbors(
	 *   'func_123',
	 *   'out',
	 *   ['DEPENDS_ON', 'CALLS'],
	 *   10
	 * );
	 * ```
	 */
	getNeighbors(
		nodeId: string,
		direction?: 'in' | 'out' | 'both',
		edgeTypes?: string[],
		limit?: number
	): Promise<Array<{ node: GraphNode; edge: GraphEdge }>>;

	/**
	 * Find shortest path between two nodes
	 *
	 * @param startNodeId - Starting node ID
	 * @param endNodeId - Target node ID
	 * @param maxDepth - Maximum path length to search
	 * @param edgeTypes - Optional edge types to traverse
	 * @returns Path if found, null otherwise
	 *
	 * @example
	 * ```typescript
	 * const path = await graph.findPath('func_123', 'func_789', 5);
	 * if (path) {
	 *   console.log(`Path length: ${path.edges.length}`);
	 * }
	 * ```
	 */
	findPath(
		startNodeId: string,
		endNodeId: string,
		maxDepth?: number,
		edgeTypes?: string[]
	): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>;

	// Graph management

	/**
	 * Clear all nodes and edges from the graph
	 *
	 * WARNING: This will permanently delete all graph data.
	 *
	 * @example
	 * ```typescript
	 * // Use with caution!
	 * await graph.clearGraph();
	 * ```
	 */
	clearGraph(): Promise<void>;

	/**
	 * Get statistics about the graph
	 *
	 * @returns Object containing graph statistics
	 *
	 * @example
	 * ```typescript
	 * const stats = await graph.getStatistics();
	 * console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.edgeCount}`);
	 * ```
	 */
	getStatistics(): Promise<{
		nodeCount: number;
		edgeCount: number;
		labelCounts: Record<string, number>;
		edgeTypeCounts: Record<string, number>;
	}>;

	// Connection management

	/**
	 * Establishes connection to the knowledge graph backend
	 *
	 * Should be called before performing any operations.
	 * Implementations should handle reconnection logic internally.
	 *
	 * @throws {KnowledgeGraphConnectionError} If connection fails
	 *
	 * @example
	 * ```typescript
	 * const graph = new Neo4jBackend(config);
	 * await graph.connect();
	 * // Now ready to use
	 * ```
	 */
	connect(): Promise<void>;

	/**
	 * Gracefully closes the connection to the knowledge graph
	 *
	 * Should clean up resources and close any open connections.
	 * After disconnect, connect() must be called again before use.
	 *
	 * @example
	 * ```typescript
	 * // Clean shutdown
	 * await graph.disconnect();
	 * ```
	 */
	disconnect(): Promise<void>;

	/**
	 * Checks if the backend is currently connected and ready
	 *
	 * @returns true if connected and operational, false otherwise
	 *
	 * @example
	 * ```typescript
	 * if (!graph.isConnected()) {
	 *   await graph.connect();
	 * }
	 * ```
	 */
	isConnected(): boolean;

	/**
	 * Returns the backend type identifier
	 *
	 * Useful for logging, monitoring, and conditional logic based on backend type.
	 *
	 * @returns Backend type string (e.g., 'neo4j', 'in-memory')
	 *
	 * @example
	 * ```typescript
	 * console.log(`Using ${graph.getBackendType()} for knowledge graph`);
	 * ```
	 */
	getBackendType(): string;
}
