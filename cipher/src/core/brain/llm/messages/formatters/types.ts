import { InternalMessage } from '../types.js';

export interface IMessageFormatter {
	/**
	 * Format a single message into the specific structure of target LLM API.
	 * This method always returns an array for interface compatibility.
	 *
	 * @param message - The message to format.
	 * @param systemPrompt - Optional system prompt to include.
	 * @returns Array of formatted messages.
	 */
	format(message: Readonly<InternalMessage>, systemPrompt?: string | null): any[];

	/**
	 * Parse the response from the LLM into a list of internal messages
	 * @param response - The response from the LLM
	 * @returns A list of internal messages
	 */
	parseResponse(response: any): InternalMessage[];

	/**
	 * Parse the stream response from the LLM into a list of internal messages
	 * @param response - The stream response from the LLM
	 * @returns A list of internal messages
	 */
	parseStreamResponse?(response: any): Promise<InternalMessage[]>;
}
