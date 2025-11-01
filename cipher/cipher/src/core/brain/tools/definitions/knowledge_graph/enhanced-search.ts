/**
 * Enhanced Search Tool
 *
 * Advanced search capabilities for the knowledge graph with semantic search,
 * fuzzy matching, multi-property search, and intelligent query understanding.
 *
 * This tool addresses the limitations of the basic search by providing:
 * - Semantic search across multiple properties
 * - Fuzzy matching for partial names
 * - Intelligent query parsing
 * - Contextual search based on relationships
 * - Natural language query support
 */

import { InternalTool, InternalToolContext } from '../../types.js';
import { logger } from '../../../../logger/index.js';
import type { GraphNode, GraphEdge } from '../../../../knowledge_graph/backend/types.js';

/**
 * Enhanced search configuration
 */
interface EnhancedSearchOptions {
	/** Enable semantic search using LLM */
	semanticSearch?: boolean;
	/** Enable fuzzy matching for entity names */
	fuzzyMatching?: boolean;
	/** Fuzzy match threshold (0.0-1.0) */
	fuzzyThreshold?: number;
	/** Include related entities in results */
	includeRelated?: boolean;
	/** Maximum depth for relationship traversal */
	relationDepth?: number;
	/** Search across multiple properties */
	searchProperties?: string[];
	/** Use natural language query understanding */
	naturalLanguage?: boolean;
}

/**
 * Enhanced search result
 */
interface EnhancedSearchResult {
	success: boolean;
	message: string;
	timestamp: string;
	query: {
		original: string;
		processed: string;
		type: 'exact' | 'fuzzy' | 'semantic' | 'natural';
		confidence: number;
	};
	results: {
		nodes: Array<GraphNode & { score?: number; matchReason?: string }>;
		edges: Array<GraphEdge & { score?: number; matchReason?: string }>;
		related: Array<{ entity: GraphNode; relationship: GraphEdge; distance: number }>;
		totalCount: number;
		executionTime: number;
	};
	suggestions?: string[];
	error?: string;
}

/**
 * Enhanced Search Tool
 */
