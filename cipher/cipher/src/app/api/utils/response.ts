import { Response } from 'express';

// Standard API response structure
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	meta?: {
		timestamp: string;
		requestId?: string;
	};
}

// Success response helper
export function successResponse<T>(
	res: Response,
	data: T,
	statusCode: number = 200,
	requestId?: string
): void {
	const response: ApiResponse<T> = {
		success: true,
		data,
		meta: {
			timestamp: new Date().toISOString(),
			...(requestId && { requestId }),
		},
	};

	res.status(statusCode).json(response);
}

// CRITICAL FIX: Enhanced error response helper to prevent [object Object] display
export function errorResponse(
	res: Response,
	code: string,
	message: string,
	statusCode: number = 500,
	details?: any,
	requestId?: string
): void {
	// CRITICAL FIX: Sanitize error message and details to ensure they're serializable
	let sanitizedMessage = message;
	let sanitizedDetails = details;

	// Ensure message is always a string
	if (typeof message !== 'string') {
		try {
			sanitizedMessage =
				(message as any) instanceof Error ? (message as Error).message : String(message);
		} catch {
			sanitizedMessage = 'Unknown error occurred';
		}
	}

	// Sanitize details to prevent circular references and [object Object] display
	if (details !== undefined && details !== null) {
		try {
			if (details instanceof Error) {
				sanitizedDetails = {
					message: details.message,
					name: details.name,
					...(details.stack && { stack: details.stack.split('\n').slice(0, 3).join('\n') }),
				};
			} else if (typeof details === 'object') {
				// Safely stringify object, handling circular references
				sanitizedDetails = JSON.parse(
					JSON.stringify(details, (key, value) => {
						// Handle circular references and functions
						if (typeof value === 'function') return '[Function]';
						if (typeof value === 'symbol') return '[Symbol]';
						if (value instanceof Error) return { message: value.message, name: value.name };
						return value;
					})
				);
			} else {
				sanitizedDetails = String(details);
			}
		} catch {
			// If serialization fails, convert to string
			sanitizedDetails = { message: String(details), serializationError: true };
		}
	}

	const response: ApiResponse = {
		success: false,
		error: {
			code,
			message: sanitizedMessage,
			...(sanitizedDetails !== undefined && { details: sanitizedDetails }),
		},
		meta: {
			timestamp: new Date().toISOString(),
			...(requestId && { requestId }),
		},
	};

	res.status(statusCode).json(response);
}

// Common error codes
export const ERROR_CODES = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	UNAUTHORIZED: 'UNAUTHORIZED',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	BAD_REQUEST: 'BAD_REQUEST',
	SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
	MCP_SERVER_ERROR: 'MCP_SERVER_ERROR',
	LLM_ERROR: 'LLM_ERROR',
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
