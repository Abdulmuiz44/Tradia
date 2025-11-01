'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Session } from '@/types/server-registry';
import { ChatMessage } from '@/types/chat';

// LRU Cache implementation for session data
class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private maxSize: number;

	constructor(maxSize: number = 20) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxSize) {
			// Remove least recently used (first entry)
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, value);
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

// Session data structure for caching
interface CachedSessionData {
	session: Session;
	messages: ChatMessage[];
	lastAccessed: number;
	isLoaded: boolean;
}

// Session store state
interface SessionState {
	// Session list data
	sessions: Session[];
	sessionsLoading: boolean;
	sessionsError: string | null;
	lastSessionsFetch: number | null;

	// Current session
	currentSessionId: string | null;
	isWelcomeState: boolean;

	// Session cache
	sessionCache: LRUCache<string, CachedSessionData>;

	// Feature flags
	enableOptimizations: boolean;
	maxCacheSize: number;

	// Loading states
	switchingSession: boolean;
	creatingSession: boolean;
	deletingSessionId: string | null;

	// Actions
	setSessions: (sessions: Session[]) => void;
	setSessionsLoading: (loading: boolean) => void;
	setSessionsError: (error: string | null) => void;
	updateSessionInList: (sessionId: string, updates: Partial<Session>) => void;
	removeSessionFromList: (sessionId: string) => void;
	addSessionToList: (session: Session) => void;

	setCurrentSessionId: (sessionId: string | null) => void;
	setWelcomeState: (isWelcome: boolean) => void;

	// Cache management
	getCachedSession: (sessionId: string) => CachedSessionData | undefined;
	setCachedSession: (sessionId: string, data: CachedSessionData) => void;
	removeCachedSession: (sessionId: string) => void;
	clearSessionCache: () => void;
	getCacheStats: () => { size: number; keys: string[] };

	// Session operations
	setSwitchingSession: (switching: boolean) => void;
	setCreatingSession: (creating: boolean) => void;
	setDeletingSessionId: (sessionId: string | null) => void;

	// Settings
	setEnableOptimizations: (enabled: boolean) => void;
	setMaxCacheSize: (size: number) => void;

	// Utilities
	refreshSessionsList: () => void;
	preloadSession: (sessionId: string) => Promise<void>;
	invalidateSession: (sessionId: string) => void;
}

// Default settings
const DEFAULT_MAX_CACHE_SIZE = 15;
const DEFAULT_ENABLE_OPTIMIZATIONS = true;
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// Create the session store
export const useSessionStore = create<SessionState>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				// Initial state
				sessions: [],
				sessionsLoading: false,
				sessionsError: null,
				lastSessionsFetch: null,

				currentSessionId: null,
				isWelcomeState: true,

				sessionCache: new LRUCache(DEFAULT_MAX_CACHE_SIZE),

				enableOptimizations: DEFAULT_ENABLE_OPTIMIZATIONS,
				maxCacheSize: DEFAULT_MAX_CACHE_SIZE,

				switchingSession: false,
				creatingSession: false,
				deletingSessionId: null,

				// Session list actions - force re-render by creating new array reference
				setSessions: sessions => set({ sessions: [...sessions], lastSessionsFetch: Date.now() }),

				setSessionsLoading: loading => set({ sessionsLoading: loading }),

				setSessionsError: error => set({ sessionsError: error }),

				updateSessionInList: (sessionId, updates) =>
					set(state => ({
						sessions: [
							...state.sessions.map(session =>
								session.id === sessionId ? { ...session, ...updates } : session
							),
						],
					})),

				removeSessionFromList: sessionId =>
					set(state => ({
						sessions: [...state.sessions.filter(session => session.id !== sessionId)],
					})),

				addSessionToList: session =>
					set(state => {
						// Remove any existing session with same ID to prevent duplicates
						const filteredSessions = state.sessions.filter(s => s.id !== session.id);
						return {
							sessions: [session, ...filteredSessions],
						};
					}),

				// Current session actions
				setCurrentSessionId: sessionId => set({ currentSessionId: sessionId }),

				setWelcomeState: isWelcome => set({ isWelcomeState: isWelcome }),

				// Cache management
				getCachedSession: sessionId => {
					const cache = get().sessionCache;
					const cached = cache.get(sessionId);

					// Check if cache entry is expired
					if (cached && Date.now() - cached.lastAccessed > CACHE_EXPIRY_TIME) {
						cache.delete(sessionId);
						return undefined;
					}

					return cached;
				},

				setCachedSession: (sessionId, data) => {
					const state = get();
					const updatedData = { ...data, lastAccessed: Date.now() };
					state.sessionCache.set(sessionId, updatedData);

					// Force re-render by updating a reference
					set({ sessionCache: state.sessionCache });
				},

				removeCachedSession: sessionId => {
					const state = get();
					state.sessionCache.delete(sessionId);
					set({ sessionCache: state.sessionCache });
				},

				clearSessionCache: () => {
					const state = get();
					state.sessionCache.clear();
					set({ sessionCache: state.sessionCache });
				},

				getCacheStats: () => {
					const cache = get().sessionCache;
					return {
						size: cache.size(),
						keys: Array.from((cache as any).cache.keys()),
					};
				},

				// Session operations
				setSwitchingSession: switching => set({ switchingSession: switching }),

				setCreatingSession: creating => set({ creatingSession: creating }),

				setDeletingSessionId: sessionId => set({ deletingSessionId: sessionId }),

				// Settings
				setEnableOptimizations: enabled => {
					set({ enableOptimizations: enabled });
					if (!enabled) {
						get().clearSessionCache();
					}
				},

				setMaxCacheSize: size => {
					const state = get();
					state.sessionCache = new LRUCache(size);
					set({ maxCacheSize: size, sessionCache: state.sessionCache });
				},

				// Utilities
				refreshSessionsList: () => {
					// This will be implemented by the React Query hooks
					// Just clear the cache timestamp to force refetch
					set({ lastSessionsFetch: null });
				},

				preloadSession: async sessionId => {
					const state = get();
					if (!state.enableOptimizations) return;

					// Check if already cached
					if (state.getCachedSession(sessionId)) return;

					try {
						// This will be implemented by the React Query hooks
						console.log('Preloading session:', sessionId);
					} catch (error) {
						console.warn('Failed to preload session:', sessionId, error);
					}
				},

				invalidateSession: sessionId => {
					const state = get();
					state.removeCachedSession(sessionId);

					// Update session in list if it exists
					const session = state.sessions.find(s => s.id === sessionId);
					if (session) {
						state.updateSessionInList(sessionId, { lastActivity: new Date().toISOString() });
					}
				},
			}),
			{
				name: 'cipher-session-store',
				storage: createJSONStorage(() => localStorage),
				partialize: state => ({
					// Only persist certain state properties
					currentSessionId: state.currentSessionId,
					isWelcomeState: state.isWelcomeState,
					enableOptimizations: state.enableOptimizations,
					maxCacheSize: state.maxCacheSize,
					// Don't persist cache or loading states
				}),
				version: 1,
				migrate: (persistedState: any, version: number) => {
					// Handle version migrations if needed
					if (version === 0) {
						// Migrate from version 0 to 1
						return {
							...persistedState,
							enableOptimizations: DEFAULT_ENABLE_OPTIMIZATIONS,
							maxCacheSize: DEFAULT_MAX_CACHE_SIZE,
						};
					}
					return persistedState;
				},
			}
		)
	)
);