export const enhancedSearchTool: InternalTool = {
	name: 'enhanced_search',
	category: 'knowledge_graph',
	internal: true,
	description:
		'Advanced search with semantic capabilities, fuzzy matching, and intelligent query understanding.',
	version: '1.0.0',
	parameters: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query (can be natural language or structured)',
			},
			searchType: {
				type: 'string',
				enum: ['nodes', 'edges', 'both', 'auto'],
				description: 'Type of entities to search for',
				default: 'auto',
			},
			options: {
				type: 'object',
				description: 'Enhanced search configuration',
				properties: {
					semanticSearch: {
						type: 'boolean',
						description: 'Enable semantic search using LLM',
						default: true,
					},
					fuzzyMatching: {
						type: 'boolean',
						description: 'Enable fuzzy matching for entity names',
						default: true,
					},
					fuzzyThreshold: {
						type: 'number',
						description: 'Fuzzy match threshold (0.0-1.0)',
						minimum: 0.0,
						maximum: 1.0,
						default: 0.6,
					},
					includeRelated: {
						type: 'boolean',
						description: 'Include related entities in results',
						default: true,
					},
					relationDepth: {
						type: 'number',
						description: 'Maximum depth for relationship traversal',
						minimum: 1,
						maximum: 3,
						default: 2,
					},
					searchProperties: {
						type: 'array',
						items: { type: 'string' },
						description: 'Properties to search across',
						default: ['name', 'description', 'content', 'title'],
					},
					naturalLanguage: {
						type: 'boolean',
						description: 'Use natural language query understanding',
						default: true,
					},
				},
			},
			limit: {
				type: 'number',
				description: 'Maximum number of results to return',
				minimum: 1,
				maximum: 1000,
				default: 50,
			},
		},
		required: ['query'],
	},
	handler: async (
		args: {
			query: string;
			searchType?: 'nodes' | 'edges' | 'both' | 'auto';
			options?: EnhancedSearchOptions;
			limit?: number;
		},
		context?: InternalToolContext
	): Promise<EnhancedSearchResult> => {
		const startTime = Date.now();

		try {
			logger.info('EnhancedSearch: Processing enhanced search query', {
				queryLength: args.query?.length || 0,
				searchType: args.searchType,
				hasOptions: !!args.options,
			});

			// Validate input
			if (!args.query || typeof args.query !== 'string' || args.query.trim().length === 0) {
				throw new Error('Query is required and must be a non-empty string');
			}

			const query = args.query.trim();
			const searchType = args.searchType || 'auto';
			const limit = args.limit || 50;
			const options: EnhancedSearchOptions = {
				semanticSearch: true,
				fuzzyMatching: true,
				fuzzyThreshold: 0.6,
				includeRelated: true,
				relationDepth: 2,
				searchProperties: ['name', 'description', 'content', 'title'],
				naturalLanguage: true,
				...args.options,
			};

			const kgManager = context?.services?.knowledgeGraphManager;
			const llmService = context?.services?.llmService;

			if (!kgManager) {
				throw new Error('KnowledgeGraphManager not available in context.services');
			}

			const graph = kgManager.getGraph();
			if (!graph) {
				throw new Error('Knowledge graph backend is not connected');
			}

			// Initialize result structure
			const result: EnhancedSearchResult = {
				success: false,
				message: '',
				timestamp: new Date().toISOString(),
				query: {
					original: query,
					processed: query,
					type: 'exact',
					confidence: 1.0,
				},
				results: {
					nodes: [],
					edges: [],
					related: [],
					totalCount: 0,
					executionTime: 0,
				},
			};

			// Step 1: Process and understand the query
			const processedQuery = await processSearchQuery(query, options, llmService);
			result.query = processedQuery;

			// Step 2: Determine search type if auto
			const finalSearchType =
				searchType === 'auto' ? await determineSearchType(processedQuery, llmService) : searchType;

			// Step 3: Execute different search strategies
			const searchResults = await executeEnhancedSearch(
				processedQuery,
				finalSearchType,
				options,
				graph,
				llmService,
				limit
			);

			result.results = searchResults;

			// Step 4: Include related entities if requested
			if (options.includeRelated && searchResults.nodes.length > 0) {
				const relatedEntities = await findRelatedEntities(
					searchResults.nodes.slice(0, 5), // Limit to top 5 for performance
					options.relationDepth || 2,
					graph
				);
				result.results.related = relatedEntities;
			}

			// Step 5: Generate suggestions for better search
			if (searchResults.totalCount === 0 && llmService) {
				result.suggestions = await generateSearchSuggestions(query, graph, llmService);
			}

			result.results.executionTime = Date.now() - startTime;
			result.results.totalCount = result.results.nodes.length + result.results.edges.length;
			result.success = true;
			result.message = `Enhanced search completed - found ${result.results.nodes.length} nodes, ${result.results.edges.length} edges, ${result.results.related.length} related entities`;

			logger.info('EnhancedSearch: Search completed successfully', {
				queryType: result.query.type,
				queryConfidence: result.query.confidence,
				nodesFound: result.results.nodes.length,
				edgesFound: result.results.edges.length,
				relatedFound: result.results.related.length,
				executionTime: result.results.executionTime,
			});

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('EnhancedSearch: Search failed', {
				error: errorMessage,
				queryLength: args.query?.length || 0,
			});

			return {
				success: false,
				message: `Enhanced search failed: ${errorMessage}`,
				timestamp: new Date().toISOString(),
				query: {
					original: args.query || '',
					processed: args.query || '',
					type: 'exact',
					confidence: 0.0,
				},
				results: {
					nodes: [],
					edges: [],
					related: [],
					totalCount: 0,
					executionTime: Date.now() - startTime,
				},
				error: errorMessage,
			};
		}
	},
};

/**
 * Process and understand the search query
 */
