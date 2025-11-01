import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchGraphTool } from '../search-graph.js';

const mockNodes = [
	{ id: 'node1', labels: ['Function'], properties: { name: 'testFunction' } },
	{ id: 'node2', labels: ['Class'], properties: { name: 'TestClass' } },
];

const mockEdges = [
	{
		id: 'edge1',
		type: 'DEPENDS_ON',
		startNodeId: 'node1',
		endNodeId: 'node2',
		properties: { strength: 0.8 },
	},
];

const mockGraph = {
	findNodes: vi.fn().mockResolvedValue(mockNodes),
	findEdges: vi.fn().mockResolvedValue(mockEdges),
};

const getContext = (opts: { withManager?: boolean; withGraph?: boolean } = {}) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;
	return {
		toolName: 'search_graph',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			knowledgeGraphManager: kgManager as any,
		},
	} as any;
};

describe('searchGraphTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGraph.findNodes.mockResolvedValue(mockNodes);
		mockGraph.findEdges.mockResolvedValue(mockEdges);
	});

	it('should search both nodes and edges successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'both',
				nodeLabels: ['Function'],
				edgeTypes: ['DEPENDS_ON'],
				properties: { name: 'test' },
				limit: 10,
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Search completed - found 2 nodes and 1 edges');
		expect(result.results.nodes).toEqual(mockNodes);
		expect(result.results.edges).toEqual(mockEdges);
		expect(result.results.totalCount).toBe(3);
		expect(result.results.searchMetadata).toBeDefined();
		expect(result.results.searchMetadata.appliedFilters.nodeLabels).toEqual(['Function']);
		expect(result.results.searchMetadata.appliedFilters.edgeTypes).toEqual(['DEPENDS_ON']);

		expect(mockGraph.findNodes).toHaveBeenCalledWith({ name: 'test' }, ['Function'], 10);
		expect(mockGraph.findEdges).toHaveBeenCalledWith({ name: 'test' }, 'DEPENDS_ON', 10);
	});

	it('should search only nodes successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'nodes',
				nodeLabels: ['Function', 'Class'],
				properties: { language: 'typescript' },
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.results.nodes).toEqual(mockNodes);
		expect(result.results.edges).toEqual([]);
		expect(result.results.searchMetadata.searchType).toBe('nodes');

		expect(mockGraph.findNodes).toHaveBeenCalledWith(
			{ language: 'typescript' },
			['Function', 'Class'],
			50
		);
		expect(mockGraph.findEdges).not.toHaveBeenCalled();
	});

	it('should search only edges successfully', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'edges',
				edgeTypes: ['DEPENDS_ON', 'CALLS'],
				properties: { strength: { gte: 0.5 } },
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.results.nodes).toEqual([]);
		// When searching multiple edge types, results are flattened and may contain duplicates
		expect(result.results.edges).toEqual([mockEdges[0], mockEdges[0]]); // Duplicated because searched twice
		expect(result.results.searchMetadata.searchType).toBe('edges');

		expect(mockGraph.findNodes).not.toHaveBeenCalled();
		expect(mockGraph.findEdges).toHaveBeenCalled();
	});

	it('should support legacy labels parameter for nodes', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'nodes',
				labels: ['Function', 'Class'], // Legacy parameter
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.results.searchMetadata.appliedFilters.nodeLabels).toEqual(['Function', 'Class']);
		expect(result.results.searchMetadata.appliedFilters.legacyLabels).toEqual([
			'Function',
			'Class',
		]);

		expect(mockGraph.findNodes).toHaveBeenCalledWith(undefined, ['Function', 'Class'], 50);
	});

	it('should support legacy labels parameter for edges', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'edges',
				labels: ['DEPENDS_ON'], // Legacy parameter
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.results.searchMetadata.appliedFilters.edgeTypes).toEqual(['DEPENDS_ON']);
		expect(result.results.searchMetadata.appliedFilters.legacyLabels).toEqual(['DEPENDS_ON']);

		expect(mockGraph.findEdges).toHaveBeenCalled();
	});

	it('should handle text search for nodes', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'nodes',
				textSearch: 'testFunction',
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.results.searchMetadata.appliedFilters.textSearch).toBe('testFunction');

		// Text search should be converted to name filter for nodes
		expect(mockGraph.findNodes).toHaveBeenCalledWith({ name: 'testFunction' }, undefined, 50);
	});

	it('should handle text search for edges', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'edges',
				textSearch: 'dependency',
			},
			context
		);

		expect(result.success).toBe(true);

		// Text search should be converted to description filter for edges
		expect(mockGraph.findEdges).toHaveBeenCalledWith({ description: 'dependency' }, undefined, 50);
	});

	it('should use default searchType and limit', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler({}, context);

		expect(result.success).toBe(true);
		expect(result.results.searchMetadata.searchType).toBe('both');
		expect(result.results.searchMetadata.limit).toBe(50);
	});

	it('should fail if limit is out of range (too low)', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler({ searchType: 'nodes', limit: 0 }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Limit must be between 1 and 1000');
	});

	it('should fail if limit is out of range (too high)', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler({ searchType: 'nodes', limit: 1001 }, context);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Limit must be between 1 and 1000');
	});

	it('should fail if knowledgeGraphManager is missing', async () => {
		const context = getContext({ withManager: false });
		const result = await searchGraphTool.handler(
			{ searchType: 'nodes', nodeLabels: ['Test'] },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('KnowledgeGraphManager not available in context.services');
		expect(result.results).toBeNull();
	});

	it('should fail if backend is not connected', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await searchGraphTool.handler(
			{ searchType: 'edges', edgeTypes: ['Test'] },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Knowledge graph backend is not connected');
		expect(result.results).toBeNull();
	});

	it('should handle backend error during search', async () => {
		const errorGraph = {
			findNodes: vi.fn().mockRejectedValue(new Error('Search operation failed')),
			findEdges: vi.fn().mockRejectedValue(new Error('Search operation failed')),
		};
		const context = {
			toolName: 'search_graph',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: { knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any },
		};

		const result = await searchGraphTool.handler(
			{ searchType: 'nodes', nodeLabels: ['Test'] },
			context
		);

		expect(result.success).toBe(false);
		expect(result.message).toContain('Search operation failed');
		expect(result.results.nodes).toEqual([]);
		expect(result.results.edges).toEqual([]);
		expect(result.results.totalCount).toBe(0);
	});

	it('should handle multiple edge types search', async () => {
		// Mock different results for different edge types
		mockGraph.findEdges.mockImplementation((filters, edgeType) => {
			if (edgeType === 'DEPENDS_ON') return Promise.resolve([mockEdges[0]]);
			if (edgeType === 'CALLS') return Promise.resolve([]);
			return Promise.resolve(mockEdges);
		});

		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'edges',
				edgeTypes: ['DEPENDS_ON', 'CALLS'],
				limit: 20,
			},
			context
		);

		expect(result.success).toBe(true);
		expect(mockGraph.findEdges).toHaveBeenCalledTimes(2);
		expect(mockGraph.findEdges).toHaveBeenCalledWith(undefined, 'DEPENDS_ON', 10);
		expect(mockGraph.findEdges).toHaveBeenCalledWith(undefined, 'CALLS', 10);
	});

	it('should combine properties and text search filters', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await searchGraphTool.handler(
			{
				searchType: 'nodes',
				properties: { language: 'typescript' },
				textSearch: 'testFunction',
			},
			context
		);

		expect(result.success).toBe(true);

		// Should combine both property filters and text search
		expect(mockGraph.findNodes).toHaveBeenCalledWith(
			{ language: 'typescript', name: 'testFunction' },
			undefined,
			50
		);
	});
});
