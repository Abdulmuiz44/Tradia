/**
 * Knowledge Graph Add Node Tool
 *
 * Tool for adding nodes to the knowledge graph.
 * Validates input data and adds nodes with proper labels and properties.
 */

import type { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';

/**
 * Input schema for the add node tool
 */
interface AddNodeInput {
	/** Unique identifier for the node */
	id: string;
	/** Array of labels/types for the node */
	labels: string[];
	/** Properties/attributes of the node */
	properties?: Record<string, any>;
}

/**
 * Add a node to the knowledge graph
 *
 * @param args - Node data including id, labels, and properties
 * @param context - Execution context with services
 * @returns Success message or error details
 */
async function addNodeHandler(
	args: AddNodeInput,
	context?: InternalToolContext
): Promise<{ success: boolean; message: string; nodeId?: string; timestamp: string }> {
	try {
		logger.info('AddNode: Processing add node request', {
			nodeId: args.id,
			labels: args.labels,
			hasProperties: !!args.properties,
			propertiesCount: args.properties ? Object.keys(args.properties).length : 0,
		});

		// Validate input
		if (!args.id || typeof args.id !== 'string' || args.id.trim().length === 0) {
			return {
				success: false,
				message: 'Node ID must be a non-empty string',
				timestamp: new Date().toISOString(),
			};
		}

		if (!Array.isArray(args.labels) || args.labels.length === 0) {
			return {
				success: false,
				message: 'Node must have at least one label',
				timestamp: new Date().toISOString(),
			};
		}

		// Validate labels are non-empty strings
		const invalidLabels = args.labels.filter(
			label => !label || typeof label !== 'string' || label.trim().length === 0
		);
		if (invalidLabels.length > 0) {
			return {
				success: false,
				message: 'All labels must be non-empty strings',
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

		// Check if node already exists
		const existingNode = await graph.getNode(args.id.trim());
		if (existingNode) {
			logger.warn('AddNode: Attempting to add node that already exists', {
				nodeId: args.id,
				existingLabels: existingNode.labels,
			});
			return {
				success: false,
				message: `Node '${args.id}' already exists in the knowledge graph`,
				nodeId: args.id,
				timestamp: new Date().toISOString(),
			};
		}

		// Add the node
		await graph.addNode({
			id: args.id.trim(),
			labels: args.labels.map(label => label.trim()),
			properties: args.properties || {},
		});

		logger.info('AddNode: Node added successfully', {
			nodeId: args.id,
			labels: args.labels,
			properties: args.properties ? Object.keys(args.properties) : [],
		});

		return {
			success: true,
			message: `Node '${args.id}' added to knowledge graph`,
			nodeId: args.id,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('AddNode: Failed to add node', {
			error: errorMessage,
			nodeId: args.id,
			labels: args.labels,
		});

		return {
			success: false,
			message: `Failed to add node: ${errorMessage}`,
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Add Node Tool Definition
 */
export const addNodeTool: InternalTool = {
	name: 'add_node',
	description: 'Add a node to the knowledge graph with labels and properties',
	category: 'knowledge_graph',
	internal: true,
	version: '1.0.0',
	handler: addNodeHandler,
	parameters: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'Unique identifier for the node',
			},
			labels: {
				type: 'array',
				items: { type: 'string' },
				description: 'Array of labels/types for the node (e.g., ["Function", "Code"])',
				minItems: 1,
			},
			properties: {
				type: 'object',
				description: 'Optional properties/attributes for the node',
				additionalProperties: true,
			},
		},
		required: ['id', 'labels'],
	},
};
