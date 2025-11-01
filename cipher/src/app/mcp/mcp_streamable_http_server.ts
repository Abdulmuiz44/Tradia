import express, { Application, Request, Response } from 'express';
import http from 'http';
import { randomUUID } from 'crypto';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {
	StreamableHTTPServerTransportOptions,
	EventStore,
	StreamId,
	EventId,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '@core/logger/index.js';

/**
 * Simple in-memory event store for streamable-HTTP transport resumability
 */
class InMemoryEventStore implements EventStore {
	private events: Map<string, { eventId: EventId; message: JSONRPCMessage }[]> = new Map();
	private eventCounter = 0;

	async storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId> {
		const eventId = `event-${++this.eventCounter}`;

		if (!this.events.has(streamId)) {
			this.events.set(streamId, []);
		}

		this.events.get(streamId)!.push({ eventId, message });

		// Keep only last 1000 events per stream to prevent memory leaks
		const events = this.events.get(streamId)!;
		if (events.length > 1000) {
			events.splice(0, events.length - 1000);
		}

		logger.debug(`[Event Store] Stored event ${eventId} for stream ${streamId}`);
		return eventId;
	}

	async replayEventsAfter(
		lastEventId: EventId,
		{ send }: { send: (eventId: EventId, message: JSONRPCMessage) => Promise<void> }
	): Promise<StreamId> {
		// Find the stream and event position
		for (const [streamId, events] of this.events.entries()) {
			const eventIndex = events.findIndex(e => e.eventId === lastEventId);

			if (eventIndex !== -1) {
				// Replay all events after the specified event ID
				const eventsToReplay = events.slice(eventIndex + 1);

				logger.debug(
					`[Event Store] Replaying ${eventsToReplay.length} events after ${lastEventId} for stream ${streamId}`
				);

				for (const event of eventsToReplay) {
					await send(event.eventId, event.message);
				}

				return streamId;
			}
		}

		// If event ID not found, return a new stream ID
		const newStreamId = randomUUID();
		logger.debug(
			`[Event Store] Event ${lastEventId} not found, creating new stream ${newStreamId}`
		);
		return newStreamId;
	}

	/**
	 * Clean up old events for a stream
	 */
	cleanupStream(streamId: StreamId): void {
		this.events.delete(streamId);
		logger.debug(`[Event Store] Cleaned up stream ${streamId}`);
	}

	/**
	 * Get stats about stored events
	 */
	getStats() {
		const totalEvents = Array.from(this.events.values()).reduce(
			(sum, events) => sum + events.length,
			0
		);
		return {
			streams: this.events.size,
			totalEvents,
			streams_details: Array.from(this.events.entries()).map(([streamId, events]) => {
				const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
				return {
					streamId,
					eventCount: events.length,
					latestEventId: lastEvent ? lastEvent.eventId : null,
				};
			}),
		};
	}
}

/**
 * Dedicated streamable-HTTP server for MCP mode following the proper streamable-HTTP specification.
 * Uses StreamableHTTPServerTransport from the MCP SDK for correct HTTP request-response pattern.
 */
export class McpStreamableHttpServer {
	private app: Application;
	private httpServer?: http.Server;
	private mcpServer?: McpServer;
	private transport?: StreamableHTTPServerTransport;
	private eventStore: InMemoryEventStore;
	private port: number;
	private host: string;
	private transportOptions: StreamableHTTPServerTransportOptions;

	constructor(
		port: number,
		host: string = 'localhost',
		options?: Partial<StreamableHTTPServerTransportOptions>
	) {
		this.port = port;
		this.host = host;
		this.eventStore = new InMemoryEventStore();

		// Configure transport options with sensible defaults and concrete types
		this.transportOptions = {
			...(options ?? {}),
			sessionIdGenerator: options?.sessionIdGenerator ?? (() => randomUUID()),
			eventStore: this.eventStore,
			enableDnsRebindingProtection: options?.enableDnsRebindingProtection ?? false,
			allowedHosts: options?.allowedHosts ?? [],
			allowedOrigins: options?.allowedOrigins ?? [],
		};

		this.app = express();
		this.setupMiddleware();
	}

	/**
	 * Set up minimal middleware for streamable-HTTP server
	 */
	private setupMiddleware(): void {
		// Minimal JSON parsing middleware
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true }));

		// Basic error handling
		this.app.use((err: Error, req: Request, res: Response, _next: any) => {
			logger.error('[MCP Streamable-HTTP Server] Request error:', {
				error: err.message,
				path: req.path,
				method: req.method,
			});

			if (!res.headersSent) {
				res.status(500).json({
					error: 'Internal server error',
					message: err.message,
				});
			}
		});
	}

	/**
	 * Start the streamable-HTTP server with the given MCP server instance
	 */
	async start(mcpServer: McpServer): Promise<void> {
		this.mcpServer = mcpServer;

		// Create a placeholder transport for initialization (required by interface)
		this.transport = new StreamableHTTPServerTransport(this.transportOptions);

		// Set up HTTP routes (actual transports will be created per session)
		this.setupHttpRoutes();

		// Start HTTP server
		return new Promise((resolve, reject) => {
			this.httpServer = http.createServer(this.app);

			this.httpServer.listen(this.port, this.host, () => {
				logger.info(
					`[MCP Streamable-HTTP Server] Started on ${this.host}:${this.port}`,
					null,
					'green'
				);
				logger.info(
					`[MCP Streamable-HTTP Server] HTTP endpoints: http://${this.host}:${this.port}/http`,
					null,
					'cyan'
				);
				resolve();
			});

			this.httpServer.on('error', err => {
				logger.error('[MCP Streamable-HTTP Server] Failed to start:', err.message);
				reject(err);
			});

			// Set up graceful shutdown handlers
			process.on('SIGTERM', () => this.stop());
			process.on('SIGINT', () => this.stop());
		});
	}

	/**
	 * Stop the streamable-HTTP server and clean up resources
	 */
	async stop(): Promise<void> {
		logger.info('[MCP Streamable-HTTP Server] Shutting down...');

		// Close the transport
		if (this.transport) {
			try {
				this.transport.close();
			} catch (error) {
				logger.error('[MCP Streamable-HTTP Server] Error closing transport:', error);
			}
		}

		// Close HTTP server
		if (this.httpServer) {
			return new Promise(resolve => {
				this.httpServer!.close(() => {
					logger.info('[MCP Streamable-HTTP Server] Stopped');
					resolve();
				});
			});
		}
	}

	/**
	 * Set up HTTP routes following the streamable-HTTP transport pattern
	 * Following the MCP SDK example pattern with session management
	 */
	private setupHttpRoutes(): void {
		if (!this.transport) {
			logger.error('[MCP Streamable-HTTP Server] Transport not initialized for route setup.');
			return;
		}

		// Map to store transports by session ID (following MCP SDK example)
		const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

		// POST /http - Main endpoint for streamable-HTTP requests (initialization and messages)
		this.app.post('/http', async (req: Request, res: Response) => {
			logger.debug('[MCP Streamable-HTTP Server] POST request received');
			logger.debug('[MCP Streamable-HTTP Server] POST Request Headers:', req.headers);
			logger.debug('[MCP Streamable-HTTP Server] POST Request Body:', req.body);

			const sessionId = req.headers['mcp-session-id'] as string;

			try {
				let transport: StreamableHTTPServerTransport;

				if (sessionId && transports[sessionId]) {
					// Reuse existing transport
					transport = transports[sessionId];
					logger.debug(
						`[MCP Streamable-HTTP Server] Using existing transport for session: ${sessionId}`
					);
				} else if (!sessionId && isInitializeRequest(req.body)) {
					// New initialization request - create new transport
					transport = new StreamableHTTPServerTransport({
						sessionIdGenerator: this.transportOptions.sessionIdGenerator ?? (() => randomUUID()),
						eventStore: this.eventStore,
						enableDnsRebindingProtection:
							this.transportOptions.enableDnsRebindingProtection ?? false,
						allowedHosts: this.transportOptions.allowedHosts ?? [],
						allowedOrigins: this.transportOptions.allowedOrigins ?? [],
						onsessioninitialized: (newSessionId: string) => {
							logger.info(`[MCP Streamable-HTTP Server] Session initialized: ${newSessionId}`);
							transports[newSessionId] = transport;
						},
					});

					// Set up onclose handler
					transport.onclose = () => {
						const sid = transport.sessionId;
						if (sid && transports[sid]) {
							logger.info(`[MCP Streamable-HTTP Server] Transport closed for session ${sid}`);
							delete transports[sid];
						}
					};

					// Connect transport to MCP server
					await this.mcpServer!.connect(transport);
					logger.debug('[MCP Streamable-HTTP Server] New transport connected to MCP server');
				} else {
					// Invalid request
					logger.error(
						'[MCP Streamable-HTTP Server] Invalid request - no session ID or not initialization'
					);
					return res.status(400).json({
						jsonrpc: '2.0',
						error: {
							code: -32000,
							message: 'Bad Request: No valid session ID provided',
						},
						id: null,
					});
				}

				// Handle the request with the transport
				await transport.handleRequest(req, res, req.body);
				logger.debug('[MCP Streamable-HTTP Server] POST request handled successfully');
				return;
			} catch (error) {
				logger.error('[MCP Streamable-HTTP Server] Error handling POST request:', error);
				if (!res.headersSent) {
					res.status(500).json({
						jsonrpc: '2.0',
						error: {
							code: -32603,
							message: 'Internal server error',
						},
						id: null,
					});
				}
				return;
			}
		});

		// GET /http - Handle SSE streams for existing sessions
		this.app.get('/http', async (req: Request, res: Response) => {
			logger.info('[MCP Streamable-HTTP Server] GET request for SSE stream');
			logger.debug('[MCP Streamable-HTTP Server] GET Request Headers:', req.headers);

			const sessionId = req.headers['mcp-session-id'] as string;
			if (!sessionId || !transports[sessionId]) {
				logger.error('[MCP Streamable-HTTP Server] Invalid or missing session ID for SSE stream');
				return res.status(400).send('Invalid or missing session ID');
			}

			// Check for resumability
			const lastEventId = req.headers['last-event-id'] as string;
			if (lastEventId) {
				logger.info(
					`[MCP Streamable-HTTP Server] Client reconnecting with Last-Event-ID: ${lastEventId}`
				);
			} else {
				logger.info(
					`[MCP Streamable-HTTP Server] Establishing new SSE stream for session ${sessionId}`
				);
			}

			try {
				const transport = transports[sessionId];
				await transport.handleRequest(req, res);
				logger.debug('[MCP Streamable-HTTP Server] GET request handled successfully');
				return;
			} catch (error) {
				logger.error('[MCP Streamable-HTTP Server] Error handling GET request:', error);
				if (!res.headersSent) {
					res.status(500).send('Error establishing SSE stream');
				}
				return;
			}
		});

		// DELETE /http - Handle session termination
		this.app.delete('/http', async (req: Request, res: Response) => {
			logger.info('[MCP Streamable-HTTP Server] DELETE request for session termination');
			logger.debug('[MCP Streamable-HTTP Server] DELETE Request Headers:', req.headers);

			const sessionId = req.headers['mcp-session-id'] as string;
			if (!sessionId || !transports[sessionId]) {
				logger.error('[MCP Streamable-HTTP Server] Invalid or missing session ID for termination');
				return res.status(400).send('Invalid or missing session ID');
			}

			try {
				const transport = transports[sessionId];
				await transport.handleRequest(req, res);
				logger.debug('[MCP Streamable-HTTP Server] DELETE request handled successfully');
				return;
			} catch (error) {
				logger.error('[MCP Streamable-HTTP Server] Error handling DELETE request:', error);
				if (!res.headersSent) {
					res.status(500).send('Error processing session termination');
				}
				return;
			}
		});

		// GET /http/stats - Get server statistics (debugging endpoint)
		this.app.get('/http/stats', (req: Request, res: Response) => {
			const stats = this.getStats();
			res.json(stats);
		});

		logger.info('[MCP Streamable-HTTP Server] Streamable-HTTP routes registered:');
		logger.info(
			'  GET /http (establish stream), POST /http (send/receive), DELETE /http (cleanup)'
		);
	}

	/**
	 * Get the HTTP server instance
	 */
	getHttpServer(): http.Server | undefined {
		return this.httpServer;
	}

	/**
	 * Get server stats
	 */
	getStats() {
		return {
			port: this.port,
			host: this.host,
			transport: 'streamable-http',
			isRunning: !!this.httpServer,
			eventStore: this.eventStore.getStats(),
			transportOptions: {
				hasSessionIdGenerator: !!this.transportOptions.sessionIdGenerator,
				hasEventStore: !!this.transportOptions.eventStore,
				enableDnsRebindingProtection: this.transportOptions.enableDnsRebindingProtection,
				allowedHosts: this.transportOptions.allowedHosts?.length || 0,
				allowedOrigins: this.transportOptions.allowedOrigins?.length || 0,
			},
		};
	}

	/**
	 * Get the transport instance
	 */
	getTransport(): StreamableHTTPServerTransport | undefined {
		return this.transport;
	}

	/**
	 * Clean up a specific stream from the event store
	 */
	cleanupStream(streamId: string): void {
		this.eventStore.cleanupStream(streamId);
	}
}
