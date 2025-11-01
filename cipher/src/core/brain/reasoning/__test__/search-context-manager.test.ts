/**
 * Tests for Search Context Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchContextManager } from '../search-context-manager.js';

// Mock logger
vi.mock('../../../../logger/index.js', () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('SearchContextManager', () => {
	let manager: SearchContextManager;

	beforeEach(() => {
		manager = new SearchContextManager();
	});

	describe('Processing search results', () => {
		it('should process empty search results', async () => {
			const searchResults = {};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults).toHaveLength(0);
			expect(result.secondaryResults).toHaveLength(0);
			expect(result.totalResults).toBe(0);
			expect(result.summary).toBe('No relevant search results found.');
			expect(result.sourcesUsed).toHaveLength(0);
		});

		it('should process graph search results', async () => {
			const searchResults = {
				graph: [
					{
						content: 'Graph node 1',
						relevance: 0.8,
						metadata: { nodeType: 'concept' },
					},
					{
						content: 'Graph node 2',
						relevance: 0.6,
						metadata: { nodeType: 'entity' },
					},
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults).toHaveLength(2);
			expect(result.secondaryResults).toHaveLength(0);
			expect(result.totalResults).toBe(2);
			expect(result.sourcesUsed).toContain('graph');
			expect(result.primaryResults[0]?.source).toBe('graph');
			expect(result.primaryResults[0]?.content).toBe('Graph node 1');
			expect(result.primaryResults[0]?.relevance).toBe(0.8);
		});

		it('should process memory search results', async () => {
			const searchResults = {
				memory: [
					{
						content: 'Memory fact 1',
						relevance: 0.9,
						metadata: { memoryType: 'fact' },
					},
					{
						content: 'Memory fact 2',
						relevance: 0.7,
						metadata: { memoryType: 'experience' },
					},
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults).toHaveLength(2);
			expect(result.sourcesUsed).toContain('memory');
			expect(result.primaryResults[0]?.source).toBe('memory');
			expect(result.primaryResults[0]?.content).toBe('Memory fact 1');
			expect(result.primaryResults[0]?.relevance).toBe(0.9);
		});

		it('should process reasoning patterns search results', async () => {
			const searchResults = {
				reasoning_patterns: [
					{
						content: 'Reasoning pattern 1',
						relevance: 0.85,
						metadata: { patternType: 'problem_solving' },
					},
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults).toHaveLength(1);
			expect(result.sourcesUsed).toContain('reasoning_patterns');
			expect(result.primaryResults[0]?.source).toBe('reasoning_patterns');
			expect(result.primaryResults[0]?.content).toBe('Reasoning pattern 1');
		});

		it('should process mixed search results', async () => {
			const searchResults = {
				graph: [{ content: 'Graph result', relevance: 0.8 }],
				memory: [{ content: 'Memory result', relevance: 0.7 }],
				reasoning_patterns: [{ content: 'Reasoning result', relevance: 0.9 }],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.totalResults).toBe(3);
			expect(result.sourcesUsed).toContain('graph');
			expect(result.sourcesUsed).toContain('memory');
			expect(result.sourcesUsed).toContain('reasoning_patterns');
			expect(result.primaryResults).toHaveLength(3);
		});

		it('should sort results by relevance', async () => {
			const searchResults = {
				memory: [
					{ content: 'Low relevance', relevance: 0.5 },
					{ content: 'High relevance', relevance: 0.9 },
					{ content: 'Medium relevance', relevance: 0.7 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults[0]?.content).toBe('High relevance');
			expect(result.primaryResults[0]?.relevance).toBe(0.9);
			expect(result.primaryResults[1]?.content).toBe('Medium relevance');
			expect(result.primaryResults[1]?.relevance).toBe(0.7);
			// Note: Low relevance result might be filtered out due to relevance threshold
		});

		it('should filter results by relevance threshold', async () => {
			manager.updateOptions({ relevanceThreshold: 0.7 });

			const searchResults = {
				memory: [
					{ content: 'High relevance', relevance: 0.9 },
					{ content: 'Medium relevance', relevance: 0.6 },
					{ content: 'Low relevance', relevance: 0.3 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.totalResults).toBe(1);
			expect(result.primaryResults[0]?.content).toBe('High relevance');
		});

		it('should split results into primary and secondary', async () => {
			manager.updateOptions({ maxPrimaryResults: 2, maxSecondaryResults: 2 });

			const searchResults = {
				memory: [
					{ content: 'Result 1', relevance: 0.9 },
					{ content: 'Result 2', relevance: 0.8 },
					{ content: 'Result 3', relevance: 0.7 },
					{ content: 'Result 4', relevance: 0.6 },
					{ content: 'Result 5', relevance: 0.5 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.primaryResults).toHaveLength(2);
			expect(result.secondaryResults).toHaveLength(2);
			expect(result.primaryResults[0]?.content).toBe('Result 1');
			expect(result.primaryResults[1]?.content).toBe('Result 2');
			expect(result.secondaryResults[0]?.content).toBe('Result 3');
			expect(result.secondaryResults[1]?.content).toBe('Result 4');
		});
	});

	describe('Deduplication', () => {
		it('should deduplicate identical results', async () => {
			const searchResults = {
				memory: [
					{ content: 'Same content', relevance: 0.8 },
					{ content: 'Same content', relevance: 0.9 },
					{ content: 'Different content', relevance: 0.7 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.totalResults).toBe(2);
			expect(result.primaryResults[0]?.content).toBe('Same content');
			expect(result.primaryResults[0]?.relevance).toBe(0.9); // Higher relevance kept
		});

		it('should not deduplicate when disabled', async () => {
			manager.updateOptions({ enableDeduplication: false });

			const searchResults = {
				memory: [
					{ content: 'Same content', relevance: 0.8 },
					{ content: 'Same content', relevance: 0.9 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.totalResults).toBe(2);
		});
	});

	// Content extraction is tested implicitly through other tests

	describe('Metadata extraction', () => {
		it('should extract source-specific metadata', async () => {
			const searchResults = {
				graph: [
					{
						content: 'Graph node',
						relevance: 0.8,
						type: 'concept',
						relationships: ['rel1', 'rel2'],
					},
				],
				memory: [
					{
						content: 'Memory fact',
						relevance: 0.8,
						memoryType: 'fact',
						sessionId: 'session-1',
						extractedAt: '2023-01-01',
					},
				],
				reasoning_patterns: [
					{
						content: 'Reasoning pattern',
						relevance: 0.8,
						patternType: 'problem_solving',
						qualityScore: 0.9,
						stepCount: 5,
					},
				],
			};

			const result = await manager.processSearchResults(searchResults);

			const graphResult = result.primaryResults.find(r => r.source === 'graph');
			const memoryResult = result.primaryResults.find(r => r.source === 'memory');
			const reasoningResult = result.primaryResults.find(r => r.source === 'reasoning_patterns');

			expect(graphResult?.metadata?.nodeType).toBe('concept');
			expect(graphResult?.metadata?.relationships).toEqual(['rel1', 'rel2']);

			expect(memoryResult?.metadata?.memoryType).toBe('fact');
			expect(memoryResult?.metadata?.sessionId).toBe('session-1');
			expect(memoryResult?.metadata?.extractedAt).toBe('2023-01-01');

			expect(reasoningResult?.metadata?.patternType).toBe('problem_solving');
			expect(reasoningResult?.metadata?.qualityScore).toBe(0.9);
			expect(reasoningResult?.metadata?.stepCount).toBe(5);
		});
	});

	describe('Caching', () => {
		it('should cache search results', async () => {
			const searchResults = {
				memory: [{ content: 'Cached result', relevance: 0.8 }],
			};

			await manager.processSearchResults(searchResults, 'test query');

			const cached = manager.getCachedResults('test query');
			expect(cached).toBeDefined();
			expect(cached).toHaveLength(1);
			expect(cached?.[0]?.content).toBe('Cached result');
		});

		it('should return null for non-existent cached results', () => {
			const cached = manager.getCachedResults('nonexistent query');
			expect(cached).toBeNull();
		});

		it('should clear cache', async () => {
			const searchResults = {
				memory: [{ content: 'Cached result', relevance: 0.8 }],
			};

			await manager.processSearchResults(searchResults, 'test query');
			manager.clearCache();

			const cached = manager.getCachedResults('test query');
			expect(cached).toBeNull();
		});
	});

	describe('Options management', () => {
		it('should use default options', () => {
			const options = manager.getOptions();

			expect(options.maxPrimaryResults).toBe(5);
			expect(options.maxSecondaryResults).toBe(10);
			expect(options.relevanceThreshold).toBe(0.6);
			expect(options.enableDeduplication).toBe(true);
			expect(options.enableSummarization).toBe(true);
			expect(options.sortByRelevance).toBe(true);
		});

		it('should allow updating options', () => {
			const newOptions = {
				maxPrimaryResults: 10,
				relevanceThreshold: 0.8,
			};

			manager.updateOptions(newOptions);
			const options = manager.getOptions();

			expect(options.maxPrimaryResults).toBe(10);
			expect(options.relevanceThreshold).toBe(0.8);
			expect(options.maxSecondaryResults).toBe(10); // Unchanged
		});
	});

	describe('Error handling', () => {
		it('should handle malformed search results gracefully', async () => {
			const searchResults = {
				memory: [
					{ relevance: 0.8 }, // Missing content
					null, // Null result
					{ content: 'Valid result', relevance: 0.9 },
				],
			};

			const result = await manager.processSearchResults(searchResults);

			expect(result.totalResults).toBeGreaterThan(0);
			expect(result.primaryResults.some(r => r.content === 'Valid result')).toBe(true);
		});
	});
});
