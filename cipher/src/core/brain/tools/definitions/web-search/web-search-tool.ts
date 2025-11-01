import { InternalTool } from '../../types.js';
import { WebSearchManager } from './manager.js';
import { getWebSearchConfigFromEnv } from './factory.js';
import { createLogger } from '../../../../logger/index.js';
import { SearchOptions, SearchResponse } from './types.js';
import { WebSearchInput } from './config.js';

import { InternalSearchResult } from './types.js';

const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });

// Global web search manager instance
let webSearchManager: WebSearchManager | null = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

/**
 * Validate and sanitize search input
 */
function validateAndSanitizeInput(input: WebSearchInput): {
	isValid: boolean;
	sanitizedInput?: WebSearchInput;
	errors?: string[];
} {
	const errors: string[] = [];

	// Check search term
	if (!input.search_term || typeof input.search_term !== 'string') {
		errors.push('search_term is required and must be a string');
	} else if (input.search_term.trim().length === 0) {
		errors.push('search_term cannot be empty or whitespace only');
	} else if (input.search_term.length > 1000) {
		errors.push('search_term exceeds maximum length of 1000 characters');
	}

	// Check max_results
	if (input.max_results !== undefined) {
		if (
			typeof input.max_results !== 'number' ||
			input.max_results < 1 ||
			input.max_results > 20 ||
			!Number.isInteger(input.max_results)
		) {
			errors.push('max_results must be an integer between 1 and 20');
		}
	}

	// Check safe_mode
	if (input.safe_mode !== undefined && typeof input.safe_mode !== 'boolean') {
		errors.push('safe_mode must be a boolean');
	}

	if (errors.length > 0) {
		logger.warn('Input validation failed', {
			input: {
				search_term:
					input.search_term?.substring(0, 100) + (input.search_term?.length > 100 ? '...' : ''),
				max_results: input.max_results,
				safe_mode: input.safe_mode,
			},
			errors,
		});
		return { isValid: false, errors };
	}

	// Sanitize input
	const sanitizedInput: WebSearchInput = {
		search_term: input.search_term.trim(),
		max_results: input.max_results || 3,
		safe_mode: input.safe_mode !== false, // Default to true
	};

	logger.debug('Input validation successful', {
		originalInput: {
			search_term:
				input.search_term?.substring(0, 100) + (input.search_term?.length > 100 ? '...' : ''),
			max_results: input.max_results,
			safe_mode: input.safe_mode,
		},
		sanitizedInput: {
			search_term:
				sanitizedInput.search_term?.substring(0, 100) +
				(sanitizedInput.search_term?.length > 100 ? '...' : ''),
			max_results: sanitizedInput.max_results,
			safe_mode: sanitizedInput.safe_mode,
		},
	});

	return { isValid: true, sanitizedInput };
}

/**
 * Initialize the web search manager if not already initialized
 */
async function initializeWebSearchManager(): Promise<WebSearchManager> {
	const initStartTime = Date.now();
	initializationAttempts++;

	logger.debug('Attempting to initialize web search manager', {
		attempt: initializationAttempts,
		maxAttempts: MAX_INITIALIZATION_ATTEMPTS,
		managerExists: !!webSearchManager,
	});

	if (!webSearchManager) {
		try {
			// Check for configuration
			const config = await getWebSearchConfigFromEnv();
			if (!config) {
				const error =
					'No web search configuration available - check environment variables or config files';
				logger.error('Configuration retrieval failed', {
					attempt: initializationAttempts,
					configSource: 'environment',
					availableEnvVars: Object.keys(process.env).filter(
						key =>
							key.toLowerCase().includes('search') ||
							key.toLowerCase().includes('duck') ||
							key.toLowerCase().includes('web')
					),
				});
				throw new Error(error);
			}

			logger.debug('Configuration retrieved successfully', {
				configType: config.engine || 'unknown',
				hasApiKey: !!(config as any).apiKey,
				hasCustomHeaders: !!(config as any).headers,
				attempt: initializationAttempts,
			});

			// Create manager instance
			webSearchManager = new WebSearchManager(config);

			// Attempt connection with timeout
			const connectionPromise = webSearchManager.connect();
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Manager connection timeout after 30 seconds')), 30000)
			);

			await Promise.race([connectionPromise, timeoutPromise]);

			const initializationTime = Date.now() - initStartTime;
			logger.info('Web search manager initialized successfully', {
				attempt: initializationAttempts,
				initializationTime,
				engine: config.engine || 'unknown',
			});
		} catch (error) {
			const initializationTime = Date.now() - initStartTime;
			const errorMessage = error instanceof Error ? error.message : String(error);

			logger.error('Failed to initialize web search manager', {
				attempt: initializationAttempts,
				maxAttempts: MAX_INITIALIZATION_ATTEMPTS,
				initializationTime,
				error: errorMessage,
				errorType: error instanceof Error ? error.constructor.name : 'Unknown',
				stack: error instanceof Error ? error.stack : undefined,
			});

			// Clean up failed manager
			webSearchManager = null;

			if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
				const finalError = `Web search initialization failed after ${MAX_INITIALIZATION_ATTEMPTS} attempts: ${errorMessage}`;
				logger.error('Max initialization attempts reached', {
					totalAttempts: initializationAttempts,
					finalError,
				});
				throw new Error(finalError);
			}

			throw new Error(
				`Web search initialization failed (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS}): ${errorMessage}`
			);
		}
	} else {
		logger.debug('Using existing web search manager instance', {
			attempt: initializationAttempts,
			managerAge: Date.now() - initStartTime,
		});
	}

	return webSearchManager;
}

/**
 * Web search tool implementation
 */
