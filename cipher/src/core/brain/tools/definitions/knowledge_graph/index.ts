/**
 * Knowledge Graph Tools Module
 *
 * This module exports all knowledge graph-related internal tools for the Cipher agent.
 * These tools handle graph operations, entity management, and knowledge graph queries.
 */

import type { InternalToolSet } from '../../types.js';

// Export all knowledge graph tools with dynamic imports
export { addNodeTool } from './add-node.js';
export { addEdgeTool } from './add-edge.js';
export { searchGraphTool } from './search-graph.js';
export { getNeighborsTool } from './get-neighbors.js';
export { extractEntitiesTool } from './extract-entities.js';
export { updateNodeTool } from './update-node.js';
export { deleteNodeTool } from './delete-node.js';
export { queryGraphTool } from './query-graph.js';

// Export new intelligent knowledge graph tools
export { intelligentProcessorTool } from './intelligent-processor.js';
export { enhancedSearchTool } from './enhanced-search.js';
export { relationshipManagerTool } from './relationship-manager.js';

/**
 * Get all knowledge graph tools as a tool set
 */
export async function getKnowledgeGraphTools(): Promise<InternalToolSet> {
	const [
		{ addNodeTool },
		{ addEdgeTool },
		{ searchGraphTool },
		{ getNeighborsTool },
		{ extractEntitiesTool },
		{ updateNodeTool },
		{ deleteNodeTool },
		{ queryGraphTool },
		{ intelligentProcessorTool },
		{ enhancedSearchTool },
		{ relationshipManagerTool },
	] = await Promise.all([
		import('./add-node.js'),
		import('./add-edge.js'),
		import('./search-graph.js'),
		import('./get-neighbors.js'),
		import('./extract-entities.js'),
		import('./update-node.js'),
		import('./delete-node.js'),
		import('./query-graph.js'),
		import('./intelligent-processor.js'),
		import('./enhanced-search.js'),
		import('./relationship-manager.js'),
	]);

	return {
		[addNodeTool.name]: addNodeTool,
		[addEdgeTool.name]: addEdgeTool,
		[searchGraphTool.name]: searchGraphTool,
		[getNeighborsTool.name]: getNeighborsTool,
		[extractEntitiesTool.name]: extractEntitiesTool,
		[updateNodeTool.name]: updateNodeTool,
		[deleteNodeTool.name]: deleteNodeTool,
		[queryGraphTool.name]: queryGraphTool,
		[intelligentProcessorTool.name]: intelligentProcessorTool,
		[enhancedSearchTool.name]: enhancedSearchTool,
		[relationshipManagerTool.name]: relationshipManagerTool,
	};
}
