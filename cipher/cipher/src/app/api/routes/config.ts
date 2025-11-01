import { Router, Request, Response } from 'express';
import { MemAgent } from '@core/brain/memAgent/index.js';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response.js';
import { redactSensitiveData } from '../utils/security.js';
import { logger } from '@core/logger/index.js';
import { dump as yamlDump } from 'js-yaml';

export function createConfigRoutes(agent: MemAgent): Router {
	const router = Router();

	/**
	 * GET /api/config.yaml
	 * Export current configuration as YAML with sensitive data redacted
	 */
	router.get('/yaml', async (req: Request, res: Response) => {
		try {
			logger.info('Exporting configuration as YAML', { requestId: req.requestId });

			// Get effective configuration
			const config = agent.getEffectiveConfig();

			// Redact sensitive information
			const redactedConfig = redactSensitiveData(config);

			// Convert to YAML
			const yamlConfig = yamlDump(redactedConfig, {
				indent: 2,
				lineWidth: 120,
				noRefs: true,
			});

			// Set appropriate headers for YAML response
			res.setHeader('Content-Type', 'application/x-yaml; charset=utf-8');
			res.setHeader('Content-Disposition', 'attachment; filename="cipher-config.yml"');
			res.setHeader('X-Request-ID', req.requestId);

			res.send(yamlConfig);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to export configuration', {
				requestId: req.requestId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to export configuration: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	/**
	 * GET /api/config
	 * Get current configuration as JSON with sensitive data redacted
	 */
	router.get('/', async (req: Request, res: Response) => {
		try {
			logger.info('Getting current configuration', { requestId: req.requestId });

			// Get effective configuration
			const config = agent.getEffectiveConfig();

			// Redact sensitive information
			const redactedConfig = redactSensitiveData(config);

			successResponse(
				res,
				{
					config: redactedConfig,
					timestamp: new Date().toISOString(),
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to get configuration', {
				requestId: req.requestId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get configuration: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	/**
	 * GET /api/config/session/:sessionId
	 * Get session-specific configuration
	 */
	router.get('/session/:sessionId', async (req: Request, res: Response) => {
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

			logger.info('Getting session-specific configuration', {
				requestId: req.requestId,
				sessionId,
			});

			// Check if session exists
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

			// Get session-specific configuration
			const config = agent.getEffectiveConfig(sessionId);

			// Redact sensitive information
			const redactedConfig = redactSensitiveData(config);

			successResponse(
				res,
				{
					sessionId,
					config: redactedConfig,
					timestamp: new Date().toISOString(),
				},
				200,
				req.requestId
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			logger.error('Failed to get session configuration', {
				requestId: req.requestId,
				sessionId: req.params.sessionId,
				error: errorMsg,
			});

			errorResponse(
				res,
				ERROR_CODES.INTERNAL_ERROR,
				`Failed to get session configuration: ${errorMsg}`,
				500,
				undefined,
				req.requestId
			);
		}
	});

	return router;
}
