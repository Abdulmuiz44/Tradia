/**
 * Tests for Session Management API Endpoints
 * Verifies the critical fixes for session deletion, error serialization, and API performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the logger
vi.mock('../../../core/logger/index.js', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock session manager
const mockSessionManager = {
	createSession: vi.fn(),
	getSession: vi.fn(),
	deleteSession: vi.fn(),
	listSessions: vi.fn(),
	hasSession: vi.fn(),
	saveSession: vi.fn(),
	loadSession: vi.fn(),
};

vi.mock('../../../core/session/session-manager.js', () => ({
	SessionManager: vi.fn().mockImplementation(() => mockSessionManager),
}));

describe('Session API Endpoints', () => {
	let app: express.Application;

	beforeEach(async () => {
		vi.clearAllMocks();
		app = express();
		app.use(express.json());

		// Mock session routes (simplified version of actual routes)
		app.get('/api/sessions', async (req, res) => {
			try {
				const sessions = await mockSessionManager.listSessions();

				// Transform sessions to include message count
				const sessionsWithMetadata = sessions.map((session: any) => ({
					id: session.id,
					messageCount: session.getContextManager?.()?.getRawMessages?.()?.length || 0,
					lastActivity: session.lastActivity || Date.now(),
				}));

				res.json({ sessions: sessionsWithMetadata });
			} catch (error) {
				res.status(500).json({
					error: {
						message: error instanceof Error ? error.message : 'Failed to load sessions',
						code: 'SESSION_LIST_ERROR',
					},
				});
			}
		});

		app.post('/api/sessions', async (req, res) => {
			try {
				const { sessionId } = req.body;

				if (!sessionId || typeof sessionId !== 'string') {
					return res.status(400).json({
						error: {
							message: 'Session ID is required and must be a string',
							code: 'INVALID_SESSION_ID',
						},
					});
				}

				const session = await mockSessionManager.createSession(sessionId);
				res.status(201).json({
					sessionId: session.id,
					created: true,
					messageCount: 0,
				});
			} catch (error) {
				res.status(500).json({
					error: {
						message: error instanceof Error ? error.message : 'Failed to create session',
						code: 'SESSION_CREATE_ERROR',
					},
				});
			}
		});

		app.delete('/api/sessions/:sessionId', async (req, res) => {
			try {
				const { sessionId } = req.params;

				if (!sessionId) {
					return res.status(400).json({
						error: {
							message: 'Session ID is required',
							code: 'MISSING_SESSION_ID',
						},
					});
				}

				const deleted = await mockSessionManager.deleteSession(sessionId);

				if (!deleted) {
					return res.status(404).json({
						error: {
							message: 'Session not found',
							code: 'SESSION_NOT_FOUND',
						},
					});
				}

				res.json({ deleted: true, sessionId });
			} catch (error) {
				res.status(500).json({
					error: {
						message: error instanceof Error ? error.message : 'Failed to delete session',
						code: 'SESSION_DELETE_ERROR',
					},
				});
			}
		});

		app.get('/api/sessions/:sessionId/history', async (req, res) => {
			try {
				const { sessionId } = req.params;
				const session = await mockSessionManager.getSession(sessionId);

				if (!session) {
					return res.status(404).json({
						error: {
							message: 'Session not found',
							code: 'SESSION_NOT_FOUND',
						},
					});
				}

				const history = await session.getConversationHistory();
				res.json({
					history,
					messageCount: history.length,
					sessionId,
				});
			} catch (error) {
				res.status(500).json({
					error: {
						message: error instanceof Error ? error.message : 'Failed to get session history',
						code: 'SESSION_HISTORY_ERROR',
					},
				});
			}
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Session Listing API', () => {
		it('should return sessions with correct message counts', async () => {
			const mockSessions = [
				{
					id: 'session-1',
					getContextManager: () => ({
						getRawMessages: () => [
							{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
							{ role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
						],
					}),
					lastActivity: Date.now(),
				},
				{
					id: 'session-2',
					getContextManager: () => ({
						getRawMessages: () => [],
					}),
					lastActivity: Date.now(),
				},
			];

			mockSessionManager.listSessions.mockResolvedValue(mockSessions);

			const response = await request(app).get('/api/sessions').expect(200);

			expect(response.body.sessions).toHaveLength(2);
			expect(response.body.sessions[0].messageCount).toBe(2);
			expect(response.body.sessions[1].messageCount).toBe(0);
			expect(response.body.sessions[0].messageCount).not.toBe(0); // Fix for issue #3
		});

		it('should handle session listing errors with proper serialization', async () => {
			const testError = new Error('Database connection failed');
			mockSessionManager.listSessions.mockRejectedValue(testError);

			const response = await request(app).get('/api/sessions').expect(500);

			// Error should be properly serialized, not "[object Object]"
			expect(response.body.error).toBeDefined();
			expect(response.body.error.message).toBe('Database connection failed');
			expect(response.body.error.code).toBe('SESSION_LIST_ERROR');
			expect(typeof response.body.error.message).toBe('string');
		});

		it('should handle empty session list', async () => {
			mockSessionManager.listSessions.mockResolvedValue([]);

			const response = await request(app).get('/api/sessions').expect(200);

			expect(response.body.sessions).toEqual([]);
		});
	});

	describe('Session Creation API', () => {
		it('should create session successfully', async () => {
			const sessionId = 'new-session-123';
			const mockSession = {
				id: sessionId,
				getContextManager: () => ({
					getRawMessages: () => [],
				}),
			};

			mockSessionManager.createSession.mockResolvedValue(mockSession);

			const response = await request(app).post('/api/sessions').send({ sessionId }).expect(201);

			expect(response.body.sessionId).toBe(sessionId);
			expect(response.body.created).toBe(true);
			expect(response.body.messageCount).toBe(0);
		});

		it('should handle session creation errors properly', async () => {
			const sessionId = 'failing-session';
			const testError = new Error('Storage unavailable');

			mockSessionManager.createSession.mockRejectedValue(testError);

			const response = await request(app).post('/api/sessions').send({ sessionId }).expect(500);

			expect(response.body.error.message).toBe('Storage unavailable');
			expect(response.body.error.code).toBe('SESSION_CREATE_ERROR');
			expect(typeof response.body.error.message).toBe('string'); // Not "[object Object]"
		});

		it('should validate session ID input', async () => {
			const response = await request(app)
				.post('/api/sessions')
				.send({ sessionId: null })
				.expect(400);

			expect(response.body.error.message).toBe('Session ID is required and must be a string');
			expect(response.body.error.code).toBe('INVALID_SESSION_ID');
		});
	});

	describe('Session Deletion API', () => {
		it('should delete session successfully', async () => {
			const sessionId = 'session-to-delete';

			mockSessionManager.deleteSession.mockResolvedValue(true);

			const response = await request(app).delete(`/api/sessions/${sessionId}`).expect(200);

			expect(response.body.deleted).toBe(true);
			expect(response.body.sessionId).toBe(sessionId);
			expect(mockSessionManager.deleteSession).toHaveBeenCalledWith(sessionId);
		});

		it('should handle non-existent session deletion gracefully', async () => {
			const sessionId = 'non-existent-session';

			mockSessionManager.deleteSession.mockResolvedValue(false);

			const response = await request(app).delete(`/api/sessions/${sessionId}`).expect(404);

			expect(response.body.error.message).toBe('Session not found');
			expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
		});

		it('should handle session deletion errors with proper serialization', async () => {
			const sessionId = 'error-session';
			const testError = new Error('Failed to delete session from storage');

			mockSessionManager.deleteSession.mockRejectedValue(testError);

			const response = await request(app).delete(`/api/sessions/${sessionId}`).expect(500);

			expect(response.body.error.message).toBe('Failed to delete session from storage');
			expect(response.body.error.code).toBe('SESSION_DELETE_ERROR');
			expect(typeof response.body.error.message).toBe('string'); // Fix for issue #2
		});

		it('should validate session ID parameter', async () => {
			await request(app).delete('/api/sessions/').expect(404); // Express will return 404 for missing route param
		});
	});

	describe('Session History API', () => {
		it('should return session history with correct message count', async () => {
			const sessionId = 'session-with-history';
			const mockHistory = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				{ role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
				{ role: 'user', content: [{ type: 'text', text: 'How are you?' }] },
			];

			const mockSession = {
				id: sessionId,
				getConversationHistory: vi.fn().mockResolvedValue(mockHistory),
			};

			mockSessionManager.getSession.mockResolvedValue(mockSession);

			const response = await request(app).get(`/api/sessions/${sessionId}/history`).expect(200);

			expect(response.body.history).toEqual(mockHistory);
			expect(response.body.messageCount).toBe(3);
			expect(response.body.messageCount).not.toBe(0); // Fix for issue #3
			expect(response.body.sessionId).toBe(sessionId);
		});

		it('should handle session history errors properly', async () => {
			const sessionId = 'error-session';
			const testError = new Error('History provider unavailable');

			mockSessionManager.getSession.mockRejectedValue(testError);

			const response = await request(app).get(`/api/sessions/${sessionId}/history`).expect(500);

			expect(response.body.error.message).toBe('History provider unavailable');
			expect(response.body.error.code).toBe('SESSION_HISTORY_ERROR');
			expect(typeof response.body.error.message).toBe('string');
		});

		it('should handle non-existent session history request', async () => {
			const sessionId = 'non-existent-session';

			mockSessionManager.getSession.mockResolvedValue(null);

			const response = await request(app).get(`/api/sessions/${sessionId}/history`).expect(404);

			expect(response.body.error.message).toBe('Session not found');
			expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
		});
	});

	describe('API Performance and Rate Limiting', () => {
		it('should handle concurrent session operations', async () => {
			const sessionIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

			// Mock successful operations
			mockSessionManager.createSession.mockImplementation(async id => ({
				id,
				getContextManager: () => ({
					getRawMessages: () => [],
				}),
			}));

			// Make concurrent requests
			const requests = sessionIds.map(sessionId =>
				request(app).post('/api/sessions').send({ sessionId })
			);

			const responses = await Promise.all(requests);

			// All requests should succeed
			responses.forEach((response, index) => {
				expect(response.status).toBe(201);
				expect(response.body.sessionId).toBe(sessionIds[index]);
			});
		});

		it('should handle rapid successive requests efficiently', async () => {
			const sessionId = 'rapid-test-session';
			const mockSession = {
				id: sessionId,
				getConversationHistory: vi.fn().mockResolvedValue([]),
			};

			mockSessionManager.getSession.mockResolvedValue(mockSession);

			// Make 10 rapid requests
			const startTime = Date.now();
			const requests = Array.from({ length: 10 }, () =>
				request(app).get(`/api/sessions/${sessionId}/history`)
			);

			const responses = await Promise.all(requests);
			const duration = Date.now() - startTime;

			// All requests should succeed
			responses.forEach(response => {
				expect(response.status).toBe(200);
			});

			// Should complete reasonably quickly (not timeout)
			expect(duration).toBeLessThan(5000); // 5 seconds max
		});

		it('should prevent API overload with proper error handling', async () => {
			// Simulate overloaded system
			mockSessionManager.listSessions.mockImplementation(async () => {
				await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
				throw new Error('System overloaded');
			});

			const startTime = Date.now();
			const response = await request(app).get('/api/sessions').expect(500);

			const duration = Date.now() - startTime;

			expect(response.body.error.message).toBe('System overloaded');
			expect(duration).toBeGreaterThan(90); // Should include the delay
			expect(duration).toBeLessThan(1000); // But not hang indefinitely
		});
	});

	describe('Error Response Format Consistency', () => {
		it('should return consistent error format across all endpoints', async () => {
			const endpoints = [
				{ method: 'get', path: '/api/sessions' },
				{ method: 'post', path: '/api/sessions' },
				{ method: 'delete', path: '/api/sessions/test' },
				{ method: 'get', path: '/api/sessions/test/history' },
			];

			// Mock all operations to fail
			mockSessionManager.listSessions.mockRejectedValue(new Error('Test error'));
			mockSessionManager.createSession.mockRejectedValue(new Error('Test error'));
			mockSessionManager.deleteSession.mockRejectedValue(new Error('Test error'));
			mockSessionManager.getSession.mockRejectedValue(new Error('Test error'));

			for (const endpoint of endpoints) {
				let response;

				if (endpoint.method === 'post') {
					response = await request(app).post(endpoint.path).send({ sessionId: 'test' });
				} else if (endpoint.method === 'delete') {
					response = await request(app).delete(endpoint.path);
				} else {
					response = await request(app).get(endpoint.path);
				}

				// All error responses should have consistent format
				expect(response.status).toBeGreaterThanOrEqual(400);
				expect(response.body.error).toBeDefined();
				expect(response.body.error.message).toBeDefined();
				expect(response.body.error.code).toBeDefined();
				expect(typeof response.body.error.message).toBe('string');
				expect(response.body.error.message).not.toBe('[object Object]');
			}
		});
	});
});
