/**
 * Search Context Manager
 *
 * Handles multiple search tool calls and provides well-sorted context
 * to feed into the agent. This ensures efficient use of search results
 * from cipher_search_graph, cipher_memory_search, and cipher_search_reasoning_patterns.
 */

import { logger } from '../../logger/index.js';

export interface SearchResult {
	source: 'graph' | 'memory' | 'reasoning_patterns';
	content: string;
	relevance: number;
	metadata?: Record<string, any>;
	timestamp?: string;
}

export interface SortedContext {
	primaryResults: SearchResult[];
	secondaryResults: SearchResult[];
	summary: string;
	totalResults: number;
	sourcesUsed: string[];
}

export interface SearchContextOptions {
	maxPrimaryResults?: number;
	maxSecondaryResults?: number;
	relevanceThreshold?: number;
	enableDeduplication?: boolean;
	enableSummarization?: boolean;
	sortByRelevance?: boolean;
}

/**
 * Default search context options
 */
const DEFAULT_OPTIONS: Required<SearchContextOptions> = {
	maxPrimaryResults: 5,
	maxSecondaryResults: 10,
	relevanceThreshold: 0.6,
	enableDeduplication: true,
	enableSummarization: true,
	sortByRelevance: true,
};

/**
 * Manages multiple search tool results and provides well-sorted context
 */
export class SearchContextManager {
	private options: Required<SearchContextOptions>;
	private recentSearches: Map<string, { timestamp: number; results: SearchResult[] }> = new Map();

	constructor(options?: SearchContextOptions) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Process multiple search tool results and return well-sorted context
	 */
	async processSearchResults(
		searchResults: {
			graph?: any[];
			memory?: any[];
			reasoning_patterns?: any[];
		},
		query?: string
	): Promise<SortedContext> {
		try {
			logger.debug('SearchContextManager: Processing search results', {
				graphResults: searchResults.graph?.length || 0,
				memoryResults: searchResults.memory?.length || 0,
				reasoningResults: searchResults.reasoning_patterns?.length || 0,
			});

			// Step 1: Normalize and validate search results
			const normalizedResults = this.normalizeSearchResults(searchResults);

			// Step 2: Deduplicate results if enabled
			const deduplicatedResults = this.options.enableDeduplication
				? this.deduplicateResults(normalizedResults)
				: normalizedResults;

			// Step 3: Sort results by relevance
			const sortedResults = this.options.sortByRelevance
				? this.sortByRelevance(deduplicatedResults)
				: deduplicatedResults;

			// Step 4: Filter by relevance threshold
			const filteredResults = this.filterByRelevance(sortedResults);

			// Step 5: Split into primary and secondary results
			const { primaryResults, secondaryResults } = this.splitResults(filteredResults);

			// Step 6: Generate summary
			const summary = this.options.enableSummarization
				? await this.generateSummary(primaryResults, query)
				: this.generateBasicSummary(primaryResults);

			// Step 7: Cache results for future reference
			if (query) {
				this.cacheSearchResults(query, [...primaryResults, ...secondaryResults]);
			}

			const context: SortedContext = {
				primaryResults,
				secondaryResults,
				summary,
				totalResults: primaryResults.length + secondaryResults.length,
				sourcesUsed: this.getSourcesUsed([...primaryResults, ...secondaryResults]),
			};

			logger.debug('SearchContextManager: Context processing completed', {
				primaryCount: primaryResults.length,
				secondaryCount: secondaryResults.length,
				totalResults: context.totalResults,
				sourcesUsed: context.sourcesUsed,
			});

			return context;
		} catch (error) {
			logger.error('SearchContextManager: Error processing search results', {
				error: error instanceof Error ? error.message : String(error),
			});

			// Return empty context on error
			return {
				primaryResults: [],
				secondaryResults: [],
				summary: 'Error processing search results',
				totalResults: 0,
				sourcesUsed: [],
			};
		}
	}

