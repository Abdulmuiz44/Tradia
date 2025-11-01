/**
 * Get Neighbors Tool
 *
 * Finds neighboring nodes in the knowledge graph with direction and type filtering.
 * Supports filtering by edge types and limiting the number of results.
 */

import { InternalTool } from '../../types.js';

/**
 * Input schema for the get neighbors tool
 */
interface GetNeighborsInput {
	/** ID of the node to get neighbors for */
	nodeId: string;
	/** Direction of relationships ('in', 'out', 'both') */
	direction?: 'in' | 'out' | 'both';
	/** Optional edge types to filter by */
	edgeTypes?: string[];
	/** Maximum number of neighbors to return */
	limit?: number;
}

/**
 * Get neighbors of a node in the knowledge graph
 *
 * @param args - Search parameters
 * @param context - Execution context with services
 * @returns List of neighbor nodes with their connecting edges
 */
async function getNeighborsHandler(
	args: GetNeighborsInput,
	context?: any
): Promise<{ success: boolean; message: string; neighbors?: Array<{ node: any; edge: any }> }> {
	try {
		// Validate input
		if (!args.nodeId || typeof args.nodeId !== 'string') {
			return {
				success: false,
				message: 'Node ID must be a non-empty string',
			};
		}
		const direction = args.direction || 'both';
		const limit = args.limit || 10;
		const kgManager = context?.services?.knowledgeGraphManager;
		if (!kgManager) {
			return {
				success: false,
				message: 'KnowledgeGraphManager not available in context.services',
			};
		}
		const graph = kgManager.getGraph();
		if (!graph) {
			return {
				success: false,
				message: 'Knowledge graph backend is not connected',
			};
		}
		const neighbors = await graph.getNeighbors(args.nodeId, direction, args.edgeTypes, limit);
		return {
			success: true,
			message: 'Neighbors retrieved',
			neighbors,
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to get neighbors: ${(error as Error).message}`,
		};
	}
}

/**
 * Get Neighbors Tool Definition
 */
export const getNeighborsTool: InternalTool = {
	name: 'get_neighbors',
	description: 'Get neighboring nodes in the knowledge graph with optional filtering',
	category: 'knowledge_graph',
	internal: true,
	handler: getNeighborsHandler,
	parameters: {
		type: 'object',
		properties: {
			nodeId: {
				type: 'string',
				description: 'ID of the node to get neighbors for',
			},
			direction: {
				type: 'string',
				enum: ['in', 'out', 'both'],
				description: 'Direction of relationships to traverse',
				default: 'both',
			},
			edgeTypes: {
				type: 'array',
				items: { type: 'string' },
				description: 'Optional edge types to filter by (e.g., ["DEPENDS_ON", "CALLS"])',
			},
			limit: {
				type: 'number',
				description: 'Maximum number of neighbors to return',
				minimum: 1,
				maximum: 100,
				default: 10,
			},
		},
		required: ['nodeId'],
	},
};
