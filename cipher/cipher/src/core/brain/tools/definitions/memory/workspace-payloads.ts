/**
 * Workspace Memory Payload Structures
 *
 * Specialized payload structures for workspace memory that focuses on team
 * collaboration, project progress tracking, and shared context.
 */

import { BasePayload } from './payloads.js';

/**
 * Workspace Memory Payload - For team and project information
 */
export interface WorkspacePayload extends BasePayload {
	tags: string[];
	confidence: number;
	event: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';

	// Workspace-specific fields
	teamMember?: string; // Name/ID of team member
	currentProgress?: {
		feature: string; // Feature being worked on
		status: 'in-progress' | 'completed' | 'blocked' | 'reviewing';
		completion?: number; // 0-100 percentage
	};

	bugsEncountered?: Array<{
		description: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		status: 'open' | 'in-progress' | 'fixed';
	}>;

	workContext?: {
		project?: string; // Project identifier
		repository?: string; // Git repo if relevant
		branch?: string; // Current working branch
	};

	domain?: string; // e.g., 'frontend', 'backend', 'devops'
	sourceSessionId?: string; // Session that created this memory
	qualitySource: 'similarity' | 'llm' | 'heuristic'; // How quality was determined
}

/**
 * Create new workspace payload
 */
export async function createWorkspacePayload(
	id: string | number,
	text: string,
	tags: string[],
	confidence: number,
	event: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE',
	options: {
		teamMember?: string;
		currentProgress?: {
			feature: string;
			status: 'in-progress' | 'completed' | 'blocked' | 'reviewing';
			completion?: number;
		};
		bugsEncountered?: Array<{
			description: string;
			severity: 'low' | 'medium' | 'high' | 'critical';
			status: 'open' | 'in-progress' | 'fixed';
		}>;
		workContext?: {
			project?: string;
			repository?: string;
			branch?: string;
		};
		domain?: string;
		sourceSessionId?: string;
		qualitySource: 'similarity' | 'llm' | 'heuristic';
		userId?: string;
		projectId?: string;
		workspaceMode?: 'shared' | 'isolated';
	}
): Promise<WorkspacePayload> {
	// Import env here to avoid circular dependencies
	const { env } = await import('../../../../env.js');

	return {
		id: typeof id === 'string' ? parseInt(id, 10) || 0 : id,
		text,
		tags,
		confidence,
		event,
		timestamp: new Date().toISOString(),
		version: 2,
		...(options.teamMember && { teamMember: options.teamMember }),
		...(options.currentProgress && { currentProgress: options.currentProgress }),
		...(options.bugsEncountered && { bugsEncountered: options.bugsEncountered }),
		...(options.workContext && { workContext: options.workContext }),
		...(options.domain && { domain: options.domain }),
		...(options.sourceSessionId && { sourceSessionId: options.sourceSessionId }),
		qualitySource: options.qualitySource,
		// Add cross-tool sharing identifiers (env vars take precedence for security)
		...((env.CIPHER_USER_ID || options.userId) && { userId: env.CIPHER_USER_ID || options.userId }),
		...((env.CIPHER_PROJECT_NAME || options.projectId) && {
			projectId: env.CIPHER_PROJECT_NAME || options.projectId,
		}),
		workspaceMode: env.CIPHER_WORKSPACE_MODE || options.workspaceMode || 'isolated',
	};
}

/**
 * Merge LLM-provided workspace info with regex-extracted info
 * LLM data takes precedence, regex fills gaps
 */
export function mergeWorkspaceInfo(
	llmProvided: Partial<{
		teamMember?: string;
		currentProgress?: {
			feature: string;
			status: 'in-progress' | 'completed' | 'blocked' | 'reviewing';
			completion?: number;
		};
		bugsEncountered?: Array<{
			description: string;
			severity: 'low' | 'medium' | 'high' | 'critical';
			status: 'open' | 'in-progress' | 'fixed';
		}>;
		workContext?: {
			project?: string;
			repository?: string;
			branch?: string;
		};
		domain?: string;
	}> = {},
	regexExtracted: ReturnType<typeof extractWorkspaceInfo>
): {
	teamMember?: string;
	currentProgress?: {
		feature: string;
		status: 'in-progress' | 'completed' | 'blocked' | 'reviewing';
		completion?: number;
	};
	bugsEncountered?: Array<{
		description: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		status: 'open' | 'in-progress' | 'fixed';
	}>;
	workContext?: {
		project?: string;
		repository?: string;
		branch?: string;
	};
	domain?: string;
} {
	const result: any = {};

	// Team member: LLM takes precedence
	result.teamMember = llmProvided.teamMember || regexExtracted.teamMember;

	// Current progress: merge intelligently
	if (llmProvided.currentProgress || regexExtracted.currentProgress) {
		result.currentProgress = {
			...regexExtracted.currentProgress,
			...llmProvided.currentProgress,
		};
	}

	// Bugs encountered: LLM takes precedence, or use regex if LLM not provided
	result.bugsEncountered = llmProvided.bugsEncountered || regexExtracted.bugsEncountered;

	// Work context: merge individual fields
	if (llmProvided.workContext || regexExtracted.workContext) {
		result.workContext = {
			...regexExtracted.workContext,
			...llmProvided.workContext,
		};
	}

	// Domain: LLM takes precedence
	result.domain = llmProvided.domain || regexExtracted.domain;

	return result;
}

/**
 * Extract workspace-relevant information from text
 */
