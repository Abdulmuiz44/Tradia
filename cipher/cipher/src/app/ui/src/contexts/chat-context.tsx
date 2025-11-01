"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/use-chat';
import { 
  ChatContextType, 
  ChatProviderProps, 
  ChatMessage, 
  SessionMessage,
  ConnectionStatus 
} from '@/types/chat';
import {
  getWebSocketUrl,
  createAutoSession,
  loadSession,
  loadSessionHistory,
  convertHistoryToUIMessages,
  resetBackendSession
} from '@/lib/chat-config';
import { useSessionStore, sessionStoreActions } from '@/stores/session-store';
import { useSessionSwitch, useCreateSession, useSessionOperations } from '@/hooks/use-sessions';

// Create the context
const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ 
  children, 
  wsUrl: customWsUrl,
  autoConnect = true 
}: ChatProviderProps) {
  // WebSocket URL configuration
  const wsUrl = getWebSocketUrl(customWsUrl);

  // Get session state from store
  const { 
    currentSessionId, 
    isWelcomeState, 
    enableOptimizations,
    getCachedSession 
  } = useSessionStore();
  
  // Local streaming state
  const [isStreaming, setIsStreaming] = useState(true);
  
  // Session operations hooks
  const { switchToSession, isSwitching } = useSessionSwitch();
  const createSessionMutation = useCreateSession();
  
  // Initialize session operations to handle cache refresh events
  useSessionOperations();

  // Chat hook integration
  const {
    messages,
    sendMessage: originalSendMessage,
    status,
    reset: originalReset,
    setMessages,
    websocket,
    clearMessages
  } = useChat(wsUrl, {
    autoConnect,
    onMessage: (message) => {
      // Emit custom event for message
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cipher:newMessage', {
            detail: { message, sessionId: currentSessionId }
          })
        );
      }
    },
    onError: (error) => {
      console.error('Chat WebSocket error:', error);
      // Emit custom event for error
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cipher:error', {
            detail: { error, sessionId: currentSessionId }
          })
        );
      }
    },
    onStatusChange: (status) => {
      console.log('Chat WebSocket status changed:', status);
      // Emit custom event for status change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cipher:statusChange', {
            detail: { status, sessionId: currentSessionId }
          })
        );
      }
    }
  });

  // Load session history with caching support
  const loadHistory = useCallback(async (sessionId: string) => {
    try {
      console.log('Loading history for session:', sessionId);
      
      // Check cache first if optimizations enabled
      if (enableOptimizations) {
        const cached = getCachedSession(sessionId);
        if (cached && cached.messages.length > 0) {
          console.log('Using cached messages:', cached.messages.length);
          setMessages(cached.messages);
          return;
        }
      }
      
      // Load from server
      const history = await loadSessionHistory(sessionId);
      console.log('History loaded:', history.length, 'messages');
      const uiMessages = convertHistoryToUIMessages(history, sessionId);
      console.log('UI messages converted:', uiMessages.length, 'messages');
      setMessages(uiMessages);
    } catch (error) {
      console.error('Error loading session history:', error);
      // On error, just clear messages and continue
      setMessages([]);
    }
  }, [setMessages, enableOptimizations, getCachedSession]);

  // Enhanced switch session using optimized hooks
  const switchSession = useCallback(async (sessionId: string) => {
    if (sessionId === currentSessionId || isSwitching) {
      return;
    }

    console.log('Switching to session:', sessionId);

    try {
      // Clear current messages immediately to prevent UI conflicts
      setMessages([]);
      
      // Use the optimized session switch hook (handles both switching and loading messages)
      await switchToSession(sessionId);
      
      // Get messages from the session cache after switching
      if (enableOptimizations) {
        const cachedSession = getCachedSession(sessionId);
        if (cachedSession?.messages) {
          console.log('Setting messages from cache:', cachedSession.messages.length);
          setMessages(cachedSession.messages);
        } else {
          console.log('No cached messages found, loading from server');
          await loadHistory(sessionId);
        }
      } else {
        // Fallback to loading history if optimizations disabled
        await loadHistory(sessionId);
      }
      
    } catch (error) {
      console.error('Error switching session:', error);
      throw error;
    }
  }, [currentSessionId, isSwitching, switchToSession, setMessages, loadHistory]);

  // Helper function to ensure "default" session exists
  const ensureDefaultSession = useCallback(async (): Promise<string> => {
    const { sessions } = useSessionStore.getState();
    
    // Check if "default" session already exists
    const defaultSession = sessions.find(s => s.id === 'default');
    
    if (defaultSession) {
      console.log('📋 Using existing default session');
      // Switch to default session if not already current
      if (currentSessionId !== 'default') {
        await switchSession('default');
      }
      return 'default';
    }
    
    // Create "default" session if it doesn't exist
    console.log('🆕 Creating new default session');
    try {
      const newSession = await new Promise<{ id: string }>((resolve, reject) => {
        createSessionMutation.mutate('default', {
          onSuccess: resolve,
          onError: reject,
        });
      });
      
      // Load the new session as the current working session
      await loadSession(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('Error creating default session:', error);
      throw error;
    }
  }, [currentSessionId, switchSession, createSessionMutation, loadSession]);

  // Enhanced send message with default session management
  const sendMessage = useCallback(async (
    content: string,
    imageData?: { base64: string; mimeType: string }
  ) => {
    let sessionId = currentSessionId;

    // Auto-create or switch to "default" session if needed
    if (!sessionId && isWelcomeState) {
      sessionId = await ensureDefaultSession();
      // Update UI state to reflect that we're no longer in welcome state
      sessionStoreActions.switchToSession(sessionId);
    }

    if (sessionId) {
      originalSendMessage(content, imageData, sessionId, isStreaming);
    } else {
      console.error('No session available for sending message');
      throw new Error('No session available for sending message');
    }
  }, [
    originalSendMessage, 
    currentSessionId, 
    isWelcomeState, 
    isStreaming,
    ensureDefaultSession
  ]);

  // Quick action send message - always uses "default" session
  const sendQuickActionMessage = useCallback(async (content: string) => {
    try {
      // Always ensure we're using the "default" session for quick actions
      const sessionId = await ensureDefaultSession();
      originalSendMessage(content, undefined, sessionId, isStreaming);
    } catch (error) {
      console.error('Error sending quick action message:', error);
      throw error;
    }
  }, [originalSendMessage, ensureDefaultSession, isStreaming]);

  // Return to welcome state
  const returnToWelcome = useCallback(() => {
    const previousSessionId = currentSessionId;
    
    sessionStoreActions.returnToWelcome();
    clearMessages();

    // Reset the backend to no default session
    resetBackendSession();

    // Emit custom event for returning to welcome
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cipher:returnToWelcome', {
          detail: { previousSessionId }
        })
      );
    }
  }, [currentSessionId, clearMessages]);

  // Enhanced reset function
  const reset = useCallback(() => {
    if (currentSessionId) {
      originalReset(currentSessionId);
      
      // Emit custom event for conversation reset
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cipher:conversationReset', {
            detail: { sessionId: currentSessionId }
          })
        );
      }
    }
  }, [originalReset, currentSessionId]);

  // Set streaming preference
  const setStreaming = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
    
    // Emit custom event for streaming preference change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cipher:streamingChanged', {
          detail: { streaming, sessionId: currentSessionId }
        })
      );
    }
  }, [currentSessionId]);

  // Event system integration
  useEffect(() => {
    const handleConfigChange = (event: CustomEvent) => {
      console.log('Config changed:', event.detail);
      // Trigger UI updates based on config changes
      // This could trigger a re-fetch of server configurations, etc.
    };

    const handleServersChange = (event: CustomEvent) => {
      console.log('Servers changed:', event.detail);
      // Trigger UI updates based on server changes
      // This could trigger a re-connect or server list refresh
    };

    const handleSessionReset = (event: CustomEvent) => {
      const { sessionId } = event.detail || {};
      if (sessionId === currentSessionId) {
        setMessages([]);
      }
    };

    const handleExternalSessionSwitch = (event: CustomEvent) => {
      const { sessionId } = event.detail || {};
      if (sessionId && sessionId !== currentSessionId) {
        switchSession(sessionId).catch(error => {
          console.error('Error handling external session switch:', error);
        });
      }
    };

    const handleWelcomeRequest = (event: CustomEvent) => {
      returnToWelcome();
    };

    const handleSessionChanged = (event: CustomEvent) => {
      const { sessionId, cached } = event.detail || {};
      console.log('Session changed event:', sessionId, 'cached:', cached);
      
      // Load messages for the new session (both cached and non-cached scenarios)
      if (sessionId) {
        loadHistory(sessionId).catch(error => {
          console.error('Error loading session history:', error);
        });
      }
    };

    if (typeof window !== 'undefined') {
      // Listen for configuration and server changes
      window.addEventListener('cipher:configChanged', handleConfigChange as EventListener);
      window.addEventListener('cipher:serversChanged', handleServersChange as EventListener);
      
      // Listen for session-related events from other components
      window.addEventListener('cipher:conversationReset', handleSessionReset as EventListener);
      window.addEventListener('cipher:switchSession', handleExternalSessionSwitch as EventListener);
      window.addEventListener('cipher:requestWelcome', handleWelcomeRequest as EventListener);
      window.addEventListener('cipher:sessionChanged', handleSessionChanged as EventListener);

      return () => {
        window.removeEventListener('cipher:configChanged', handleConfigChange as EventListener);
        window.removeEventListener('cipher:serversChanged', handleServersChange as EventListener);
        window.removeEventListener('cipher:conversationReset', handleSessionReset as EventListener);
        window.removeEventListener('cipher:switchSession', handleExternalSessionSwitch as EventListener);
        window.removeEventListener('cipher:requestWelcome', handleWelcomeRequest as EventListener);
        window.removeEventListener('cipher:sessionChanged', handleSessionChanged as EventListener);
      };
    }
  }, [currentSessionId, setMessages, switchSession, returnToWelcome, loadHistory]);

  // Load current session history on mount and session change
  useEffect(() => {
    if (currentSessionId && !isWelcomeState) {
      console.log('Loading history for current session:', currentSessionId);
      loadHistory(currentSessionId).catch(error => {
        console.error('Error loading current session history:', error);
      });
    }
  }, [currentSessionId, isWelcomeState, loadHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending operations
      setMessages([]);
      
      console.log('ChatContext: Cleanup completed on unmount');
    };
  }, [setMessages]);

  // Create session creation function for external use
  const createNewSession = useCallback(async (): Promise<string> => {
    try {
      const sessionId = await createAutoSession();
      await loadSession(sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error creating new session:', error);
      throw error;
    }
  }, []);

  // Context value
  const contextValue: ChatContextType = {
    messages,
    sendMessage,
    sendQuickActionMessage,
    status,
    reset,
    currentSessionId,
    switchSession,
    loadSessionHistory: loadHistory,
    isWelcomeState,
    returnToWelcome,
    isStreaming,
    setStreaming,
    websocket,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the chat context
export function useChatContext(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// Additional utility hooks
export function useChatSession() {
  const { currentSessionId, switchSession, returnToWelcome, isWelcomeState } = useChatContext();
  
  return {
    currentSessionId,
    switchSession,
    returnToWelcome,
    isWelcomeState,
    hasActiveSession: !isWelcomeState && currentSessionId !== null,
  };
}

export function useChatMessages() {
  const { messages, sendMessage, reset } = useChatContext();
  
  return {
    messages,
    sendMessage,
    reset,
    messageCount: messages.length,
    hasMessages: messages.length > 0,
  };
}

export function useChatStatus() {
  const { status, websocket, isStreaming, setStreaming } = useChatContext();
  
  return {
    status,
    websocket,
    isStreaming,
    setStreaming,
    isConnected: status === 'open',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'closed',
  };
}