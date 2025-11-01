/**
 * Knowledge Graph Update Node Tool
 *
 * Tool for updating existing nodes in the knowledge graph.
 * Allows updating properties and optionally labels.
 */

import type { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';

/**
 * Input schema for the update node tool
 */
interface UpdateNodeInput {
	/** ID of the node to update */
	nodeId: string;
	/** Properties to update (merged with existing) */
	properties: Record<string, any>;
	/** Optional new labels to set */
	labels?: string[];
}

/**
 * Update a node in the knowledge graph
 *
 * @param args - Update parameters
 * @param context - Execution context with services
 * @returns Success message or error details
 */
async function updateNodeHandler(
	args: UpdateNodeInput,
	context?: InternalToolContext
): Promise<{ success: boolean; message: string; nodeId?: string; timestamp: string }> {
	try {
		logger.info('UpdateNode: Processing update request', {
			nodeId: args.nodeId,
			hasProperties: !!args.properties,
			propertiesCount: args.properties ? Object.keys(args.properties).length : 0,
			hasLabels: !!args.labels,
			labelsCount: args.labels ? args.labels.length : 0,
		});

		// Validate input
		if (!args.nodeId || typeof args.nodeId !== 'string' || args.nodeId.trim().length === 0) {
			return {
				success: false,
				message: 'Node ID must be a non-empty string',
				timestamp: new Date().toISOString(),
			};
		}

		if (
			!args.properties ||
			typeof args.properties !== 'object' ||
			Object.keys(args.properties).length === 0
		) {
			return {
				success: false,
				message: 'Properties must be provided as a non-empty object',
				timestamp: new Date().toISOString(),
			};
		}

		// Validate labels if provided
		if (args.labels && (!Array.isArray(args.labels) || args.labels.length === 0)) {
			return {
				success: false,
				message: 'Labels must be a non-empty array when provided',
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

		await graph.updateNode(args.nodeId.trim(), args.properties, args.labels);

		logger.info('UpdateNode: Node updated successfully', {
			nodeId: args.nodeId,
			updatedProperties: Object.keys(args.properties),
			updatedLabels: args.labels,
		});

		return {
			success: true,
			message: `Node '${args.nodeId}' updated in knowledge graph`,
			nodeId: args.nodeId,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('UpdateNode: Failed to update node', {
			error: errorMessage,
			nodeId: args.nodeId,
			properties: args.properties ? Object.keys(args.properties) : [],
		});

		return {
			success: false,
			message: `Failed to update node: ${errorMessage}`,
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Update Node Tool Definition
 */
export const updateNodeTool: InternalTool = {
	name: 'update_node',
	description: 'Update an existing node in the knowledge graph',
	category: 'knowledge_graph',
	internal: true,
	version: '1.0.0',
	handler: updateNodeHandler,
	parameters: {
		type: 'object',
		properties: {
			nodeId: {
				type: 'string',
				description: 'ID of the node to update',
			},
			properties: {
				type: 'object',
				description: 'Properties to update (will be merged with existing properties)',
				additionalProperties: true,
			},
			labels: {
				type: 'array',
				items: { type: 'string' },
				description: 'Optional new labels to set for the node',
			},
		},
		required: ['nodeId', 'properties'],
	},
};
