/**
 * Extract Fact Tool
 *
 * Extracts detailed facts with implementation code, commands, and technical
 * details from the interaction for memory storage and future reference.
 */

import { InternalTool } from '../../types.js';
import { logger } from '../../../../logger/index.js';

/**
 * Extract Fact Tool Definition for external use
 */
export const EXTRACT_KNOWLEDGE_TOOL = {
	type: 'function',
	function: {
		name: 'extract_knowledge',
		description:
			'Extract detailed knowledge with implementation code, commands, and technical details from the interaction.',
		parameters: {
			type: 'object',
			properties: {
				knowledge: {
					type: 'array',
					description:
						'An array of strings, each containing a programming knowledge along with complete implementation code, command syntax, or technical details when present. Always preserve the complete pattern within triple backticks.',
					items: {
						type: 'string',
					},
				},
			},
			required: ['knowledge'],
			additionalProperties: false,
		},
	},
};

/**
 * Extract fact tool for capturing programming facts and technical details
 */
export const extractKnowledgeTool: InternalTool = {
	name: 'extract_knowledge',
	category: 'memory',
	internal: true,
	description:
		'Extract detailed facts with implementation code, commands, and technical details from the interaction.',
	version: '1.0.0',
	parameters: {
		type: 'object',
		properties: {
			knowledge: {
				type: 'array',
				description:
					'An array of strings, each containing a programming fact along with complete implementation code, command syntax, or technical details when present. Always preserve the complete pattern within triple backticks.',
				items: {
					type: 'string',
				},
			},
		},
		required: ['knowledge'],
	},
	handler: async (args: { knowledge: string[] }) => {
		try {
			logger.info('ExtractFact: Processing fact extraction request', {
				factCount: Array.isArray(args.knowledge) ? args.knowledge.length : 1,
				inputType: typeof args.knowledge,
			});

			// Validate input and handle both string and array inputs
			let knowledgeArray: string[];

			if (!args.knowledge) {
				throw new Error('No facts provided for extraction');
			}

			// Handle case where LLM passes knowledge as a JSON string instead of array
			if (typeof args.knowledge === 'string') {
				try {
					// Try to parse as JSON array first
					const parsed = JSON.parse(args.knowledge);
					if (Array.isArray(parsed)) {
						knowledgeArray = parsed;
					} else {
						// Treat as single string fact
						knowledgeArray = [args.knowledge];
					}
				} catch {
					// Not valid JSON, treat as single string fact
					knowledgeArray = [args.knowledge];
				}
			} else if (Array.isArray(args.knowledge)) {
				knowledgeArray = args.knowledge;
			} else {
				throw new Error('Knowledge must be a string or array of strings');
			}

			if (knowledgeArray.length === 0) {
				throw new Error('No facts provided for extraction');
			}

			// Filter out empty or invalid facts
			const validFacts = knowledgeArray
				.filter(fact => fact && typeof fact === 'string' && fact.trim().length > 0)
				.map(fact => fact.trim());

			if (validFacts.length === 0) {
				throw new Error('No valid facts found after filtering');
			}

			// Process each fact and extract metadata
			const processedFacts = validFacts.map((fact, index) => {
				const metadata = {
					id: `fact_${Date.now()}_${index}`,
					timestamp: new Date().toISOString(),
					length: fact.length,
					hasCodeBlock: fact.includes('```'),
					hasCommand: fact.includes('$') || fact.includes('npm') || fact.includes('git'),
					hasPath: fact.includes('/') || fact.includes('\\'),
				};

				return {
					content: fact,
					metadata,
				};
			});

			// Simulate storing facts (in real implementation, this would connect to memory storage)
			logger.debug('ExtractFact: Facts processed successfully', {
				totalFacts: processedFacts.length,
				factsWithCode: processedFacts.filter(f => f.metadata.hasCodeBlock).length,
				factsWithCommands: processedFacts.filter(f => f.metadata.hasCommand).length,
			});

			// Return success response with details
			const result = {
				success: true,
				extracted: processedFacts.length,
				skipped: knowledgeArray.length - validFacts.length,
				timestamp: new Date().toISOString(),
				facts: processedFacts.map(f => ({
					id: f.metadata.id,
					preview: f.content.substring(0, 100) + (f.content.length > 100 ? '...' : ''),
					metadata: {
						hasCodeBlock: f.metadata.hasCodeBlock,
						hasCommand: f.metadata.hasCommand,
						length: f.metadata.length,
					},
				})),
			};

			logger.info('ExtractFact: Successfully extracted and processed facts', {
				extracted: result.extracted,
				skipped: result.skipped,
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('ExtractFact: Failed to extract facts', {
				error: errorMessage,
				factCount: Array.isArray(args.knowledge) ? args.knowledge.length : 1,
				inputType: typeof args.knowledge,
			});

			return {
				success: false,
				error: errorMessage,
				extracted: 0,
				skipped: Array.isArray(args.knowledge) ? args.knowledge.length : 1,
				timestamp: new Date().toISOString(),
			};
		}
	},
};