async function processSearchQuery(
	query: string,
	options: EnhancedSearchOptions,
	llmService?: any
): Promise<{
	original: string;
	processed: string;
	type: 'exact' | 'fuzzy' | 'semantic' | 'natural';
	confidence: number;
}> {
	// If natural language processing is disabled or LLM is not available, use exact search
	if (!options.naturalLanguage || !llmService) {
		return {
			original: query,
			processed: query,
			type: 'exact',
			confidence: 1.0,
		};
	}

	try {
		const queryProcessingPrompt = `
You are a query processing system for a knowledge graph search. Your job is to understand the user's search intent and convert it into an optimized search query.

Original query: "${query}"

Analyze the query and provide:
1. The search intent (what is the user looking for?)
2. Key entities or concepts to search for
3. Relationship context if any
4. Optimized search terms
5. Confidence level (0.0-1.0)

Examples:
- "find people who like ice cream" -> entities: ["people", "ice cream"], relationship: "LIKES", optimized: "Person LIKES ice cream"
- "Long's friends" -> entities: ["Long"], relationship: "KNOWS", optimized: "Long KNOWS Person"
- "companies in San Francisco" -> entities: ["companies", "San Francisco"], relationship: "LOCATED_IN", optimized: "Organization LOCATED_IN San Francisco"

Respond with a JSON object:
{
  "intent": "description of search intent",
  "entities": ["entity1", "entity2"],
  "relationships": ["RELATIONSHIP_TYPE"],
  "optimizedQuery": "optimized search terms",
  "searchType": "exact" | "fuzzy" | "semantic" | "natural",
  "confidence": 0.0-1.0
}

Respond ONLY with the JSON object:`;

		const response = await llmService.generate(queryProcessingPrompt);
		const cleanResponse = response.replace(/```json|```/g, '').trim();
		const analysis = JSON.parse(cleanResponse);

		return {
			original: query,
			processed: analysis.optimizedQuery || query,
			type: analysis.searchType || 'semantic',
			confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.8)),
		};
	} catch (error) {
		logger.debug('EnhancedSearch: Failed to process query with LLM, using fallback', {
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			original: query,
			processed: query,
			type: 'fuzzy',
			confidence: 0.7,
		};
	}
}

/**
 * Determine the best search type for the query
 */
async function determineSearchType(
	processedQuery: any,
	_llmService?: any
): Promise<'nodes' | 'edges' | 'both'> {
	// Simple heuristics for search type determination
	if (processedQuery.type === 'semantic' || processedQuery.type === 'natural') {
		return 'both'; // Semantic queries often involve both entities and relationships
	}

	const queryLower = processedQuery.processed.toLowerCase();

	// Check for relationship keywords
	const relationshipKeywords = [
		'relationship',
		'connection',
		'relates',
		'connected',
		'links',
		'depends',
		'calls',
	];
	if (relationshipKeywords.some(keyword => queryLower.includes(keyword))) {
		return 'edges';
	}

	// Check for entity keywords
	const entityKeywords = ['person', 'people', 'company', 'organization', 'concept', 'thing'];
	if (entityKeywords.some(keyword => queryLower.includes(keyword))) {
		return 'nodes';
	}

	// Default to both for comprehensive search
	return 'both';
}

/**
 * Execute enhanced search with multiple strategies
 */
