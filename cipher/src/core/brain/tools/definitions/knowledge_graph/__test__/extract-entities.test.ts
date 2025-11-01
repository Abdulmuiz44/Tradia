import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractEntitiesTool } from '../extract-entities.js';

const mockGraph = {
	addNode: vi.fn().mockResolvedValue(undefined),
	addEdge: vi.fn().mockResolvedValue(undefined),
};

const mockLLMService: any = {
	generate: vi.fn().mockResolvedValue('[]'), // Empty JSON array by default
	directGenerate: vi.fn().mockResolvedValue('[]'),
	getAllTools: vi.fn().mockReturnValue([]),
	getConfig: vi.fn().mockReturnValue({}),
};

const getContext = (
	opts: { withManager?: boolean; withGraph?: boolean; withLLM?: boolean } = {}
) => {
	const kgManager = opts.withManager
		? { getGraph: vi.fn().mockReturnValue(opts.withGraph ? mockGraph : null) }
		: undefined;

	const llmService = opts.withLLM ? mockLLMService : undefined;

	return {
		toolName: 'extract_entities',
		startTime: Date.now(),
		sessionId: 'test-session',
		metadata: {},
		services: {
			...(kgManager ? { knowledgeGraphManager: kgManager } : {}),
			...(llmService ? { llmService } : {}),
		},
	} as any;
};

describe('extractEntitiesTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset LLM mock to return empty array by default
		mockLLMService.generate.mockResolvedValue('[]');
	});

	it('should extract entities successfully with LLM', async () => {
		// Mock LLM response with entities
		mockLLMService.generate.mockResolvedValue(
			JSON.stringify([
				{
					name: 'TestFunction',
					type: 'Function',
					confidence: 0.9,
					context: 'function TestFunction()',
					description: 'A test function',
				},
			])
		);

		const context = getContext({ withManager: true, withGraph: true, withLLM: true });
		const result = await extractEntitiesTool.handler(
			{
				text: 'function TestFunction() { return true; }',
				options: {
					entityTypes: ['Function'],
					autoLink: true,
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		expect(result.entities).toBeDefined();
		expect(result.extracted).toBeGreaterThan(0);
		expect(mockGraph.addNode).toHaveBeenCalled();
		expect(mockLLMService.generate).toHaveBeenCalled();
	});

	it('should fall back to regex patterns when LLM fails', async () => {
		// Mock LLM to throw error
		mockLLMService.generate.mockRejectedValue(new Error('LLM service unavailable'));

		const context = getContext({ withManager: true, withGraph: true, withLLM: true });
		const result = await extractEntitiesTool.handler(
			{
				text: 'function TestFunction() { return true; }',
				options: {
					entityTypes: ['Function'],
					autoLink: false,
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		expect(result.entities).toBeDefined();
		expect(mockGraph.addNode).toHaveBeenCalled();
	});

	it('should work with legacy parameters', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await extractEntitiesTool.handler(
			{
				text: 'class TestClass {}',
				entityTypes: ['Class'],
				autoLink: true,
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		expect(result.entities).toBeDefined();
	});

	it('should fail if text is missing', async () => {
		const context = getContext({ withManager: true, withGraph: true });
		const result = await extractEntitiesTool.handler(
			{
				text: '',
				options: {
					entityTypes: ['Organization'],
					autoLink: true,
				},
			},
			context
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain('Text is required and must be a non-empty string');
	});

	it('should work without knowledge graph manager', async () => {
		const context = getContext({ withManager: false });
		const result = await extractEntitiesTool.handler(
			{
				text: 'Sample text with entities',
				options: {
					entityTypes: ['Organization'],
					autoLink: true,
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		expect(result.extracted).toBe(0); // No graph to add to
	});

	it('should work without connected graph backend', async () => {
		const context = getContext({ withManager: true, withGraph: false });
		const result = await extractEntitiesTool.handler(
			{
				text: 'Sample text with entities',
				options: {
					entityTypes: ['Organization'],
					autoLink: true,
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		expect(result.extracted).toBe(0); // No graph to add to
	});

	it('should handle malformed LLM JSON response gracefully', async () => {
		// Mock LLM to return invalid JSON
		mockLLMService.generate.mockResolvedValue('invalid json response');

		const context = getContext({ withManager: true, withGraph: true, withLLM: true });
		const result = await extractEntitiesTool.handler(
			{
				text: 'function TestFunction() { return true; }',
				options: {
					entityTypes: ['Function'],
					autoLink: false,
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.message).toContain('Entity extraction completed successfully');
		// Should fall back to regex patterns
		expect(mockGraph.addNode).toHaveBeenCalled();
	});

	it('should create relationships when autoLink is enabled', async () => {
		// Mock LLM responses for both entities and relationships
		mockLLMService.generate
			.mockResolvedValueOnce(
				JSON.stringify([
					{
						name: 'TestFunction',
						type: 'Function',
						confidence: 0.9,
						context: 'function TestFunction()',
						description: 'A test function',
					},
					{
						name: 'TestClass',
						type: 'Class',
						confidence: 0.9,
						context: 'class TestClass',
						description: 'A test class',
					},
				])
			)
			.mockResolvedValueOnce(
				JSON.stringify([
					{
						sourceEntity: 'TestFunction',
						targetEntity: 'TestClass',
						relationshipType: 'BELONGS_TO',
						confidence: 0.8,
						reasoning: 'Function belongs to class',
					},
				])
			);

		const context = getContext({ withManager: true, withGraph: true, withLLM: true });
		const result = await extractEntitiesTool.handler(
			{
				text: 'class TestClass { function TestFunction() {} }',
				options: {
					entityTypes: ['Function', 'Class'],
					autoLink: true,
					linkTypes: ['BELONGS_TO', 'USES'],
				},
			},
			context
		);

		expect(result.success).toBe(true);
		expect(result.extracted).toBe(2);
		expect(result.linked).toBe(1);
		expect(mockGraph.addNode).toHaveBeenCalledTimes(2);
		expect(mockGraph.addEdge).toHaveBeenCalledTimes(1);
	});

	it('should handle graph backend errors gracefully', async () => {
		const errorGraph = {
			addNode: vi.fn().mockRejectedValue(new Error('Backend connection failed')),
			addEdge: vi.fn().mockResolvedValue(undefined),
		};
		const context = {
			toolName: 'extract_entities',
			startTime: Date.now(),
			sessionId: 'test-session',
			metadata: {},
			services: {
				knowledgeGraphManager: { getGraph: vi.fn().mockReturnValue(errorGraph) } as any,
				llmService: mockLLMService,
			},
		} as any;

		const result = await extractEntitiesTool.handler(
			{
				text: 'function TestFunction() {}',
				options: {
					entityTypes: ['Function'],
					autoLink: false,
				},
			},
			context
		);

		// Extract entities tool continues even if backend fails - it still extracts entities from text
		expect(result.success).toBe(true);
		expect(result.extracted).toBeGreaterThan(0);
		expect(result.linked).toBe(0); // No links created when autoLink is false
		expect(result.message).toContain('Entity extraction completed successfully');
	});
});
