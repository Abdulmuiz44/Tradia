/**
 * Search Graph Tool
 *
 * Searches for nodes and edges in the knowledge graph with filtering capabilities.
 * Supports label-based, property-based, and full-text search.
 */

import { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';
import type {
	GraphNode,
	GraphEdge,
	NodeFilters,
	EdgeFilters,
} from '../../../../knowledge_graph/backend/types.js';

/**
 * Search Graph Tool Definition for external use
 */
export const SEARCH_GRAPH_TOOL = {
	type: 'function',
	function: {
		name: 'search_graph',
		description: 'Search for nodes and edges in the knowledge graph with optional filters.',
		parameters: {
			type: 'object',
			properties: {
				searchType: {
					type: 'string',
					enum: ['nodes', 'edges', 'both'],
					description: 'Type of entities to search for',
					default: 'both',
				},
				nodeLabels: {
					type: 'array',
					description: 'Filter by node labels (only applicable when searching nodes)',
					items: {
						type: 'string',
					},
				},
				edgeTypes: {
					type: 'array',
					description: 'Filter by edge types (only applicable when searching edges)',
					items: {
						type: 'string',
					},
				},
				// Legacy parameter for backward compatibility
				labels: {
					type: 'array',
					description: 'Filter by node labels or edge types (deprecated, use nodeLabels/edgeTypes)',
					items: {
						type: 'string',
					},
				},
				properties: {
					type: 'object',
					description: 'Filter by properties (key-value pairs)',
					additionalProperties: true,
				},
				textSearch: {
					type: 'string',
					description: 'Full-text search in properties and names',
				},
				limit: {
					type: 'number',
					description: 'Maximum number of results to return',
					minimum: 1,
					maximum: 1000,
					default: 50,
				},
			},
			additionalProperties: false,
		},
	},
};

/**
 * Search graph tool for finding entities in the knowledge graph
 */
export const searchGraphTool: InternalTool = {
	name: 'search_graph',
	category: 'knowledge_graph',
	internal: true,
	description: 'Search for nodes and edges in the knowledge graph with optional filters.',
	version: '1.0.0',
	parameters: {
		type: 'object',
		properties: {
			searchType: {
				type: 'string',
				enum: ['nodes', 'edges', 'both'],
				description: 'Type of entities to search for',
			},
			nodeLabels: {
				type: 'array',
				description: 'Filter by node labels (only applicable when searching nodes)',
				items: {
					type: 'string',
				},
			},
			edgeTypes: {
				type: 'array',
				description: 'Filter by edge types (only applicable when searching edges)',
				items: {
					type: 'string',
				},
			},
			// Legacy parameter for backward compatibility
			labels: {
				type: 'array',
				description: 'Filter by node labels or edge types (deprecated, use nodeLabels/edgeTypes)',
				items: {
					type: 'string',
				},
			},
			properties: {
				type: 'object',
				description: 'Filter by properties (key-value pairs)',
				additionalProperties: true,
			},
			textSearch: {
				type: 'string',
				description: 'Full-text search in properties and names',
			},
			limit: {
				type: 'number',
				description: 'Maximum number of results to return',
				minimum: 1,
				maximum: 1000,
			},
		},
		required: [],
	},
	handler: async (
		args: {
			searchType?: 'nodes' | 'edges' | 'both';
			nodeLabels?: string[];
			edgeTypes?: string[];
			labels?: string[]; // Legacy parameter
			properties?: Record<string, any>;
			textSearch?: string;
			limit?: number;
		},
		context?: InternalToolContext
	) => {
		try {
			logger.debug('SearchGraph: Processing search request', {
				searchType: args.searchType,
				hasNodeLabels: !!args.nodeLabels,
				hasEdgeTypes: !!args.edgeTypes,
				hasLegacyLabels: !!args.labels,
				hasProperties: !!args.properties,
				hasTextSearch: !!args.textSearch,
			});

			const searchType = args.searchType || 'both';
			const limit = args.limit !== undefined ? args.limit : 50;

			// Validate limit
			if (limit < 1 || limit > 1000) {
				return {
					success: false,
					message: 'Limit must be between 1 and 1000',
					results: null,
					timestamp: new Date().toISOString(),
				};
			}

			const kgManager = context?.services?.knowledgeGraphManager;
			if (!kgManager) {
				return {
					success: false,
					message: 'KnowledgeGraphManager not available in context.services',
					results: null,
					timestamp: new Date().toISOString(),
				};
			}

			const graph = kgManager.getGraph();
			if (!graph) {
				return {
					success: false,
					message: 'Knowledge graph backend is not connected',
					results: null,
					timestamp: new Date().toISOString(),
				};
			}

			// Support both new specific parameters and legacy labels parameter
			const nodeLabelsToUse = args.nodeLabels || (searchType === 'nodes' ? args.labels : undefined);
			const edgeTypesToUse = args.edgeTypes || (searchType === 'edges' ? args.labels : undefined);

			let nodes: GraphNode[] = [];
			let edges: GraphEdge[] = [];
			const startTime = Date.now();

			// Search nodes
			if (searchType === 'nodes' || searchType === 'both') {
				const nodeFilters = buildNodeFilters(args.properties, args.textSearch);
				nodes = await graph.findNodes(nodeFilters, nodeLabelsToUse, limit);

				logger.debug('SearchGraph: Found nodes', {
					count: nodes.length,
					labels: nodeLabelsToUse,
					filters: nodeFilters,
				});
			}

			// Search edges
			if (searchType === 'edges' || searchType === 'both') {
				const edgeFilters = buildEdgeFilters(args.properties, args.textSearch);

				// For edge search, we can search by multiple edge types
				if (edgeTypesToUse && edgeTypesToUse.length > 0) {
					// Search for each edge type separately and combine results
					const edgeResults = await Promise.all(
						edgeTypesToUse.map(edgeType =>
							graph.findEdges(edgeFilters, edgeType, Math.ceil(limit / edgeTypesToUse.length))
						)
					);
					edges = edgeResults.flat().slice(0, limit);
				} else {
					// Search all edge types
					edges = await graph.findEdges(edgeFilters, undefined, limit);
				}

				logger.debug('SearchGraph: Found edges', {
					count: edges.length,
					types: edgeTypesToUse,
					filters: edgeFilters,
				});
			}

			const executionTime = Date.now() - startTime;

			return {
				success: true,
				results: {
					nodes,
					edges,
					totalCount: nodes.length + edges.length,
					searchMetadata: {
						searchType,
						appliedFilters: {
							nodeLabels: nodeLabelsToUse || [],
							edgeTypes: edgeTypesToUse || [],
							legacyLabels: args.labels || [], // For backward compatibility tracking
							properties: args.properties || {},
							textSearch: args.textSearch,
						},
						limit,
						executionTime,
					},
				},
				message: `Search completed - found ${nodes.length} nodes and ${edges.length} edges`,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('SearchGraph: Search failed', {
				error: errorMessage,
				searchType: args.searchType,
				limit: args.limit,
			});

			return {
				success: false,
				message: `Search failed: ${errorMessage}`,
				results: {
					nodes: [],
					edges: [],
					totalCount: 0,
				},
				timestamp: new Date().toISOString(),
			};
		}
	},
};

/**
 * Build node filters from properties and text search
 */
function buildNodeFilters(
	properties?: Record<string, any>,
	textSearch?: string
): NodeFilters | undefined {
	const filters: NodeFilters = {};

	// Add property filters
	if (properties && Object.keys(properties).length > 0) {
		Object.assign(filters, properties);
	}

	// Add text search filters
	if (textSearch && textSearch.trim().length > 0) {
		// Add name filter for text search (most common property)
		filters.name = textSearch.trim();
	}

	return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Build edge filters from properties and text search
 */
function buildEdgeFilters(
	properties?: Record<string, any>,
	textSearch?: string
): EdgeFilters | undefined {
	const filters: EdgeFilters = {};

	// Add property filters
	if (properties && Object.keys(properties).length > 0) {
		Object.assign(filters, properties);
	}

	// Add text search filters for edges
	if (textSearch && textSearch.trim().length > 0) {
		// Search in common edge properties
		filters.description = textSearch.trim();
	}

	return Object.keys(filters).length > 0 ? filters : undefined;
}
