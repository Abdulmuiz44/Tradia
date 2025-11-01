/**
 * Event-Aware Vector Store Wrapper
 *
 * Wraps any VectorStore implementation to emit session-scoped memory operation events.
 * This enables tracking and monitoring of memory operations in the event system.
 */

import { VectorStore, VectorStoreResult, SearchFilters } from './backend/types.js';
import { EventManager } from '../events/event-manager.js';
import { SessionEvents } from '../events/event-types.js';
import { logger } from '../logger/logger.js';

/**
 * Event-aware wrapper for VectorStore implementations
 *
 * Delegates all operations to the underlying store while emitting appropriate events
 */
export class EventAwareVectorStore implements VectorStore {
	private store: VectorStore;
	private eventManager?: EventManager;
	private sessionId?: string;

	constructor(store: VectorStore, eventManager?: EventManager, sessionId?: string) {
		this.store = store;
		this.eventManager = eventManager!;
		this.sessionId = sessionId!;
	}

	/**
	 * Set the session context for event emission
	 */
	setSessionContext(sessionId: string): void {
		this.sessionId = sessionId;
	}

	/**
	 * Set the event manager for event emission
	 */
	setEventManager(eventManager: EventManager): void {
		this.eventManager = eventManager;
	}

	async insert(vectors: number[][], ids: number[], payloads: Record<string, any>[]): Promise<void> {
		const startTime = Date.now();

		try {
			await this.store.insert(vectors, ids, payloads);

			// Emit memory stored event
			if (this.eventManager && this.sessionId) {
				this.eventManager.emitSessionEvent(this.sessionId, SessionEvents.MEMORY_STORED, {
					sessionId: this.sessionId,
					type: 'knowledge',
					size: vectors.length,
					timestamp: Date.now(),
				});
			}

			logger.debug('Memory operation: insert completed', {
				vectorCount: vectors.length,
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});
		} catch (error) {
			logger.error('Memory operation: insert failed', {
				error: error instanceof Error ? error.message : String(error),
				vectorCount: vectors.length,
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async search(
		query: number[],
		limit?: number,
		filters?: SearchFilters
	): Promise<VectorStoreResult[]> {
		const startTime = Date.now();

		try {
			const results = await this.store.search(query, limit, filters);

			// Emit memory searched event
			if (this.eventManager && this.sessionId) {
				this.eventManager.emitSessionEvent(this.sessionId, SessionEvents.MEMORY_SEARCHED, {
					sessionId: this.sessionId,
					query: 'vector_search',
					resultCount: results.length,
					duration: Date.now() - startTime,
					timestamp: Date.now(),
				});
			}

			logger.debug('Memory operation: search completed', {
				resultCount: results.length,
				limit: limit || 10,
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});

			return results;
		} catch (error) {
			logger.error('Memory operation: search failed', {
				error: error instanceof Error ? error.message : String(error),
				limit: limit || 10,
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async get(vectorId: number): Promise<VectorStoreResult | null> {
		const startTime = Date.now();

		try {
			const result = await this.store.get(vectorId);

			// Emit memory retrieved event
			if (this.eventManager && this.sessionId) {
				this.eventManager.emitSessionEvent(this.sessionId, SessionEvents.MEMORY_RETRIEVED, {
					sessionId: this.sessionId,
					type: 'knowledge',
					count: result ? 1 : 0,
					timestamp: Date.now(),
				});
			}

			logger.debug('Memory operation: get completed', {
				vectorId,
				found: !!result,
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});

			return result;
		} catch (error) {
			logger.error('Memory operation: get failed', {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async update(vectorId: number, vector: number[], payload: Record<string, any>): Promise<void> {
		const startTime = Date.now();

		try {
			await this.store.update(vectorId, vector, payload);

			// Emit memory stored event for updates
			if (this.eventManager && this.sessionId) {
				this.eventManager.emitSessionEvent(this.sessionId, SessionEvents.MEMORY_STORED, {
					sessionId: this.sessionId,
					type: 'knowledge',
					size: 1,
					timestamp: Date.now(),
				});
			}

			logger.debug('Memory operation: update completed', {
				vectorId,
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});
		} catch (error) {
			logger.error('Memory operation: update failed', {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async delete(vectorId: number): Promise<void> {
		const startTime = Date.now();

		try {
			await this.store.delete(vectorId);

			// Emit memory deleted event (using memory_stored with delete operation)
			if (this.eventManager && this.sessionId) {
				this.eventManager.emitSessionEvent(this.sessionId, SessionEvents.MEMORY_STORED, {
					sessionId: this.sessionId,
					type: 'knowledge',
					size: 1,
					timestamp: Date.now(),
				});
			}

			logger.debug('Memory operation: delete completed', {
				vectorId,
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});
		} catch (error) {
			logger.error('Memory operation: delete failed', {
				error: error instanceof Error ? error.message : String(error),
				vectorId,
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async deleteCollection(): Promise<void> {
		const startTime = Date.now();

		try {
			await this.store.deleteCollection();

			logger.info('Memory operation: collection deleted', {
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});
		} catch (error) {
			logger.error('Memory operation: deleteCollection failed', {
				error: error instanceof Error ? error.message : String(error),
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	async list(filters?: SearchFilters, limit?: number): Promise<[VectorStoreResult[], number]> {
		const startTime = Date.now();

		try {
			const [results, total] = await this.store.list(filters, limit);

			logger.debug('Memory operation: list completed', {
				resultCount: results.length,
				totalCount: total,
				limit: limit || 'unlimited',
				duration: Date.now() - startTime,
				sessionId: this.sessionId,
			});

			return [results, total];
		} catch (error) {
			logger.error('Memory operation: list failed', {
				error: error instanceof Error ? error.message : String(error),
				limit: limit || 'unlimited',
				sessionId: this.sessionId,
			});
			throw error;
		}
	}

	// Delegate connection management methods
	async connect(): Promise<void> {
		return this.store.connect();
	}

	async disconnect(): Promise<void> {
		return this.store.disconnect();
	}

	isConnected(): boolean {
		return this.store.isConnected();
	}

	// Delegate metadata methods
	getBackendType(): string {
		return this.store.getBackendType();
	}

	getDimension(): number {
		return this.store.getDimension();
	}

	getCollectionName(): string {
		return this.store.getCollectionName();
	}
}
