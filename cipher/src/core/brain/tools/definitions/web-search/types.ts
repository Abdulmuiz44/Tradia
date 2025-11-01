export interface SearchOptions {
	/** Search query string */
	query?: string;
	/** Safe search mode */
	safeMode?: boolean;
	/** Maximum number of results to return */
	maxResults?: number;
	/** Timeout for search request in milliseconds */
	timeout?: number;
	/** Additional custom headers */
	headers?: Record<string, string>;
}

export interface ExtractedContent {
	/** Page title */
	pageTitle?: string;
	/** Meta description */
	metaDescription?: string;
	/** Extracted headings with their levels */
	headings?: Array<{ level: number; text: string }>;
	/** Extracted paragraphs */
	paragraphs?: string[];
	/** Main text content */
	mainText?: string;
	/** Text content from lists */
	listText?: string[];
	/** Text content from tables (converted to readable format) */
	tableText?: string[];
	/** LLM-optimized structured content */
	llmOptimized?: {
		/** Key facts extracted from the content */
		keyFacts: string[];
		/** Content summary optimized for LLM understanding */
		summary: string;
		/** Content relevance score to the search query (0-1) */
		relevanceScore: number;
		/** Content type classification */
		contentType:
			| 'documentation'
			| 'tutorial'
			| 'article'
			| 'reference'
			| 'forum'
			| 'news'
			| 'other';
	};
}

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
	domain: string;
	pageTitle?: string;
	headings?: Array<{ level: number; text: string }>;
	mainText?: string;
	/** LLM-optimized structured content */
	llmOptimized?: {
		/** Key facts extracted from the content */
		keyFacts: string[];
		/** Content summary optimized for LLM understanding */
		summary: string;
		/** Content relevance score to the search query (0-1) */
		relevanceScore: number;
		/** Content type classification */
		contentType:
			| 'documentation'
			| 'tutorial'
			| 'article'
			| 'reference'
			| 'forum'
			| 'news'
			| 'other';
	};
}

export interface SearchResponse {
	/** Whether the search was successful */
	success: boolean;
	/** Array of search results */
	results: InternalSearchResult[];
	/** Query that was actually executed (may differ from input due to processing) */
	executedQuery: string;
	/** Total execution time in milliseconds */
	executionTime: number;
	/** Error message if search failed */
	error?: string;
}

export interface ProviderConfig {
	/** Whether this provider is enabled */
	enabled: boolean;
	/** Provider name */
	name: string;
	/** Request timeout in milliseconds */
	timeout?: number;
	/** Maximum retries for failed requests */
	maxRetries?: number;
	/** Rate limiting configuration */
	rateLimit?: {
		/** Requests per minute */
		requestsPerMinute: number;
		/** Burst limit */
		burstLimit?: number;
	};
	/** Custom headers to send with requests */
	headers?: Record<string, string>;
}

export interface InternalSearchResult {
	provider: string;
	rankOnPage: number;
	url: string;
	title: string;
	snippet: string;
	domain: string;
	llmOptimized: {
		keyFacts: string[];
		summary: string;
		relevanceScore: number;
		contentType:
			| 'documentation'
			| 'tutorial'
			| 'article'
			| 'reference'
			| 'forum'
			| 'news'
			| 'other';
	};
}
