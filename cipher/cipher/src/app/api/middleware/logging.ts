import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger/index.js';

// Extend Express Request interface to include requestId
declare global {
	namespace Express {
		interface Request {
			requestId: string;
			startTime: number;
		}
	}
}

/**
 * Request ID middleware - adds unique request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
	req.requestId = uuidv4();
	req.startTime = Date.now();

	// Add request ID to response headers
	res.setHeader('X-Request-ID', req.requestId);

	next();
}

/**
 * Request logging middleware - logs incoming requests and responses
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
	const { method, url, ip, headers } = req;
	const userAgent = headers['user-agent'] || 'unknown';

	// Log incoming request
	logger.info('API Request', {
		requestId: req.requestId,
		method,
		url,
		ip,
		userAgent,
		contentType: headers['content-type'],
	});

	// Override res.end to log response
	const originalEnd = res.end;
	res.end = function (chunk?: any, encoding?: any): any {
		const duration = Date.now() - req.startTime;
		const { statusCode } = res;

		// Log response
		logger.info('API Response', {
			requestId: req.requestId,
			method,
			url,
			statusCode,
			duration: `${duration}ms`,
			responseSize: res.get('content-length') || 'unknown',
		});

		// Call original end method
		return originalEnd.call(this, chunk, encoding);
	};

	next();
}

/**
 * Error logging middleware - logs errors with request context
 */
export function errorLoggingMiddleware(
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	logger.error('API Error', {
		requestId: req.requestId,
		method: req.method,
		url: req.url,
		error: err.message,
		stack: err.stack,
		userAgent: req.headers['user-agent'],
	});

	next(err);
}
