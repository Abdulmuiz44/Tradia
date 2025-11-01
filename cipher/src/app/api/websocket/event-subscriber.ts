import { EventManager } from '@core/events/event-manager.js';
import { logger } from '@core/logger/index.js';
import { WebSocketConnectionManager } from './connection-manager.js';
import { WebSocketResponse, WebSocketEventType, WebSocketEventData } from './types.js';

export class WebSocketEventSubscriber {
	private abortController: AbortController | null = null;
	private sessionAbortControllers = new Map<string, AbortController>();
	private subscribedSessions = new Set<string>();
	private subscriptionStats = {
		totalEventsReceived: 0,
		totalEventsBroadcast: 0,
		eventTypeStats: new Map<string, number>(),
		lastEventTime: 0,
	};

	constructor(
		private connectionManager: WebSocketConnectionManager,
		private eventManager: EventManager
	) {}

	/**
	 * Subscribe to events from the EventManager
	 */
	subscribe(): void {
		if (this.abortController) {
			logger.warn('WebSocket event subscriber already active');
			return;
		}

		this.abortController = new AbortController();
		const { signal } = this.abortController;

		// Set higher max listeners limit to prevent memory leak warnings
		// Note: AbortSignal doesn't have setMaxListeners, but we can set it on the AbortController
		try {
			if (
				'setMaxListeners' in this.abortController &&
				typeof this.abortController.setMaxListeners === 'function'
			) {
				this.abortController.setMaxListeners(100);
			}
		} catch {
			// Ignore if setMaxListeners is not available
		}

		logger.info('Starting WebSocket event subscription');

		// Subscribe to Service Events
		this.subscribeToServiceEvents(signal);

		// Subscribe to Session Events (we'll handle session-specific events dynamically)
		this.subscribeToSessionEvents();

		logger.info('WebSocket event subscriptions established');
	}

	/**
	 * Subscribe to service-level events
	 */
	private subscribeToServiceEvents(signal: AbortSignal): void {
		const serviceBus = this.eventManager.getServiceEventBus();

		// MCP Events
		serviceBus.on(
			'cipher:mcpClientConnected',
			data => {
				this.handleEvent(
					'mcpServerConnected',
					{
						serverName: data.serverName,
						capabilities: [],
					},
					signal
				);
			},
			{ signal }
		);

		serviceBus.on(
			'cipher:mcpClientDisconnected',
			data => {
				this.handleEvent(
					'mcpServerDisconnected',
					{
						serverName: data.serverName,
						...(data.reason && { reason: data.reason }),
					},
					signal
				);
			},
			{ signal }
		);

		// Tool Events
		serviceBus.on(
			'cipher:toolRegistered',
			data => {
				this.handleEvent(
					'availableToolsUpdated',
					{
						tools: [data.toolName],
					},
					signal
				);
			},
			{ signal }
		);

		// Memory Events
		serviceBus.on(
			'cipher:memoryOperationCompleted',
			data => {
				this.handleEvent(
					'memoryOperation',
					{
						operation: data.operation as 'store' | 'retrieve' | 'search',
						success: true,
						sessionId: data.sessionId || '',
						details: {
							operation: data.operation,
							duration: data.duration,
						},
					},
					signal
				);
			},
			{ signal }
		);

		serviceBus.on(
			'cipher:memoryOperationFailed',
			data => {
				this.handleEvent(
					'memoryOperation',
					{
						operation: data.operation as 'store' | 'retrieve' | 'search',
						success: false,
						sessionId: data.sessionId || '',
						details: {
							error: data.error,
						},
					},
					signal
				);
			},
			{ signal }
		);

		// System Events
		serviceBus.on(
			'cipher:error',
			data => {
				this.handleEvent(
					'error',
					{
						message: data.error || 'System error',
						code: 'SYSTEM_ERROR',
						...(data.stack && { stack: data.stack }),
					},
					signal
				);
			},
			{ signal }
		);
	}

	/**
	 * Subscribe to session-specific events dynamically
	 */
	private subscribeToSessionEvents(): void {
		// Listen for all active sessions and subscribe to their events
		const activeSessions = this.eventManager.getActiveSessionIds();

		activeSessions.forEach(sessionId => {
			if (!this.subscribedSessions.has(sessionId)) {
				// Create session-specific abort controller for existing sessions too
				const sessionAbortController = new AbortController();
				this.sessionAbortControllers.set(sessionId, sessionAbortController);

				this.subscribeToSingleSessionEvents(sessionId, sessionAbortController.signal);
				this.subscribedSessions.add(sessionId);
			}
		});

		logger.debug('Session event subscriptions ready for existing sessions', {
			existingSessionCount: activeSessions.length,
			subscribedSessionCount: this.subscribedSessions.size,
		});
	}

