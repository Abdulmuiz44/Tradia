import { SearchOptions, ProviderConfig, InternalSearchResult } from '../types.js';

/**
 * Abstract base class for web search providers
 */
export abstract class BaseProvider {
	protected config: ProviderConfig;
	protected requestCount = 0;
	protected lastRequestTime = 0;

	/** Provider name identifier */
	abstract readonly name: string;

	constructor(config: Partial<ProviderConfig> = {}) {
		this.config = {
			enabled: true,
			name: config.name || 'unknown',
			timeout: 10000, // 10 seconds default
			maxRetries: 3,
			rateLimit: {
				requestsPerMinute: 60,
				burstLimit: 10,
			},
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; CipherBot/1.0; +https://byterover.com)',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate',
				DNT: '1',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			},
			...config,
		};
	}

	/**
	 * Abstract search method that must be implemented by each provider
	 */
	abstract search(query: string, options: SearchOptions): Promise<InternalSearchResult[]>;

	/**
	 * Guarded page navigation with retry logic and error handling
	 * Can be used by providers that use Puppeteer or similar page-based navigation
	 */
	protected async guardedPageGoto(page: any, url: string): Promise<void> {
		if (!this.config.enabled) {
			throw new Error(`Provider ${this.config.name} is disabled`);
		}

		// Rate limiting check
		await this.enforceRateLimit();

		const maxRetries = this.config.maxRetries ?? 3;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				this.requestCount++;
				this.lastRequestTime = Date.now();

				// Navigate to the result URL with timeout
				await page.goto(url, {
					waitUntil: 'domcontentloaded',
					timeout: this.config.timeout || 15000,
				});

				// Success - return without error
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Don't retry on certain errors
				if (
					error instanceof Error &&
					(error.message.includes('timeout') ||
						error.message.includes('net::ERR_') ||
						error.message.includes('Navigation timeout'))
				) {
					// For navigation errors, log and continue with retry
					console.debug(`Navigation error on attempt ${attempt + 1} for ${url}:`, error.message);
				}

				// Wait before retrying (exponential backoff)
				if (attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		// If we get here, all retries failed
		console.warn(
			`Failed to navigate to ${url} after ${maxRetries + 1} attempts:`,
			lastError?.message
		);
		throw lastError || new Error(`Failed to navigate to ${url}`);
	}

	/**
	 * Enforce rate limiting based on configuration
	 */
	private async enforceRateLimit(): Promise<void> {
		if (!this.config.rateLimit) return;

		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		const minInterval = 60000 / this.config.rateLimit.requestsPerMinute; // ms between requests

		if (timeSinceLastRequest < minInterval) {
			const delay = minInterval - timeSinceLastRequest;
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	/**
	 * Get provider configuration
	 */
	public getConfig(): ProviderConfig {
		return { ...this.config };
	}

	/**
	 * Update provider configuration
	 */
	public updateConfig(config: Partial<ProviderConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get provider statistics
	 */
	public getStats(): { requestCount: number; lastRequestTime: number } {
		return {
			requestCount: this.requestCount,
			lastRequestTime: this.lastRequestTime,
		};
	}

	/**
	 * Reset provider statistics
	 */
	public resetStats(): void {
		this.requestCount = 0;
		this.lastRequestTime = 0;
	}

	/**
	 * Check if provider is enabled and ready
	 */
	public isReady(): boolean {
		return this.config.enabled;
	}

	/**
	 * Clean and validate URL
	 */
	protected cleanUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.href;
		} catch {
			return '';
		}
	}

	/**
	 * Extract domain from URL
	 */
	protected extractDomain(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname;
		} catch {
			return '';
		}
	}

	/**
	 * Sanitize text content
	 */
	protected sanitizeText(text: string): string {
		return text
			.replace(/\s+/g, ' ') // Replace multiple whitespace with single space
			.replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with space
			.trim();
	}
}