	/**
	 * Normalize search results from different sources
	 */
	private normalizeSearchResults(searchResults: {
		graph?: any[];
		memory?: any[];
		reasoning_patterns?: any[];
	}): SearchResult[] {
		const normalized: SearchResult[] = [];

		// Normalize graph search results
		if (searchResults.graph && Array.isArray(searchResults.graph)) {
			for (const result of searchResults.graph) {
				if (result && typeof result === 'object') {
					const content = this.extractContent(result, 'graph');
					if (
						content &&
						content !== 'Invalid result object' &&
						content !== 'No content available'
					) {
						const metadata = this.extractMetadata(result, 'graph');
						const timestamp = this.extractTimestamp(result, 'graph');
						normalized.push({
							source: 'graph',
							content,
							relevance: this.extractRelevance(result, 'graph'),
							...(metadata && { metadata }),
							...(timestamp && { timestamp }),
						});
					}
				}
			}
		}

		// Normalize memory search results
		if (searchResults.memory && Array.isArray(searchResults.memory)) {
			for (const result of searchResults.memory) {
				if (result && typeof result === 'object') {
					const content = this.extractContent(result, 'memory');
					if (
						content &&
						content !== 'Invalid result object' &&
						content !== 'No content available'
					) {
						const metadata = this.extractMetadata(result, 'memory');
						const timestamp = this.extractTimestamp(result, 'memory');
						normalized.push({
							source: 'memory',
							content,
							relevance: this.extractRelevance(result, 'memory'),
							...(metadata && { metadata }),
							...(timestamp && { timestamp }),
						});
					}
				}
			}
		}

		// Normalize reasoning patterns search results
		if (searchResults.reasoning_patterns && Array.isArray(searchResults.reasoning_patterns)) {
			for (const result of searchResults.reasoning_patterns) {
				if (result && typeof result === 'object') {
					const content = this.extractContent(result, 'reasoning_patterns');
					if (
						content &&
						content !== 'Invalid result object' &&
						content !== 'No content available'
					) {
						const metadata = this.extractMetadata(result, 'reasoning_patterns');
						const timestamp = this.extractTimestamp(result, 'reasoning_patterns');
						normalized.push({
							source: 'reasoning_patterns',
							content,
							relevance: this.extractRelevance(result, 'reasoning_patterns'),
							...(metadata && { metadata }),
							...(timestamp && { timestamp }),
						});
					}
				}
			}
		}

		return normalized;
	}

	/**
	 * Extract content from search result based on source
	 */
	private extractContent(result: any, source: string): string {
		if (!result || typeof result !== 'object') {
			return 'Invalid result object';
		}

		let content: string | undefined;
		switch (source) {
			case 'graph':
				content = result.content || result.text || result.description || result.name;
				break;
			case 'memory':
				content = result.content || result.text || result.fact || result.memory;
				break;
			case 'reasoning_patterns':
				content = result.content || result.text || result.pattern || result.reasoning;
				break;
			default:
				content = result.content || result.text;
				break;
		}

		// If no content found, try to stringify the result
		if (!content) {
			try {
				content = JSON.stringify(result);
			} catch {
				content = String(result);
			}
		}

		return content || 'No content available';
	}

	/**
	 * Extract relevance score from search result
	 */
	private extractRelevance(result: any, _source: string): number {
		// Try to extract relevance from various possible fields
		const relevance =
			result.relevance || result.score || result.similarity || result.confidence || 0.5;
		return Math.max(0, Math.min(1, relevance));
	}

	/**
	 * Extract metadata from search result
	 */
	private extractMetadata(result: any, source: string): Record<string, any> | undefined {
		const metadata = result.metadata || result.meta || {};

		// Add source-specific metadata
		switch (source) {
			case 'graph':
				return {
					...metadata,
					nodeType: result.type || result.nodeType,
					relationships: result.relationships || result.connections,
				};
			case 'memory':
				return {
					...metadata,
					memoryType: result.memoryType || result.type,
					sessionId: result.sessionId,
					extractedAt: result.extractedAt,
				};
			case 'reasoning_patterns':
				return {
					...metadata,
					patternType: result.patternType || result.type,
					qualityScore: result.qualityScore,
					stepCount: result.stepCount,
				};
			default:
				return metadata;
		}
	}

	/**
	 * Extract timestamp from search result
	 */
	private extractTimestamp(result: any, _source: string): string | undefined {
		return result.timestamp || result.createdAt || result.updatedAt || result.date;
	}

	/**
	 * Deduplicate search results based on content similarity
	 */
	private deduplicateResults(results: SearchResult[]): SearchResult[] {
		const unique: SearchResult[] = [];
		const seen: Set<string> = new Set();

		for (const result of results) {
			// Create a normalized content hash for deduplication
			const normalizedContent = result.content.toLowerCase().trim().replace(/\s+/g, ' ');
			const contentHash = `${result.source}:${normalizedContent.substring(0, 100)}`;

			if (!seen.has(contentHash)) {
				seen.add(contentHash);
				unique.push(result);
			} else {
				// If duplicate found, keep the one with higher relevance
				const existingIndex = unique.findIndex(r => {
					const existingNormalized = r.content.toLowerCase().trim().replace(/\s+/g, ' ');
					const existingHash = `${r.source}:${existingNormalized.substring(0, 100)}`;
					return existingHash === contentHash;
				});

				if (
					existingIndex >= 0 &&
					unique[existingIndex] &&
					result.relevance > unique[existingIndex].relevance
				) {
					unique[existingIndex] = result;
				}
			}
		}

		return unique;
	}

