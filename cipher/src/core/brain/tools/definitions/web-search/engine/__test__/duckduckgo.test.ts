/**
 * Comprehensive Unit Tests for DuckDuckGo Puppeteer Search Provider
 *
 * Tests all functionality including search operations, content extraction,
 * LLM optimization, error handling, and platform-specific configurations.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { DuckDuckGoPuppeteerProvider } from '../duckduckgo.js';
import { SearchOptions, InternalSearchResult, ExtractedContent } from '../../types.js';
import * as os from 'os';
import puppeteer from 'puppeteer';

// Mock Puppeteer
const mockPage = {
	setViewport: vi.fn().mockResolvedValue(undefined),
	setUserAgent: vi.fn().mockResolvedValue(undefined),
	setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
	goto: vi.fn().mockResolvedValue(undefined),
	waitForSelector: vi.fn().mockResolvedValue(undefined),
	waitForFunction: vi.fn().mockResolvedValue(undefined),
	screenshot: vi.fn().mockResolvedValue(undefined),
	content: vi.fn().mockResolvedValue('<html><body>test</body></html>'),
	evaluate: vi.fn(),
	close: vi.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
	newPage: vi.fn(() => Promise.resolve(mockPage)),
	close: vi.fn(),
};

vi.mock('puppeteer', () => ({
	default: {
		launch: vi.fn(() => Promise.resolve(mockBrowser)),
	},
}));

// Mock OS module
vi.mock('os', () => ({
	platform: vi.fn(() => 'darwin'),
	arch: vi.fn(() => 'x64'),
}));

// Mock logger
vi.mock('../../../../../logger/index.js', () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('DuckDuckGoPuppeteerProvider', () => {
	let provider: DuckDuckGoPuppeteerProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock implementations
		(puppeteer.launch as any).mockImplementation(() => Promise.resolve(mockBrowser));
		mockBrowser.newPage.mockImplementation(() => Promise.resolve(mockPage));

		// Reset all page mock functions to their default implementations
		mockPage.setViewport.mockResolvedValue(undefined);
		mockPage.setUserAgent.mockResolvedValue(undefined);
		mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
		mockPage.goto.mockResolvedValue(undefined);
		mockPage.waitForSelector.mockResolvedValue(undefined);
		mockPage.waitForFunction.mockResolvedValue(undefined);
		mockPage.screenshot.mockResolvedValue(undefined);
		mockPage.content.mockResolvedValue('<html><body>test</body></html>');
		mockPage.close.mockResolvedValue(undefined);

		provider = new DuckDuckGoPuppeteerProvider();
	});

	afterEach(async () => {
		await provider.cleanup();
	});

	describe('Initialization', () => {
		it('should initialize with default configuration', () => {
			expect(provider.name).toBe('duckduckgo-puppeteer');
			expect(provider.isReady()).toBe(true);
		});

		it('should apply custom configuration', () => {
			const customConfig = {
				timeout: 20000,
				maxRetries: 5,
				headers: { 'Custom-Header': 'test-value' },
			};

			const customProvider = new DuckDuckGoPuppeteerProvider(customConfig);
			const config = customProvider.getConfig();

			expect(config.timeout).toBe(20000);
			expect(config.maxRetries).toBe(5);
			expect(config.headers?.['Custom-Header']).toBe('test-value');
		});

		it('should get platform-specific configuration recommendations', () => {
			const recommendations = provider.getConfigRecommendations();

			expect(recommendations.timeout).toBeDefined();
			expect(recommendations.maxRetries).toBe(2);
			expect(recommendations.rateLimit).toBeDefined();
			expect(recommendations.headers).toBeDefined();
		});
	});

	describe('Platform-specific Configuration', () => {
		it('should return macOS configuration for darwin platform', () => {
			(os.platform as MockedFunction<typeof os.platform>).mockReturnValue('darwin');

			const provider = new DuckDuckGoPuppeteerProvider();
			const recommendations = provider.getConfigRecommendations();

			expect(recommendations.timeout).toBe(30000);
			expect(recommendations.rateLimit?.requestsPerMinute).toBe(10);
		});

		it('should return Windows configuration for win32 platform', () => {
			(os.platform as MockedFunction<typeof os.platform>).mockReturnValue('win32');

			const provider = new DuckDuckGoPuppeteerProvider();
			const recommendations = provider.getConfigRecommendations();

			expect(recommendations.timeout).toBe(30000);
			expect(recommendations.rateLimit?.requestsPerMinute).toBe(12);
		});

		it('should return Linux configuration for linux platform', () => {
			(os.platform as MockedFunction<typeof os.platform>).mockReturnValue('linux');

			const provider = new DuckDuckGoPuppeteerProvider();
			const recommendations = provider.getConfigRecommendations();

			expect(recommendations.timeout).toBe(45000);
			expect(recommendations.rateLimit?.requestsPerMinute).toBe(10);
		});
	});

	describe('Search Functionality', () => {
		const mockSearchResults = [
			{
				provider: 'duckduckgo',
				rankOnPage: 1,
				url: 'https://example.com/article1',
				title: 'Test Article 1',
				snippet: 'This is a test article about TypeScript',
				domain: 'example.com',
				llmOptimized: {
					keyFacts: ['TypeScript is a typed superset of JavaScript'],
					summary: 'Article about TypeScript development',
					relevanceScore: 0.8,
					contentType: 'article' as const,
				},
			},
		];

		beforeEach(() => {
			mockPage.evaluate.mockResolvedValue({
				results: mockSearchResults,
				debug: {
					title: 'DuckDuckGo Search Results',
					url: 'https://duckduckgo.com/?q=test',
					hasAnomaly: false,
					totalLinks: 10,
					totalArticles: 5,
				},
			});
		});

		it('should perform successful search with basic query', async () => {
			const options: SearchOptions = { maxResults: 3 };
			const results = await provider.search('TypeScript tutorial', options);

			expect(puppeteer.launch).toHaveBeenCalledWith({
				headless: true,
				args: expect.arrayContaining([
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-blink-features=AutomationControlled',
				]),
			});

			expect(mockPage.setViewport).toHaveBeenCalledWith({ width: 1366, height: 768 });
			expect(mockPage.setUserAgent).toHaveBeenCalled();
			expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
			expect(mockPage.goto).toHaveBeenCalledWith(
				expect.stringContaining('https://duckduckgo.com/?q=TypeScript+tutorial'), // URLSearchParams uses + for spaces
				{ waitUntil: 'networkidle0', timeout: 30000 }
			);

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
		}, 10000); // Increase timeout to 10 seconds

		it('should handle empty or invalid queries', async () => {
			const results1 = await provider.search('', {});
			const results2 = await provider.search('   ', {});

			expect(results1).toEqual([]);
			expect(results2).toEqual([]);
		});

		it('should handle CAPTCHA/anomaly detection', async () => {
			mockPage.evaluate.mockResolvedValue({
				results: [],
				debug: {
					hasAnomaly: true,
					anomalyText: 'Please complete the CAPTCHA',
				},
			});

			const results = await provider.search('test query', {});
			expect(results).toEqual([]);
		});

		it('should sanitize query properly', async () => {
			const longQuery = 'a'.repeat(600);
			await provider.search(longQuery, {});

			expect(mockPage.goto).toHaveBeenCalledWith(
				expect.stringContaining('a'.repeat(500).replace(/ /g, '+')), // URLSearchParams encoding
				expect.any(Object)
			);
		}, 10000); // Increase timeout

		it('should build URL with search options', async () => {
			const options: SearchOptions = {
				safeMode: true,
				maxResults: 5,
			};

			await provider.search('test query', options);

			expect(mockPage.goto).toHaveBeenCalledWith(
				expect.stringMatching(/safe=strict/),
				expect.any(Object)
			);
		}, 10000); // Increase timeout
	});

	describe('Content Extraction', () => {
		const mockExtractedContent: ExtractedContent = {
			pageTitle: 'Test Article',
			metaDescription: 'A test article about web development',
			headings: [
				{ level: 1, text: 'Introduction' },
				{ level: 2, text: 'Getting Started' },
			],
			paragraphs: [
				'This is the first paragraph with important information.',
				'Second paragraph contains more details about the topic.',
			],
			mainText: 'Full article content with detailed information about web development...',
			listText: ['Item 1', 'Item 2', 'Item 3'],
			tableText: ['Headers: Name | Age | City. Data: John | 25 | New York'],
		};

		beforeEach(() => {
			// Set default mock for search results evaluation
			mockPage.evaluate.mockResolvedValue({
				results: [
					{
						provider: 'duckduckgo',
						rankOnPage: 1,
						url: 'https://example.com/test',
						title: 'Test Page',
						snippet: 'Test snippet',
						domain: 'example.com',
						llmOptimized: {
							keyFacts: [],
							summary: 'Test summary',
							relevanceScore: 0.5,
							contentType: 'other' as const,
						},
					},
				],
				debug: { hasAnomaly: false },
			});
		});

		it('should extract structured content from page', async () => {
			// Reset the mock to ensure clean state
			mockPage.evaluate.mockReset();

			// Mock the search results evaluation to return results that will trigger content fetching
			mockPage.evaluate.mockResolvedValueOnce({
				results: [
					{
						provider: 'duckduckgo',
						rankOnPage: 1,
						url: 'https://example.com/test',
						title: 'Test Page',
						snippet: 'Test snippet',
						domain: 'example.com',
						llmOptimized: {
							keyFacts: [],
							summary: 'Test summary',
							relevanceScore: 0.5,
							contentType: 'other' as const,
						},
					},
				],
				debug: { hasAnomaly: false },
			});

			// Mock the content extraction evaluation (will be called when fetching content)
			mockPage.evaluate.mockResolvedValueOnce(mockExtractedContent);

			const results = await provider.search('test query', {});

			// Should have called goto twice: once for search, once for content
			expect(mockPage.goto).toHaveBeenCalledTimes(2);
			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
		}, 10000); // Increase timeout

		it('should generate LLM-optimized content', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			// Access private method for testing
			const generateMethod = (provider as any).generateLLMOptimizedContent.bind(provider);

			const optimized = generateMethod(mockExtractedContent, 'web development');

			expect(optimized).toBeDefined();
			expect(optimized.keyFacts).toBeInstanceOf(Array);
			expect(optimized.summary).toContain('Topic: Test Article');
			expect(optimized.relevanceScore).toBeGreaterThanOrEqual(0);
			expect(optimized.relevanceScore).toBeLessThanOrEqual(1);
			expect(optimized.contentType).toBe('article');
		});

		it('should extract key facts from content', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			const extractMethod = (provider as any).extractKeyFacts.bind(provider);

			const facts = extractMethod({
				paragraphs: [
					'The API endpoint is https://api.example.com/v1',
					'Default port is 8080 and requires authentication',
					'This is just regular text without specific facts',
				],
				tableText: ['Configuration: timeout | 30s. retries | 3'],
			});

			expect(facts).toContain('The API endpoint is https://api.example.com/v1');
			expect(facts).toContain('Default port is 8080 and requires authentication');
			expect(facts).toContain('Configuration: timeout | 30s. retries | 3');
			expect(facts).not.toContain('This is just regular text without specific facts');
		});

		it('should calculate relevance score correctly', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			const calculateMethod = (provider as any).calculateRelevanceScore.bind(provider);

			const content = {
				mainText: 'This article discusses TypeScript development and JavaScript programming',
			};

			const score1 = calculateMethod(content, 'TypeScript JavaScript');
			const score2 = calculateMethod(content, 'Python Django');

			expect(score1).toBeGreaterThan(score2);
			expect(score1).toBeGreaterThan(0);
			expect(score2).toBeGreaterThanOrEqual(0);
		});

		it('should classify content types correctly', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			const classifyMethod = (provider as any).classifyContentType.bind(provider);

			expect(
				classifyMethod({
					pageTitle: 'API Documentation',
					mainText: 'api reference documentation',
				})
			).toBe('documentation');

			expect(
				classifyMethod({
					pageTitle: 'How to Tutorial',
					mainText: 'step by step guide',
				})
			).toBe('tutorial');

			expect(
				classifyMethod({
					pageTitle: 'Stack Overflow Question',
					mainText: 'user asked about this problem',
				})
			).toBe('forum');

			expect(
				classifyMethod({
					pageTitle: 'Breaking News',
					mainText: 'published yesterday breaking news',
				})
			).toBe('news');

			expect(
				classifyMethod({
					pageTitle: 'Regular Article',
					mainText: 'general article content',
				})
			).toBe('article');
		});
	});

	describe('Error Handling', () => {
		it('should handle browser launch failure', async () => {
			(puppeteer.launch as MockedFunction<any>).mockRejectedValue(
				new Error('Failed to launch browser')
			);

			const results = await provider.search('test query', {});
			expect(results).toEqual([]);
		});

		it('should handle page navigation failure', async () => {
			mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

			const results = await provider.search('test query', {});
			expect(results).toEqual([]);
		});

		it('should handle page evaluation errors', async () => {
			mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

			const results = await provider.search('test query', {});
			expect(results).toEqual([]);
		});

		it('should handle content fetching errors gracefully', async () => {
			mockPage.evaluate.mockResolvedValueOnce({
				results: [
					{
						provider: 'duckduckgo',
						rankOnPage: 1,
						url: 'https://example.com/test',
						title: 'Test',
						snippet: 'Test snippet',
						domain: 'example.com',
						llmOptimized: {
							keyFacts: [],
							summary: 'Test',
							relevanceScore: 0.5,
							contentType: 'other' as const,
						},
					},
				],
				debug: { hasAnomaly: false },
			});

			// Make content fetching fail
			mockPage.goto.mockRejectedValueOnce(new Error('Content fetch failed'));

			const results = await provider.search('test query', {});
			expect(results).toBeDefined();
		});

		it('should close page even if errors occur', async () => {
			mockPage.evaluate.mockRejectedValue(new Error('Test error'));

			await provider.search('test query', {});
			expect(mockPage.close).toHaveBeenCalled();
		}, 10000); // Increase timeout
	});

	describe('Browser Management', () => {
		it('should reuse browser instance across searches', async () => {
			await provider.search('query 1', {});
			await provider.search('query 2', {});

			expect(puppeteer.launch).toHaveBeenCalledTimes(1);
			expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
		}, 15000); // Increase timeout for this test as it runs 2 searches

		it('should cleanup browser on cleanup call', async () => {
			await provider.search('test query', {});
			await provider.cleanup();

			expect(mockBrowser.close).toHaveBeenCalled();
		});

		it('should handle cleanup when no browser exists', async () => {
			await provider.cleanup();
			expect(mockBrowser.close).not.toHaveBeenCalled();
		});
	});

	describe('Utility Methods', () => {
		it('should sanitize queries correctly', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			const sanitizeMethod = (provider as any).sanitizeQuery.bind(provider);

			expect(sanitizeMethod('  test query  ')).toBe('test query');
			expect(sanitizeMethod('')).toBe('');
			expect(sanitizeMethod(null)).toBe('');
			expect(sanitizeMethod(undefined)).toBe('');
			expect(sanitizeMethod('a'.repeat(600))).toBe('a'.repeat(500));
		});

		it('should build URLs correctly', () => {
			const provider = new DuckDuckGoPuppeteerProvider();
			const buildUrlMethod = (provider as any).buildUrl.bind(provider);

			const url1 = buildUrlMethod('test query', {});
			expect(url1).toContain('https://duckduckgo.com/?q=test+query'); // URLSearchParams uses + for spaces
			expect(url1).toContain('ia=web');
			expect(url1).toContain('safe=moderate'); // Default when safeMode is not specified

			const url2 = buildUrlMethod('test', { safeMode: true });
			expect(url2).toContain('safe=strict');
		});
	});

	describe('Configuration Updates', () => {
		it('should allow configuration updates', () => {
			const newConfig = {
				timeout: 15000,
				maxRetries: 2,
				headers: { 'X-Custom': 'value' },
			};

			provider.updateConfig(newConfig);
			const config = provider.getConfig();

			expect(config.timeout).toBe(15000);
			expect(config.maxRetries).toBe(2);
			expect(config.headers?.['X-Custom']).toBe('value');
		});

		it('should provide statistics', () => {
			const stats = provider.getStats();
			expect(stats).toHaveProperty('requestCount');
			expect(stats).toHaveProperty('lastRequestTime');
		});

		it('should reset statistics', () => {
			provider.resetStats();
			const stats = provider.getStats();
			expect(stats.requestCount).toBe(0);
			expect(stats.lastRequestTime).toBe(0);
		});
	});
});
