import { BaseProvider } from './base.js';
import { SearchOptions, ProviderConfig, ExtractedContent, InternalSearchResult } from '../types.js';
import puppeteer from 'puppeteer';
import { logger } from '../../../../../logger/index.js';
import { env } from '../../../../../env.js';
import { URLSearchParams } from 'url';
import * as os from 'os';

/**
 * Get OS-specific Puppeteer launch arguments
 */
function getPuppeteerArgs(): string[] {
	const baseArgs = [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-blink-features=AutomationControlled',
		'--disable-web-security',
		'--disable-features=VizDisplayCompositor',
		'--disable-dev-shm-usage',
		'--disable-gpu',
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-extensions',
		'--disable-plugins',
		'--disable-background-timer-throttling',
		'--disable-backgrounding-occluded-windows',
		'--disable-renderer-backgrounding',
	];
	const platform = os.platform();

	if (platform === 'darwin') {
		return [
			...baseArgs,
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		];
	} else if (platform === 'win32') {
		return [
			...baseArgs,
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		];
	} else {
		return [
			...baseArgs,
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		];
	}
}

/**
 * Get OS-specific user agent string
 */
function getUserAgent(): string {
	const platform = os.platform();

	switch (platform) {
		case 'win32':
			return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		case 'darwin':
			return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		case 'linux':
			return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		default:
			return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
	}
}

export class DuckDuckGoPuppeteerProvider extends BaseProvider {
	name = 'duckduckgo-puppeteer' as const;
	private browser: any = null;

	constructor(config?: Partial<ProviderConfig>) {
		super(config);
		// Apply configuration recommendations after initialization
		const recommendations = this.getConfigRecommendations();
		this.updateConfig({
			...recommendations,
			...config,
			headers: {
				...recommendations.headers,
				...config?.headers,
			},
		});

		logger.info(`DuckDuckGo: Initialized for platform: ${os.platform()} (${os.arch()})`);
	}

