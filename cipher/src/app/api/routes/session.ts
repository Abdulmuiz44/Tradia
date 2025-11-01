import { Router, Request, Response } from 'express';
import { MemAgent } from '@core/brain/memAgent/index.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';
import {
	validateSessionId,
	validateCreateSession,
	validateListParams,
} from '../middleware/validation.js';
import { logger } from '@core/logger/index.js';

export function createSessionRoutes(agent: MemAgent): Router {
	const router = Router();

	/**
	 * GET /api/sessions
	 * List all active sessions with metadata - OPTIMIZED for performance
	 */
	router.get('/', validateListParams, async (req: Request, res: Response) => {
		const startTime = Date.now();
		try {
			logger.info('Listing sessions', { requestId: req.requestId });

			// PERFORMANCE OPTIMIZATION: Get session IDs with optimized batch processing
			let sessionIds: string[] = [];
			try {
				sessionIds = await agent.listSessions();
				logger.debug(
					`Agent returned ${sessionIds.length} session IDs in ${Date.now() - startTime}ms`
				);
			} catch (listError) {
				logger.error('Failed to get session IDs from agent:', listError);
				// Continue with empty list rather than failing completely
				sessionIds = [];
			}

			if (sessionIds.length === 0) {
				logger.debug('No sessions found, returning empty list');
				successResponse(
					res,
					{
						sessions: [],
						count: 0,
						currentSession: agent.getCurrentSessionId?.() || null,
						processingTime: Date.now() - startTime,
					},
					200,
					req.requestId
				);
				return;
			}

			// PERFORMANCE OPTIMIZATION: Use batch processing for session metadata
			const sessionManager = agent.sessionManager;
			let sessionsMetadata: Map<string, any>;

			try {
				// Use the new batch processing method for optimal performance
				sessionsMetadata = await sessionManager.getBatchSessionMetadata(sessionIds);
				logger.debug(`Batch loaded ${sessionsMetadata.size} session metadata entries`);
			} catch (batchError) {
				logger.warn(
					'Batch metadata loading failed, falling back to individual processing:',
					batchError
				);
				// Fallback to individual processing if batch fails
				sessionsMetadata = new Map();
				for (const sessionId of sessionIds.slice(0, 50)) {
					// Limit to prevent overload
					try {
						const metadata = await agent.getSessionMetadata(sessionId);
						if (metadata) {
							sessionsMetadata.set(sessionId, metadata);
						}
					} catch (error) {
						logger.debug(`Failed to get metadata for session ${sessionId}:`, error);
					}
				}
			}

			// CRITICAL FIX: Filter out sessions with 0 messages to prevent phantom sessions
			const validSessions = Array.from(sessionsMetadata.values()).filter(session => {
				return session.messageCount > 0;
			});

			const processingTime = Date.now() - startTime;

			logger.info(
				`Successfully listed ${validSessions.length}/${Array.from(sessionsMetadata.values()).length} valid sessions in ${processingTime}ms`
			);

			successResponse(
				res,
				{
					sessions: validSessions,
					count: validSessions.length,
					currentSession: agent.getCurrentSessionId?.() || null,
					processingTime,
				},
				200,
				req.requestId
			);
			return;
		} catch (error) {
			// CRITICAL FIX: Properly extract error message to prevent [object Object] display
			let errorMsg: string;
			try {
				errorMsg = error instanceof Error ? error.message : String(error);
			} catch {
				errorMsg = 'Unknown error occurred during session listing';
			}

			logger.error('Error listing sessions:', error);
			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				'Failed to list sessions',
				500,
				{ details: errorMsg, processingTime: Date.now() - startTime },
				req.requestId
			);
		}
	});

	/**
	 * POST /api/sessions
	 * Create a new session
	 */
	/**
	 * Validate and sanitize session ID to prevent problematic IDs
	 */
	function sanitizeSessionId(sessionId: string | undefined): string | null {
		if (!sessionId) return null; // Auto-generate

		// Remove problematic patterns and characters
		const sanitized = sessionId
			.trim()
			.replace(/[^\w-]/g, '-') // Replace non-alphanumeric with hyphens
			.replace(/^empty-?/i, '') // Remove "empty" prefix
			.replace(/^null-?/i, '') // Remove "null" prefix
			.replace(/^undefined-?/i, '') // Remove "undefined" prefix
			.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
			.replace(/-+/g, '-') // Collapse multiple hyphens
			.substring(0, 64); // Limit length

		// If sanitization results in empty string, return null for auto-generation
		if (!sanitized || sanitized.length < 3) return null;

		return sanitized;
	}

	router.post('/', validateCreateSession, async (req: Request, res: Response) => {
		try {
			const { sessionId: rawSessionId } = req.body;
			const sessionId = sanitizeSessionId(rawSessionId);

			logger.info('Creating new session', {
				requestId: req.requestId,
				originalSessionId: rawSessionId,
				sessionId: sessionId || 'auto-generated',
			});

			const session = await agent.createSession(sessionId || undefined);

			successResponse(
				res,
				{
					session: {
						id: session.id,
						// Only include serializable session properties
						createdAt: new Date().toISOString(),
					},
					created: true,
					timestamp: new Date().toISOString(),
				},
				201,
				req.requestId
			);
		} catch (error) {
			// Safely extract error message to avoid circular reference issues
			let errorMsg: string;
			try {
				errorMsg = error instanceof Error ? error.message : String(error);
			} catch {
				errorMsg = 'Unknown error occurred during session creation';
			}

			logger.error('Failed to create session', {
				requestId: req.requestId,
				error: errorMsg,
			});

			// Check if error is due to duplicate session ID
			if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					`Session creation failed: ${errorMsg}`,
					400,
					undefined,
					req.requestId
				);
			} else {
				errorResponse(
					res,
					ERROR_CODES.INTERNAL_ERROR,
					`Failed to create session: ${errorMsg}`,
					500,
					undefined,
					req.requestId
				);
			}
		}
	});

	/**
	 * GET /api/sessions/current
	 * Get current working session
	 */
	router.get('/current', async (req: Request, res: Response) => {
		try {
			const currentSessionId = agent.getCurrentSessionId();
			const metadata = await agent.getSessionMetadata(currentSessionId);

			if (!metadata) {
				errorResponse(
					res,
					ERROR_CODES.SESSION_NOT_FOUND,
					'Current session not found',
					404,
					undefined,
					req.requestId
				);
				return;
			}

			successResponse(
				res,
				{
					sessionId: currentSessionId,
					metadata,
					isCurrent: true,
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to get current session', {
				requestId: req.requestId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get current session: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	/**
	 * GET /api/sessions/:sessionId
	 * Get session details
	 */
	router.get('/:sessionId', validateSessionId, async (req: Request, res: Response) => {
		try {
			const { sessionId } = req.params;

			if (!sessionId) {
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					'Session ID is required',
					400,
					undefined,
					req.requestId
				);
				return;
			}

			logger.info('Getting session details', {
				requestId: req.requestId,
				sessionId,
			});

			const session = await agent.getSession(sessionId);
			if (!session) {
				errorResponse(
					res,
					ERROR_CODES.SESSION_NOT_FOUND,
					`Session ${sessionId} not found`,
					404,
					undefined,
					req.requestId
				);
				return;
			}

			const metadata = await agent.getSessionMetadata(sessionId);

			successResponse(
				res,
				{
					sessionId,
					metadata,
					isCurrent: sessionId === agent.getCurrentSessionId(),
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to get session details', {
				requestId: req.requestId,
				sessionId: req.params.sessionId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get session details: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	/**
	 * POST /api/sessions/:sessionId/load
	 * Load session as current
	 */
	router.post('/:sessionId/load', validateSessionId, async (req: Request, res: Response) => {
		try {
			const { sessionId: rawSessionId } = req.params;

			// Validate and sanitize session ID
			const sessionId = sanitizeSessionId(rawSessionId);
			if (!sessionId) {
				logger.warn('Attempted to load session with invalid ID:', rawSessionId);
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					'Invalid session ID provided',
					400,
					undefined,
					req.requestId
				);
				return;
			}

			logger.info('Loading session', {
				requestId: req.requestId,
				sessionId,
			});

			// CRITICAL FIX: Handle non-existent sessions gracefully
			let session;
			try {
				session = await agent.loadSession(sessionId);
			} catch (loadError) {
				const errorMsg = loadError instanceof Error ? loadError.message : String(loadError);
				logger.warn(`Session ${sessionId} not found, creating new session:`, {
					originalSessionId: rawSessionId,
					sanitizedSessionId: sessionId,
					error: errorMsg,
					requestId: req.requestId,
				});

				// Create new session with the requested ID
				try {
					session = await agent.createSession(sessionId);
					logger.info(`Created new session: ${sessionId}`);
				} catch (createError) {
					const createErrorMsg =
						createError instanceof Error ? createError.message : String(createError);
					logger.error(`Failed to create session ${sessionId}:`, createErrorMsg);

					// If we can't create with the specific ID, create with auto-generated ID
					session = await agent.createSession();
					logger.info(`Created auto-generated session: ${session.id}`);
				}
			}

			// CRITICAL FIX: Ensure conversation history is available in the loaded session
			// This is essential for UI mode to display previous messages when switching sessions
			let conversationHistory: any[] = [];
			try {
				// Force refresh conversation history after loading
				if (session && typeof session.refreshConversationHistory === 'function') {
					await session.refreshConversationHistory();
					logger.debug(`Session ${sessionId}: Refreshed conversation history after loading`);
				}

				// Get the conversation history to return with the response
				if (session && typeof session.getConversationHistory === 'function') {
					conversationHistory = await session.getConversationHistory();
					logger.info(
						`Session ${sessionId}: Loaded with ${conversationHistory.length} messages in conversation history`
					);
				}
			} catch (historyError) {
				logger.warn(`Session ${sessionId}: Failed to refresh history after loading:`, historyError);
				// Continue even if history refresh fails
			}

			successResponse(
				res,
				{
					sessionId: session.id,
					loaded: true,
					currentSession: agent.getCurrentSessionId(),
					conversationHistory, // CRITICAL FIX: Return history with session load
					timestamp: new Date().toISOString(),
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to load session', {
				requestId: req.requestId,
				sessionId: req.params.sessionId,
				error: errorMsg,
			});

			if (errorMsg.includes('not found')) {
				errorResponse(
					res,
					ERROR_CODES.SESSION_NOT_FOUND,
					`Session ${req.params.sessionId} not found`,
					404,
					undefined,
					req.requestId
				);
			} else {
				errorResponse(
					res,
					ERROR_CODES.INTERNAL_ERROR,
					`Failed to load session: ${errorMsg}`,
					500,
					undefined,
					req.requestId
				);
			}
		}
	});

	/**
	 * GET /api/sessions/:sessionId/history
	 * Get session conversation history - OPTIMIZED with caching
	 */
	router.get('/:sessionId/history', validateSessionId, async (req: Request, res: Response) => {
		const startTime = Date.now();
		try {
			const { sessionId } = req.params;

			// Handle null or invalid session IDs
			if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
				logger.warn('Attempted to get history for session with invalid ID:', sessionId);
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					'Invalid session ID provided',
					400,
					undefined,
					req.requestId
				);
				return;
			}

			logger.info('Getting session history', {
				requestId: req.requestId,
				sessionId,
			});

			// PERFORMANCE OPTIMIZATION: Use optimized history retrieval with request deduplication
			const sessionManager = agent.sessionManager;
			const cacheKey = `history_${sessionId}`;

			// Check if there's already a pending request for this session's history
			if ((sessionManager as any).requestDeduplicator?.has(cacheKey)) {
				logger.debug(`Deduplicating concurrent history request for session ${sessionId}`);
				const history = await (sessionManager as any).requestDeduplicator.get(cacheKey);
				successResponse(
					res,
					{
						sessionId,
						history: history || [],
						count: (history || []).length,
						timestamp: new Date().toISOString(),
						processingTime: Date.now() - startTime,
						source: 'deduplication',
					},
					200,
					req.requestId
				);
				return;
			}

			let history = [];
			let historySource = 'none';

			// PERFORMANCE OPTIMIZATION: Parallel data retrieval
			const historyPromise = (async () => {
				// Try session manager first (fastest)
				try {
					const session = await agent.getSession(sessionId);
					if (session) {
						const sessionHistory = await agent.getSessionHistory(sessionId);
						if (sessionHistory && sessionHistory.length > 0) {
							return { history: sessionHistory, source: 'session-manager' };
						}
					}
				} catch {
					logger.debug(`Session ${sessionId} not found in session manager`);
				}

				// Try database storage (parallel queries for better performance)
				try {
					const storageManager = (sessionManager as any).storageManager;
					if (storageManager?.isConnected()) {
						const backends = storageManager.getBackends();
						if (backends?.database) {
							// Query both message and session keys in parallel
							const [messageHistory, sessionData] = await Promise.allSettled([
								backends.database.get(`messages:${sessionId}`),
								backends.database.get(`session:${sessionId}`),
							]);

							// Priority: messages key first
							if (
								messageHistory.status === 'fulfilled' &&
								messageHistory.value &&
								Array.isArray(messageHistory.value)
							) {
								return { history: messageHistory.value, source: 'database-messages' };
							}

							// Fallback: session conversation history
							if (
								sessionData.status === 'fulfilled' &&
								sessionData.value?.conversationHistory &&
								Array.isArray(sessionData.value.conversationHistory)
							) {
								return {
									history: sessionData.value.conversationHistory,
									source: 'database-session',
								};
							}
						}
					}
				} catch (error) {
					logger.warn(`Failed to get history from database for session ${sessionId}:`, error);
				}

				return { history: [], source: 'none' };
			})();

			// Store promise for request deduplication
			if ((sessionManager as any).requestDeduplicator) {
				(sessionManager as any).requestDeduplicator.set(
					cacheKey,
					historyPromise.then(result => result.history)
				);
			}

			try {
				const result = await historyPromise;
				history = result.history;
				historySource = result.source;
			} finally {
				// Clean up deduplication
				if ((sessionManager as any).requestDeduplicator) {
					(sessionManager as any).requestDeduplicator.delete(cacheKey);
				}
			}

			const processingTime = Date.now() - startTime;

			// Log the final result
			logger.info(
				`Session ${sessionId} history retrieval: ${history.length} messages from ${historySource} in ${processingTime}ms`
			);

			successResponse(
				res,
				{
					sessionId,
					history,
					count: history.length,
					timestamp: new Date().toISOString(),
					processingTime,
					source: historySource,
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			const processingTime = Date.now() - startTime;
			logger.error('Failed to get session history', {
				requestId: req.requestId,
				sessionId: req.params.sessionId,
				error: errorMsg,
				processingTime,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get session history: ${errorMsg}`,
				500,
				{ processingTime },
				req.requestId
			);
		}
	});

	/**
	 * DELETE /api/sessions/:sessionId
	 * Delete session
	 */
	router.delete('/:sessionId', validateSessionId, async (req: Request, res: Response) => {
		try {
			const { sessionId } = req.params;

			// Handle null or invalid session IDs
			if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
				logger.warn('Attempted to delete session with invalid ID:', sessionId);
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					'Invalid session ID provided',
					400,
					undefined,
					req.requestId
				);
				return;
			}

			logger.info('Deleting session', {
				requestId: req.requestId,
				sessionId,
			});

			// CRITICAL FIX: Always return success for deletion to prevent frontend inconsistencies
			// The session manager will handle cleanup of non-existent sessions gracefully
			const success = await agent.removeSession(sessionId);

			// Always return success for deletions to prevent UI inconsistencies
			// Even if session wasn't found, it's effectively "deleted" from the user's perspective

			// CRITICAL FIX: Always return success to prevent UI inconsistencies
			// The frontend should show the session as deleted immediately
			successResponse(
				res,
				{
					sessionId,
					deleted: true,
					successful: success,
					timestamp: new Date().toISOString(),
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to delete session', {
				requestId: req.requestId,
				sessionId: req.params.sessionId,
				error: errorMsg,
			});

			if (errorMsg.includes('Cannot remove the currently active session')) {
				errorResponse(
					res,
					ERROR_CODES.BAD_REQUEST,
					'Cannot delete the currently active session. Switch to another session first.',
					400,
					undefined,
					req.requestId
				);
			} else {
				errorResponse(
					res,
					ERROR_CODES.INTERNAL_ERROR,
					`Failed to delete session: ${errorMsg}`,
					500,
					undefined,
					req.requestId
				);
			}
		}
	});

	/**
	 * GET /api/sessions/stats
	 * Get session performance statistics - MONITORING ENDPOINT
	 */
	router.get('/stats', async (req: Request, res: Response) => {
		try {
			logger.info('Getting session performance stats', { requestId: req.requestId });

			const sessionManager = agent.sessionManager;
			const stats = await sessionManager.getSessionStats();

			// Add additional runtime metrics
			const runtimeStats = {
				uptime: process.uptime(),
				memoryUsage: process.memoryUsage(),
				timestamp: new Date().toISOString(),
				requestId: req.requestId,
			};

			successResponse(
				res,
				{
					sessionStats: stats,
					runtimeStats,
					optimizationStatus: {
						cachingEnabled: true,
						batchProcessingEnabled: true,
						requestDeduplicationEnabled: true,
						performanceMonitoringEnabled: true,
					},
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to get session stats', {
				requestId: req.requestId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get session stats: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	return router;
}
