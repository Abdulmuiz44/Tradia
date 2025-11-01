import { logger } from '../../../../logger/index.js';
import { InternalMessage } from '../types.js';
import { getImageData } from '../utils.js';
import { IMessageFormatter } from './types.js';

/**
 * Message formatter for Anthropic
 *
 * Usage examples:
 *
 * // For single messages without needing an array wrapper:
 * const singleMsg = formatter.formatSingle(message);
 *
 * // For single messages with system prompt (returns array):
 * const withSystem = formatter.formatSingle(message, systemPrompt);
 *
 * // For multiple messages efficiently:
 * const multipleFormatted = formatter.formatMultiple(messages, systemPrompt);
 *
 * // For interface compatibility (always returns array):
 * const compatibleFormat = formatter.format(message, systemPrompt);
 */
export class AnthropicMessageFormatter implements IMessageFormatter {
	/**
	 * Format the message into the specific structure of target LLM API.
	 * This method maintains compatibility with the interface but is more efficient for single messages.
	 *
	 * @param message - The message to format.
	 * @param systemPrompt - The system prompt to include (optional).
	 * @returns The formatted message array.
	 */
	format(message: Readonly<InternalMessage>, systemPrompt: string | null = null): any[] {
		const result = this.formatSingle(message, systemPrompt);
		return Array.isArray(result) ? result : [result];
	}

	/**
	 * Format a single message more efficiently without always creating an array.
	 * Use this when you know you're processing a single message and want optimal performance.
	 *
	 * @param message - The message to format.
	 * @param systemPrompt - The system prompt to include (optional).
	 * @returns A single formatted message object or array if system prompt is included.
	 */
	formatSingle(
		message: Readonly<InternalMessage>,
		systemPrompt: string | null = null
	): any | any[] {
		// Anthropic handles system prompts differently - they're passed separately to the API
		// So we don't include system prompts in the message formatting
		if (systemPrompt) {
			logger.debug(
				'System prompt provided for Anthropic formatter - will be handled separately by the service'
			);
		}

		// For Anthropic, we always return just the formatted message
		// System prompts are handled at the API level, not in message formatting
		return this.formatMessageOnly(message);
	}

	/**
	 * Format multiple messages efficiently.
	 *
	 * @param messages - Array of messages to format.
	 * @param systemPrompt - The system prompt to include (optional).
	 * @returns Array of formatted messages.
	 */
	formatMultiple(messages: Readonly<InternalMessage[]>, systemPrompt: string | null = null): any[] {
		if (systemPrompt) {
			logger.debug(
				'System prompt provided for Anthropic formatter - will be handled separately by the service'
			);
		}

		return messages.map(message => this.formatMessageOnly(message));
	}

	/**
	 * Format a single message without any system prompt handling.
	 * This is the core formatting logic extracted for reuse.
	 *
	 * @param message - The message to format.
	 * @returns The formatted message object.
	 */
	private formatMessageOnly(message: Readonly<InternalMessage>): any {
		switch (message.role) {
			case 'system':
				// System messages are handled separately in Anthropic API
				logger.warn(
					'System message encountered in Anthropic formatter - should be handled at API level'
				);
				return null;

			case 'user':
				// Handle tool results as special user messages
				if (message.toolCallId) {
					return {
						role: 'user',
						content: [
							{
								type: 'tool_result',
								tool_use_id: message.toolCallId,
								content: message.content,
							},
						],
					};
				}
				// Regular user message
				return {
					role: 'user',
					content: this.formatUserContent(message.content),
				};

			case 'assistant':
				if (message.toolCalls && message.toolCalls.length > 0) {
					const contentArray = [];

					// Add text content if present
					if (message.content) {
						contentArray.push({
							type: 'text',
							text: message.content,
						});
					}

					// Add tool calls
					for (const toolCall of message.toolCalls) {
						contentArray.push({
							type: 'tool_use',
							id: toolCall.id,
							name: toolCall.function.name,
							input: JSON.parse(toolCall.function.arguments),
						});
					}

					return {
						role: 'assistant',
						content: contentArray,
					};
				} else {
					return {
						role: 'assistant',
						content: message.content,
					};
				}

			case 'tool':
				// Tool messages are converted to user messages with tool_result content
				return {
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: message.toolCallId!,
							content: message.content!,
						},
					],
				};

			default:
				throw new Error(`Unsupported message role: ${(message as any).role}`);
		}
	}

	parseResponse(response: any): InternalMessage[] {
		const internal: InternalMessage[] = [];
		if (!response || !Array.isArray(response.content)) {
			return internal;
		}
		let combinedText: string | null = null;
		const calls: InternalMessage['toolCalls'] = [];
		for (const block of response.content) {
			if (block.type === 'text') {
				combinedText = (combinedText ?? '') + block.text;
			} else if (block.type === 'tool_use') {
				calls.push({
					id: block.id,
					type: 'function',
					function: {
						name: block.name,
						arguments: JSON.stringify(block.input),
					},
				});
			}
		}
		const assistantMessage: any = {
			role: 'assistant',
			content: combinedText,
		};
		if (calls.length > 0) {
			assistantMessage.toolCalls = calls;
		}
		internal.push(assistantMessage);
		return internal;
	}

	/**
	 * Format the user content into the specific structure of Anthropic API.
	 *
	 * @param content - The user content to format.
	 * @returns The formatted user content.
	 */
	private formatUserContent(content: InternalMessage['content']): any {
		if (!Array.isArray(content)) {
			return content;
		}
		return content
			.map(part => {
				if (part.type === 'text') {
					return { type: 'text', text: part.text };
				}
				if (part.type === 'image') {
					const raw = getImageData(part);
					let source: any;
					if (raw.startsWith('http://') || raw.startsWith('https://')) {
						source = { type: 'url', url: raw };
					} else if (raw.startsWith('data:')) {
						// Data URI: split metadata and base64 data
						const [meta, b64] = raw.split(',', 2);
						const mediaTypeMatch = meta?.match(/data:(.*);base64/);
						const media_type =
							(mediaTypeMatch && mediaTypeMatch[1]) || part.mimeType || 'application/octet-stream';
						source = { type: 'base64', media_type, data: b64 };
					} else {
						// Plain base64 string
						source = { type: 'base64', media_type: part.mimeType, data: raw };
					}
					return { type: 'image', source };
				}
				return null;
			})
			.filter(Boolean);
	}
}
