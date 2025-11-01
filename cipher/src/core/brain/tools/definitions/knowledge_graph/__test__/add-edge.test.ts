import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addEdgeTool } from '../add-edge.js';

const mockNode = {
	id: 'test-node',
	labels: ['TestLabel'],
	properties: { name: 'test' },
};

const mockGraph = {
	addEdge: vi.fn().mockResolvedValue('test-edge-id'),
	getNode: vi.fn().mockResolvedValue(mockNode),
};

const getContext = (opts: { withManager?: boolean; withGraph?: boolean } = {}) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;
	return {
		toolName: 'add_edge',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			knowledgeGraphManager: kgManager as any,
		},
	} as any;
};

describe('addEdgeTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mocks to successful responses
		mockGraph.getNode.mockResolvedValue(mockNode);
		mockGraph.addEdge.mockResolvedValue('test-edge-id');
	});

	it('should add an edge successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{
				sourceId: 'node1',
				targetId: 'node2',
				edgeType: 'DEPENDS_ON',
				properties: { strength: 0.9 },
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.edgeId).toMatch(/^edge_node1_node2_DEPENDS_ON_\d+$/);
		expect(result.message).toContain("Edge 'DEPENDS_ON' added between 'node1' and 'node2'");

		// Verify source and target nodes were checked
		expect(mockGraph.getNode).toHaveBeenCalledWith('node1');
		expect(mockGraph.getNode).toHaveBeenCalledWith('node2');

		// Verify edge was added with correct GraphEdge interface
		expect(mockGraph.addEdge).toHaveBeenCalledWith({
			id: expect.stringMatching(/^edge_node1_node2_DEPENDS_ON_\d+$/),
			type: 'DEPENDS_ON',
			startNodeId: 'node1',
			endNodeId: 'node2',
			properties: { strength: 0.9 },
		});
	});

	it('should add an edge without properties', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{
				sourceId: 'node1',
				targetId: 'node2',
				edgeType: 'CALLS',
			},
			context
		);

		expect(result.success).toBe(true);
		expect(mockGraph.addEdge).toHaveBeenCalledWith({
			id: expect.stringMatching(/^edge_node1_node2_CALLS_\d+$/),
			type: 'CALLS',
			startNodeId: 'node1',
			endNodeId: 'node2',
			properties: {},
		});
	});

	it('should fail if sourceId is missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{ sourceId: '', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Source node ID must be a non-empty string');
	});

	it('should fail if targetId is missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: '', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Target node ID must be a non-empty string');
	});

	it('should fail if edgeType is missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'node2', edgeType: '' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Edge type must be a non-empty string');
	});

	it('should fail if source node does not exist', async () => {
		// Mock getNode to return null for the source node
		mockGraph.getNode.mockImplementation((nodeId: string) => {
			if (nodeId === 'nonexistent') return Promise.resolve(null);
			return Promise.resolve(mockNode);
		});

		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{ sourceId: 'nonexistent', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain("Source node 'nonexistent' does not exist");
	});

	it('should fail if target node does not exist', async () => {
		// Mock getNode to return null for the target node
		mockGraph.getNode.mockImplementation((nodeId: string) => {
			if (nodeId === 'nonexistent') return Promise.resolve(null);
			return Promise.resolve(mockNode);
		});

		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'nonexistent', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain("Target node 'nonexistent' does not exist");
	});

	it('should fail if knowledgeGraphManager is missing', async () => {
		const context = getContext({ withManager: false });
		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('KnowledgeGraphManager not available in context.services');
	});

	it('should fail if backend is not connected', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Knowledge graph backend is not connected');
	});

	it('should handle backend error during node validation', async () => {
		const errorGraph = {
			getNode: vi.fn().mockRejectedValue(new Error('Node validation failed')),
			addEdge: vi.fn().mockResolvedValue('test-edge-id'),
		};
		const context = {
			toolName: 'add_edge',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node validation failed');
	});

	it('should handle backend error during edge creation', async () => {
		const errorGraph = {
			getNode: vi.fn().mockResolvedValue(mockNode),
			addEdge: vi.fn().mockRejectedValue(new Error('Edge creation failed')),
		};
		const context = {
			toolName: 'add_edge',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await addEdgeTool.handler(
			{ sourceId: 'node1', targetId: 'node2', edgeType: 'DEPENDS_ON' },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Edge creation failed');
	});

	it('should trim whitespace from input parameters', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addEdgeTool.handler(
			{
				sourceId: '  node1  ',
				targetId: '  node2  ',
				edgeType: '  DEPENDS_ON  ',
			},
			context
		);

		expect(result.success).toBe(true);

		// Verify trimmed values were used
		expect(mockGraph.getNode).toHaveBeenCalledWith('node1');
		expect(mockGraph.getNode).toHaveBeenCalledWith('node2');
		expect(mockGraph.addEdge).toHaveBeenCalledWith({
			id: expect.stringMatching(/^edge_node1_node2_DEPENDS_ON_\d+$/),
			type: 'DEPENDS_ON',
			startNodeId: 'node1',
			endNodeId: 'node2',
			properties: {},
		});
	});
});
