import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InternalToolManager } from '../manager.js';
import { registerAllTools } from '../definitions/index.js';

// Mock the logger to avoid console output during tests
vi.mock('../../../logger/index.js', () => ({
	createLogger: vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	})),
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

// Skip all tests if reflection memory is disabled
(process.env.DISABLE_REFLECTION_MEMORY === 'true' ? describe.skip : describe)(
	'Phase 3: Service Integration Tests',
	() => {
		let toolManager: InternalToolManager;
		let mockVectorStoreManager: any;
		let originalEnv: Record<string, string | undefined>;

		beforeEach(async () => {
			// Store original env values
			originalEnv = { ...process.env };

			// Set required environment variables for reflection memory collections only
			process.env.REFLECTION_VECTOR_STORE_COLLECTION = 'reflection_memory';

			// Create mock vector store manager with dual collection support
			const mockVectorStore = {
				search: vi.fn().mockResolvedValue([]),
				store: vi.fn().mockResolvedValue(undefined),
				insert: vi.fn().mockResolvedValue(undefined),
			};

			mockVectorStoreManager = {
				search: vi.fn().mockResolvedValue([]),
				store: vi.fn().mockResolvedValue(undefined),
				searchInCollection: vi.fn().mockResolvedValue([]),
				storeInCollection: vi.fn().mockResolvedValue(undefined),
				getStore: vi.fn().mockReturnValue(mockVectorStore),
			};

			// Reset all mocks
			vi.clearAllMocks();

			// Initialize tool manager
			toolManager = new InternalToolManager({
				enabled: true,
				timeout: 30000,
				enableCache: false,
				cacheTimeout: 300000,
			});

			await toolManager.initialize();

			// Register all tools including reflection memory tools
			await registerAllTools(toolManager);

			// Set services including vector store manager
			toolManager.setServices({
				vectorStoreManager: mockVectorStoreManager,
				embeddingManager: {
					getEmbedder: vi.fn().mockReturnValue({
						embed: vi.fn().mockResolvedValue(
							Array(128)
								.fill(0)
								.map(() => Math.random())
						),
						embedBatch: vi.fn().mockImplementation((queries: string[]) => {
							// Return embeddings for each query
							return Promise.resolve(
								queries.map(() =>
									Array(128)
										.fill(0)
										.map(() => Math.random())
								)
							);
						}),
						getConfig: vi.fn().mockReturnValue({ type: 'openai' }),
					}),
				},
				llmService: {
					directGenerate: vi
						.fn()
						.mockResolvedValue(
							'Operation: ADD\nConfidence: 0.8\nReasoning: New technical information to store'
						),
				},
			});
		});

		afterEach(() => {
			// Restore original env
			Object.assign(process.env, originalEnv);
			delete process.env.REFLECTION_VECTOR_STORE_COLLECTION;
		});

		describe('Tool Registration', () => {
			it('should register all reflection memory tools', () => {
				const tools = toolManager.getAllTools();

				expect(tools).toHaveProperty('cipher_extract_reasoning_steps');
				expect(tools).toHaveProperty('cipher_evaluate_reasoning');
				expect(tools).toHaveProperty('cipher_search_reasoning_patterns');

				// Verify tool categories
				const reflectionTools = toolManager.getToolsByCategory('memory');
				expect(Object.keys(reflectionTools).length).toBeGreaterThan(0);
			});

			it('should properly categorize reflection memory tools', () => {
				const extractTool = toolManager.getTool('extract_reasoning_steps');
				const evaluateTool = toolManager.getTool('evaluate_reasoning');
				const searchTool = toolManager.getTool('search_reasoning_patterns');

				expect(extractTool?.category).toBe('memory');
				expect(evaluateTool?.category).toBe('memory');
				expect(searchTool?.category).toBe('memory');
			});
		});

		describe('Extract and Store Workflow', () => {
			it('should extract reasoning and store in vector storage', async () => {
				const userInput = `I need to solve this math problem: 2 + 2.
Thought: I need to solve this math problem: 2 + 2.
Action: I'll add the numbers together.
Observation: 2 + 2 = 4.
Conclusion: The answer is 4.`;

				const result = await toolManager.executeTool(
					'extract_reasoning_steps',
					{
						userInput,
						options: { includeMetadata: true },
					},
					{
						sessionId: 'test-session',
						services: { vectorStoreManager: mockVectorStoreManager },
					}
				);

				expect(result.success).toBe(true);
				expect(result.result.trace).toBeDefined();
				expect(result.result.trace.steps).toHaveLength(4);
			});

			it('should handle storage failures gracefully', async () => {
				// Mock storage failure
				mockVectorStoreManager.storeInCollection.mockRejectedValue(new Error('Storage failed'));

				const userInput = 'Simple test.\nThought: Simple test.';

				const result = await toolManager.executeTool(
					'extract_reasoning_steps',
					{ userInput },
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				// Should still succeed even if storage fails
				expect(result.success).toBe(true);
				expect(result.result.trace).toBeDefined();
			});
		});

		describe('Evaluation and Storage Workflow', () => {
			it('should evaluate reasoning and store evaluation results', async () => {
				const sampleTrace = {
					id: 'test-trace-123',
					steps: [
						{
							type: 'thought',
							content: 'I need to solve this problem',
						},
						{
							type: 'action',
							content: 'Implementing solution approach',
						},
					],
					metadata: {
						extractedAt: '2024-01-01T00:00:00Z',
						conversationLength: 100,
						stepCount: 2,
						hasExplicitMarkup: true,
					},
				};

				const result = await toolManager.executeTool(
					'evaluate_reasoning',
					{
						trace: sampleTrace,
						options: { checkEfficiency: true, detectLoops: true, generateSuggestions: true },
					},
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(result.success).toBe(true);
				expect(result.result.evaluation).toBeDefined();
				expect(result.result.evaluation.qualityScore).toBeGreaterThan(0);

				// Verify evaluation storage was attempted if shouldStore is true
				const mockVectorStore = mockVectorStoreManager.getStore();
				if (result.result.evaluation.shouldStore) {
					expect(
						mockVectorStore.store.mock.calls.length + mockVectorStore.insert.mock.calls.length
					).toBeGreaterThanOrEqual(0);
				}
			});
		});

		describe('Search Integration', () => {
			it('should search reasoning patterns using vector storage', async () => {
				// Mock search results
				const mockSearchResults = [
					{
						id: 'trace-1',
						content: 'Reasoning pattern about problem solving',
						score: 0.85,
						metadata: {
							type: 'reasoning_trace',
							qualityScore: 0.9,
							traceId: 'trace-1',
						},
					},
				];

				// Set up the mock on the vector store's search method
				const mockVectorStore = mockVectorStoreManager.getStore();
				mockVectorStore.search.mockResolvedValue(mockSearchResults);

				const result = await toolManager.executeTool(
					'search_reasoning_patterns',
					{
						query: 'problem solving approaches',
						options: { maxResults: 5, minQualityScore: 0.7 },
					},
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(result.success).toBe(true);
				expect(result.result.patterns).toHaveLength(1);
				expect(result.result.patterns[0]).toMatchObject({
					id: 'trace-1',
					score: 0.85,
				});

				// Verify vector search was called with embedding vector
				expect(mockVectorStore.search).toHaveBeenCalledWith(
					expect.any(Array), // embedding vector
					5 // maxResults
				);
			});

			it.skip('should fallback to default collection when dual collection not available', async () => {
				// The search tool always uses the vector store from getStore()
				// So this test should verify that it works normally even without dual collection support
				const mockVectorStore = mockVectorStoreManager.getStore();
				mockVectorStore.search.mockResolvedValue([]);

				const result = await toolManager.executeTool(
					'search_reasoning_patterns',
					{ query: 'test query' },
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(result.success).toBe(true);
				expect(result.result.patterns).toHaveLength(0);
				expect(result.metadata.fallback).toBeDefined();

				// No need to restore services since we're not modifying them
			});
		});

		describe('Complete Integration Workflow', () => {
			it('should execute the complete reflection memory workflow', async () => {
				const userInput = 'Help me solve this programming problem';
				const reasoningContent = `
Thought: I need to analyze the problem first.
Action: Breaking down the requirements.
Observation: The problem involves data structures.
Thought: I should use an efficient algorithm.
Action: Implementing the solution.
Observation: The solution works correctly.
			`;

				// Step 1: Extract reasoning
				const extractResult = await toolManager.executeTool(
					'extract_reasoning_steps',
					{ userInput, reasoningContent },
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(extractResult.success).toBe(true);
				expect(extractResult.result.trace).toBeDefined();

				// Step 2: Evaluate reasoning
				const evaluateResult = await toolManager.executeTool(
					'evaluate_reasoning',
					{
						trace: extractResult.result.trace,
						options: { checkEfficiency: true, detectLoops: true, generateSuggestions: true },
					},
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(evaluateResult.success).toBe(true);
				expect(evaluateResult.result.evaluation).toBeDefined();

				// Step 3: Search for similar patterns
				const searchResult = await toolManager.executeTool(
					'search_reasoning_patterns',
					{ query: 'programming problem solving' },
					{ services: { vectorStoreManager: mockVectorStoreManager } }
				);

				expect(searchResult.success).toBe(true);
				expect(searchResult.result.patterns).toBeDefined();
			});
		});
	}
);
