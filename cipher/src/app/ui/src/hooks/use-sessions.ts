'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Session } from '@/types/server-registry';
import { ChatMessage, SessionMessage } from '@/types/chat';
import { useSessionStore, sessionStoreActions } from '@/stores/session-store';
import { convertHistoryToUIMessages, loadSession, loadSessionHistory } from '@/lib/chat-config';

// Browser event types
declare global {
	interface WindowEventMap {
		'cipher:newMessage': CustomEvent;
		'cipher:response': CustomEvent;
		'cipher:responseComplete': CustomEvent;
	}
}

// Simplified session sync (React Query handles most synchronization automatically)
export function useSessionsSync() {
	const queryClient = useQueryClient();

	const syncSessions = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists() });
	}, [queryClient]);

	return { syncSessions };
}

// Query keys
export const sessionQueryKeys = {
	all: ['sessions'] as const,
	lists: () => [...sessionQueryKeys.all, 'list'] as const,
	list: (filters?: any) => [...sessionQueryKeys.lists(), filters] as const,
	details: () => [...sessionQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...sessionQueryKeys.details(), id] as const,
	history: (id: string) => [...sessionQueryKeys.detail(id), 'history'] as const,
};

// API functions
async function fetchSessions(): Promise<Session[]> {
	const response = await fetch('/api/sessions');
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error?.message || errorData.message || 'Failed to fetch sessions');
	}

	const data = await response.json();
	const sessions = data.data?.sessions || data.sessions || [];

	// CRITICAL FIX: Filter out sessions with 0 messages and enhance with message counts
	const sessionsWithCounts = await Promise.all(
		sessions.map(async (session: Session) => {
			try {
				const historyResponse = await fetch(`/api/sessions/${session.id}/history`);
				if (historyResponse.ok) {
					const historyData = await historyResponse.json();
					const history = historyData.data?.history || historyData.history || [];
					// Filter to only include user and assistant messages (excluding tool calls)
					const filteredHistory = history.filter((msg: any) => {
						// Include user messages
						if (msg.role === 'user') return true;
						// Include assistant messages that don't have tool calls
						if (msg.role === 'assistant' && (!msg.toolCalls || msg.toolCalls.length === 0))
							return true;
						// Exclude everything else
						return false;
					});
					return { ...session, messageCount: filteredHistory.length };
				}
			} catch (error) {
				console.warn(`Failed to load message count for session ${session.id}:`, error);
			}
			return { ...session, messageCount: session.messageCount || 0 };
		})
	);

	// Filter out phantom sessions with 0 messages to prevent UI inconsistencies
	const validSessions = sessionsWithCounts.filter(session => session.messageCount > 0);

	console.log(
		`📊 Sessions filtered: ${sessions.length} → ${validSessions.length} (removed ${sessions.length - validSessions.length} phantom sessions)`
	);

	return validSessions;
}

async function fetchSessionHistory(sessionId: string): Promise<SessionMessage[]> {
	return loadSessionHistory(sessionId);
}

async function createSession(sessionId?: string): Promise<Session> {
	const response = await fetch('/api/sessions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(sessionId ? { sessionId } : {}),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error?.message || errorData.message || 'Failed to create session');
	}

	const data = await response.json();
	const session = data.data?.session || data.session;

	if (!session || !session.id) {
		throw new Error('Invalid session response format');
	}

	return session;
}

