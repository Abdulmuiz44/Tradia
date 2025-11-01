/**
 * Web Search Module Constants
 *
 * Central location for all web search-related constants including
 * error messages, log prefixes, timeouts, and configuration defaults.
 *
 * @module web-search/constants
 */

/**
 * Log prefixes for consistent logging across the web search module
 */
export const LOG_PREFIXES = {
	MANAGER: '[WebSearch:Manager]',
	PROVIDER: '[WebSearch:Provider]',
	DUCKDUCKGO: '[WebSearch:DuckDuckGo]',
	FACTORY: '[WebSearch:Factory]',
	TOOL: '[WebSearch:Tool]',
	EXTRACTOR: '[WebSearch:Extractor]',
} as const;

/**
 * Error messages for the web search module
 */
export const ERROR_MESSAGES = {
	PROVIDER_NOT_FOUND: 'Web search provider not found',
	PROVIDER_DISABLED: 'Web search provider is disabled',
	SEARCH_FAILED: 'Web search operation failed',
	CONNECTION_FAILED: 'Failed to connect to web search provider',
	INVALID_CONFIG: 'Invalid web search configuration',
	TIMEOUT_EXCEEDED: 'Web search operation timed out',
	RATE_LIMITED: 'Web search rate limit exceeded',
	CONTENT_EXTRACTION_FAILED: 'Failed to extract content from search result',
} as const;

/**
 * Timeout constants for web search operations
 */
export const TIMEOUTS = {
	DEFAULT_SEARCH: 10000, // 10 seconds
	PROVIDER_CONNECTION: 5000, // 5 seconds
	CONTENT_EXTRACTION: 15000, // 15 seconds
	PAGE_LOAD: 30000, // 30 seconds for Puppeteer
} as const;

/**
 * Content extraction limits
 */
export const EXTRACTION_LIMITS = {
	MAX_TEXT_LENGTH: 2000,
	MAX_HEADINGS: 10,
	MAX_KEY_FACTS: 5,
	MAX_PARAGRAPHS: 20,
	MAX_LIST_ITEMS: 15,
} as const;

/**
 * Search engine specific constants
 */
export const SEARCH_ENGINES = {
	DUCKDUCKGO: 'duckduckgo',
} as const;

/**
 * Content type classifications
 */
export const CONTENT_TYPES = {
	DOCUMENTATION: 'documentation',
	TUTORIAL: 'tutorial',
	ARTICLE: 'article',
	REFERENCE: 'reference',
	FORUM: 'forum',
	NEWS: 'news',
	OTHER: 'other',
} as const;