	/**
	 * Subscribe to a session's events on-demand (called when session is bound to connection)
	 */
	public subscribeToSession(sessionId: string): void {
		if (this.abortController && !this.subscribedSessions.has(sessionId)) {
			logger.debug('Dynamically subscribing to session events', { sessionId });

			// Create session-specific abort controller to prevent memory leaks
			const sessionAbortController = new AbortController();
			this.sessionAbortControllers.set(sessionId, sessionAbortController);

			this.subscribeToSingleSessionEvents(sessionId, sessionAbortController.signal);
			this.subscribedSessions.add(sessionId);
		} else if (this.subscribedSessions.has(sessionId)) {
			logger.debug('Session already subscribed, skipping', { sessionId });
		}
	}

	/**
	 * Remove session from tracking when it's deleted
	 */
	public unsubscribeFromSession(sessionId: string): void {
		if (this.subscribedSessions.has(sessionId)) {
			// Abort session-specific events to clean up listeners
			const sessionAbortController = this.sessionAbortControllers.get(sessionId);
			if (sessionAbortController) {
				sessionAbortController.abort();
				this.sessionAbortControllers.delete(sessionId);
			}

			this.subscribedSessions.delete(sessionId);
			logger.debug('Session removed from subscription tracking and listeners cleaned up', {
				sessionId,
			});
		}
	}

