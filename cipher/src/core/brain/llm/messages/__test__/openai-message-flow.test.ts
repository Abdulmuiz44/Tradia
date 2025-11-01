/**
 * OpenAI Message Flow Validation Tests
 *
 * Tests for the OpenAI message flow validation and repair functionality.
 * Ensures that tool messages always follow assistant messages with tool_calls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextManager } from '../manager.js';
import { OpenAIMessageFormatter } from '../formatters/openai.js';
import { EnhancedPromptManager } from '../../../brain/systemPrompt/enhanced-manager.js';
import { InternalMessage } from '../types.js';

// Mock the logger
const mockLogger = {
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
};

vi.mock('../../../logger/index.js', () => ({
	logger: mockLogger,
}));

// Mock the prompt manager
const mockPromptManager = {
	generateSystemPrompt: vi.fn().mockResolvedValue({ content: 'Test system prompt' }),
} as unknown as EnhancedPromptManager;

describe('OpenAI Message Flow Validation', () => {
	let contextManager: ContextManager;
	let formatter: OpenAIMessageFormatter;

	beforeEach(() => {
		formatter = new OpenAIMessageFormatter();
		contextManager = new ContextManager(formatter, mockPromptManager, undefined, undefined);
		// Reset mock calls before each test
		vi.clearAllMocks();
	});

	describe('Valid Message Flows', () => {
		it('should handle normal conversation flow', async () => {
			await contextManager.addUserMessage('Hello');
			await contextManager.addAssistantMessage('Hi there!');
			await contextManager.addUserMessage('How are you?');
			await contextManager.addAssistantMessage('I am doing well, thank you!');

			const formatted = await contextManager.getAllFormattedMessages();

			// Should have system + 4 conversation messages
			expect(formatted).toHaveLength(5);
			expect(formatted[0].role).toBe('system');
			expect(formatted[1].role).toBe('user');
			expect(formatted[2].role).toBe('assistant');
			expect(formatted[3].role).toBe('user');
			expect(formatted[4].role).toBe('assistant');
		});

		it('should handle valid tool call flow', async () => {
			await contextManager.addUserMessage('What is the weather?');

			// Assistant message with tool calls
			await contextManager.addAssistantMessage('Let me check the weather for you.', [
				{
					id: 'call_123',
					type: 'function',
					function: {
						name: 'get_weather',
						arguments: '{"location": "New York"}',
					},
				},
			]);

			// Tool response
			await contextManager.addToolResult('call_123', 'get_weather', {
				temperature: 72,
				condition: 'sunny',
			});

			// Final assistant response
			await contextManager.addAssistantMessage('The weather in New York is 72°F and sunny.');

			const formatted = await contextManager.getAllFormattedMessages();

			// Should have system + user + assistant_with_tools + tool + assistant
			expect(formatted).toHaveLength(5);
			expect(formatted[0].role).toBe('system');
			expect(formatted[1].role).toBe('user');
			expect(formatted[2].role).toBe('assistant');
			expect(formatted[2].tool_calls).toBeDefined();
			expect(formatted[3].role).toBe('tool');
			expect(formatted[3].tool_call_id).toBe('call_123');
			expect(formatted[4].role).toBe('assistant');
		});
	});

	describe('Invalid Message Flows - Repair Logic', () => {
		it('should remove orphaned tool messages', async () => {
			// Manually add messages that would create an invalid flow
			const messages: InternalMessage[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				{ role: 'assistant', content: 'Hi there!' },
				// This tool message has no corresponding assistant with tool_calls
				{ role: 'tool', content: 'Tool result', toolCallId: 'call_orphan', name: 'orphaned_tool' },
				{ role: 'user', content: [{ type: 'text', text: 'Continue' }] },
			];

			// Directly access the private method for testing
			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should remove the orphaned tool message
			expect(repairedMessages).toHaveLength(3);
			expect(repairedMessages.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
		});

		it('should keep valid tool messages and remove invalid ones', async () => {
			const messages: InternalMessage[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				// Valid assistant with tool calls
				{
					role: 'assistant',
					content: 'Let me help you.',
					toolCalls: [
						{
							id: 'call_valid',
							type: 'function',
							function: { name: 'valid_tool', arguments: '{}' },
						},
					],
				},
				// Valid tool response
				{ role: 'tool', content: 'Valid result', toolCallId: 'call_valid', name: 'valid_tool' },
				// Invalid orphaned tool response
				{
					role: 'tool',
					content: 'Invalid result',
					toolCallId: 'call_invalid',
					name: 'invalid_tool',
				},
				{ role: 'assistant', content: 'Here is the result.' },
			];

			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should keep valid tool message, remove invalid one
			expect(repairedMessages).toHaveLength(4);
			expect(repairedMessages.map(m => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
			expect(repairedMessages[2].toolCallId).toBe('call_valid');
		});

		it('should handle multiple tool calls correctly', async () => {
			const messages: InternalMessage[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Do multiple things' }] },
				// Assistant with multiple tool calls
				{
					role: 'assistant',
					content: 'I will do multiple things.',
					toolCalls: [
						{
							id: 'call_1',
							type: 'function',
							function: { name: 'tool_1', arguments: '{}' },
						},
						{
							id: 'call_2',
							type: 'function',
							function: { name: 'tool_2', arguments: '{}' },
						},
					],
				},
				// Valid tool responses
				{ role: 'tool', content: 'Result 1', toolCallId: 'call_1', name: 'tool_1' },
				{ role: 'tool', content: 'Result 2', toolCallId: 'call_2', name: 'tool_2' },
				// Invalid tool response with wrong ID
				{ role: 'tool', content: 'Invalid result', toolCallId: 'call_3', name: 'tool_3' },
				{ role: 'assistant', content: 'Done with both tasks.' },
			];

			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should keep the 2 valid tool messages, remove the invalid one
			expect(repairedMessages).toHaveLength(5);
			const roles = repairedMessages.map(m => m.role);
			expect(roles).toEqual(['user', 'assistant', 'tool', 'tool', 'assistant']);

			// Check that correct tool call IDs are preserved
			const toolMessages = repairedMessages.filter(m => m.role === 'tool');
			expect(toolMessages.map(m => m.toolCallId)).toEqual(['call_1', 'call_2']);
		});

		it('should reset tool call tracking after user messages', async () => {
			const messages: InternalMessage[] = [
				// First conversation
				{ role: 'user', content: [{ type: 'text', text: 'First question' }] },
				{
					role: 'assistant',
					content: 'Let me help.',
					toolCalls: [
						{
							id: 'call_first',
							type: 'function',
							function: { name: 'first_tool', arguments: '{}' },
						},
					],
				},
				{ role: 'tool', content: 'First result', toolCallId: 'call_first', name: 'first_tool' },

				// New user message should reset tracking
				{ role: 'user', content: [{ type: 'text', text: 'Second question' }] },

				// This tool message should be orphaned now (no recent assistant with tool calls)
				{ role: 'tool', content: 'Orphaned result', toolCallId: 'call_first', name: 'first_tool' },

				{ role: 'assistant', content: 'Second answer.' },
			];

			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should remove the orphaned tool message after the second user message
			expect(repairedMessages).toHaveLength(5);
			expect(repairedMessages.map(m => m.role)).toEqual([
				'user',
				'assistant',
				'tool',
				'user',
				'assistant',
			]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty message list', async () => {
			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod([]);

			expect(repairedMessages).toHaveLength(0);
		});

		it('should handle messages without toolCalls property', async () => {
			const messages: InternalMessage[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				{ role: 'assistant', content: 'Hi!' }, // No toolCalls property
				{ role: 'tool', content: 'Tool result', toolCallId: 'call_123', name: 'tool' },
			];

			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should remove the orphaned tool message
			expect(repairedMessages).toHaveLength(2);
			expect(repairedMessages.map(m => m.role)).toEqual(['user', 'assistant']);
		});

		it('should handle assistant messages with empty toolCalls array', async () => {
			const messages: InternalMessage[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				{ role: 'assistant', content: 'Hi!', toolCalls: [] }, // Empty toolCalls
				{ role: 'tool', content: 'Tool result', toolCallId: 'call_123', name: 'tool' },
			];

			const validateMethod = (contextManager as any).validateAndRepairMessageFlow.bind(
				contextManager
			);
			const repairedMessages = validateMethod(messages);

			// Should remove the orphaned tool message
			expect(repairedMessages).toHaveLength(2);
			expect(repairedMessages.map(m => m.role)).toEqual(['user', 'assistant']);
		});
	});
});
