/**
 * Knowledge Graph Add Edge Tool
 *
 * Tool for adding edges (relationships) between nodes in the knowledge graph.
 * Validates that source and target nodes exist before creating relationships.
 */

import type { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';

/**
 * Input schema for the add edge tool
 */
interface AddEdgeInput {
	/** ID of the source node */
	sourceId: string;
	/** ID of the target node */
	targetId: string;
	/** Type/label of the relationship */
	edgeType: string;
	/** Optional properties for the edge */
	properties?: Record<string, any>;
}

/**
 * Add an edge to the knowledge graph
 *
 * @param args - Edge data including source, target, type, and properties
 * @param context - Execution context with services
 * @returns Success message or error details
 */
async function addEdgeHandler(
	args: AddEdgeInput,
	context?: InternalToolContext
): Promise<{ success: boolean; message: string; edgeId?: string; timestamp: string }> {
	try {
		logger.info('AddEdge: Processing add edge request', {
			sourceId: args.sourceId,
			targetId: args.targetId,
			edgeType: args.edgeType,
			hasProperties: !!args.properties,
			propertiesCount: args.properties ? Object.keys(args.properties).length : 0,
		});

		// Validate input
		if (!args.sourceId || typeof args.sourceId !== 'string' || args.sourceId.trim().length === 0) {
			return {
				success: false,
				message: 'Source node ID must be a non-empty string',
				timestamp: new Date().toISOString(),
			};
		}

		if (!args.targetId || typeof args.targetId !== 'string' || args.targetId.trim().length === 0) {
			return {
				success: false,
				message: 'Target node ID must be a non-empty string',
				timestamp: new Date().toISOString(),
			};
		}

		if (!args.edgeType || typeof args.edgeType !== 'string' || args.edgeType.trim().length === 0) {
			return {
				success: false,
				message: 'Edge type must be a non-empty string',
				timestamp: new Date().toISOString(),
			};
		}

		const kgManager = context?.services?.knowledgeGraphManager;
		if (!kgManager) {
			return {
				success: false,
				message: 'KnowledgeGraphManager not available in context.services',
				timestamp: new Date().toISOString(),
			};
		}

		const graph = kgManager.getGraph();
		if (!graph) {
			return {
				success: false,
				message: 'Knowledge graph backend is not connected',
				timestamp: new Date().toISOString(),
			};
		}

		// Verify that source and target nodes exist
		const sourceNode = await graph.getNode(args.sourceId.trim());
		if (!sourceNode) {
			return {
				success: false,
				message: `Source node '${args.sourceId}' does not exist in the knowledge graph`,
				timestamp: new Date().toISOString(),
			};
		}

		const targetNode = await graph.getNode(args.targetId.trim());
		if (!targetNode) {
			return {
				success: false,
				message: `Target node '${args.targetId}' does not exist in the knowledge graph`,
				timestamp: new Date().toISOString(),
			};
		}

		// Add the edge
		const edgeId = `edge_${args.sourceId.trim()}_${args.targetId.trim()}_${args.edgeType.trim()}_${Date.now()}`;
		await graph.addEdge({
			id: edgeId,
			type: args.edgeType.trim(),
			startNodeId: args.sourceId.trim(),
			endNodeId: args.targetId.trim(),
			properties: args.properties || {},
		});

		logger.info('AddEdge: Edge added successfully', {
			edgeId,
			sourceId: args.sourceId,
			targetId: args.targetId,
			edgeType: args.edgeType,
			properties: args.properties ? Object.keys(args.properties) : [],
		});

		return {
			success: true,
			message: `Edge '${args.edgeType}' added between '${args.sourceId}' and '${args.targetId}'`,
			edgeId,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('AddEdge: Failed to add edge', {
			error: errorMessage,
			sourceId: args.sourceId,
			targetId: args.targetId,
			edgeType: args.edgeType,
		});

		return {
			success: false,
			message: `Failed to add edge: ${errorMessage}`,
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Add Edge Tool Definition
 */
export const addEdgeTool: InternalTool = {
	name: 'add_edge',
	description: 'Add an edge (relationship) between two nodes in the knowledge graph',
	category: 'knowledge_graph',
	internal: true,
	version: '1.0.0',
	handler: addEdgeHandler,
	parameters: {
		type: 'object',
		properties: {
			sourceId: {
				type: 'string',
				description: 'ID of the source node',
			},
			targetId: {
				type: 'string',
				description: 'ID of the target node',
			},
			edgeType: {
				type: 'string',
				description: 'Type/label of the relationship (e.g., "CALLS", "IMPORTS", "DEPENDS_ON")',
			},
			properties: {
				type: 'object',
				description: 'Optional properties for the edge',
				additionalProperties: true,
			},
		},
		required: ['sourceId', 'targetId', 'edgeType'],
	},
};
