import { createLogger } from '../../../../logger/index.js';
import { env } from '../../../../env.js';
import { DuckDuckGoPuppeteerProvider } from './engine/duckduckgo.js';
import { BaseProvider } from './engine/base.js';
import { WebSearchConfig } from './config.js';

const logger = createLogger({ level: env.CIPHER_LOG_LEVEL });

export function createWebSearchProvider(
	searchEngine: string,
	searchEngineConfig?: any
): BaseProvider | null {
	if (searchEngine === 'duckduckgo') {
		return new DuckDuckGoPuppeteerProvider(searchEngineConfig);
	}
	logger.error('Unknown web search engine', { searchEngine });
	return null;
}

export function getDefaultWebSearchConfig(): WebSearchConfig {
	return {
		engine: 'duckduckgo' as const,
		headless: true,
		maxResults: 2,
		timeout: 10000,
		config: {
			timeout: 10000,
			maxRetries: 2,
			rateLimit: {
				requestsPerMinute: 10,
				burstLimit: 3,
			},
		},
	};
}

export async function getWebSearchConfigFromEnv(
	agentConfig?: any
): Promise<WebSearchConfig | null> {
	// Start with default configuration
	const defaultConfig = getDefaultWebSearchConfig();

	// Override with environment variables
	const searchEngine = env.WEB_SEARCH_ENGINE;
	const searchEngineConfig = agentConfig?.webSearch?.[searchEngine];

	if (searchEngine === 'duckduckgo') {
		return {
			engine: 'duckduckgo' as const,
			headless: true,
			maxResults: env.WEB_SEARCH_MAX_RESULTS, // Use env var
			timeout: defaultConfig.timeout,
			config: {
				...defaultConfig.config,
				...searchEngineConfig, // Allow agent config to override
				rateLimit: {
					requestsPerMinute: env.WEB_SEARCH_RATE_LIMIT, // Use env var
					burstLimit: defaultConfig.config?.rateLimit?.burstLimit || 3,
					...(searchEngineConfig?.rateLimit || {}), // Allow agent config to override
				},
			},
		};
	}

	logger.warn('Unknown web search engine', { searchEngine });
	return null;
}

export async function createWebSearchProviderFromEnv(
	searchToolConfig?: any
): Promise<BaseProvider | null> {
	const config = await getWebSearchConfigFromEnv(searchToolConfig);
	if (!config) {
		return null;
	}

	return createWebSearchProvider(config.engine, config.config);
}
