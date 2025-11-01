import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteNodeTool } from '../delete-node.js';

const mockExistingNode = {
	id: 'existing-node',
	labels: ['TestClass'],
	properties: { name: 'test' },
};

const mockGraph = {
	deleteNode: vi.fn().mockResolvedValue(undefined),
	getNode: vi.fn().mockResolvedValue(mockExistingNode), // By default, node exists
};

const getContext = (opts: { withManager?: boolean; withGraph?: boolean } = {}) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;
	return {
		toolName: 'delete_node',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			knowledgeGraphManager: kgManager as any,
		},
	} as any;
};

describe('deleteNodeTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mocks to default states
		mockGraph.getNode.mockResolvedValue(mockExistingNode); // Node exists by default
		mockGraph.deleteNode.mockResolvedValue(undefined);
	});

	it('should delete an existing node successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await deleteNodeTool.handler({ id: 'existing-node' }, context);

		expect(result.success).toBe(true);
		expect(result.nodeId).toBe('existing-node');
		expect(result.message).toContain('Node deleted from knowledge graph');

		// Verify node existence was checked
		expect(mockGraph.getNode).toHaveBeenCalledWith('existing-node');

		// Verify node was deleted
		expect(mockGraph.deleteNode).toHaveBeenCalledWith('existing-node');
	});

	it('should succeed when trying to delete non-existent node (idempotent)', async () => {
		// Mock getNode to return null (node doesn't exist)
		mockGraph.getNode.mockResolvedValue(null);

		const context = getContext({ withManager: true, withGraph: true });
		const result = await deleteNodeTool.handler({ id: 'nonexistent-node' }, context);

		expect(result.success).toBe(true);
		expect(result.nodeId).toBe('nonexistent-node');
		expect(result.message).toContain(
			"Node 'nonexistent-node' does not exist (already deleted or never existed)"
		);

		// Verify node existence was checked
		expect(mockGraph.getNode).toHaveBeenCalledWith('nonexistent-node');

		// Verify deleteNode was not called since node doesn't exist
		expect(mockGraph.deleteNode).not.toHaveBeenCalled();
	});

	it('should fail if id is missing or empty', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await deleteNodeTool.handler({ id: '' }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node ID must be a non-empty string');
	});

	it('should fail if knowledgeGraphManager is missing', async () => {
		const context = getContext({ withManager: false });
		const result = await deleteNodeTool.handler({ id: 'node1' }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('KnowledgeGraphManager not available in context.services');
		expect(result.nodeId).toBe('node1');
	});

	it('should fail if backend is not connected', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await deleteNodeTool.handler({ id: 'node2' }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Knowledge graph backend is not connected');
		expect(result.nodeId).toBe('node2');
	});

	it('should handle backend error during node existence check', async () => {
		const errorGraph = {
			getNode: vi.fn().mockRejectedValue(new Error('Database connection failed')),
			deleteNode: vi.fn().mockResolvedValue(undefined),
		};
		const context = {
			toolName: 'delete_node',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await deleteNodeTool.handler({ id: 'node3' }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Database connection failed');
	});

	it('should handle backend error during deletion', async () => {
		const errorGraph = {
			getNode: vi.fn().mockResolvedValue(mockExistingNode),
			deleteNode: vi.fn().mockRejectedValue(new Error('Deletion failed')),
		};
		const context = {
			toolName: 'delete_node',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await deleteNodeTool.handler({ id: 'node4' }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Deletion failed');
	});

	it('should trim whitespace from node id', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await deleteNodeTool.handler({ id: '  existing-node  ' }, context);

		expect(result.success).toBe(true);

		// Verify trimmed value was used
		expect(mockGraph.getNode).toHaveBeenCalledWith('existing-node');
		expect(mockGraph.deleteNode).toHaveBeenCalledWith('existing-node');
	});
});
