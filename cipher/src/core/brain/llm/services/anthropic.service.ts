import { logger } from 'src/core/logger/index.js';

export class AnthropicService {
	private contextManager: any;
	private unifiedToolManager: any;
	private config: any;

	constructor(contextManager: any, unifiedToolManager: any, config: any) {
		this.contextManager = contextManager;
		this.unifiedToolManager = unifiedToolManager;
		this.config = config;
	}

	async generate(
		input: string,
		imageDataInput?: { image: string; mimeType: string },
		stream: boolean = false
	): Promise<string> {
		try {
			// Check for file references in user input and attempt to find them
			const fileReferences = this.extractFileReferences(input);
			let contextualInfo = '';

			if (fileReferences.length > 0 && this.unifiedToolManager) {
				contextualInfo = await this.searchForReferencedFiles(fileReferences);
			}

			// Add the user message to context
			this.contextManager.addUserMessage(input, imageDataInput);

			// Get the current context for the API call
			const messages = this.contextManager.getMessages();

			// Add contextual file information if found
			if (contextualInfo) {
				// Insert context before the last user message
				const lastUserMessageIndex = messages.length - 1;
				if (lastUserMessageIndex >= 0 && messages[lastUserMessageIndex].role === 'user') {
					const lastMessage = messages[lastUserMessageIndex];
					if (Array.isArray(lastMessage.content) && lastMessage.content.length > 0) {
						const lastContent = lastMessage.content[lastMessage.content.length - 1];
						if (lastContent.type === 'text') {
							lastContent.text = `${contextualInfo}\n\n${lastContent.text}`;
						}
					}
				}
			}

			const systemMessage = this.contextManager.getSystemMessage();

			logger.debug('AnthropicService: Sending request to Anthropic API', {
				messageCount: messages.length,
				hasSystem: !!systemMessage,
				stream,
				model: this.config.anthropic?.model || 'claude-3-5-sonnet-20241022',
				hasFileContext: !!contextualInfo,
			});

			// ... existing code ...
			// ... existing code ...
			// Add a dummy return for now (replace with actual result if available)
			return '';
		} catch (error) {
			logger.error('AnthropicService: Error generating response', { error });
			throw error;
		}
	}

	/**
	 * Extract potential file references from user input
	 */
	private extractFileReferences(input: string): string[] {
		const fileReferences: string[] = [];

		// Look for common file patterns
		const patterns = [
			// Files with extensions
			/\b[\w-]+\.[a-zA-Z0-9]{1,10}\b/g,
			// Quoted filenames
			/["'`]([^"'`]*\.[a-zA-Z0-9]{1,10})["'`]/g,
			// Files in paths
			/[\w\-/.]+\.[a-zA-Z0-9]{1,10}/g,
		];

		for (const pattern of patterns) {
			const matches = input.match(pattern);
			if (matches) {
				fileReferences.push(...matches.map(match => match.replace(/["'`]/g, '').trim()));
			}
		}

		// Remove duplicates and filter out common non-file extensions
		const excludeExtensions = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co'];
		return [...new Set(fileReferences)].filter(ref => {
			const ext = ref.split('.').pop()?.toLowerCase();
			return ext && !excludeExtensions.includes(ext) && ref.length < 100;
		});
	}

	/**
	 * Search for referenced files and return contextual information
	 */
	private async searchForReferencedFiles(fileReferences: string[]): Promise<string> {
		if (!this.unifiedToolManager || fileReferences.length === 0) {
			return '';
		}

		const foundFiles: string[] = [];

		for (const fileRef of fileReferences.slice(0, 3)) {
			// Limit to 3 files to avoid spam
			try {
				// Use file_search tool to find the file
				const searchResult = await this.unifiedToolManager.executeTool(
					'file_search',
					{
						query: fileRef,
						explanation: `Searching for file referenced by user: ${fileRef}`,
					},
					undefined
				); // No sessionId available in this context

				if (searchResult && Array.isArray(searchResult) && searchResult.length > 0) {
					foundFiles.push(`Found file: ${fileRef} at ${searchResult[0]}`);
				}
			} catch (error) {
				// Silently continue if file search fails
				logger.debug('AnthropicService: File search failed', {
					file: fileRef,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (foundFiles.length > 0) {
			return `[Context: Located referenced files]\n${foundFiles.join('\n')}\n`;
		}

		return '';
	}
}
