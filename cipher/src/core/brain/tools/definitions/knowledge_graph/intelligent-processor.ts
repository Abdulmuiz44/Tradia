/**
 * Intelligent Natural Language Processor Tool
 *
 * Advanced tool that intelligently processes natural language statements to automatically
 * extract, create, update, and manage entities and relationships in the knowledge graph.
 *
 * This tool can handle complex scenarios like:
 * - "Long and Trang likes ice-cream" -> Creates Long, Trang, ice-cream entities and LIKES relationships
 * - "not Long but Nam and Trang" -> Removes Long, adds Nam, maintains Trang and relationships
 * - "John works at Google as a software engineer" -> Creates entities and multiple relationships
 */

import { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';
import type { GraphNode, GraphEdge } from '../../../../knowledge_graph/backend/types.js';

/**
 * Configuration for intelligent processing
 */
interface ProcessingOptions {
	/** Whether to automatically resolve entity conflicts */
	autoResolve?: boolean;
	/** Confidence threshold for entity matching (0.0-1.0) */
	confidenceThreshold?: number;
	/** Whether to create relationships automatically */
	autoCreateRelationships?: boolean;
	/** Context to help with entity resolution */
	context?: string;
	/** Previous conversation context for updates */
	previousContext?: string;
}

/**
 * Result of intelligent processing
 */
interface ProcessingResult {
	success: boolean;
	message: string;
	timestamp: string;
	analysis: {
		originalText: string;
		intent: 'create' | 'update' | 'delete' | 'mixed';
		entities: {
			created: Array<{ id: string; name: string; type: string; confidence: number }>;
			updated: Array<{ id: string; name: string; changes: string[] }>;
			deleted: Array<{ id: string; name: string; reason: string }>;
			merged: Array<{ fromId: string; toId: string; reason: string }>;
		};
		relationships: {
			created: Array<{ id: string; type: string; from: string; to: string; confidence: number }>;
			updated: Array<{ id: string; changes: string[] }>;
			deleted: Array<{ id: string; reason: string }>;
		};
		conflicts: Array<{ type: string; description: string; resolution?: string }>;
	};
	error?: string;
}

/**
 * Intelligent Natural Language Processor Tool
 */
export const intelligentProcessorTool: InternalTool = {
	name: 'intelligent_processor',
	category: 'knowledge_graph',
	internal: true,
	description:
		'Intelligently process natural language to automatically manage entities and relationships in the knowledge graph.',
	version: '1.0.0',
	parameters: {
		type: 'object',
		properties: {
			text: {
				type: 'string',
				description: 'Natural language text to process',
			},
			options: {
				type: 'object',
				description: 'Processing configuration options',
				properties: {
					autoResolve: {
						type: 'boolean',
						description: 'Whether to automatically resolve entity conflicts',
						default: true,
					},
					confidenceThreshold: {
						type: 'number',
						description: 'Confidence threshold for entity matching (0.0-1.0)',
						minimum: 0.0,
						maximum: 1.0,
						default: 0.7,
					},
					autoCreateRelationships: {
						type: 'boolean',
						description: 'Whether to create relationships automatically',
						default: true,
					},
					context: {
						type: 'string',
						description: 'Additional context to help with processing',
					},
					previousContext: {
						type: 'string',
						description: 'Previous conversation context for handling updates',
					},
				},
			},
		},
		required: ['text'],
	},
	handler: async (
		args: {
			text: string;
			options?: ProcessingOptions;
		},
		context?: InternalToolContext
	): Promise<ProcessingResult> => {
		try {
			logger.info('IntelligentProcessor: Processing natural language text', {
				textLength: args.text?.length || 0,
				hasOptions: !!args.options,
			});

			// Validate input
			if (!args.text || typeof args.text !== 'string' || args.text.trim().length === 0) {
				throw new Error('Text is required and must be a non-empty string');
			}

			const text = args.text.trim();
			const options: ProcessingOptions = {
				autoResolve: true,
				confidenceThreshold: 0.7,
				autoCreateRelationships: true,
				...args.options,
			};

			const kgManager = context?.services?.knowledgeGraphManager;
			const llmService = context?.services?.llmService;

			if (!llmService) {
				throw new Error('LLM service is required for intelligent processing');
			}

			// Initialize result structure
			const result: ProcessingResult = {
				success: false,
				message: '',
				timestamp: new Date().toISOString(),
				analysis: {
					originalText: text,
					intent: 'create',
					entities: {
						created: [],
						updated: [],
						deleted: [],
						merged: [],
					},
					relationships: {
						created: [],
						updated: [],
						deleted: [],
					},
					conflicts: [],
				},
			};

			// Step 1: Analyze the text to understand intent and extract structured information
			const analysis = await analyzeTextIntent(text, options, llmService);
			result.analysis.intent = analysis.intent;

			// Step 2: Search for existing entities that might be related
			const existingEntities = kgManager
				? await findRelatedEntities(analysis.entities, kgManager)
				: [];

			// Step 3: Process entity operations based on intent
			await processEntityOperations(
				analysis,
				existingEntities,
				options,
				kgManager,
				llmService,
				result
			);

			// Step 4: Process relationship operations
			if (options.autoCreateRelationships && analysis.relationships.length > 0) {
				await processRelationshipOperations(analysis.relationships, result, kgManager, llmService);
			}

			// Step 5: Handle conflicts and resolutions
			if (result.analysis.conflicts.length > 0 && options.autoResolve) {
				await resolveConflicts(result.analysis.conflicts, options, kgManager, llmService);
			}

			result.success = true;
			result.message = `Intelligent processing completed: ${result.analysis.entities.created.length} entities created, ${result.analysis.entities.updated.length} updated, ${result.analysis.entities.deleted.length} deleted, ${result.analysis.relationships.created.length} relationships created`;

			logger.info('IntelligentProcessor: Processing completed successfully', {
				intent: result.analysis.intent,
				entitiesCreated: result.analysis.entities.created.length,
				entitiesUpdated: result.analysis.entities.updated.length,
				entitiesDeleted: result.analysis.entities.deleted.length,
				relationshipsCreated: result.analysis.relationships.created.length,
				conflicts: result.analysis.conflicts.length,
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('IntelligentProcessor: Processing failed', {
				error: errorMessage,
				textLength: args.text?.length || 0,
			});

			return {
				success: false,
				message: `Intelligent processing failed: ${errorMessage}`,
				timestamp: new Date().toISOString(),
				analysis: {
					originalText: args.text || '',
					intent: 'create',
					entities: { created: [], updated: [], deleted: [], merged: [] },
					relationships: { created: [], updated: [], deleted: [] },
					conflicts: [],
				},
				error: errorMessage,
			};
		}
	},
};

/**
 * Analyze text to understand intent and extract structured information
 */
async function analyzeTextIntent(
	text: string,
	options: ProcessingOptions,
	_llmService: any
): Promise<{
	intent: 'create' | 'update' | 'delete' | 'mixed';
	entities: Array<{
		name: string;
		type: string;
		action: 'create' | 'update' | 'delete';
		confidence: number;
		properties?: Record<string, any>;
		context?: string;
	}>;
	relationships: Array<{
		source: string;
		target: string;
		type: string;
		action: 'create' | 'update' | 'delete';
		confidence: number;
		properties?: Record<string, any>;
	}>;
	updateContext?: {
		replacements: Array<{ from: string; to: string }>;
		deletions: string[];
		additions: string[];
	};
}> {
	const analysisPrompt = `
You are an expert natural language processing system that analyzes text to extract entities and relationships for a knowledge graph. Your job is to understand the user's intent and provide structured information about entities and relationships.

Instructions:
1. Determine the primary intent: create (new information), update (modify existing), delete (remove information), or mixed (combination)
2. Extract all entities mentioned with their types and required actions
3. Identify relationships between entities
4. Handle negations and corrections (e.g., "not Long but Nam" means delete Long, add Nam)
5. Provide confidence scores for each extraction

Text to analyze:
"""
${text}
"""

${options.context ? `Additional context: ${options.context}` : ''}
${options.previousContext ? `Previous context: ${options.previousContext}` : ''}

Common entity types to consider:
- Person: Individual people (e.g., Long, Trang, Nam, John)
- Organization: Companies, institutions (e.g., Google, Microsoft)
- Concept: Abstract ideas, things (e.g., ice-cream, software engineering, happiness)
- Location: Places, addresses (e.g., San Francisco, home, office)
- Event: Activities, occasions (e.g., meeting, party, conference)
- Skill: Abilities, expertise (e.g., programming, cooking, singing)
- Object: Physical or digital items (e.g., book, computer, application)

Common relationship types:
- LIKES: Someone likes something
- WORKS_AT: Employment relationship
- LIVES_IN: Residence relationship
- KNOWS: Personal relationship
- HAS_SKILL: Skill possession
- PARTICIPATES_IN: Event participation
- OWNS: Ownership relationship
- RELATED_TO: General relationship

Examples:
- "Long and Trang likes ice-cream" -> Create entities: Long (Person), Trang (Person), ice-cream (Concept). Create relationships: Long LIKES ice-cream, Trang LIKES ice-cream
- "not Long but Nam and Trang" -> Delete: Long. Create: Nam (Person). Keep: Trang (if exists)
- "John works at Google as a software engineer" -> Create: John (Person), Google (Organization), software engineer (Skill). Relationships: John WORKS_AT Google, John HAS_SKILL software engineer

Respond with a JSON object in this format:
{
  "intent": "create" | "update" | "delete" | "mixed",
  "entities": [
    {
      "name": "entity name",
      "type": "entity type",
      "action": "create" | "update" | "delete",
      "confidence": 0.0-1.0,
      "properties": { "optional": "properties" },
      "context": "optional context from text"
    }
  ],
  "relationships": [
    {
      "source": "source entity name",
      "target": "target entity name", 
      "type": "relationship type",
      "action": "create" | "update" | "delete",
      "confidence": 0.0-1.0,
      "properties": { "optional": "properties" }
    }
  ],
  "updateContext": {
    "replacements": [{"from": "old entity", "to": "new entity"}],
    "deletions": ["entity to delete"],
    "additions": ["entity to add"]
  }
}

Respond ONLY with the JSON object, no other text:`;

	try {
		const response = await _llmService.generate(analysisPrompt);
		const cleanResponse = response.replace(/```json|```/g, '').trim();
		const analysis = JSON.parse(cleanResponse);

		// Validate and set defaults
		return {
			intent: analysis.intent || 'create',
			entities: Array.isArray(analysis.entities) ? analysis.entities : [],
			relationships: Array.isArray(analysis.relationships) ? analysis.relationships : [],
			updateContext: analysis.updateContext || undefined,
		};
	} catch (error) {
		logger.warn('IntelligentProcessor: Failed to parse LLM analysis, using fallback', {
			error: error instanceof Error ? error.message : String(error),
		});

		// Fallback: simple entity extraction
		return {
			intent: 'create',
			entities: extractSimpleEntities(text),
			relationships: [],
		};
	}
}

/**
 * Simple fallback entity extraction using patterns
 */
function extractSimpleEntities(text: string): Array<{
	name: string;
	type: string;
	action: 'create' | 'update' | 'delete';
	confidence: number;
}> {
	const entities: Array<{
		name: string;
		type: string;
		action: 'create' | 'update' | 'delete';
		confidence: number;
	}> = [];

	// Extract person names (capitalized words)
	const personPattern = /\b[A-Z][a-z]+\b/g;
	let match;
	while ((match = personPattern.exec(text)) !== null) {
		const name = match[0];
		if (name.length > 1 && !['The', 'And', 'Or', 'But', 'Not'].includes(name)) {
			entities.push({
				name,
				type: 'Person',
				action: 'create',
				confidence: 0.6,
			});
		}
	}

	return entities;
}

/**
 * Find existing entities that might be related to the extracted entities
 */
async function findRelatedEntities(
	extractedEntities: Array<{ name: string; type: string }>,
	kgManager: any
): Promise<GraphNode[]> {
	const graph = kgManager.getGraph();
	if (!graph) return [];

	const existingEntities: GraphNode[] = [];

	for (const entity of extractedEntities) {
		try {
			// Search by exact name match
			const exactMatches = await graph.findNodes({ name: entity.name }, [entity.type], 10);
			existingEntities.push(...exactMatches);

			// Search by fuzzy name match (case-insensitive)
			const fuzzyMatches = await graph.findNodes({}, [entity.type], 50);

			// Filter for similar names
			const similarEntities = fuzzyMatches.filter(
				(existing: GraphNode) =>
					(existing.properties.name &&
						existing.properties.name.toLowerCase().includes(entity.name.toLowerCase())) ||
					entity.name.toLowerCase().includes(existing.properties.name.toLowerCase())
			);

			existingEntities.push(...similarEntities);
		} catch (error) {
			logger.debug('IntelligentProcessor: Error searching for existing entities', {
				entityName: entity.name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// Remove duplicates
	const uniqueEntities = existingEntities.filter(
		(entity, index, self) => index === self.findIndex(e => e.id === entity.id)
	);

	return uniqueEntities;
}

/**
 * Process entity operations (create, update, delete)
 */
async function processEntityOperations(
	analysis: any,
	existingEntities: GraphNode[],
	_options: ProcessingOptions,
	kgManager: any,
	_llmService: any,
	result: ProcessingResult
): Promise<void> {
	const graph = kgManager?.getGraph();
	if (!graph) return;

	for (const entityData of analysis.entities) {
		try {
			const existingEntity = existingEntities.find(
				e =>
					e.properties.name?.toLowerCase() === entityData.name.toLowerCase() &&
					e.labels.includes(entityData.type)
			);

			if (entityData.action === 'delete') {
				if (existingEntity) {
					await graph.deleteNode(existingEntity.id);
					result.analysis.entities.deleted.push({
						id: existingEntity.id,
						name: entityData.name,
						reason: 'Explicitly requested for deletion',
					});
				}
			} else if (entityData.action === 'create' || !existingEntity) {
				// Create new entity
				const entityId = `${entityData.type.toLowerCase()}_${entityData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

				const newNode: GraphNode = {
					id: entityId,
					labels: [entityData.type],
					properties: {
						name: entityData.name,
						confidence: entityData.confidence,
						createdAt: new Date().toISOString(),
						extractedFrom: result.analysis.originalText,
						...(entityData.properties || {}),
					},
				};

				await graph.addNode(newNode);
				result.analysis.entities.created.push({
					id: entityId,
					name: entityData.name,
					type: entityData.type,
					confidence: entityData.confidence,
				});
			} else if (entityData.action === 'update' && existingEntity) {
				// Update existing entity
				const updateProperties = {
					...entityData.properties,
					updatedAt: new Date().toISOString(),
					lastExtractedFrom: result.analysis.originalText,
				};

				await graph.updateNode(existingEntity.id, updateProperties);
				result.analysis.entities.updated.push({
					id: existingEntity.id,
					name: entityData.name,
					changes: Object.keys(updateProperties),
				});
			}
		} catch (error) {
			logger.error('IntelligentProcessor: Error processing entity operation', {
				entityName: entityData.name,
				action: entityData.action,
				error: error instanceof Error ? error.message : String(error),
			});

			result.analysis.conflicts.push({
				type: 'entity_operation_error',
				description: `Failed to ${entityData.action} entity ${entityData.name}: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}
}

/**
 * Process relationship operations
 */
async function processRelationshipOperations(
	relationships: Array<{
		source: string;
		target: string;
		type: string;
		action: 'create' | 'update' | 'delete';
		confidence: number;
		properties?: Record<string, any>;
	}>,
	result: ProcessingResult,
	_kgManager: any,
	_llmService: any
): Promise<void> {
	const graph = _kgManager?.getGraph();
	if (!graph) return;

	for (const relData of relationships) {
		try {
			// Find source and target entities
			const sourceNodes = await graph.findNodes({ name: relData.source }, undefined, 10);
			const targetNodes = await graph.findNodes({ name: relData.target }, undefined, 10);

			if (sourceNodes.length === 0 || targetNodes.length === 0) {
				result.analysis.conflicts.push({
					type: 'missing_entity',
					description: `Cannot create relationship ${relData.type} between ${relData.source} and ${relData.target}: one or both entities not found`,
				});
				continue;
			}

			const sourceNode = sourceNodes[0];
			const targetNode = targetNodes[0];

			if (relData.action === 'create') {
				const relationshipId = `rel_${sourceNode.id}_${targetNode.id}_${relData.type}_${Date.now()}`;

				const newEdge: GraphEdge = {
					id: relationshipId,
					type: relData.type,
					startNodeId: sourceNode.id,
					endNodeId: targetNode.id,
					properties: {
						confidence: relData.confidence,
						createdAt: new Date().toISOString(),
						extractedFrom: result.analysis.originalText,
						...(relData.properties || {}),
					},
				};

				await graph.addEdge(newEdge);
				result.analysis.relationships.created.push({
					id: relationshipId,
					type: relData.type,
					from: relData.source,
					to: relData.target,
					confidence: relData.confidence,
				});
			}
		} catch (error) {
			logger.error('IntelligentProcessor: Error processing relationship operation', {
				relationship: `${relData.source} ${relData.type} ${relData.target}`,
				action: relData.action,
				error: error instanceof Error ? error.message : String(error),
			});

			result.analysis.conflicts.push({
				type: 'relationship_operation_error',
				description: `Failed to ${relData.action} relationship ${relData.source} ${relData.type} ${relData.target}: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}
}

/**
 * Resolve conflicts automatically
 */
async function resolveConflicts(
	conflicts: Array<{ type: string; description: string; resolution?: string }>,
	_options: ProcessingOptions,
	_kgManager: any,
	_llmService: any
): Promise<void> {
	for (const conflict of conflicts) {
		try {
			// Add resolution strategies based on conflict type
			if (conflict.type === 'missing_entity') {
				conflict.resolution = 'Entities will be created automatically if needed';
			} else if (conflict.type === 'entity_operation_error') {
				conflict.resolution = 'Operation skipped, check entity data';
			} else if (conflict.type === 'relationship_operation_error') {
				conflict.resolution = 'Relationship creation skipped, check entity existence';
			}
		} catch (error) {
			logger.warn('IntelligentProcessor: Error resolving conflict', {
				conflictType: conflict.type,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