async function executeEnhancedSearch(
	processedQuery: any,
	searchType: 'nodes' | 'edges' | 'both',
	options: EnhancedSearchOptions,
	graph: any,
	llmService?: any,
	limit: number = 50
): Promise<{
	nodes: Array<GraphNode & { score?: number; matchReason?: string }>;
	edges: Array<GraphEdge & { score?: number; matchReason?: string }>;
	related: any[];
	totalCount: number;
	executionTime: number;
}> {
	const nodes: Array<GraphNode & { score?: number; matchReason?: string }> = [];
	const edges: Array<GraphEdge & { score?: number; matchReason?: string }> = [];

	try {
		// Strategy 1: Exact search
		if (searchType === 'nodes' || searchType === 'both') {
			const exactNodes = await searchNodesExact(processedQuery.processed, graph, limit / 2);
			exactNodes.forEach(node => {
				nodes.push({
					...node,
					score: 1.0,
					matchReason: 'Exact name match',
				});
			});
		}

		if (searchType === 'edges' || searchType === 'both') {
			const exactEdges = await searchEdgesExact(processedQuery.processed, graph, limit / 2);
			exactEdges.forEach(edge => {
				edges.push({
					...edge,
					score: 1.0,
					matchReason: 'Exact type match',
				});
			});
		}

		// Strategy 2: Fuzzy search (if enabled and exact search returned few results)
		if (options.fuzzyMatching && nodes.length + edges.length < limit / 2) {
			if (searchType === 'nodes' || searchType === 'both') {
				const fuzzyNodes = await searchNodesFuzzy(
					processedQuery.processed,
					graph,
					options.fuzzyThreshold || 0.6,
					limit / 2
				);
				fuzzyNodes.forEach(node => {
					if (!nodes.find(n => n.id === node.id)) {
						nodes.push({
							...node,
							score: 0.8,
							matchReason: 'Fuzzy name match',
						});
					}
				});
			}

			if (searchType === 'edges' || searchType === 'both') {
				const fuzzyEdges = await searchEdgesFuzzy(
					processedQuery.processed,
					graph,
					options.fuzzyThreshold || 0.6,
					limit / 2
				);
				fuzzyEdges.forEach(edge => {
					if (!edges.find(e => e.id === edge.id)) {
						edges.push({
							...edge,
							score: 0.8,
							matchReason: 'Fuzzy type match',
						});
					}
				});
			}
		}

		// Strategy 3: Multi-property search
		if (options.searchProperties && options.searchProperties.length > 0) {
			const propertyResults = await searchByProperties(
				processedQuery.processed,
				options.searchProperties,
				searchType,
				graph,
				limit / 2
			);

			propertyResults.nodes.forEach(node => {
				if (!nodes.find(n => n.id === node.id)) {
					nodes.push({
						...node,
						score: 0.7,
						matchReason: 'Property match',
					});
				}
			});

			propertyResults.edges.forEach(edge => {
				if (!edges.find(e => e.id === edge.id)) {
					edges.push({
						...edge,
						score: 0.7,
						matchReason: 'Property match',
					});
				}
			});
		}

		// Sort results by score
		nodes.sort((a, b) => (b.score || 0) - (a.score || 0));
		edges.sort((a, b) => (b.score || 0) - (a.score || 0));

		// Limit results
		const limitedNodes = nodes.slice(0, limit);
		const limitedEdges = edges.slice(0, limit);

		return {
			nodes: limitedNodes,
			edges: limitedEdges,
			related: [],
			totalCount: limitedNodes.length + limitedEdges.length,
			executionTime: 0, // Will be set by caller
		};
	} catch (error) {
		logger.error('EnhancedSearch: Error executing enhanced search', {
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			nodes: [],
			edges: [],
			related: [],
			totalCount: 0,
			executionTime: 0,
		};
	}
}

/**
 * Search nodes with exact matching
 */
async function searchNodesExact(query: string, graph: any, limit: number): Promise<GraphNode[]> {
	try {
		// Search by exact name match
		const exactMatches = await graph.findNodes({ name: query }, undefined, limit);
		return exactMatches;
	} catch (error) {
		logger.debug('EnhancedSearch: Error in exact node search', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Search edges with exact matching
 */
async function searchEdgesExact(query: string, graph: any, limit: number): Promise<GraphEdge[]> {
	try {
		// Search by exact type match
		const exactMatches = await graph.findEdges({}, query, limit);
		return exactMatches;
	} catch (error) {
		logger.debug('EnhancedSearch: Error in exact edge search', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Search nodes with fuzzy matching
 */
async function searchNodesFuzzy(
	query: string,
	graph: any,
	threshold: number,
	limit: number
): Promise<GraphNode[]> {
	try {
		// Get all nodes and filter by fuzzy matching
		const allNodes = await graph.findNodes({}, undefined, limit * 5); // Get more for filtering
		const queryLower = query.toLowerCase();

		const fuzzyMatches = allNodes.filter((node: GraphNode) => {
			const name = node.properties.name?.toLowerCase() || '';
			return (
				name.includes(queryLower) ||
				queryLower.includes(name) ||
				calculateSimilarity(name, queryLower) >= threshold
			);
		});

		return fuzzyMatches.slice(0, limit);
	} catch (error) {
		logger.debug('EnhancedSearch: Error in fuzzy node search', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Search edges with fuzzy matching
 */
async function searchEdgesFuzzy(
	query: string,
	graph: any,
	threshold: number,
	limit: number
): Promise<GraphEdge[]> {
	try {
		// Get all edges and filter by fuzzy matching
		const allEdges = await graph.findEdges({}, undefined, limit * 5);
		const queryLower = query.toLowerCase();

		const fuzzyMatches = allEdges.filter((edge: GraphEdge) => {
			const type = edge.type.toLowerCase();
			return (
				type.includes(queryLower) ||
				queryLower.includes(type) ||
				calculateSimilarity(type, queryLower) >= threshold
			);
		});

		return fuzzyMatches.slice(0, limit);
	} catch (error) {
		logger.debug('EnhancedSearch: Error in fuzzy edge search', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Search by multiple properties
 */
async function searchByProperties(
	query: string,
	properties: string[],
	searchType: 'nodes' | 'edges' | 'both',
	graph: any,
	limit: number
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];

	try {
		for (const property of properties) {
			if (searchType === 'nodes' || searchType === 'both') {
				const nodeMatches = await graph.findNodes({ [property]: query }, undefined, limit);
				nodes.push(...nodeMatches);
			}

			if (searchType === 'edges' || searchType === 'both') {
				const edgeMatches = await graph.findEdges({ [property]: query }, undefined, limit);
				edges.push(...edgeMatches);
			}
		}
	} catch (error) {
		logger.debug('EnhancedSearch: Error in property search', {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	// Remove duplicates
	const uniqueNodes = nodes.filter(
		(node, index, self) => index === self.findIndex(n => n.id === node.id)
	);
	const uniqueEdges = edges.filter(
		(edge, index, self) => index === self.findIndex(e => e.id === edge.id)
	);

	return {
		nodes: uniqueNodes.slice(0, limit),
		edges: uniqueEdges.slice(0, limit),
	};
}

/**
 * Find entities related to the search results
 */
async function findRelatedEntities(
	nodes: GraphNode[],
	depth: number,
	graph: any
): Promise<Array<{ entity: GraphNode; relationship: GraphEdge; distance: number }>> {
	const related: Array<{ entity: GraphNode; relationship: GraphEdge; distance: number }> = [];

	try {
		for (const node of nodes.slice(0, 3)) {
			// Limit to top 3 for performance
			const neighbors = await graph.getNeighbors(node.id, 'both', undefined, 10);

			neighbors.forEach((neighbor: { node: GraphNode; edge: GraphEdge }) => {
				// Avoid self-references and duplicates
				if (neighbor.node.id !== node.id && !related.find(r => r.entity.id === neighbor.node.id)) {
					related.push({
						entity: neighbor.node,
						relationship: neighbor.edge,
						distance: 1,
					});
				}
			});
		}
	} catch (error) {
		logger.debug('EnhancedSearch: Error finding related entities', {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return related.slice(0, 10); // Limit results
}

/**
 * Generate search suggestions for better results
 */
async function generateSearchSuggestions(
	query: string,
	graph: any,
	llmService: any
): Promise<string[]> {
	try {
		const suggestionPrompt = `
The user searched for "${query}" in a knowledge graph but found no results. 
Generate 3-5 alternative search suggestions that might help them find what they're looking for.

Consider:
- Alternative spellings or synonyms
- Broader or more specific terms
- Related concepts
- Common entity types (Person, Organization, Concept, etc.)

Examples:
- If they searched "ice cream", suggest "dessert", "food", "frozen treats"
- If they searched "Google", suggest "technology company", "search engine", "Alphabet"

Respond with a JSON array of suggestion strings:
["suggestion1", "suggestion2", "suggestion3"]

Respond ONLY with the JSON array:`;

		const response = await llmService.generate(suggestionPrompt);
		const cleanResponse = response.replace(/```json|```/g, '').trim();
		const suggestions = JSON.parse(cleanResponse);

		return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
	} catch (error) {
		logger.debug('EnhancedSearch: Error generating suggestions', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Calculate similarity between two strings using a simple algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
	const longer = str1.length > str2.length ? str1 : str2;
	const shorter = str1.length > str2.length ? str2 : str1;

	if (longer.length === 0) return 1.0;

	const distance = levenshteinDistance(longer, shorter);
	return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
	const matrix: number[][] = Array(str2.length + 1)
		.fill(null)
		.map(() => Array(str1.length + 1).fill(0));

	for (let i = 0; i <= str1.length; i++) {
		matrix[0]![i] = i;
	}
	for (let j = 0; j <= str2.length; j++) {
		matrix[j]![0] = j;
	}

	for (let j = 1; j <= str2.length; j++) {
		for (let i = 1; i <= str1.length; i++) {
			const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
			matrix[j]![i] = Math.min(
				matrix[j]![i - 1]! + 1, // deletion
				matrix[j - 1]![i]! + 1, // insertion
				matrix[j - 1]![i - 1]! + indicator // substitution
			);
		}
	}

	return matrix[str2.length]![str1.length]!;
}