async function deleteSession(sessionId: string): Promise<void> {
	console.log('🗑️ Deleting session:', sessionId);
	const response = await fetch(`/api/sessions/${sessionId}`, {
		method: 'DELETE',
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		console.error('❌ Session deletion failed:', sessionId, errorData);
		throw new Error(errorData.error?.message || errorData.message || 'Failed to delete session');
	}

	console.log('✅ Session deletion successful:', sessionId);
}

async function loadSessionData(
	sessionId: string
): Promise<{ session: Session; messages: ChatMessage[] }> {
	// Load session on backend first
	const sessionData = await loadSession(sessionId);

	// Get session details from the sessions list or fetch individually
	let session: Session;
	const cachedSession = useSessionStore.getState().getCachedSession(sessionId);

	if (cachedSession?.session) {
		session = cachedSession.session;
	} else {
		// Fetch session details if not cached
		try {
			const response = await fetch(`/api/sessions/${sessionId}`);
			if (response.ok) {
				const data = await response.json();
				session = data.data?.session ||
					data.session || {
						id: sessionId,
						createdAt: null,
						lastActivity: null,
						messageCount: 0,
					};
			} else {
				throw new Error('Session not found');
			}
		} catch {
			// Fallback session object
			session = {
				id: sessionId,
				createdAt: null,
				lastActivity: null,
				messageCount: 0,
			};
		}
	}

	// Convert history to UI messages
	const history = sessionData.conversationHistory || [];
	const messages = convertHistoryToUIMessages(history, sessionId);

	return { session, messages };
}

// Hook for fetching sessions list - React Query as single source of truth
export function useSessions() {
	const { setSessions, setSessionsLoading, setSessionsError } = useSessionStore();

	const query = useQuery({
		queryKey: sessionQueryKeys.lists(),
		queryFn: fetchSessions,
		staleTime: 30 * 1000, // 30 seconds - longer to prevent disappearing sessions
		gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
		refetchOnWindowFocus: false, // Don't refetch on focus to prevent disappearing sessions
		refetchOnMount: 'always', // Always fetch fresh data on mount
		refetchOnReconnect: true, // Refetch when network reconnects
	});

	// Sync with Zustand store for compatibility with legacy code
	useEffect(() => {
		if (query.data) {
			setSessions(query.data);
		}
	}, [query.data, setSessions]);

	useEffect(() => {
		setSessionsLoading(query.isLoading || query.isFetching);
	}, [query.isLoading, query.isFetching, setSessionsLoading]);

	useEffect(() => {
		setSessionsError(query.error?.message || null);
	}, [query.error, setSessionsError]);

	// Return React Query data as single source of truth for immediate UI updates
	return {
		sessions: query.data || [],
		isLoading: query.isLoading || query.isFetching,
		error: query.error?.message || null,
		refetch: query.refetch,
		isRefetching: query.isRefetching,
	};
}

// Hook for fetching session details and history
export function useSession(sessionId: string | null) {
	const { getCachedSession, setCachedSession, enableOptimizations } = useSessionStore();

	const query = useQuery({
		queryKey: sessionQueryKeys.detail(sessionId!),
		queryFn: () => loadSessionData(sessionId!),
		enabled: !!sessionId,
		staleTime: enableOptimizations ? 60000 : 0, // 1 minute
		gcTime: enableOptimizations ? 10 * 60 * 1000 : 0, // 10 minutes
		refetchOnWindowFocus: false,
	});

	// Cache the session data when loaded
	useEffect(() => {
		if (query.data && sessionId && enableOptimizations) {
			setCachedSession(sessionId, {
				session: query.data.session,
				messages: query.data.messages,
				lastAccessed: Date.now(),
				isLoaded: true,
			});
		}
	}, [query.data, sessionId, setCachedSession, enableOptimizations]);

	// Return cached data if available and optimizations enabled
	const cachedData = sessionId && enableOptimizations ? getCachedSession(sessionId) : null;

	return {
		session: cachedData?.session || query.data?.session || null,
		messages: cachedData?.messages || query.data?.messages || [],
		isLoading: query.isLoading,
		error: query.error?.message || null,
		refetch: query.refetch,
		isCached: !!cachedData,
	};
}

// Hook for session history only
export function useSessionHistory(sessionId: string | null) {
	return useQuery({
		queryKey: sessionQueryKeys.history(sessionId!),
		queryFn: () => fetchSessionHistory(sessionId!),
		enabled: !!sessionId,
		staleTime: 30000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook for creating sessions with proper optimistic updates
export function useCreateSession() {
	const queryClient = useQueryClient();
	const { setCreatingSession } = useSessionStore();

	return useMutation({
		mutationFn: createSession,
		onMutate: async sessionId => {
			setCreatingSession(true);

			// Cancel any outgoing refetches to prevent race conditions
			await queryClient.cancelQueries({ queryKey: sessionQueryKeys.lists() });

			// Get current sessions for rollback
			const previousSessions =
				(queryClient.getQueryData(sessionQueryKeys.lists()) as Session[]) || [];

			// Optimistic update - add temporary session immediately for instant UI feedback
			const optimisticSession: Session = {
				id: sessionId || `temp-${Date.now()}`,
				createdAt: new Date().toISOString(),
				lastActivity: new Date().toISOString(),
				messageCount: 0,
			};

			// Update React Query cache immediately
			queryClient.setQueryData(sessionQueryKeys.lists(), [optimisticSession, ...previousSessions]);

			return { optimisticSession, previousSessions };
		},
		onError: (error, variables, context) => {
			console.error('Failed to create session:', error);
			setCreatingSession(false);

			// Rollback on error
			if (context?.previousSessions) {
				queryClient.setQueryData(sessionQueryKeys.lists(), context.previousSessions);
			}
		},
		onSuccess: (newSession, variables, context) => {
			setCreatingSession(false);

			// Replace optimistic session with real session data
			queryClient.setQueryData(sessionQueryKeys.lists(), (oldSessions: Session[] = []) => {
				const filteredSessions = context?.optimisticSession
					? oldSessions.filter(s => s.id !== context.optimisticSession.id)
					: oldSessions.filter(s => s.id !== newSession.id);

				return [newSession, ...filteredSessions];
			});

			// Update store for compatibility
			const store = useSessionStore.getState();
			store.addSessionToList(newSession);

			// Cache the new session
			store.setCachedSession(newSession.id, {
				session: newSession,
				messages: [],
				lastAccessed: Date.now(),
				isLoaded: true,
			});

			// Emit creation event
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('cipher:sessionCreated', {
						detail: { sessionId: newSession.id, session: newSession },
					})
				);
			}
		},
	});
}

// Hook for deleting sessions with proper optimistic updates
export function useDeleteSession() {
	const queryClient = useQueryClient();
	const { setDeletingSessionId, currentSessionId } = useSessionStore();

	return useMutation({
		mutationFn: deleteSession,
		onMutate: async sessionId => {
			console.log('🔄 Starting optimistic deletion for session:', sessionId);
			setDeletingSessionId(sessionId);

			// Cancel any outgoing refetches to prevent race conditions
			await queryClient.cancelQueries({ queryKey: sessionQueryKeys.lists() });

			// Get current sessions for rollback
			const previousSessions =
				(queryClient.getQueryData(sessionQueryKeys.lists()) as Session[]) || [];
			const sessionToDelete = previousSessions.find(s => s.id === sessionId);

			if (!sessionToDelete) {
				console.warn('⚠️ Session not found in cache for deletion:', sessionId);
				return { previousSessions };
			}

			// Optimistic update - immediately remove from cache for instant UI feedback
			queryClient.setQueryData(sessionQueryKeys.lists(), (oldSessions: Session[] = []) => {
				const filtered = oldSessions.filter(session => session.id !== sessionId);
				console.log(
					'📝 Optimistically removed session from cache. Before:',
					oldSessions.length,
					'After:',
					filtered.length
				);
				return filtered;
			});

			return { sessionToDelete, previousSessions };
		},
		onError: (error, sessionId, context) => {
			console.error('Failed to delete session:', error);
			setDeletingSessionId(null);

			// Rollback on error
			if (context?.previousSessions) {
				queryClient.setQueryData(sessionQueryKeys.lists(), context.previousSessions);
			}
		},
		onSuccess: (_, sessionId, context) => {
			console.log('✅ Session deletion confirmed by server:', sessionId);
			setDeletingSessionId(null);

			// Clean up all related queries
			queryClient.removeQueries({ queryKey: sessionQueryKeys.detail(sessionId) });
			queryClient.removeQueries({ queryKey: sessionQueryKeys.history(sessionId) });

			// CRITICAL FIX: Force refetch with no cache to prevent phantom sessions
			console.log('🔄 Force refetching sessions list to ensure no phantom sessions...');
			queryClient.refetchQueries({
				queryKey: sessionQueryKeys.lists(),
				type: 'active',
			});

			// Also invalidate to ensure any cached data is cleared
			queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists() });

			// Update store for compatibility
			const store = useSessionStore.getState();
			store.removeSessionFromList(sessionId);
			store.removeCachedSession(sessionId);

			// Handle current session deletion
			if (currentSessionId === sessionId) {
				sessionStoreActions.returnToWelcome();
			}

			// Emit deletion event
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('cipher:sessionDeleted', {
						detail: { sessionId, session: context?.sessionToDelete },
					})
				);
			}

			console.log('🎯 Session deletion process completed for:', sessionId);
		},
	});
}