	async search(query: string, opts: SearchOptions): Promise<InternalSearchResult[]> {
		let page: any = null;
		try {
			// Validate and sanitize query
			const sanitizedQuery = this.sanitizeQuery(query);
			if (!sanitizedQuery) {
				console.warn('DuckDuckGo Puppeteer: Empty or invalid query provided');
				return [];
			}

			// Launch browser if not already running
			if (!this.browser) {
				const puppeteerArgs = getPuppeteerArgs();
				logger.debug('DuckDuckGo: Launching browser with arguments', {
					platform: os.platform(),
					argsCount: puppeteerArgs.length,
				});

				this.browser = await puppeteer.launch({
					headless: true,
					args: puppeteerArgs,
				});
			}

			page = await this.browser.newPage();

			// Set viewport and user agent to mimic real browser
			await page.setViewport({ width: 1366, height: 768 });
			await page.setUserAgent(getUserAgent());

			// Set extra headers
			await page.setExtraHTTPHeaders({
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept-Encoding': 'gzip, deflate, br',
				DNT: '1',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			});

			// Build search URL
			const url = this.buildUrl(sanitizedQuery, opts);

			// Navigate to search page
			await page.goto(url, {
				waitUntil: 'networkidle0',
				timeout: 30000,
			});

			// Wait for search results to load
			try {
				// Wait for the main results container
				await page.waitForSelector('[data-testid="mainline"], .results--main', {
					timeout: 15000,
				});

				// Wait a bit more for results to populate
				await new Promise(resolve => setTimeout(resolve, 3000));

				// Wait for actual web result links (not DuckDuckGo internal links)
				await page.waitForFunction(
					() => {
						const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).filter(
							link => {
								const href = link.getAttribute('href') || '';
								const title = link.textContent?.trim() || '';
								return (
									!href.includes('duckduckgo.com') &&
									!href.includes('site%3A') &&
									!title.includes('Only include results for this site') &&
									!title.includes('More Images') &&
									!title.includes('News for') &&
									!title.includes('Images for') &&
									title.length > 10
								);
							}
						);
						return externalLinks.length >= 3; // Wait for at least 3 actual web results
					},
					{ timeout: 15000 }
				);
			} catch (e) {
				// Try waiting for any content that might contain results
				await new Promise(resolve => setTimeout(resolve, 5000));
			}

			// Get page content for debugging
			const pageContent = await page.content();
			// Extract results using Puppeteer's page evaluation
			const evaluationResult = await page.evaluate(
				(maxResults: number) => {
					const debugInfo: any = {
						title: document.title,
						url: window.location.href,
						hasAnomaly: false,
						selectorResults: {},
						totalLinks: 0,
						totalArticles: 0,
					};

					// Check if we're seeing a CAPTCHA or anomaly modal
					const anomalyModal = document.querySelector('.anomaly-modal__title');
					if (anomalyModal) {
						console.log(
							'DuckDuckGo Puppeteer: CAPTCHA/Anomaly detected:',
							anomalyModal.textContent
						);
						debugInfo.hasAnomaly = true;
						debugInfo.anomalyText = anomalyModal.textContent;
						return { results: [], debug: debugInfo };
					}

					// Try multiple selectors for modern DuckDuckGo
					const possibleSelectors = [
						'[data-testid="mainline"] article[data-testid="result"]', // Results in main area
						'[data-testid="mainline"] article', // Any articles in main area
						'.results--main article[data-testid="result"]',
						'.results--main article',
						'article[data-testid="result"]',
						'div[data-testid="result"]',
						'li[data-layout="organic"]',
						'ol.react-results--main > li',
						'[data-testid="web-vertical"] > ol > li',
					];
					let resultElements: Element[] = [];

					console.log('Going to test possible selectors:');
					for (const selector of possibleSelectors) {
						resultElements = Array.from(document.querySelectorAll(selector));

						if (resultElements.length > 0) {
							// Log some details about found elements

							// Check if these are site suggestions by looking at the links
							const firstLink = resultElements[0]?.querySelector('a[href]');
							const firstHref = firstLink?.getAttribute('href') || '';
							if (firstHref.includes('site%3A') || firstHref.startsWith('?q=')) {
								continue; // Keep looking for actual web results
							}
							break;
						}
					}

					// Since structured selectors often only find site suggestions,
					// let's prioritize external links as the primary source
					const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).filter(
						link => {
							const href = link.getAttribute('href') || '';
							const title = link.textContent?.trim() || '';
							return (
								!href.includes('duckduckgo.com') &&
								!href.includes('site%3A') &&
								!title.includes('Only include results for this site') &&
								!title.includes('More Images') &&
								!title.includes('News for') &&
								!title.includes('Images for') &&
								!title.includes('More at') &&
								!title.includes('All News') &&
								!title.includes('All Images') &&
								!title.startsWith('›') && // Skip breadcrumb navigation
								title.length > 10
							); // Ensure it's a meaningful title
						}
					);

					// Use external links as primary source if we have them
					if (externalLinks.length > 0) {
						resultElements = externalLinks.slice(0, 10);
					} else if (resultElements.length > 0) {
						// Fallback to structured elements if no external links found
						const firstLink = resultElements[0]?.querySelector('a[href]');
						const firstHref = firstLink?.getAttribute('href') || '';
						if (firstHref.includes('site%3A') || firstHref.startsWith('?q=')) {
							console.log(
								`DuckDuckGo Puppeteer: No good external links, keeping structured results for debugging`
							);
						}
					}

					// Collect debug information
					debugInfo.totalLinks = document.querySelectorAll('a[href]').length;
					debugInfo.totalArticles = document.querySelectorAll('article').length;

					// If no results found or only site suggestions, try external links as final fallback
					if (resultElements.length === 0) {
						const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).filter(
							link => {
								const href = link.getAttribute('href') || '';
								const title = link.textContent?.trim() || '';
								return (
									!href.includes('duckduckgo.com') &&
									!href.includes('site%3A') &&
									!title.includes('Only include results for this site') &&
									!title.includes('More Images') &&
									!title.includes('News for') &&
									!title.includes('Images for') &&
									!title.includes('More at') &&
									!title.includes('All News') &&
									!title.includes('All Images') &&
									!title.startsWith('›') && // Skip breadcrumb navigation
									title.length > 10
								); // Ensure it's a meaningful title
							}
						);

						resultElements = externalLinks.slice(0, 10);
					}

					const results: any[] = [];
					const seenDomains = new Set<string>(); // Track domains for diversity
					console.log('DuckDuckGo: Result elements:', resultElements);

					// Process results with domain diversity
					for (
						let index = 0;
						index < resultElements.length && results.length < (maxResults || 10);
						index++
					) {
						const element = resultElements[index];
						if (!element) {
							console.warn(`DuckDuckGo Puppeteer: No element found for index ${index}`);
							continue;
						}
						try {
							// Find title and URL - handle both article elements and direct link elements
							let titleElement;
							let href = '';
							let title = '';

							if (element.tagName.toLowerCase() === 'a') {
								// Element is a direct link
								titleElement = element as HTMLAnchorElement;
								href = titleElement.getAttribute('href') || '';
								title = titleElement.textContent?.trim() || '';
							} else {
								// Element is a container, find link inside
								titleElement = element.querySelector(
									'h3 a, h2 a, [data-testid="result-title-a"], a[href]'
								);
								if (!titleElement) {
									titleElement = element.querySelector('a[href^="http"]');
								}
								title = titleElement?.textContent?.trim() || '';
								href = titleElement?.getAttribute('href') || '';
							}

							// Find snippet/description
							let snippet = '';
							const snippetSelectors = [
								'[data-testid="result-snippet"]',
								'.result__snippet',
								'.result-snippet',
								'.snippet',
							];

							for (const snippetSelector of snippetSelectors) {
								const snippetElement = element.querySelector(snippetSelector);
								if (snippetElement) {
									snippet = snippetElement.textContent?.trim() || '';
									break;
								}
							}

							// Fallback to general text content for snippet
							if (!snippet) {
								snippet = element.textContent?.replace(title, '').trim().slice(0, 200) || '';
							}

							// Filter out site suggestions and non-web results
							const isSiteSuggestion =
								href.includes('site%3A') ||
								href.startsWith('?q=') ||
								title.includes('Only include results for this site');
							const isValidWebResult =
								title && href && href.startsWith('http') && !isSiteSuggestion;

							if (isValidWebResult) {
								try {
									const domain = new URL(href).hostname.toLowerCase();

									// Skip if we already have a result from this domain
									if (seenDomains.has(domain)) {
										console.warn(
											`DuckDuckGo Puppeteer: Skipping duplicate domain: ${domain} - "${title}"`
										);
										continue;
									}

									// Add domain to seen set
									seenDomains.add(domain);

									// Push to result array, this is the final result that will be returned to the user
									results.push({
										provider: 'duckduckgo',
										rankOnPage: results.length + 1,
										url: href,
										title: title,
										snippet: snippet,
										domain: domain,
										llmOptimized: {
											keyFacts: [],
											summary: snippet || title,
											relevanceScore: 0.5, // Default score, will be updated if content is fetched
											contentType: 'other' as const,
										},
									});

									console.warn(
										`DuckDuckGo Puppeteer: Added diverse result from ${domain}: "${title}"`
									);
								} catch (urlError) {
									console.warn(
										`DuckDuckGo Puppeteer: Invalid URL for result: "${href}" - "${title}"`
									);
								}
							} else {
								console.warn(
									`DuckDuckGo Puppeteer: Skipping non-web result: "${title}" - "${href}"`
								);
							}
						} catch (error) {
							console.warn('DuckDuckGo Puppeteer: Error extracting result:', error);
						}
					}

					console.log(
						`DuckDuckGo Puppeteer: Extracted ${results.length} diverse results from ${seenDomains.size} unique domains`
					);
					return { results, debug: debugInfo };
				},
				Number(opts.maxResults) || 3
			);

			// Optionally fetch HTML content for each result if requested
			if (evaluationResult.results.length > 0) {
				await this.fetchResultContent(evaluationResult.results, page, query);
			}
			console.log('Fetched content successfully, returning evaluation result');
			return evaluationResult.results;
		} catch (error) {
			console.error('DuckDuckGo Puppeteer search error:', error);
			return [];
		} finally {
			if (page) {
				await page.close();
			}
		}
	}

	private buildUrl(query: string, opts: SearchOptions): string {
		// Determine safe search mode
		let safeMode: string;
		if (opts.safeMode !== undefined) {
			// Use explicit option if provided
			safeMode = opts.safeMode ? 'strict' : 'moderate';
		} else {
			// Use environment variable as default
			safeMode = env.WEB_SEARCH_SAFETY_MODE === 'strict' ? 'strict' : 'moderate';
		}

		const params = new URLSearchParams({
			q: query,
			safe: safeMode,
			ia: 'web',
		});

		// Use the regular DuckDuckGo search endpoint
		console.log(`https://duckduckgo.com/?${params.toString()}`);
		return `https://duckduckgo.com/?${params.toString()}`;
	}

	private sanitizeQuery(query: string): string {
		if (!query || typeof query !== 'string') {
			return '';
		}
		return query.trim().slice(0, 500);
	}

	/**
	 * Fetch HTML content for each search result using guarded page navigation
	 */
	private async fetchResultContent(results: any[], page: any, query: string = ''): Promise<void> {
		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (!result || !result.url) {
				logger.warn(`DuckDuckGo Puppeteer: No URL found for result ${i + 1}`);
				continue;
			}

			try {
				logger.debug(
					`DuckDuckGo Puppeteer: Fetching content for ${i + 1}/${results.length}: ${result.url}`
				);

				// Use guarded approach for page navigation
				await this.guardedPageGoto(page, result.url);

				// Wait a bit for content to load
				await new Promise(resolve => setTimeout(resolve, 2000));

				// Extract structured content from the page
				const extractedContent = await this.extractContentFromPage(page);

				// Generate LLM-optimized content
				if (extractedContent && query) {
					const llmOptimizedContent = this.generateLLMOptimizedContent(extractedContent, query);
					if (llmOptimizedContent) {
						// Update the llmOptimized field in the result to match InternalSearchResult interface
						result.llmOptimized = llmOptimizedContent;
					}
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				logger.warn(
					`DuckDuckGo Puppeteer: Failed to fetch content for ${result.url}:`,
					errorMessage
				);
			}
		}

		// Sort results by relevance score after processing all content
		results.sort(
			(a, b) => (b.llmOptimized?.relevanceScore || 0) - (a.llmOptimized?.relevanceScore || 0)
		);
	}

	/**
	 * Extract structured content from the current page
	 */
	private async extractContentFromPage(page: any): Promise<ExtractedContent> {
		return await page.evaluate(() => {
			const extractedContent: ExtractedContent = {};

			// Extract page title
			extractedContent.pageTitle = document.title;

			// Extract meta description
			const metaDescription = document.querySelector('meta[name="description"]');
			if (metaDescription) {
				extractedContent.metaDescription = metaDescription.getAttribute('content') || '';
			}

			// Extract headings
			const headings: Array<{ level: number; text: string }> = [];
			for (let i = 1; i <= 6; i++) {
				const headerElements = document.querySelectorAll(`h${i}`);
				headerElements.forEach(el => {
					const text = el.textContent?.trim();
					if (text) {
						headings.push({ level: i, text });
					}
				});
			}
			extractedContent.headings = headings;

			// Extract paragraphs
			const paragraphs: string[] = [];
			const paragraphElements = document.querySelectorAll('p');
			paragraphElements.forEach(p => {
				const text = p.textContent?.trim();
				if (text && text.length > 20) {
					// Skip very short paragraphs
					paragraphs.push(text);
				}
			});
			extractedContent.paragraphs = paragraphs;

			// Extract main content text (try common content selectors)
			const contentSelectors = [
				'article',
				'main',
				'.content',
				'#content',
				'.post-content',
				'.entry-content',
				'[role="main"]',
			];

			let mainText = '';
			for (const selector of contentSelectors) {
				const contentEl = document.querySelector(selector);
				if (contentEl) {
					mainText = contentEl.textContent?.trim() || '';
					if (mainText.length > 100) break; // Found good content
				}
			}

			// Fallback to body if no main content found
			if (!mainText || mainText.length < 100) {
				mainText = document.body.textContent?.trim() || '';
			}

			extractedContent.mainText = mainText;
			// Extract text from lists
			const listTexts: string[] = [];

			// Get text from unordered lists
			const ulElements = document.querySelectorAll('ul');
			ulElements.forEach(ul => {
				const items: string[] = [];
				const liElements = ul.querySelectorAll('li');
				liElements.forEach(li => {
					const text = li.textContent?.trim();
					if (text && text.length > 5) items.push(text);
				});
				if (items.length > 0) {
					listTexts.push(items.join(' • '));
				}
			});

			// Get text from ordered lists
			const olElements = document.querySelectorAll('ol');
			olElements.forEach(ol => {
				const items: string[] = [];
				const liElements = ol.querySelectorAll('li');
				liElements.forEach((li, index) => {
					const text = li.textContent?.trim();
					if (text && text.length > 5) items.push(`${index + 1}. ${text}`);
				});
				if (items.length > 0) {
					listTexts.push(items.join(' '));
				}
			});

			extractedContent.listText = listTexts.slice(0, 10); // Limit to first 10 lists

			// Extract text from tables and convert to readable format
			const tableTexts: string[] = [];
			const tableElements = document.querySelectorAll('table');
			tableElements.forEach(table => {
				const headers: string[] = [];
				const rows: string[][] = [];

				// Extract headers
				const headerElements = table.querySelectorAll('th');
				headerElements.forEach(th => {
					const text = th.textContent?.trim();
					if (text) headers.push(text);
				});

				// Extract rows
				const rowElements = table.querySelectorAll('tr');
				rowElements.forEach(tr => {
					const cells: string[] = [];
					const cellElements = tr.querySelectorAll('td');
					cellElements.forEach(td => {
						const text = td.textContent?.trim();
						if (text) cells.push(text);
					});
					if (cells.length > 0) {
						rows.push(cells);
					}
				});

				// Convert table to readable text format
				if (headers.length > 0 || rows.length > 0) {
					let tableText = '';
					if (headers.length > 0) {
						tableText += `Headers: ${headers.join(' | ')}. `;
					}
					if (rows.length > 0) {
						const rowTexts = rows.map(row => row.join(' | ')).slice(0, 5); // Limit to first 5 rows
						tableText += `Data: ${rowTexts.join('. ')}`;
					}
					if (tableText.length > 10) {
						tableTexts.push(tableText);
					}
				}
			});

			extractedContent.tableText = tableTexts.slice(0, 5); // Limit to first 5 tables

			return extractedContent;
		});
	}

	/**
	 * Generate LLM-optimized content from extracted content
	 */
	private generateLLMOptimizedContent(
		extractedContent: ExtractedContent,
		query: string
	): ExtractedContent['llmOptimized'] {
		if (!extractedContent.mainText) return undefined;

		// Extract key facts
		const keyFacts = this.extractKeyFacts(extractedContent);

		// Generate summary
		const summary = this.generateContentSummary(extractedContent, query);

		// Calculate relevance score
		const relevanceScore = this.calculateRelevanceScore(extractedContent, query);

		// Classify content type
		const contentType = this.classifyContentType(extractedContent);

		return {
			keyFacts,
			summary,
			relevanceScore,
			contentType,
		};
	}

	/**
	 * Extract key facts from content
	 */
	private extractKeyFacts(content: ExtractedContent): string[] {
		const facts: string[] = [];

		// Extract from paragraphs - look for factual statements
		if (content.paragraphs) {
			content.paragraphs.forEach(para => {
				// Look for sentences with numbers, specific values, or definitive statements
				if (
					para.match(/\d+|port|version|API|endpoint|default|required|must|should/i) &&
					para.length < 300
				) {
					facts.push(para.trim());
				}
			});
		}

		// Extract from table data - these are often key facts
		if (content.tableText) {
			content.tableText.forEach(table => {
				if (table.length < 500) {
					facts.push(table);
				}
			});
		}

		return facts.slice(0, 8); // Limit to most important facts
	}

	/**
	 * Generate a concise summary optimized for LLM understanding
	 */
	private generateContentSummary(content: ExtractedContent, query: string): string {
		const summaryParts: string[] = [];

		if (content.pageTitle) {
			summaryParts.push(`Topic: ${content.pageTitle}`);
		}

		if (content.metaDescription) {
			summaryParts.push(content.metaDescription);
		}

		// Add most relevant paragraphs
		if (content.paragraphs) {
			const queryWords = query.toLowerCase().split(/\s+/);
			const relevantParagraphs = content.paragraphs
				.filter(para => {
					const paraLower = para.toLowerCase();
					return queryWords.some(word => paraLower.includes(word));
				})
				.slice(0, 2);

			if (relevantParagraphs.length > 0) {
				summaryParts.push(...relevantParagraphs);
			} else if (content.paragraphs.length > 0 && content.paragraphs[0]) {
				summaryParts.push(content.paragraphs[0]);
			}
		}

		return summaryParts.join(' ').substring(0, 800);
	}

	/**
	 * Calculate relevance score based on query match
	 */
	private calculateRelevanceScore(content: ExtractedContent, query: string): number {
		const queryWords = query
			.toLowerCase()
			.split(/\s+/)
			.filter(word => word.length > 2);
		const contentText = (content.mainText || '').toLowerCase();

		if (queryWords.length === 0 || !contentText) return 0;

		let matches = 0;
		let totalWords = queryWords.length;

		queryWords.forEach(word => {
			const regex = new RegExp(word, 'gi');
			const wordMatches = (contentText.match(regex) || []).length;
			if (wordMatches > 0) {
				matches += Math.min(wordMatches / 10, 1); // Cap influence of repeated words
			}
		});

		return parseFloat(Math.min(matches / totalWords, 1).toFixed(2));
	}

	/**
	 * Classify content type for better LLM understanding
	 */
	private classifyContentType(
		content: ExtractedContent
	): 'documentation' | 'tutorial' | 'article' | 'reference' | 'forum' | 'news' | 'other' {
		const text = (content.mainText || '').toLowerCase();
		const title = (content.pageTitle || '').toLowerCase();

		if (
			title.includes('docs') ||
			title.includes('documentation') ||
			text.includes('api reference')
		) {
			return 'documentation';
		}

		if (title.includes('tutorial') || title.includes('guide') || text.includes('step by step')) {
			return 'tutorial';
		}

		if (
			title.includes('forum') ||
			title.includes('discussion') ||
			text.includes('asked') ||
			text.includes('answered')
		) {
			return 'forum';
		}

		if (title.includes('news') || text.includes('published') || text.includes('breaking')) {
			return 'news';
		}

		if (text.includes('reference') || text.includes('specification')) {
			return 'reference';
		}

		if (text.includes('how to') || text.includes('tutorial')) {
			return 'tutorial';
		}

		return 'article';
	}

	/**
	 * Clean up browser instance
	 */
	async cleanup(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	/**
	 * Get provider-specific configuration recommendations
	 */
	public getConfigRecommendations(): Partial<ProviderConfig> {
		const platform = os.platform();

		// Adjust timeout based on platform (Linux containers might need more time)
		const timeout = platform === 'linux' ? 45000 : 30000;

		// Adjust rate limits based on platform performance characteristics
		const rateLimit =
			platform === 'win32'
				? { requestsPerMinute: 12, burstLimit: 4 } // Windows can handle slightly more
				: { requestsPerMinute: 10, burstLimit: 3 }; // Conservative for macOS/Linux

		return {
			timeout,
			maxRetries: 2,
			rateLimit,
			headers: {
				'User-Agent': getUserAgent(),
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept-Encoding': 'gzip, deflate, br',
				DNT: '1',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			},
		};
	}
}