	/**
	 * Subscribe to events for a specific session
	 */
	private subscribeToSingleSessionEvents(sessionId: string, signal: AbortSignal): void {
		const sessionBus = this.eventManager.getSessionEventBus(sessionId);

		// LLM Events
		sessionBus.on(
			'llm:thinking',
			data => {
				this.handleEvent(
					'thinking',
					{
						sessionId: data.sessionId,
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'llm:responseStarted',
			data => {
				// Don't send another thinking event, just log it
				logger.debug('LLM response started', { sessionId: data.sessionId });
			},
			{ signal }
		);

		// Add streaming chunk event listener
		sessionBus.on(
			'llm:responseChunk',
			(data: any) => {
				this.handleEvent(
					'chunk',
					{
						text: data.chunk || data.text || '',
						isComplete: false,
						sessionId: data.sessionId,
						messageId: data.messageId,
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'llm:responseCompleted',
			async (data: any) => {
				// Use the actual response content from the event data
				const content = data.response || data.content || 'Response completed';

				const sessionId = data.sessionId;
				const messageId = data.messageId;

				// Break down the response into chunks and emit them
				if (content && typeof content === 'string') {
					const chunkSize = 50; // Emit chunks of 50 characters
					for (let i = 0; i < content.length; i += chunkSize) {
						const chunk = content.slice(i, i + chunkSize);
						const isComplete = i + chunkSize >= content.length;

						this.handleEvent(
							'chunk',
							{
								text: chunk,
								isComplete,
								sessionId,
								messageId,
							},
							signal
						);

						// Add a small delay between chunks to simulate real streaming
						if (!isComplete) {
							await new Promise(resolve => setTimeout(resolve, 50));
						}
					}
				}

				// Emit the final response event
				this.handleEvent(
					'response',
					{
						content: content,
						sessionId: data.sessionId,
						messageId: data.messageId,
						metadata: {
							model: data.model,
							tokenCount: data.tokenCount,
							duration: data.duration,
						},
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'llm:responseError',
			data => {
				this.handleEvent(
					'error',
					{
						message: data.error || 'LLM processing error',
						code: 'LLM_ERROR',
						sessionId: data.sessionId,
					},
					signal
				);
			},
			{ signal }
		);

		// Tool Events
		sessionBus.on(
			'tool:executionStarted',
			data => {
				logger.debug('WebSocket: Received tool:executionStarted event', {
					toolName: data.toolName,
					sessionId: data.sessionId,
					executionId: data.executionId,
					argsKeys: data.args ? Object.keys(data.args) : [],
					args: data.args,
				});

				// Send the specific tool execution started event
				this.handleEvent(
					'toolExecutionStarted',
					{
						toolName: data.toolName,
						sessionId: data.sessionId,
						callId: data.executionId,
						executionId: data.executionId,
						args: data.args || {},
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'tool:executionCompleted',
			(data: any) => {
				// Send specific completion event
				this.handleEvent(
					'toolExecutionCompleted',
					{
						toolName: data.toolName,
						success: data.success,
						sessionId: data.sessionId,
						callId: data.executionId,
						executionId: data.executionId,
						result: data.result,
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'tool:executionFailed',
			(data: any) => {
				// Send specific failure event
				this.handleEvent(
					'toolExecutionFailed',
					{
						toolName: data.toolName,
						error: data.error,
						sessionId: data.sessionId,
						callId: data.executionId,
						executionId: data.executionId,
					},
					signal
				);
			},
			{ signal }
		);

		// Memory Events
		sessionBus.on(
			'memory:stored',
			(data: any) => {
				this.handleEvent(
					'memoryOperation',
					{
						operation: 'store',
						success: true,
						sessionId: data.sessionId,
						details: {
							type: data.type,
							size: data.size,
						},
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'memory:retrieved',
			(data: any) => {
				this.handleEvent(
					'memoryOperation',
					{
						operation: 'retrieve',
						success: true,
						sessionId: data.sessionId,
						details: {
							count: data.count,
							type: data.type,
						},
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'memory:searched',
			(data: any) => {
				this.handleEvent(
					'memoryOperation',
					{
						operation: 'search',
						success: true,
						sessionId: data.sessionId,
						details: {
							query: data.query,
							resultCount: data.resultCount,
							duration: data.duration,
						},
					},
					signal
				);
			},
			{ signal }
		);

		// Session Lifecycle Events
		sessionBus.on(
			'session:created',
			data => {
				this.handleEvent(
					'sessionCreated',
					{
						sessionId: data.sessionId,
						timestamp: data.timestamp,
					},
					signal
				);
			},
			{ signal }
		);

		sessionBus.on(
			'session:deleted',
			data => {
				// Clean up session subscription tracking
				this.unsubscribeFromSession(data.sessionId);

				this.handleEvent(
					'sessionEnded',
					{
						sessionId: data.sessionId,
						timestamp: data.timestamp,
					},
					signal
				);
			},
			{ signal }
		);

		// Conversation Events
		sessionBus.on(
			'conversation:cleared',
			data => {
				this.handleEvent(
					'conversationReset',
					{
						sessionId: data.sessionId,
					},
					signal
				);
			},
			{ signal }
		);
	}

	/**
	 * Handle an event and broadcast to appropriate WebSocket connections
	 */
	private handleEvent<T extends WebSocketEventType>(
		eventType: T,
		data: WebSocketEventData[T],
		signal: AbortSignal
	): void {
		if (signal.aborted) {
			return;
		}

		const response: WebSocketResponse = {
			event: eventType,
			data: data,
			timestamp: Date.now(),
		};

		// Broadcast to all sessions if no specific sessionId
		const sessionId = (data as any)?.sessionId;
		if (!sessionId) {
			this.broadcastMessage(response);
		} else {
			this.broadcastToSession(sessionId, response);
		}

		// Update stats
		this.subscriptionStats.totalEventsBroadcast++;
		this.subscriptionStats.lastEventTime = Date.now();
		this.subscriptionStats.eventTypeStats.set(
			eventType,
			(this.subscriptionStats.eventTypeStats.get(eventType) || 0) + 1
		);
	}

	/**
	 * Unsubscribe from events
	 */
	unsubscribe(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}

		// Clean up all session-specific abort controllers
		this.sessionAbortControllers.forEach((controller, sessionId) => {
			controller.abort();
		});
		this.sessionAbortControllers.clear();
		this.subscribedSessions.clear();

		logger.info('WebSocket event subscriptions terminated and all session controllers cleaned up');
	}

	/**
	 * Get subscription statistics
	 */
	getStats(): {
		isActive: boolean;
		totalEventsReceived: number;
		totalEventsBroadcast: number;
		lastEventTime: number;
		eventTypeStats: Record<string, number>;
		subscribedSessionCount: number;
		connectionStats: any;
	} {
		return {
			isActive: !!this.abortController && !this.abortController.signal.aborted,
			totalEventsReceived: this.subscriptionStats.totalEventsReceived,
			totalEventsBroadcast: this.subscriptionStats.totalEventsBroadcast,
			lastEventTime: this.subscriptionStats.lastEventTime,
			eventTypeStats: Object.fromEntries(this.subscriptionStats.eventTypeStats),
			subscribedSessionCount: this.subscribedSessions.size,
			connectionStats: this.connectionManager.getStats(),
		};
	}

	/**
	 * Manually broadcast a message to all connections
	 */
	broadcastMessage(message: WebSocketResponse): void {
		this.connectionManager.broadcastToAll(message);
		this.subscriptionStats.totalEventsBroadcast++;
	}

	/**
	 * Manually broadcast a message to a specific session
	 */
	broadcastToSession(sessionId: string, message: WebSocketResponse): void {
		this.connectionManager.broadcastToSession(sessionId, message);
		this.subscriptionStats.totalEventsBroadcast++;
	}

	/**
	 * Send a system message to all connections
	 */
	sendSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
		const response: WebSocketResponse = {
			event: 'systemMessage',
			data: {
				message,
				level,
				timestamp: Date.now(),
			},
			timestamp: Date.now(),
		};

		this.broadcastMessage(response);

		logger.info('System message broadcast via WebSocket', {
			message,
			level,
		});
	}

	/**
	 * Check if subscriber is active
	 */
	isActive(): boolean {
		return !!this.abortController && !this.abortController.signal.aborted;
	}

	/**
	 * Dispose of the event subscriber
	 */
	dispose(): void {
		this.unsubscribe();

		// Reset statistics
		this.subscriptionStats = {
			totalEventsReceived: 0,
			totalEventsBroadcast: 0,
			eventTypeStats: new Map<string, number>(),
			lastEventTime: 0,
		};

		// Clear subscribed sessions
		this.subscribedSessions.clear();

		logger.info('WebSocket event subscriber disposed');
	}
}
