import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addNodeTool } from '../add-node.js';

const mockGraph = {
	addNode: vi.fn().mockResolvedValue(undefined),
	getNode: vi.fn().mockResolvedValue(null), // By default, node doesn't exist
};

const getContext = (opts: { withManager?: boolean; withGraph?: boolean } = {}) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;
	return {
		toolName: 'add_node',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			knowledgeGraphManager: kgManager as any,
		},
	};
};

describe('addNodeTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mocks to default states
		mockGraph.getNode.mockResolvedValue(null); // Node doesn't exist by default
		mockGraph.addNode.mockResolvedValue(undefined);
	});

	it('should add a node successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler(
			{
				id: 'node1',
				labels: ['Function', 'Code'],
				properties: { name: 'testFunction', language: 'typescript' },
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.nodeId).toBe('node1');
		expect(result.message).toContain("Node 'node1' added to knowledge graph");

		// Verify node existence was checked
		expect(mockGraph.getNode).toHaveBeenCalledWith('node1');

		// Verify node was added with correct parameters
		expect(mockGraph.addNode).toHaveBeenCalledWith({
			id: 'node1',
			labels: ['Function', 'Code'],
			properties: { name: 'testFunction', language: 'typescript' },
		});
	});

	it('should add a node without properties', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler({ id: 'node2', labels: ['Class'] }, context);

		expect(result.success).toBe(true);
		expect(mockGraph.addNode).toHaveBeenCalledWith({
			id: 'node2',
			labels: ['Class'],
			properties: {},
		});
	});

	it('should fail if id is missing or empty', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler({ id: '', labels: ['Test'], properties: {} }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node ID must be a non-empty string');
	});

	it('should fail if labels are missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler({ id: 'node3', labels: [], properties: {} }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node must have at least one label');
	});

	it('should fail if labels contain empty strings', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler(
			{ id: 'node4', labels: ['ValidLabel', '', 'AnotherLabel'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('All labels must be non-empty strings');
	});

	it('should fail if node already exists', async () => {
		// Mock getNode to return an existing node
		mockGraph.getNode.mockResolvedValue({
			id: 'existing-node',
			labels: ['ExistingClass'],
			properties: { name: 'existing' },
		});

		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler(
			{ id: 'existing-node', labels: ['NewClass'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain("Node 'existing-node' already exists in the knowledge graph");
		expect(result.nodeId).toBe('existing-node');

		// Verify addNode was not called
		expect(mockGraph.addNode).not.toHaveBeenCalled();
	});

	it('should fail if knowledgeGraphManager is missing', async () => {
		const context = getContext({ withManager: false });
		const result = await addNodeTool.handler(
			{ id: 'node5', labels: ['Test'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('KnowledgeGraphManager not available in context.services');
	});

	it('should fail if backend is not connected', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await addNodeTool.handler(
			{ id: 'node6', labels: ['Test'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Knowledge graph backend is not connected');
	});

	it('should handle backend error during node existence check', async () => {
		const errorGraph = {
			getNode: vi.fn().mockRejectedValue(new Error('Database connection failed')),
			addNode: vi.fn().mockResolvedValue(undefined),
		};
		const context = {
			toolName: 'add_node',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await addNodeTool.handler(
			{ id: 'node7', labels: ['Test'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Database connection failed');
	});

	it('should handle backend error during node creation', async () => {
		const errorGraph = {
			getNode: vi.fn().mockResolvedValue(null),
			addNode: vi.fn().mockRejectedValue(new Error('Node creation failed')),
		};
		const context = {
			toolName: 'add_node',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await addNodeTool.handler(
			{ id: 'node8', labels: ['Test'], properties: {} },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Node creation failed');
	});

	it('should trim whitespace from id and labels', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await addNodeTool.handler(
			{
				id: '  node9  ',
				labels: ['  Function  ', '  Code  '],
				properties: { name: 'test' },
			},
			context
		);

		expect(result.success).toBe(true);

		// Verify trimmed values were used
		expect(mockGraph.getNode).toHaveBeenCalledWith('node9');
		expect(mockGraph.addNode).toHaveBeenCalledWith({
			id: 'node9',
			labels: ['Function', 'Code'],
			properties: { name: 'test' },
		});
	});
});
