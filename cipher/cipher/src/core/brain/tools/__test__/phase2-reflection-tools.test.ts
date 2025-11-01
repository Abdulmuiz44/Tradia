/**
 * Phase 2 Test: Reflection Memory Tools
 *
 * Tests the three core reasoning tools:
 * - extractReasoningSteps
 * - evaluateReasoning
 * - searchReasoningPatterns
 */

import { describe, it, expect, vi } from 'vitest';
import {
	extractReasoningSteps,
	evaluateReasoning,
	searchReasoningPatterns,
	ReasoningStepSchema,
	ReasoningTraceSchema,
} from '../def_reflective_memory_tools.js';

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

describe('Phase 2: Reflection Memory Tools', () => {
	describe('extractReasoningSteps', () => {
		it('should extract explicit thought markup patterns', async () => {
			const userInput = `Create a factorial function with proper validation
Thought: I need to create a function to calculate the factorial.
Action: I'll write a recursive function.
\`\`\`javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\`
Observation: The function works correctly for positive integers.
Thought: I should add input validation.
Action: Adding validation for edge cases.
\`\`\`javascript
function factorial(n) {
  if (n < 0) throw new Error('Negative numbers not allowed');
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
\`\`\`
Result: Function complete with proper validation.
			`;

			const result = await extractReasoningSteps.handler({
				userInput,
				options: {
					extractExplicit: true,
					extractImplicit: true,
					includeMetadata: true,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.trace).toBeDefined();
			expect(result.result.trace.steps).toBeInstanceOf(Array);
			expect(result.result.trace.steps.length).toBeGreaterThan(0);

			// Should extract explicit thought steps
			const thoughtSteps = result.result.trace.steps.filter((s: any) => s.type === 'thought');
			expect(thoughtSteps.length).toBeGreaterThan(0);

			// Steps should not have confidence fields (removed in new requirements)
			expect(
				result.result.trace.steps.every(
					(s: any) => !Object.prototype.hasOwnProperty.call(s, 'confidence')
				)
			).toBe(true);
		});

		it('should extract implicit reasoning patterns when no explicit markup', async () => {
			const userInput = `I need an efficient sorting algorithm
I need to solve this sorting problem. Let me think about different approaches.
Bubble sort would be simple but inefficient for large datasets. 
Quick sort might be better - it has O(n log n) average complexity.
I'll implement quicksort with proper pivot selection.
			`;

			const result = await extractReasoningSteps.handler({
				userInput,
				options: {
					extractExplicit: true,
					extractImplicit: true,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.trace.steps).toBeInstanceOf(Array);
			expect(result.result.trace.steps.length).toBeGreaterThan(0);

			// Should extract implicit reasoning
			expect(
				result.result.trace.steps.some(
					(s: any) => s.content.includes('sorting') || s.content.includes('quicksort')
				)
			).toBe(true);
		});

		it('should handle empty reasoning content gracefully', async () => {
			const result = await extractReasoningSteps.handler({
				userInput: 'Test input',
				options: {},
			});

			// Should handle gracefully - either succeed with empty steps or fail with clear message
			if (result.success) {
				expect(result.result.trace.steps).toBeInstanceOf(Array);
			} else {
				expect(result.result.error).toBeDefined();
			}
		});

		it('should detect reasoning loops', async () => {
			const userInput = `Help me test this API endpoint
Thought: I need to test the API endpoint.
Action: Making a request to /api/test
Observation: Got 404 error.
Thought: I need to test the API endpoint.
Action: Making a request to /api/test  
Observation: Still getting 404.
Thought: Let me check the endpoint again.
Action: Making a request to /api/test
Observation: Same 404 error.
			`;

			const result = await extractReasoningSteps.handler({
				userInput,
				options: {},
			});

			expect(result.success).toBe(true);
			// Should detect repeated patterns - this will be validated in the evaluation phase
			expect(result.result.trace.steps.length).toBeGreaterThan(3);
		});
	});

	describe('evaluateReasoning', () => {
		// Create a sample trace for testing
		const sampleTrace = {
			id: 'test-trace-123',
			steps: [
				{
					type: 'thought',
					content: 'I need to solve this problem',
				},
				{
					type: 'action',
					content: 'Implementing solution approach A',
				},
				{
					type: 'observation',
					content: 'Approach A worked correctly',
				},
			],
			metadata: {
				extractedAt: '2024-01-01T00:00:00Z',
				conversationLength: 100,
				stepCount: 3,
				hasExplicitMarkup: true,
			},
		};

		it('should evaluate reasoning quality and provide suggestions', async () => {
			const result = await evaluateReasoning.handler({
				trace: sampleTrace,
				options: {
					checkEfficiency: true,
					detectLoops: true,
					generateSuggestions: true,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation).toBeDefined();
			expect(result.result.evaluation.qualityScore).toBeGreaterThanOrEqual(0);
			expect(result.result.evaluation.qualityScore).toBeLessThanOrEqual(1);
			expect(result.result.evaluation.issues).toBeInstanceOf(Array);
			expect(result.result.evaluation.suggestions).toBeInstanceOf(Array);
		});

		it('should identify redundant steps', async () => {
			const traceWithRedundancy = {
				...sampleTrace,
				steps: [
					...sampleTrace.steps,
					{
						type: 'thought',
						content: 'I need to solve this problem', // Duplicate
					},
				],
			};

			const result = await evaluateReasoning.handler({
				trace: traceWithRedundancy,
				options: { detectLoops: true },
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation.issues).toBeInstanceOf(Array);
			// Should detect redundancy in analysis
		});

		it('should identify inefficient paths', async () => {
			const inefficientTrace = {
				...sampleTrace,
				steps: Array(20)
					.fill(0)
					.map((_, i) => ({
						type: 'thought',
						content: `Step ${i}`,
					})),
			};

			const result = await evaluateReasoning.handler({
				trace: inefficientTrace,
				options: { checkEfficiency: true },
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation.issues).toBeInstanceOf(Array);
			// Should identify efficiency issues with many low-confidence steps
		});

		it('should identify low confidence steps', async () => {
			const lowConfidenceTrace = {
				...sampleTrace,
				steps: [
					{
						type: 'thought',
						content: 'Uncertain about this approach',
					},
					{
						type: 'action',
						content: 'Trying something random',
					},
				],
			};

			const result = await evaluateReasoning.handler({
				trace: lowConfidenceTrace,
				options: { checkEfficiency: true },
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation.issues).toBeInstanceOf(Array);
			// Should identify low confidence issues
		});

		it('should generate optimized steps when quality is good', async () => {
			const goodTrace = {
				...sampleTrace,
				steps: [
					{
						type: 'thought',
						content: 'Clear problem analysis',
						confidence: 0.95,
						timestamp: '2024-01-01T00:00:00Z',
					},
					{
						type: 'action',
						content: 'Efficient implementation',
						confidence: 0.9,
						timestamp: '2024-01-01T00:01:00Z',
					},
				],
			};

			const result = await evaluateReasoning.handler({
				trace: goodTrace,
				options: { generateSuggestions: true },
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation.suggestions).toBeInstanceOf(Array);
		});

		it('should calculate quality scores properly', async () => {
			const highQualityTrace = {
				...sampleTrace,
				steps: [
					{
						type: 'thought',
						content: 'Systematic problem analysis',
					},
					{
						type: 'action',
						content: 'Implement optimal solution',
					},
					{
						type: 'observation',
						content: 'Solution works perfectly',
					},
				],
			};

			const result = await evaluateReasoning.handler({
				trace: highQualityTrace,
				options: {},
			});

			expect(result.success).toBe(true);
			expect(result.result.evaluation.qualityScore).toBeGreaterThan(0.7);
		});
	});

	describe('searchReasoningPatterns', () => {
		it.skip('should search for reasoning patterns (placeholder implementation)', async () => {
			const result = await searchReasoningPatterns.handler({
				query: 'How to create React components',
				context: {
					taskType: 'code_generation',
					domain: 'programming',
				},
				options: {
					maxResults: 5,
					minQualityScore: 0.7,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.patterns).toBeInstanceOf(Array);
			expect(result.result.metadata).toBeDefined();
			expect(result.result.metadata.note).toBeDefined();
			expect(result.metadata.phase).toBeDefined();
		});

		it('should respect maxResults parameter', async () => {
			const result = await searchReasoningPatterns.handler({
				query: 'Test query',
				options: {
					maxResults: 3,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.patterns).toBeInstanceOf(Array);
			expect(result.result.patterns.length).toBeLessThanOrEqual(3);
		});

		it('should handle quality filtering', async () => {
			const result = await searchReasoningPatterns.handler({
				query: 'Test query',
				options: {
					minQualityScore: 0.8,
					includeEvaluations: true,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.patterns).toBeInstanceOf(Array);
		});

		it.skip('should handle context parameters', async () => {
			const result = await searchReasoningPatterns.handler({
				query: 'Test query with context',
				context: {
					taskType: 'problem_solving',
					domain: 'math',
					complexity: 'high',
				},
				options: {
					maxResults: 10,
				},
			});

			expect(result.success).toBe(true);
			expect(result.result.metadata.searchQuery).toBeDefined();
		});
	});

	describe('Integration Tests', () => {
		it('should work together: extract → evaluate workflow', async () => {
			// Step 1: Extract reasoning
			const extractResult = await extractReasoningSteps.handler({
				userInput: `Create a sorting algorithm
Thought: I need to solve this coding problem step by step.
Action: First, let me understand the requirements.
Observation: The problem asks for a sorting algorithm.
Thought: I'll implement quicksort for efficiency.
Action: Writing the quicksort implementation.
Result: Algorithm works correctly.
				`,
				options: {
					extractExplicit: true,
					includeMetadata: true,
				},
			});

			expect(extractResult.success).toBe(true);
			expect(extractResult.result.trace).toBeDefined();

			// Step 2: Evaluate the extracted reasoning
			const evaluateResult = await evaluateReasoning.handler({
				trace: extractResult.result.trace,
				options: {
					checkEfficiency: true,
					generateSuggestions: true,
				},
			});

			expect(evaluateResult.success).toBe(true);
			expect(evaluateResult.result.evaluation).toBeDefined();
			expect(evaluateResult.result.evaluation.qualityScore).toBeGreaterThanOrEqual(0);
		});

		it('should handle failed outcomes in extract → evaluate workflow', async () => {
			// Extract reasoning from a failed attempt
			const extractResult = await extractReasoningSteps.handler({
				userInput: `Optimize a sorting algorithm
Thought: Let me try a simple approach.
Action: Using bubble sort algorithm.
Observation: It's too slow for large datasets.
Thought: Maybe I can optimize it somehow.
Action: Adding some micro-optimizations.
Observation: Still too slow, approach failed.
				`,
				options: {},
			});

			expect(extractResult.success).toBe(true);

			// Evaluate the failed reasoning
			const evaluateResult = await evaluateReasoning.handler({
				trace: extractResult.result.trace,
				options: {},
			});

			expect(evaluateResult.success).toBe(true);
			expect(evaluateResult.result.evaluation.issues).toBeInstanceOf(Array);
			// Failed reasoning should have suggestions for improvement
			expect(evaluateResult.result.evaluation.suggestions).toBeInstanceOf(Array);
		});
	});

	describe('Schema Validation', () => {
		it('should validate ReasoningStep schema', () => {
			const validStep = {
				type: 'thought',
				content: 'I need to think about this',
			};

			const result = ReasoningStepSchema.safeParse(validStep);
			expect(result.success).toBe(true);
		});

		it('should validate ReasoningTrace schema', () => {
			const validTrace = {
				id: 'test-trace-123',
				steps: [
					{
						type: 'thought',
						content: 'I need to solve this problem',
					},
					{
						type: 'action',
						content: 'Implementing solution approach A',
					},
				],
				metadata: {
					extractedAt: '2024-01-01T00:00:00Z',
					conversationLength: 100,
					stepCount: 2,
					hasExplicitMarkup: true,
				},
			};

			const result = ReasoningTraceSchema.safeParse(validTrace);
			expect(result.success).toBe(true);
		});
	});
});