	/**
	 * Sort results by relevance score
	 */
	private sortByRelevance(results: SearchResult[]): SearchResult[] {
		return [...results].sort((a, b) => b.relevance - a.relevance);
	}

	/**
	 * Filter results by relevance threshold
	 */
	private filterByRelevance(results: SearchResult[]): SearchResult[] {
		return results.filter(result => result.relevance >= this.options.relevanceThreshold);
	}

	/**
	 * Split results into primary and secondary based on relevance and limits
	 */
	private splitResults(results: SearchResult[]): {
		primaryResults: SearchResult[];
		secondaryResults: SearchResult[];
	} {
		const primaryResults = results.slice(0, this.options.maxPrimaryResults);
		const secondaryResults = results.slice(
			this.options.maxPrimaryResults,
			this.options.maxPrimaryResults + this.options.maxSecondaryResults
		);

		return { primaryResults, secondaryResults };
	}

	/**
	 * Generate a summary of the primary search results
	 */
	private async generateSummary(primaryResults: SearchResult[], _query?: string): Promise<string> {
		if (primaryResults.length === 0) {
			return 'No relevant search results found.';
		}

		const resultCounts = this.countResultsBySource(primaryResults);
		const topResults = primaryResults.slice(0, 3);

		let summary = `Found ${primaryResults.length} relevant results`;
		if ((resultCounts.graph || 0) > 0)
			summary += ` (${resultCounts.graph || 0} from knowledge graph`;
		if ((resultCounts.memory || 0) > 0)
			summary += `${(resultCounts.graph || 0) > 0 ? ', ' : ' ('}${resultCounts.memory || 0} from memory`;
		if ((resultCounts.reasoning_patterns || 0) > 0)
			summary += `${(resultCounts.graph || 0) > 0 || (resultCounts.memory || 0) > 0 ? ', ' : ' ('}${resultCounts.reasoning_patterns || 0} reasoning patterns`;
		summary += ')';

		if (topResults.length > 0) {
			summary += '. Top results include: ';
			summary += topResults
				.map(
					(result, index) =>
						`${index + 1}) ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`
				)
				.join('; ');
		}

		return summary;
	}

	/**
	 * Generate a basic summary without LLM processing
	 */
	private generateBasicSummary(primaryResults: SearchResult[]): string {
		if (primaryResults.length === 0) {
			return 'No relevant search results found.';
		}

		const resultCounts = this.countResultsBySource(primaryResults);
		let summary = `Found ${primaryResults.length} relevant results`;

		const sources = [];
		if ((resultCounts.graph || 0) > 0)
			sources.push(`${resultCounts.graph || 0} from knowledge graph`);
		if ((resultCounts.memory || 0) > 0) sources.push(`${resultCounts.memory || 0} from memory`);
		if ((resultCounts.reasoning_patterns || 0) > 0)
			sources.push(`${resultCounts.reasoning_patterns || 0} reasoning patterns`);

		if (sources.length > 0) {
			summary += ` (${sources.join(', ')})`;
		}

		return summary;
	}

	/**
	 * Count results by source
	 */
	private countResultsBySource(results: SearchResult[]): Record<string, number> {
		return results.reduce(
			(counts, result) => {
				counts[result.source] = (counts[result.source] || 0) + 1;
				return counts;
			},
			{} as Record<string, number>
		);
	}

	/**
	 * Get list of sources used in results
	 */
	private getSourcesUsed(results: SearchResult[]): string[] {
		const sources = new Set<string>();
		for (const result of results) {
			sources.add(result.source);
		}
		return Array.from(sources);
	}

	/**
	 * Cache search results for future reference
	 */
	private cacheSearchResults(_query: string, results: SearchResult[]): void {
		const now = Date.now();
		this.recentSearches.set(_query, { timestamp: now, results });

		// Clean up old cache entries (older than 1 hour)
		const oneHourAgo = now - 3600000;
		for (const [key, value] of this.recentSearches.entries()) {
			if (value.timestamp < oneHourAgo) {
				this.recentSearches.delete(key);
			}
		}
	}

	/**
	 * Get cached search results for a query
	 */
	getCachedResults(query: string): SearchResult[] | null {
		const cached = this.recentSearches.get(query);
		if (cached && Date.now() - cached.timestamp < 300000) {
			// 5 minutes
			return cached.results;
		}
		return null;
	}

	/**
	 * Update search context options
	 */
	updateOptions(newOptions: Partial<SearchContextOptions>): void {
		this.options = { ...this.options, ...newOptions };
		logger.debug('SearchContextManager: Updated options', { newOptions });
	}

	/**
	 * Get current search context options
	 */
	getOptions(): Required<SearchContextOptions> {
		return { ...this.options };
	}

	/**
	 * Clear search cache
	 */
	clearCache(): void {
		this.recentSearches.clear();
		logger.debug('SearchContextManager: Cache cleared');
	}
}