// Hook for switching sessions with caching
export function useSessionSwitch() {
	const {
		switchingSession,
		setSwitchingSession,
		getCachedSession,
		setCachedSession,
		enableOptimizations,
		currentSessionId,
	} = useSessionStore();

	const switchToSession = useCallback(
		async (sessionId: string) => {
			if (sessionId === currentSessionId || switchingSession) {
				return;
			}

			setSwitchingSession(true);

			try {
				// Check cache first if optimizations enabled
				if (enableOptimizations) {
					const cached = getCachedSession(sessionId);
					console.log('🔍 Cache check for session', sessionId);
					console.log('   - Cache hit:', !!cached);
					console.log('   - Is loaded:', cached?.isLoaded);
					console.log('   - Messages count:', cached?.messages?.length || 0);
					console.log('   - Optimizations enabled:', enableOptimizations);

					if (cached && cached.isLoaded) {
						console.log(
							'✅ Using cached session data for',
							sessionId,
							'with',
							cached.messages?.length || 0,
							'messages'
						);
						// Use cached data
						sessionStoreActions.switchToSession(sessionId);
						setSwitchingSession(false);

						// Emit session change event
						if (typeof window !== 'undefined') {
							window.dispatchEvent(
								new CustomEvent('cipher:sessionChanged', {
									detail: { sessionId, previousSessionId: currentSessionId, cached: true },
								})
							);
						}
						return;
					}
				}

				// Load session data from server (fallback)
				console.log('❌ Session not cached, loading from server:', sessionId);
				const { session, messages } = await loadSessionData(sessionId);

				// Cache the data if optimizations enabled
				if (enableOptimizations) {
					setCachedSession(sessionId, {
						session,
						messages,
						lastAccessed: Date.now(),
						isLoaded: true,
					});
				}

				// Switch to session
				sessionStoreActions.switchToSession(sessionId);

				// Emit session change event
				if (typeof window !== 'undefined') {
					window.dispatchEvent(
						new CustomEvent('cipher:sessionChanged', {
							detail: { sessionId, previousSessionId: currentSessionId, cached: false },
						})
					);
				}
			} catch (error) {
				console.error('Failed to switch session:', error);

				// Emit error event
				if (typeof window !== 'undefined') {
					window.dispatchEvent(
						new CustomEvent('cipher:sessionSwitchError', {
							detail: {
								sessionId,
								error: error instanceof Error ? error.message : String(error),
							},
						})
					);
				}

				throw error;
			} finally {
				setSwitchingSession(false);
			}
		},
		[
			currentSessionId,
			switchingSession,
			setSwitchingSession,
			getCachedSession,
			setCachedSession,
			enableOptimizations,
		]
	);

	return {
		switchToSession,
		isSwitching: switchingSession,
	};
}

