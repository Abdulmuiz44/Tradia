/**
 * In-Memory Knowledge Graph Backend
 *
 * Fast local storage implementation for development, testing, and small datasets.
 * All data is stored in memory using Map structures with optional indexing for performance.
 *
 * @module knowledge_graph/backend/in-memory
 */

import { Logger, createLogger } from '../../logger/logger.js';
import type { KnowledgeGraph } from './knowledge-graph.js';
import type {
	GraphNode,
	GraphEdge,
	GraphQuery,
	GraphResult,
	NodeFilters,
	EdgeFilters,
} from './types.js';
import {
	KnowledgeGraphConnectionError,
	NodeNotFoundError,
	EdgeNotFoundError,
	InvalidQueryError,
	GraphValidationError,
} from './types.js';
import type { InMemoryBackendConfig } from '../config.js';
import { DEFAULTS, ERROR_MESSAGES, LOG_PREFIXES } from '../constants.js';

/**
 * In-memory storage entry for tracking metadata
 */
interface StorageEntry<T> {
	data: T;
	createdAt: number;
	updatedAt: number;
}

/**
 * Index structure for faster lookups
 */
interface Index {
	labels: Map<string, Set<string>>; // label -> set of node IDs
	edgeTypes: Map<string, Set<string>>; // edge type -> set of edge IDs
	properties: Map<string, Map<any, Set<string>>>; // property name -> value -> set of IDs
}

/**
 * In-Memory Knowledge Graph Backend
 *
 * Provides a fast, local implementation of the knowledge graph interface.
 * All data is stored in memory and lost when the process terminates.
 *
 * @example
 * ```typescript
 * const backend = new InMemoryBackend({
 *   type: 'in-memory',
 *   maxNodes: 10000,
 *   maxEdges: 50000,
 *   enableIndexing: true
 * });
 *
 * await backend.connect();
 * await backend.addNode({
 *   id: 'node1',
 *   labels: ['Function'],
 *   properties: { name: 'myFunction' }
 * });
 * ```
 */
export class InMemoryBackend implements KnowledgeGraph {
	private readonly config: InMemoryBackendConfig;
	private readonly logger: Logger;
	private connected = false;

	// Core storage
	private nodes = new Map<string, StorageEntry<GraphNode>>();
	private edges = new Map<string, StorageEntry<GraphEdge>>();

	// Adjacency lists for graph traversal
	private outgoingEdges = new Map<string, Set<string>>(); // node ID -> set of outgoing edge IDs
	private incomingEdges = new Map<string, Set<string>>(); // node ID -> set of incoming edge IDs

	// Indexes for performance
	private nodeIndex: Index = {
		labels: new Map(),
		edgeTypes: new Map(),
		properties: new Map(),
	};

	private edgeIndex: Index = {
		labels: new Map(),
		edgeTypes: new Map(),
		properties: new Map(),
	};

	// Statistics
	private stats = {
		nodeCount: 0,
		edgeCount: 0,
		operations: 0,
		queriesExecuted: 0,
		lastOperation: 0,
	};