export function extractWorkspaceInfo(text: string): {
	teamMember?: string;
	currentProgress?: {
		feature: string;
		status: 'in-progress' | 'completed' | 'blocked' | 'reviewing';
		completion?: number;
	};
	bugsEncountered?: Array<{
		description: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		status: 'open' | 'in-progress' | 'fixed';
	}>;
	workContext?: {
		project?: string;
		repository?: string;
		branch?: string;
	};
	domain?: string;
} {
	const result: any = {};

	// Extract team member patterns
	const teamMemberPatterns = [
		/(?:worked on by|assigned to|developer|dev|team member|teammate)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
		/(@[a-zA-Z_]+)/, // @username mentions
		/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is working on|completed|fixed|implemented)/i,
	];

	for (const pattern of teamMemberPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			result.teamMember = match[1].replace('@', '').trim();
			break;
		}
	}

	// Extract progress information
	const progressPatterns = [
		/(?:working on|implementing|developing|building)\s+([^.!?]+)/i,
		/(?:blocked on|stuck on|waiting on)\s+([^.!?]+)/i,
		/(?:feature|component|module):\s*([^.!?]+)/i,
		/(?:task|ticket|issue):\s*([^.!?]+)/i,
	];

	const statusPatterns = [
		{ pattern: /\b(?:completed|done|finished|deployed|released)\b/i, status: 'completed' as const },
		{ pattern: /\b(?:blocked|stuck|waiting|pending)\b/i, status: 'blocked' as const },
		{ pattern: /\b(?:reviewing|review|testing|qa)\b/i, status: 'reviewing' as const },
		{ pattern: /\b(?:in progress|ongoing|working|developing)\b/i, status: 'in-progress' as const },
	];

	for (const pattern of progressPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const feature = match[1].trim();

			// Determine status
			let status: 'in-progress' | 'completed' | 'blocked' | 'reviewing' = 'in-progress';
			for (const statusPattern of statusPatterns) {
				if (statusPattern.pattern.test(text)) {
					status = statusPattern.status;
					break;
				}
			}

			// Extract completion percentage
			let completion: number | undefined;
			const completionMatch = text.match(/(\d+)%/);
			if (completionMatch && completionMatch[1]) {
				completion = parseInt(completionMatch[1], 10);
			}

			result.currentProgress = { feature, status, completion };
			break;
		}
	}

	// Extract bug information
	const bugPatterns = [
		/(?:bug|issue|error|problem):\s*([^.!?]+)/i,
		/(?:fixed|resolved|closed)\s+(?:bug|issue|error):\s*([^.!?]+)/i,
		/(?:critical|high|medium|low)\s+(?:priority|severity)\s+(?:bug|issue):\s*([^.!?]+)/i,
	];

	const severityPatterns = [
		{ pattern: /\bcritical\b/i, severity: 'critical' as const },
		{ pattern: /\bhigh\b/i, severity: 'high' as const },
		{ pattern: /\bmedium\b/i, severity: 'medium' as const },
		{ pattern: /\blow\b/i, severity: 'low' as const },
	];

	for (const pattern of bugPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const description = match[1].trim();

			// Determine severity
			let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
			for (const severityPattern of severityPatterns) {
				if (severityPattern.pattern.test(text)) {
					severity = severityPattern.severity;
					break;
				}
			}

			// Determine status
			let status: 'open' | 'in-progress' | 'fixed' = 'open';
			if (/\b(?:fixed|resolved|closed)\b/i.test(text)) {
				status = 'fixed';
			} else if (/\b(?:fixing|working on|investigating)\b/i.test(text)) {
				status = 'in-progress';
			}

			result.bugsEncountered = [{ description, severity, status }];
			break;
		}
	}

	// Extract work context
	const workContext: any = {};

	// Project patterns
	const projectPatterns = [
		/(?:project|app|application):\s*([a-zA-Z0-9_-]+)/i,
		/(?:in|for|on)\s+(?:the\s+)?([a-zA-Z0-9_-]+)\s+project/i,
	];

	for (const pattern of projectPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			workContext.project = match[1].trim();
			break;
		}
	}

	// Repository patterns
	const repoPatterns = [
		/(?:repo|repository):\s*([a-zA-Z0-9_/.-]+)/i,
		/(?:github\.com|gitlab\.com)\/([a-zA-Z0-9_/-]+)/i,
		/git\s+clone\s+.*\/([a-zA-Z0-9_-]+)\.git/i,
	];

	for (const pattern of repoPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			workContext.repository = match[1].trim();
			break;
		}
	}

	// Branch patterns
	const branchPatterns = [
		/(?:branch|git checkout)\s+([a-zA-Z0-9_/-]+)/i,
		/(?:on|in)\s+(?:the\s+)?([a-zA-Z0-9_/-]+)\s+branch/i,
		/(?:feature|hotfix|bugfix)\/([a-zA-Z0-9_/-]+)/i,
	];

	for (const pattern of branchPatterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			workContext.branch = match[1].trim();
			break;
		}
	}

	if (Object.keys(workContext).length > 0) {
		result.workContext = workContext;
	}

	// Extract domain
	const domainPatterns = [
		{
			pattern: /\b(?:frontend|front-end|ui|ux|react|vue|angular|html|css|javascript|typescript)\b/i,
			domain: 'frontend',
		},
		{
			pattern: /\b(?:backend|back-end|server|api|database|sql|node|express|django|flask)\b/i,
			domain: 'backend',
		},
		{
			pattern: /\b(?:devops|deployment|docker|kubernetes|ci|cd|pipeline|infrastructure)\b/i,
			domain: 'devops',
		},
		{
			pattern: /\b(?:testing|qa|quality|unit test|integration test|e2e)\b/i,
			domain: 'quality-assurance',
		},
		{ pattern: /\b(?:design|ux|ui|mockup|wireframe|prototype)\b/i, domain: 'design' },
	];

	for (const domainPattern of domainPatterns) {
		if (domainPattern.pattern.test(text)) {
			result.domain = domainPattern.domain;
			break;
		}
	}

	return result;
}
