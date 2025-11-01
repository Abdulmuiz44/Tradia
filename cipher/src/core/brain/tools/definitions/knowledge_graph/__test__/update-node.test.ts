import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateNodeTool } from '../update-node.js';

const mockGraph = {
	updateNode: vi.fn().mockResolvedValue(undefined),
};

const getContext = (opts: { withManager?: boolean; withGraph?: boolean } = {}) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;
	return {
		toolName: 'update_node',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			knowledgeGraphManager: kgManager as any,
		},
	} as any;
};

describe('updateNodeTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGraph.updateNode.mockResolvedValue(undefined);
	});

	it('should update a node successfully with properties and labels', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{
				nodeId: 'node1',
				properties: { name: 'updated', version: '2.0' },
				labels: ['Function', 'Updated'],
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.nodeId).toBe('node1');
		expect(result.message).toContain("Node 'node1' updated in knowledge graph");
		expect(mockGraph.updateNode).toHaveBeenCalledWith(
			'node1',
			{ name: 'updated', version: '2.0' },
			['Function', 'Updated']
		);
	});

	it('should update a node successfully with only properties', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{
				nodeId: 'node2',
				properties: { description: 'updated description', lastModified: Date.now() },
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.nodeId).toBe('node2');
		expect(result.message).toContain("Node 'node2' updated in knowledge graph");
		expect(mockGraph.updateNode).toHaveBeenCalledWith(
			'node2',
			{ description: 'updated description', lastModified: expect.any(Number) },
			undefined
		);
	});

	it('should fail if nodeId is missing or empty', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{ nodeId: '', properties: { name: 'test' } },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node ID must be a non-empty string');
	});

	it('should fail if properties are missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{ nodeId: 'node3', properties: undefined as any },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Properties must be provided as a non-empty object');
	});

	it('should fail if properties are empty object', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler({ nodeId: 'node4', properties: {} }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Properties must be provided as a non-empty object');
	});

	it('should fail if labels are provided as empty array', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{
				nodeId: 'node5',
				properties: { name: 'test' },
				labels: [],
			},
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Labels must be a non-empty array when provided');
	});

	it('should fail if knowledgeGraphManager is missing', async () => {
		const context = getContext({ withManager: false });
		const result = await updateNodeTool.handler(
			{ nodeId: 'node6', properties: { name: 'test' } },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('KnowledgeGraphManager not available in context.services');
	});

	it('should fail if backend is not connected', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await updateNodeTool.handler(
			{ nodeId: 'node7', properties: { name: 'test' } },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Knowledge graph backend is not connected');
	});

	it('should handle backend error', async () => {
		const errorGraph = {
			updateNode: vi.fn().mockRejectedValue(new Error('Update operation failed')),
		};
		const context = {
			toolName: 'update_node',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await updateNodeTool.handler(
			{ nodeId: 'node8', properties: { name: 'test' } },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Update operation failed');
	});

	it('should trim whitespace from nodeId', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await updateNodeTool.handler(
			{
				nodeId: '  node9  ',
				properties: { name: 'trimmed' },
			},
			context
		);

		expect(result.success).toBe(true);

		// Verify trimmed value was used
		expect(mockGraph.updateNode).toHaveBeenCalledWith('node9', { name: 'trimmed' }, undefined);
	});

	it('should handle complex property updates', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const complexProperties = {
			metadata: {
				created: '2023-01-01',
				updated: '2023-12-01',
				version: 2,
			},
			tags: ['important', 'updated'],
			settings: {
				enabled: true,
				priority: 'high',
			},
		};

		const result = await updateNodeTool.handler(
			{
				nodeId: 'complex-node',
				properties: complexProperties,
				labels: ['ComplexNode', 'Updated'],
			},
			context
		);

		expect(result.success).toBe(true);
		expect(mockGraph.updateNode).toHaveBeenCalledWith('complex-node', complexProperties, [
			'ComplexNode',
			'Updated',
		]);
	});
});
