/**
 * Web Search Tools Module
 *
 * Provides web search capabilities for the Cipher AI system using various search engines.
 * Currently supports DuckDuckGo with Puppeteer-based scraping.
 *
 * @module WebSearch
 */

// Core components
export { WebSearchManager } from './manager.js';
export { BaseProvider } from './engine/base.js';
export { DuckDuckGoPuppeteerProvider } from './engine/duckduckgo.js';

// Configuration and factory
export { WebSearchConfig, WebSearchConfigSchema } from './config.js';
export {
	createWebSearchProvider,
	getWebSearchConfigFromEnv,
	createWebSearchProviderFromEnv,
} from './factory.js';

// Constants
export {
	LOG_PREFIXES,
	ERROR_MESSAGES,
	TIMEOUTS,
	EXTRACTION_LIMITS,
	SEARCH_ENGINES,
	CONTENT_TYPES,
} from './constants.js';

// Types
export type {
	SearchOptions,
	SearchResult,
	SearchResponse,
	ExtractedContent,
	ProviderConfig,
	InternalSearchResult,
} from './types.js';

// Tool integration
export { webSearchTool, getWebSearchTools, cleanupWebSearch } from './web-search-tool.js';

/**
 * Check if web search is available based on environment configuration
 */
export function isWebSearchAvailable(): boolean {
	try {
		// Check if required environment variables or configs are available
		const searchEngine = process.env.WEB_SEARCH_ENGINE || 'duckduckgo';
		return searchEngine === 'duckduckgo'; // Currently only DuckDuckGo is supported
	} catch {
		return false;
	}
}

/**
 * Get web search configuration summary for debugging
 */
export function getWebSearchInfo() {
	return {
		availableEngines: ['duckduckgo'],
		defaultEngine: process.env.WEB_SEARCH_ENGINE || 'duckduckgo',
		isAvailable: isWebSearchAvailable(),
		version: '1.0.0',
	};
}

import type { InternalToolSet } from '../../types.js';
import { getWebSearchTools } from './web-search-tool.js';

/**
 * Get all system tools
 */
export function getSystemTools(): InternalToolSet {
	const webSearchTools = getWebSearchTools();

	return {
		...webSearchTools,
	};
}
