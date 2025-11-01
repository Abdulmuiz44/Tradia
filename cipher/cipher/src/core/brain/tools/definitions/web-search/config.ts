import { z } from 'zod';

const BaseWebSearchSchema = z.object({
	engine: z.enum(['duckduckgo']).default('duckduckgo'),
	config: z.record(z.any()).optional(),
});

const DuckDuckGoSchema = BaseWebSearchSchema.extend({
	engine: z.literal('duckduckgo'),
	headless: z.boolean().default(true),
	maxResults: z.number().default(3),
	timeout: z.number().default(10000),
}).strict();

export const WebSearchConfigSchema = z.discriminatedUnion('engine', [DuckDuckGoSchema]);

export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;

// Input schema for the web search tool
const WebSearchInputSchema = z.object({
	search_term: z
		.string()
		.describe(
			'The search term to look up on the web. Be specific and include relevant keywords for better results. For technical queries, include version numbers or dates if relevant.'
		),
	max_results: z
		.number()
		.min(1)
		.max(20)
		.default(3)
		.optional()
		.describe('Maximum number of search results to return (1-20)'),
	safe_mode: z
		.boolean()
		.default(true)
		.optional()
		.describe('Enable safe search mode to filter explicit content'),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export const SearchResultSchema = z.object({
	title: z.string().describe('The title of the search result'),
	url: z.string().describe('The URL of the search result'),
	snippet: z.string().describe('The snippet of the search result'),
	domain: z.string().describe('The domain of the search result'),
	relevanceScore: z.number().describe('The relevance score of the search result'),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