// Hook for preloading sessions
export function useSessionPreloader() {
	const { getCachedSession, setCachedSession, enableOptimizations } = useSessionStore();

	const preloadSession = useCallback(
		async (sessionId: string) => {
			if (!enableOptimizations) return;

			// Check if already cached
			if (getCachedSession(sessionId)) return;

			try {
				const { session, messages } = await loadSessionData(sessionId);
				setCachedSession(sessionId, {
					session,
					messages,
					lastAccessed: Date.now(),
					isLoaded: true,
				});
			} catch (error) {
				console.warn('Failed to preload session:', sessionId, error);
			}
		},
		[getCachedSession, setCachedSession, enableOptimizations]
	);

	return { preloadSession };
}

// Hook for managing session cache
export function useSessionCache() {
	const {
		getCacheStats,
		clearSessionCache,
		removeCachedSession,
		enableOptimizations,
		setEnableOptimizations,
		maxCacheSize,
		setMaxCacheSize,
	} = useSessionStore();

	return {
		stats: getCacheStats(),
		clearCache: clearSessionCache,
		removeFromCache: removeCachedSession,
		enableOptimizations,
		setEnableOptimizations,
		maxCacheSize,
		setMaxCacheSize,
	};
}

// Hook for refreshing session cache
export function useSessionCacheRefresh() {
	const { getCachedSession, setCachedSession, enableOptimizations } = useSessionStore();

	const refreshSessionCache = useCallback(
		async (sessionId: string) => {
			if (!enableOptimizations || !sessionId) return;

			try {
				console.log('🔄 Refreshing cache for session:', sessionId);

				// Fetch fresh session data
				const { session, messages } = await loadSessionData(sessionId);

				// Update cache with fresh data
				setCachedSession(sessionId, {
					session,
					messages,
					lastAccessed: Date.now(),
					isLoaded: true,
				});

				console.log(
					'✅ Cache refreshed for session:',
					sessionId,
					'with',
					messages.length,
					'messages'
				);
			} catch (error) {
				console.error('❌ Failed to refresh session cache:', sessionId, error);
			}
		},
		[getCachedSession, setCachedSession, enableOptimizations]
	);

	return { refreshSessionCache };
}