// Selectors for common use cases
export const selectCurrentSession = (state: SessionState) => {
	const { currentSessionId, sessions } = state;
	return currentSessionId ? sessions.find(s => s.id === currentSessionId) : null;
};

export const selectSessionById = (sessionId: string) => (state: SessionState) => {
	return state.sessions.find(s => s.id === sessionId);
};

export const selectIsSessionCached = (sessionId: string) => (state: SessionState) => {
	return state.getCachedSession(sessionId) !== undefined;
};

export const selectSessionsCount = (state: SessionState) => state.sessions.length;

export const selectRecentSessions =
	(limit: number = 5) =>
	(state: SessionState) => {
		return state.sessions
			.slice()
			.sort((a, b) => {
				const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
				const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
				return bTime - aTime;
			})
			.slice(0, limit);
	};

// Action creators for common operations
export const sessionStoreActions = {
	switchToSession: (sessionId: string) => {
		useSessionStore.getState().setCurrentSessionId(sessionId);
		useSessionStore.getState().setWelcomeState(false);
	},

	returnToWelcome: () => {
		useSessionStore.getState().setCurrentSessionId(null);
		useSessionStore.getState().setWelcomeState(true);
	},

	optimisticCreateSession: (session: Session) => {
		useSessionStore.getState().addSessionToList(session);
		useSessionStore.getState().setCurrentSessionId(session.id);
		useSessionStore.getState().setWelcomeState(false);
	},

	optimisticDeleteSession: (sessionId: string) => {
		const state = useSessionStore.getState();

		// If deleting current session, return to welcome
		if (state.currentSessionId === sessionId) {
			sessionStoreActions.returnToWelcome();
		}

		// Remove from list and cache
		state.removeSessionFromList(sessionId);
		state.removeCachedSession(sessionId);
	},

	rollbackCreateSession: (sessionId: string) => {
		const state = useSessionStore.getState();
		state.removeSessionFromList(sessionId);
		state.removeCachedSession(sessionId);

		if (state.currentSessionId === sessionId) {
			sessionStoreActions.returnToWelcome();
		}
	},

	rollbackDeleteSession: (session: Session) => {
		useSessionStore.getState().addSessionToList(session);
	},
};

// Hook for accessing store with selector
export const useSessionStoreSelector = <T>(selector: (state: SessionState) => T) => {
	return useSessionStore(selector);
};

// Subscribe to store changes
export const subscribeToSessionStore = (
	selector: (state: SessionState) => any,
	callback: (selectedState: any, previousSelectedState: any) => void
) => {
	return useSessionStore.subscribe(selector, callback);
};
