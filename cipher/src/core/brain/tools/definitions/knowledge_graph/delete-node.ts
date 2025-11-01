/**
 * Delete Node Tool
 *
 * Deletes a node and its relationships from the knowledge graph.
 */

import { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';

export const deleteNodeTool: InternalTool = {
	name: 'delete_node',
	category: 'knowledge_graph',
	internal: true,
	description: 'Delete a node and its relationships from the knowledge graph.',
	version: '1.0.0',
	parameters: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'Node ID to delete',
			},
		},
		required: ['id'],
	},
	handler: async (
		args: { id: string },
		context?: InternalToolContext
	): Promise<{
		success: boolean;
		message: string;
		nodeId?: string;
		timestamp: string;
	}> => {
		try {
			logger.info('DeleteNode: Processing delete request', {
				nodeId: args.id,
			});

			// Validate input
			if (!args.id || typeof args.id !== 'string' || args.id.trim().length === 0) {
				return {
					success: false,
					message: 'Node ID must be a non-empty string',
					timestamp: new Date().toISOString(),
				};
			}

			const kgManager = context?.services?.knowledgeGraphManager;
			if (!kgManager) {
				return {
					success: false,
					message: 'KnowledgeGraphManager not available in context.services',
					nodeId: args.id,
					timestamp: new Date().toISOString(),
				};
			}

			const graph = kgManager.getGraph();
			if (!graph) {
				return {
					success: false,
					message: 'Knowledge graph backend is not connected',
					nodeId: args.id,
					timestamp: new Date().toISOString(),
				};
			}

			// Check if node exists before deletion (optional, but provides better error messages)
			const existingNode = await graph.getNode(args.id.trim());
			if (!existingNode) {
				logger.warn('DeleteNode: Attempting to delete non-existent node', {
					nodeId: args.id,
				});
				// Still return success since the desired state (node not existing) is achieved
				return {
					success: true,
					message: `Node '${args.id}' does not exist (already deleted or never existed)`,
					nodeId: args.id,
					timestamp: new Date().toISOString(),
				};
			}

			// Perform deletion
			await graph.deleteNode(args.id.trim());

			logger.info('DeleteNode: Node deleted successfully', {
				nodeId: args.id,
				nodeLabels: existingNode.labels,
			});

			return {
				success: true,
				nodeId: args.id,
				message: 'Node deleted from knowledge graph',
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('DeleteNode: Failed to delete node', {
				error: errorMessage,
				nodeId: args.id,
			});

			return {
				success: false,
				nodeId: args.id,
				message: `Failed to delete node: ${errorMessage}`,
				timestamp: new Date().toISOString(),
			};
		}
	},
};