	constructor(config: InMemoryBackendConfig) {
		this.config = {
			...config,
			maxNodes: config.maxNodes ?? DEFAULTS.MAX_NODES,
			maxEdges: config.maxEdges ?? DEFAULTS.MAX_EDGES,
			enableIndexing: config.enableIndexing ?? true,
			enableGarbageCollection: config.enableGarbageCollection ?? false,
		};

		this.logger = createLogger({
			level: 'debug',
		});

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Initialized with config:`, {
			maxNodes: this.config.maxNodes,
			maxEdges: this.config.maxEdges,
			enableIndexing: this.config.enableIndexing,
			enableGarbageCollection: this.config.enableGarbageCollection,
		});
	}

	// Connection management

	async connect(): Promise<void> {
		if (this.connected) {
			this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Already connected`);
			return;
		}

		try {
			// Clear any existing data
			this.clear();

			this.connected = true;
			this.logger.info(`${LOG_PREFIXES.IN_MEMORY} Connected successfully`);
		} catch (error) {
			const connectionError = new KnowledgeGraphConnectionError(
				ERROR_MESSAGES.CONNECTION_FAILED,
				'in-memory',
				error as Error
			);
			this.logger.error(`${LOG_PREFIXES.IN_MEMORY} Connection failed:`, connectionError);
			throw connectionError;
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connected) {
			this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Already disconnected`);
			return;
		}

		try {
			// Clear all data if garbage collection is enabled
			if (this.config.enableGarbageCollection) {
				this.clear();
			}

			this.connected = false;
			this.logger.info(`${LOG_PREFIXES.IN_MEMORY} Disconnected successfully`);
		} catch (error) {
			this.logger.error(`${LOG_PREFIXES.IN_MEMORY} Error during disconnect:`, error);
			throw error;
		}
	}

	isConnected(): boolean {
		return this.connected;
	}

	getBackendType(): string {
		return 'in-memory';
	}

	// Node operations

	async addNode(node: GraphNode): Promise<void> {
		this.ensureConnected();
		this.validateNode(node);

		if (this.nodes.has(node.id)) {
			throw new GraphValidationError(`Node with ID '${node.id}' already exists`, 'node');
		}

		if (this.stats.nodeCount >= this.config.maxNodes) {
			throw new GraphValidationError(
				`Maximum number of nodes (${this.config.maxNodes}) exceeded`,
				'node'
			);
		}

		const entry: StorageEntry<GraphNode> = {
			data: this.deepClone(node),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.nodes.set(node.id, entry);
		this.stats.nodeCount++;
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		// Update indexes
		if (this.config.enableIndexing) {
			this.updateNodeIndex(node.id, node, 'add');
		}

		// Initialize adjacency lists
		this.outgoingEdges.set(node.id, new Set());
		this.incomingEdges.set(node.id, new Set());

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Added node:`, {
			id: node.id,
			labels: node.labels,
		});
	}

	async addNodes(nodes: GraphNode[]): Promise<void> {
		this.ensureConnected();

		if (this.stats.nodeCount + nodes.length > this.config.maxNodes) {
			throw new GraphValidationError(
				`Adding ${nodes.length} nodes would exceed maximum (${this.config.maxNodes})`,
				'node'
			);
		}

		// Validate all nodes first
		for (const node of nodes) {
			this.validateNode(node);
			if (this.nodes.has(node.id)) {
				throw new GraphValidationError(`Node with ID '${node.id}' already exists`, 'node');
			}
		}

		// Add all nodes
		for (const node of nodes) {
			await this.addNode(node);
		}

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Added ${nodes.length} nodes`);
	}

	async getNode(nodeId: string): Promise<GraphNode | null> {
		this.ensureConnected();

		const entry = this.nodes.get(nodeId);
		if (!entry) {
			return null;
		}

		return this.deepClone(entry.data);
	}

	async updateNode(
		nodeId: string,
		properties: Record<string, any>,
		labels?: string[]
	): Promise<void> {
		this.ensureConnected();

		const entry = this.nodes.get(nodeId);
		if (!entry) {
			throw new NodeNotFoundError(ERROR_MESSAGES.NODE_NOT_FOUND, nodeId);
		}

		// Remove old indexes
		if (this.config.enableIndexing) {
			this.updateNodeIndex(nodeId, entry.data, 'remove');
		}

		// Update node data
		const updatedNode: GraphNode = {
			...entry.data,
			properties: { ...entry.data.properties, ...properties },
			labels: labels ?? entry.data.labels,
		};

		entry.data = updatedNode;
		entry.updatedAt = Date.now();
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		// Update indexes
		if (this.config.enableIndexing) {
			this.updateNodeIndex(nodeId, updatedNode, 'add');
		}

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Updated node:`, { id: nodeId });
	}

	async deleteNode(nodeId: string): Promise<void> {
		this.ensureConnected();

		const entry = this.nodes.get(nodeId);
		if (!entry) {
			// Silently ignore if node doesn't exist
			return;
		}

		// Delete all edges connected to this node
		const outgoing = this.outgoingEdges.get(nodeId) || new Set();
		const incoming = this.incomingEdges.get(nodeId) || new Set();

		for (const edgeId of [...outgoing, ...incoming]) {
			await this.deleteEdge(edgeId);
		}

		// Remove from indexes
		if (this.config.enableIndexing) {
			this.updateNodeIndex(nodeId, entry.data, 'remove');
		}

		// Remove node
		this.nodes.delete(nodeId);
		this.outgoingEdges.delete(nodeId);
		this.incomingEdges.delete(nodeId);
		this.stats.nodeCount--;
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Deleted node:`, { id: nodeId });
	}

	async findNodes(filters?: NodeFilters, labels?: string[], limit?: number): Promise<GraphNode[]> {
		this.ensureConnected();

		const maxResults = limit ?? DEFAULTS.QUERY_LIMIT;
		const results: GraphNode[] = [];

		// Use index for label filtering if available
		let candidateIds = new Set<string>();
		if (labels && labels.length > 0 && this.config.enableIndexing) {
			for (const label of labels) {
				const labelIds = this.nodeIndex.labels.get(label) || new Set();
				if (candidateIds.size === 0) {
					candidateIds = new Set(labelIds);
				} else {
					candidateIds = new Set([...candidateIds].filter(id => labelIds.has(id)));
				}
			}
		} else {
			candidateIds = new Set(this.nodes.keys());
		}

		for (const nodeId of candidateIds) {
			if (results.length >= maxResults) break;

			const entry = this.nodes.get(nodeId);
			if (!entry) continue;

			const node = entry.data;

			// Check label filters
			if (labels && labels.length > 0) {
				if (!labels.some(label => node.labels.includes(label))) {
					continue;
				}
			}

			// Check property filters
			if (filters && !this.matchesNodeFilters(node, filters)) {
				continue;
			}

			results.push(this.deepClone(node));
		}

		this.stats.queriesExecuted++;
		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Found ${results.length} nodes`);

		return results;
	}

	// Edge operations

	async addEdge(edge: GraphEdge): Promise<void> {
		this.ensureConnected();
		this.validateEdge(edge);

		if (this.edges.has(edge.id)) {
			throw new GraphValidationError(`Edge with ID '${edge.id}' already exists`, 'edge');
		}

		if (this.stats.edgeCount >= this.config.maxEdges) {
			throw new GraphValidationError(
				`Maximum number of edges (${this.config.maxEdges}) exceeded`,
				'edge'
			);
		}

		// Check that start and end nodes exist
		if (!this.nodes.has(edge.startNodeId)) {
			throw new GraphValidationError(`Start node '${edge.startNodeId}' not found`, 'edge');
		}

		if (!this.nodes.has(edge.endNodeId)) {
			throw new GraphValidationError(`End node '${edge.endNodeId}' not found`, 'edge');
		}

		const entry: StorageEntry<GraphEdge> = {
			data: this.deepClone(edge),
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		this.edges.set(edge.id, entry);
		this.stats.edgeCount++;
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		// Update adjacency lists
		this.outgoingEdges.get(edge.startNodeId)!.add(edge.id);
		this.incomingEdges.get(edge.endNodeId)!.add(edge.id);

		// Update indexes
		if (this.config.enableIndexing) {
			this.updateEdgeIndex(edge.id, edge, 'add');
		}

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Added edge:`, {
			id: edge.id,
			type: edge.type,
			from: edge.startNodeId,
			to: edge.endNodeId,
		});
	}

	async addEdges(edges: GraphEdge[]): Promise<void> {
		this.ensureConnected();

		if (this.stats.edgeCount + edges.length > this.config.maxEdges) {
			throw new GraphValidationError(
				`Adding ${edges.length} edges would exceed maximum (${this.config.maxEdges})`,
				'edge'
			);
		}

		// Validate all edges first
		for (const edge of edges) {
			this.validateEdge(edge);
			if (this.edges.has(edge.id)) {
				throw new GraphValidationError(`Edge with ID '${edge.id}' already exists`, 'edge');
			}
		}

		// Add all edges
		for (const edge of edges) {
			await this.addEdge(edge);
		}

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Added ${edges.length} edges`);
	}

	async getEdge(edgeId: string): Promise<GraphEdge | null> {
		this.ensureConnected();

		const entry = this.edges.get(edgeId);
		if (!entry) {
			return null;
		}

		return this.deepClone(entry.data);
	}

	async updateEdge(edgeId: string, properties: Record<string, any>): Promise<void> {
		this.ensureConnected();

		const entry = this.edges.get(edgeId);
		if (!entry) {
			throw new EdgeNotFoundError(ERROR_MESSAGES.EDGE_NOT_FOUND, edgeId);
		}

		// Remove old indexes
		if (this.config.enableIndexing) {
			this.updateEdgeIndex(edgeId, entry.data, 'remove');
		}

		// Update edge data
		const updatedEdge: GraphEdge = {
			...entry.data,
			properties: { ...entry.data.properties, ...properties },
		};

		entry.data = updatedEdge;
		entry.updatedAt = Date.now();
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		// Update indexes
		if (this.config.enableIndexing) {
			this.updateEdgeIndex(edgeId, updatedEdge, 'add');
		}

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Updated edge:`, { id: edgeId });
	}

	async deleteEdge(edgeId: string): Promise<void> {
		this.ensureConnected();

		const entry = this.edges.get(edgeId);
		if (!entry) {
			// Silently ignore if edge doesn't exist
			return;
		}

		const edge = entry.data;

		// Remove from adjacency lists
		this.outgoingEdges.get(edge.startNodeId)?.delete(edgeId);
		this.incomingEdges.get(edge.endNodeId)?.delete(edgeId);

		// Remove from indexes
		if (this.config.enableIndexing) {
			this.updateEdgeIndex(edgeId, edge, 'remove');
		}

		// Remove edge
		this.edges.delete(edgeId);
		this.stats.edgeCount--;
		this.stats.operations++;
		this.stats.lastOperation = Date.now();

		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Deleted edge:`, { id: edgeId });
	}

	async findEdges(filters?: EdgeFilters, edgeType?: string, limit?: number): Promise<GraphEdge[]> {
		this.ensureConnected();

		const maxResults = limit ?? DEFAULTS.QUERY_LIMIT;
		const results: GraphEdge[] = [];

		// Use index for type filtering if available
		let candidateIds = new Set<string>();
		if (edgeType && this.config.enableIndexing) {
			candidateIds = this.edgeIndex.edgeTypes.get(edgeType) || new Set();
		} else {
			candidateIds = new Set(this.edges.keys());
		}

		for (const edgeId of candidateIds) {
			if (results.length >= maxResults) break;

			const entry = this.edges.get(edgeId);
			if (!entry) continue;

			const edge = entry.data;

			// Check type filter
			if (edgeType && edge.type !== edgeType) {
				continue;
			}

			// Check property filters
			if (filters && !this.matchesEdgeFilters(edge, filters)) {
				continue;
			}

			results.push(this.deepClone(edge));
		}

		this.stats.queriesExecuted++;
		this.logger.debug(`${LOG_PREFIXES.IN_MEMORY} Found ${results.length} edges`);

		return results;
	}

	// Advanced operations

	async query(query: GraphQuery): Promise<GraphResult> {
		this.ensureConnected();

		const startTime = Date.now();
		let result: GraphResult;

		try {
			switch (query.type) {
				case 'node':
					result = await this.executeNodeQuery(query);
					break;
				case 'edge':
					result = await this.executeEdgeQuery(query);
					break;
				case 'path':
					result = await this.executePathQuery(query);
					break;
				case 'cypher':
					throw new InvalidQueryError('Cypher queries not supported in in-memory backend', query);
				default:
					throw new InvalidQueryError(`Unsupported query type: ${(query as any).type}`, query);
			}

			result.metadata.executionTime = Date.now() - startTime;
			this.stats.queriesExecuted++;

			return result;
		} catch (error) {
			throw new InvalidQueryError(
				`Query execution failed: ${(error as Error).message}`,
				query,
				error as Error
			);
		}
	}

	async getNeighbors(
		nodeId: string,
		direction: 'in' | 'out' | 'both' = 'both',
		edgeTypes?: string[],
		limit?: number
	): Promise<Array<{ node: GraphNode; edge: GraphEdge }>> {
		this.ensureConnected();

		if (!this.nodes.has(nodeId)) {
			throw new NodeNotFoundError(ERROR_MESSAGES.NODE_NOT_FOUND, nodeId);
		}

		const maxResults = limit ?? DEFAULTS.MAX_NEIGHBORS;
		const results: Array<{ node: GraphNode; edge: GraphEdge }> = [];

		const edgeIds = new Set<string>();

		// Collect relevant edge IDs based on direction
		if (direction === 'out' || direction === 'both') {
			const outgoing = this.outgoingEdges.get(nodeId) || new Set();
			outgoing.forEach(id => edgeIds.add(id));
		}

		if (direction === 'in' || direction === 'both') {
			const incoming = this.incomingEdges.get(nodeId) || new Set();
			incoming.forEach(id => edgeIds.add(id));
		}

		for (const edgeId of edgeIds) {
			if (results.length >= maxResults) break;

			const edgeEntry = this.edges.get(edgeId);
			if (!edgeEntry) continue;

			const edge = edgeEntry.data;

			// Check edge type filter
			if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.type)) {
				continue;
			}

			// Get the neighbor node
			const neighborId = edge.startNodeId === nodeId ? edge.endNodeId : edge.startNodeId;
			const neighborEntry = this.nodes.get(neighborId);
			if (!neighborEntry) continue;

			results.push({
				node: this.deepClone(neighborEntry.data),
				edge: this.deepClone(edge),
			});
		}

		this.logger.debug(
			`${LOG_PREFIXES.IN_MEMORY} Found ${results.length} neighbors for node ${nodeId}`
		);

		return results;
	}

	async findPath(
		startNodeId: string,
		endNodeId: string,
		maxDepth: number = DEFAULTS.MAX_PATH_DEPTH,
		edgeTypes?: string[]
	): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null> {
		this.ensureConnected();

		if (!this.nodes.has(startNodeId)) {
			throw new NodeNotFoundError(`Start node not found`, startNodeId);
		}

		if (!this.nodes.has(endNodeId)) {
			throw new NodeNotFoundError(`End node not found`, endNodeId);
		}

		// Use BFS to find shortest path
		const queue: Array<{ nodeId: string; path: string[]; edgePath: string[] }> = [
			{ nodeId: startNodeId, path: [startNodeId], edgePath: [] },
		];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const current = queue.shift()!;

			if (current.nodeId === endNodeId) {
				// Found path - construct result
				const nodes: GraphNode[] = [];
				const edges: GraphEdge[] = [];

				for (const nodeId of current.path) {
					const nodeEntry = this.nodes.get(nodeId);
					if (nodeEntry) {
						nodes.push(this.deepClone(nodeEntry.data));
					}
				}

				for (const edgeId of current.edgePath) {
					const edgeEntry = this.edges.get(edgeId);
					if (edgeEntry) {
						edges.push(this.deepClone(edgeEntry.data));
					}
				}

				this.logger.debug(
					`${LOG_PREFIXES.IN_MEMORY} Found path from ${startNodeId} to ${endNodeId} with ${edges.length} edges`
				);

				return { nodes, edges };
			}

			if (current.path.length >= maxDepth || visited.has(current.nodeId)) {
				continue;
			}

			visited.add(current.nodeId);

			// Explore neighbors
			const outgoing = this.outgoingEdges.get(current.nodeId) || new Set();
			for (const edgeId of outgoing) {
				const edgeEntry = this.edges.get(edgeId);
				if (!edgeEntry) continue;

				const edge = edgeEntry.data;

				// Check edge type filter
				if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.type)) {
					continue;
				}

				const nextNodeId = edge.endNodeId;
				if (!visited.has(nextNodeId)) {
					queue.push({
						nodeId: nextNodeId,
						path: [...current.path, nextNodeId],
						edgePath: [...current.edgePath, edgeId],
					});
				}
			}
		}

		this.logger.debug(
			`${LOG_PREFIXES.IN_MEMORY} No path found from ${startNodeId} to ${endNodeId}`
		);
		return null;
	}

	// Graph management

	async clearGraph(): Promise<void> {
		this.ensureConnected();
		this.clear();
		this.logger.info(`${LOG_PREFIXES.IN_MEMORY} Graph cleared`);
	}

	async getStatistics(): Promise<{
		nodeCount: number;
		edgeCount: number;
		labelCounts: Record<string, number>;
		edgeTypeCounts: Record<string, number>;
	}> {
		this.ensureConnected();

		const labelCounts: Record<string, number> = {};
		const edgeTypeCounts: Record<string, number> = {};

		// Count node labels
		for (const entry of this.nodes.values()) {
			for (const label of entry.data.labels) {
				labelCounts[label] = (labelCounts[label] || 0) + 1;
			}
		}

		// Count edge types
		for (const entry of this.edges.values()) {
			const type = entry.data.type;
			edgeTypeCounts[type] = (edgeTypeCounts[type] || 0) + 1;
		}

		return {
			nodeCount: this.stats.nodeCount,
			edgeCount: this.stats.edgeCount,
			labelCounts,
			edgeTypeCounts,
		};
	}

	// Private helper methods

	private ensureConnected(): void {
		if (!this.connected) {
			throw new KnowledgeGraphConnectionError(ERROR_MESSAGES.NOT_CONNECTED, 'in-memory');
		}
	}

	private validateNode(node: GraphNode): void {
		if (!node.id || typeof node.id !== 'string') {
			throw new GraphValidationError('Node ID must be a non-empty string', 'node');
		}

		if (!Array.isArray(node.labels) || node.labels.length === 0) {
			throw new GraphValidationError('Node must have at least one label', 'node');
		}

		if (!node.properties || typeof node.properties !== 'object') {
			throw new GraphValidationError('Node properties must be an object', 'node');
		}
	}

	private validateEdge(edge: GraphEdge): void {
		if (!edge.id || typeof edge.id !== 'string') {
			throw new GraphValidationError('Edge ID must be a non-empty string', 'edge');
		}

		if (!edge.type || typeof edge.type !== 'string') {
			throw new GraphValidationError('Edge type must be a non-empty string', 'edge');
		}

		if (!edge.startNodeId || typeof edge.startNodeId !== 'string') {
			throw new GraphValidationError('Edge startNodeId must be a non-empty string', 'edge');
		}

		if (!edge.endNodeId || typeof edge.endNodeId !== 'string') {
			throw new GraphValidationError('Edge endNodeId must be a non-empty string', 'edge');
		}

		if (!edge.properties || typeof edge.properties !== 'object') {
			throw new GraphValidationError('Edge properties must be an object', 'edge');
		}
	}

	private deepClone<T>(obj: T): T {
		return JSON.parse(JSON.stringify(obj));
	}

	private clear(): void {
		this.nodes.clear();
		this.edges.clear();
		this.outgoingEdges.clear();
		this.incomingEdges.clear();
		this.clearIndexes();
		this.stats = {
			nodeCount: 0,
			edgeCount: 0,
			operations: 0,
			queriesExecuted: 0,
			lastOperation: 0,
		};
	}

	private clearIndexes(): void {
		this.nodeIndex.labels.clear();
		this.nodeIndex.edgeTypes.clear();
		this.nodeIndex.properties.clear();
		this.edgeIndex.labels.clear();
		this.edgeIndex.edgeTypes.clear();
		this.edgeIndex.properties.clear();
	}

	private updateNodeIndex(nodeId: string, node: GraphNode, operation: 'add' | 'remove'): void {
		if (!this.config.enableIndexing) return;

		const { labels, properties } = this.nodeIndex;

		// Update label indexes
		for (const label of node.labels) {
			if (!labels.has(label)) {
				labels.set(label, new Set());
			}
			const labelSet = labels.get(label)!;

			if (operation === 'add') {
				labelSet.add(nodeId);
			} else {
				labelSet.delete(nodeId);
				if (labelSet.size === 0) {
					labels.delete(label);
				}
			}
		}

		// Update property indexes
		for (const [key, value] of Object.entries(node.properties)) {
			if (!properties.has(key)) {
				properties.set(key, new Map());
			}
			const propMap = properties.get(key)!;

			if (!propMap.has(value)) {
				propMap.set(value, new Set());
			}
			const valueSet = propMap.get(value)!;

			if (operation === 'add') {
				valueSet.add(nodeId);
			} else {
				valueSet.delete(nodeId);
				if (valueSet.size === 0) {
					propMap.delete(value);
					if (propMap.size === 0) {
						properties.delete(key);
					}
				}
			}
		}
	}

	private updateEdgeIndex(edgeId: string, edge: GraphEdge, operation: 'add' | 'remove'): void {
		if (!this.config.enableIndexing) return;

		const { edgeTypes, properties } = this.edgeIndex;

		// Update edge type indexes
		if (!edgeTypes.has(edge.type)) {
			edgeTypes.set(edge.type, new Set());
		}
		const typeSet = edgeTypes.get(edge.type)!;

		if (operation === 'add') {
			typeSet.add(edgeId);
		} else {
			typeSet.delete(edgeId);
			if (typeSet.size === 0) {
				edgeTypes.delete(edge.type);
			}
		}

		// Update property indexes
		for (const [key, value] of Object.entries(edge.properties)) {
			if (!properties.has(key)) {
				properties.set(key, new Map());
			}
			const propMap = properties.get(key)!;

			if (!propMap.has(value)) {
				propMap.set(value, new Set());
			}
			const valueSet = propMap.get(value)!;

			if (operation === 'add') {
				valueSet.add(edgeId);
			} else {
				valueSet.delete(edgeId);
				if (valueSet.size === 0) {
					propMap.delete(value);
					if (propMap.size === 0) {
						properties.delete(key);
					}
				}
			}
		}
	}

	private matchesNodeFilters(node: GraphNode, filters: NodeFilters): boolean {
		for (const [key, filter] of Object.entries(filters)) {
			const value = node.properties[key];

			if (!this.matchesFilter(value, filter)) {
				return false;
			}
		}
		return true;
	}

	private matchesEdgeFilters(edge: GraphEdge, filters: EdgeFilters): boolean {
		for (const [key, filter] of Object.entries(filters)) {
			const value = edge.properties[key];

			if (!this.matchesFilter(value, filter)) {
				return false;
			}
		}
		return true;
	}

	private matchesFilter(value: any, filter: any): boolean {
		if (filter === null || filter === undefined) {
			return value === filter;
		}

		if (typeof filter === 'object' && !Array.isArray(filter)) {
			// Range filters
			if ('gte' in filter && value < filter.gte) return false;
			if ('gt' in filter && value <= filter.gt) return false;
			if ('lte' in filter && value > filter.lte) return false;
			if ('lt' in filter && value >= filter.lt) return false;

			// Array filters
			if ('any' in filter) {
				return Array.isArray(filter.any) && filter.any.includes(value);
			}
			if ('all' in filter) {
				return (
					Array.isArray(filter.all) &&
					Array.isArray(value) &&
					filter.all.every((item: any) => value.includes(item))
				);
			}

			return true;
		}

		// Direct equality
		return value === filter;
	}

	private async executeNodeQuery(query: GraphQuery): Promise<GraphResult> {
		const { pattern, limit } = query;
		const labels = pattern?.labels;
		const properties = pattern?.properties;

		const nodes = await this.findNodes(properties, labels, limit);

		return {
			nodes,
			edges: [],
			metadata: {
				totalCount: nodes.length,
				queryType: 'node',
			},
		};
	}

	private async executeEdgeQuery(query: GraphQuery): Promise<GraphResult> {
		const { pattern, limit } = query;
		const edgeType = pattern?.type;
		const properties = pattern?.properties;

		const edges = await this.findEdges(properties, edgeType, limit);

		return {
			nodes: [],
			edges,
			metadata: {
				totalCount: edges.length,
				queryType: 'edge',
			},
		};
	}

	private async executePathQuery(query: GraphQuery): Promise<GraphResult> {
		const { pattern, parameters } = query;
		const startNode = pattern?.startNode;
		const endNode = pattern?.endNode;
		const maxDepth = parameters?.maxDepth ?? DEFAULTS.MAX_PATH_DEPTH;

		if (!startNode?.id || !endNode?.id) {
			throw new InvalidQueryError('Path query requires startNode.id and endNode.id', query);
		}

		const path = await this.findPath(startNode.id, endNode.id, maxDepth);

		if (path) {
			return {
				nodes: path.nodes,
				edges: path.edges,
				paths: [
					{
						nodes: path.nodes,
						edges: path.edges,
						length: path.edges.length,
					},
				],
				metadata: {
					totalCount: 1,
					queryType: 'path',
				},
			};
		}

		return {
			nodes: [],
			edges: [],
			paths: [],
			metadata: {
				totalCount: 0,
				queryType: 'path',
			},
		};
	}

	// Debug methods for testing

	getInternalStats() {
		return {
			...this.stats,
			memoryUsage: {
				nodes: this.nodes.size,
				edges: this.edges.size,
				outgoingEdges: this.outgoingEdges.size,
				incomingEdges: this.incomingEdges.size,
			},
			indexSizes: this.config.enableIndexing
				? {
						nodeLabels: this.nodeIndex.labels.size,
						nodeProperties: this.nodeIndex.properties.size,
						edgeTypes: this.edgeIndex.edgeTypes.size,
						edgeProperties: this.edgeIndex.properties.size,
					}
				: null,
		};
	}
}