export const webSearchTool: InternalTool = {
	name: 'web_search',
	category: 'system',
	internal: true,
	agentAccessible: true,
	description:
		'Search the web for real-time information about any topic. Use this tool when you need up-to-date information that might not be available in memory, or when you need to verify current facts. The search results will include relevant snippets and URLs from web pages.',
	parameters: {
		type: 'object',
		properties: {
			search_term: {
				type: 'string',
				description:
					'The search term to look up on the web. Be specific and include relevant keywords for better results. For technical queries, include version numbers or dates if relevant.',
			},
			max_results: {
				type: 'number',
				minimum: 1,
				maximum: 20,
				default: 10,
				description: 'Maximum number of search results to return (1-20)',
			},
			safe_mode: {
				type: 'boolean',
				default: true,
				description: 'Enable safe search mode to filter explicit content',
			},
		},
		required: ['search_term'],
	},
	handler: async (input: WebSearchInput): Promise<SearchResponse> => {
		const handlerStartTime = Date.now();
		const requestId = Math.random().toString(36).substring(2, 15);

		logger.info('Web search tool handler started', {
			requestId,
			searchTerm:
				input.search_term?.substring(0, 100) + (input.search_term?.length > 100 ? '...' : ''),
			maxResults: input.max_results,
			safeMode: input.safe_mode,
			timestamp: new Date().toISOString(),
		});

		try {
			// Input validation and sanitization
			const validationResult = validateAndSanitizeInput(input);
			if (!validationResult.isValid) {
				const validationError = `Input validation failed: ${validationResult.errors?.join(', ')}`;
				logger.error('Input validation failed', {
					requestId,
					errors: validationResult.errors,
					originalInput: input,
				});

				return {
					success: false,
					results: [],
					executedQuery: input.search_term || '',
					executionTime: Date.now() - handlerStartTime,
					error: validationError,
				};
			}

			const sanitizedInput = validationResult.sanitizedInput!;

			// Initialize the web search manager
			const initStartTime = Date.now();
			const manager = await initializeWebSearchManager();
			const initTime = Date.now() - initStartTime;

			logger.debug('Manager initialization completed', {
				requestId,
				initTime,
				managerType: manager.constructor.name,
			});

			// Prepare search options
			const searchOptions: SearchOptions = {
				maxResults: sanitizedInput.max_results || 3,
				...(sanitizedInput.safe_mode !== undefined && { safeMode: sanitizedInput.safe_mode }),
			};

			logger.debug('Search options prepared', {
				requestId,
				searchOptions,
				searchTerm: sanitizedInput.search_term.substring(0, 100),
			});

			// Perform the search
			const searchStartTime = Date.now();
			const searchResponse: SearchResponse = await manager.search(
				sanitizedInput.search_term,
				searchOptions
			);
			const searchTime = Date.now() - searchStartTime;

			logger.info('Search execution completed', {
				requestId,
				searchTime,
				success: searchResponse.success,
				executionTime: searchResponse.executionTime,
				searchTerm: sanitizedInput.search_term.substring(0, 100),
			});

			if (!searchResponse.success) {
				logger.error('Search operation failed', {
					requestId,
					searchTime,
					error: searchResponse.error,
					executedQuery: searchResponse.executedQuery,
					searchTerm: sanitizedInput.search_term.substring(0, 100),
				});

				return {
					success: false,
					results: [],
					executedQuery: sanitizedInput.search_term,
					executionTime: searchResponse.executionTime || searchTime,
					error: searchResponse.error || 'Search failed for unknown reason',
				};
			}

			logger.debug('🔧 Web search tool execution completed successfully', {
				success: true,
				results: searchResponse.results,
				executedQuery: sanitizedInput.search_term,
				executionTime: searchResponse.executionTime || searchTime,
			});

			return {
				success: true,
				results: searchResponse.results,
				executedQuery: sanitizedInput.search_term,
				executionTime: searchResponse.executionTime || searchTime,
			};
		} catch (error) {
			const totalTime = Date.now() - handlerStartTime;
			const errorMessage = error instanceof Error ? error.message : String(error);

			logger.error('Web search tool execution failed', {
				requestId,
				totalTime,
				results: [],
				searchTerm: input.search_term?.substring(0, 100),
				error: errorMessage,
				errorType: error instanceof Error ? error.constructor.name : 'Unknown',
				stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
				initializationAttempts,
			});

			return {
				success: false,
				results: [],
				executedQuery: input.search_term || '',
				executionTime: totalTime,
				error: `Web search failed: ${errorMessage}`,
			};
		}
	},
};

/**
 * Get web search tools (for integration with the tools system)
 */
export function getWebSearchTools(): Record<string, InternalTool> {
	logger.debug('Web search tools requested', {
		toolsAvailable: ['web_search'],
		managerInitialized: !!webSearchManager,
	});

	return {
		web_search: webSearchTool,
	};
}

/**
 * Cleanup function to disconnect the web search manager
 */
export async function cleanupWebSearch(): Promise<void> {
	const cleanupStartTime = Date.now();

	if (webSearchManager) {
		try {
			await webSearchManager.disconnect();
			const cleanupTime = Date.now() - cleanupStartTime;

			logger.info('Web search manager cleaned up successfully', {
				cleanupTime,
				initializationAttempts: initializationAttempts,
			});

			webSearchManager = null;
			initializationAttempts = 0; // Reset for future use
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('Error during web search cleanup', {
				error: errorMessage,
				cleanupTime: Date.now() - cleanupStartTime,
			});

			// Force cleanup even if disconnect fails
			webSearchManager = null;
			initializationAttempts = 0;
		}
	} else {
		logger.debug('No web search manager to clean up');
	}
}