// Hook for session operations with real-time updates
export function useSessionOperations() {
	const createMutation = useCreateSession();
	const deleteMutation = useDeleteSession();
	const { switchToSession } = useSessionSwitch();
	const { refreshSessionCache } = useSessionCacheRefresh();
	const queryClient = useQueryClient();

	// Listen for WebSocket events to update cache when needed
	useEffect(() => {
		const handleNewMessage = (event: Event) => {
			const customEvent = event as CustomEvent;
			const { sessionId } = customEvent.detail || {};
			if (sessionId) {
				// Only increment message count for user messages (cipher:newMessage)
				// Don't increment for cipher:response as it might be a tool call
				const isUserMessage = event.type === 'cipher:newMessage';

				queryClient.setQueryData(sessionQueryKeys.lists(), (oldSessions: Session[] = []) => {
					return oldSessions.map(session =>
						session.id === sessionId
							? {
									...session,
									lastActivity: new Date().toISOString(),
									messageCount: isUserMessage
										? (session.messageCount || 0) + 1
										: session.messageCount,
								}
							: session
					);
				});

				// Also update store for compatibility
				useSessionStore.getState().updateSessionInList(sessionId, {
					lastActivity: new Date().toISOString(),
				});
			}
		};

		// Handle response complete event to refresh cache
		const handleResponseComplete = (event: Event) => {
			const customEvent = event as CustomEvent;
			const { sessionId } = customEvent.detail || {};
			if (sessionId) {
				console.log('🎯 Response complete for session:', sessionId, '- refreshing cache');
				// Add a small delay to ensure the backend has processed the message
				setTimeout(() => {
					refreshSessionCache(sessionId);
				}, 500);
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('cipher:newMessage', handleNewMessage as EventListener);
			window.addEventListener('cipher:response', handleNewMessage as EventListener);
			window.addEventListener('cipher:responseComplete', handleResponseComplete as EventListener);

			return () => {
				window.removeEventListener('cipher:newMessage', handleNewMessage as EventListener);
				window.removeEventListener('cipher:response', handleNewMessage as EventListener);
				window.removeEventListener(
					'cipher:responseComplete',
					handleResponseComplete as EventListener
				);
			};
		}
	}, [queryClient, refreshSessionCache]);

	return {
		createSession: createMutation.mutate,
		deleteSession: deleteMutation.mutate,
		switchToSession,
		refreshSessionCache,
		isCreating: createMutation.isPending,
		isDeleting: deleteMutation.isPending,
		createError: createMutation.error?.message || null,
		deleteError: deleteMutation.error?.message || null,
	};
}
