// src/components/ai/TradiaAIChat.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as TradeContextModule from '@/context/TradeContext';
import { useUser } from '@/context/UserContext';
import { ChatLayout } from '../chat/ChatLayout';
import { AssistantMode, Message, Conversation, TradiaAIRequest } from '@/types/chat';
import { Trade } from '@/types/trade';


export interface TradiaAIChatHandle {
  createConversation: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
}

interface TradiaAIChatProps {
  className?: string;
  activeConversationId?: string | null;
  onActiveConversationChange?: (conversationId: string | null) => void;
  onConversationsChange?: (conversations: Conversation[]) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

const TradiaAIChat = React.forwardRef<TradiaAIChatHandle, TradiaAIChatProps>((props, ref) => {
  const {
    className = "",
    activeConversationId: externalActiveId,
    onActiveConversationChange,
    onConversationsChange,
    onLoadingChange,
  } = props;
  const tradeContext = (TradeContextModule as { useTrade: () => any }).useTrade();
  const trades: Trade[] = tradeContext.trades || [];
  const { user, loading } = useUser();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState('mistral-medium-latest');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [tradeSummary, setTradeSummary] = useState<any>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('coach');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGuest = !user;

  // Load conversations and trade summary on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      if (trades.length > 0) {
        fetchTradeSummary();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      onLoadingChange?.(true);
      const response = await fetch('/api/conversations', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const transformedConversations = (data.conversations || []).map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          pinned: conv.pinned,
          messages: [], // Messages loaded separately
        }));
        setConversations(transformedConversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
      onLoadingChange?.(false);
    }
  }, [onLoadingChange]);

  const fetchTradeSummary = async () => {
    try {
      const response = await fetch('/api/trades/summary', {
        credentials: 'include',
      });
      if (response.ok) {
        const summary = await response.json();
        setTradeSummary(summary);
      }
    } catch (error) {
      console.error('Failed to fetch trade summary:', error);
    }
  };

  // Get selected trades
  const selectedTrades: Trade[] = trades.filter((trade) => selectedTradeIds.includes(trade.id));

  // Conversation handlers
  const handleCreateConversation = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Conversation',
          model,
          mode: assistantMode,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const source = data.conversation;
        const newConversation: Conversation = {
          id: source.id,
          title: source.title,
          createdAt: new Date(source.created_at),
          updatedAt: new Date(source.updated_at),
          pinned: source.pinned,
          messages: [],
        };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        onActiveConversationChange?.(newConversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [model, assistantMode, onActiveConversationChange, user]);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    if (!user) {
      return;
    }
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setActiveConversationId(conversationId);
        onActiveConversationChange?.(conversationId);
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          mode: msg.mode as AssistantMode | undefined,
          attachedTrades: [], // Will be populated if needed
        })));
        const storedModel = data.conversation.model || 'mistral-medium-latest';
        setModel(storedModel);
        if (data.conversation.mode) {
          setAssistantMode(data.conversation.mode as AssistantMode);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [user, onActiveConversationChange]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    if (!user) {
      return;
    }
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          onActiveConversationChange?.(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [activeConversationId, onActiveConversationChange, user]);

  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    if (!user) {
      return;
    }
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include',
      });

      if (response.ok) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
        );
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  }, [user]);

  const handlePinConversation = useCallback(async (conversationId: string) => {
    if (!user) {
      return;
    }
    try {
      const currentConversation = conversations.find(c => c.id === conversationId);
      const newPinned = !currentConversation?.pinned;

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
        credentials: 'include',
      });

      if (response.ok) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, pinned: newPinned } : c)
        );
      }
    } catch (error) {
      console.error('Failed to pin conversation:', error);
    }
  }, [conversations, user]);

  const handleExportConversation = useCallback((conversationId?: string) => {
    if (!user) {
      return;
    }
    const targetId = conversationId ?? activeConversationId;
    if (!targetId) {
      return;
    }

    const conversation = conversations.find((c) => c.id === targetId);
    if (conversation) {
      const dataStr = JSON.stringify(conversation, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `tradia-conversation-${conversation.title.replace(/\s+/g, '-').toLowerCase()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }, [conversations, activeConversationId, user]);

  // Message handlers
  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || isProcessing) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const timestamp = Date.now();
    const userMessage: Message = {
      id: `msg_${timestamp}`,
      type: 'user',
      content: trimmed,
      timestamp: new Date(),
      attachedTrades: selectedTrades,
      mode: assistantMode,
    };

    const pendingAssistantId = `msg_${timestamp + 1}`;
    const assistantPlaceholder: Message = {
      id: pendingAssistantId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      mode: assistantMode,
    };

    const requestMessages = [...messages, userMessage];
    const tradeIdsForRequest = selectedTrades.map((trade) => trade.id);

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setSelectedTradeIds([]);
    setIsProcessing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, updatedAt: new Date() }
            : conversation
        )
      );
    }

    let resolvedConversationId = activeConversationId ?? `conv-${Date.now()}`;
    let accumulatedText = '';

    const updateAssistantContent = (text: string) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingAssistantId ? { ...message, content: text } : message
        )
      );
    };

    const handlePayload = (payload: any) => {
      if (!payload) return;
      if (payload.type === 'error') {
        throw new Error(payload.error ?? 'AI stream error');
      }
      if (payload.type === 'text-delta') {
        accumulatedText += payload.delta ?? '';
        updateAssistantContent(accumulatedText);
        return;
      }
      if (payload.type === 'text') {
        accumulatedText = payload.text ?? accumulatedText;
        updateAssistantContent(accumulatedText);
        return;
      }
      if (payload.type === 'finish' && typeof payload.text === 'string') {
        accumulatedText = payload.text;
        updateAssistantContent(accumulatedText);
      }
    };

    try {
      const requestPayload: TradiaAIRequest = {
        messages: requestMessages.map((msg) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        attachedTradeIds: tradeIdsForRequest,
        options: {
          model,
          max_tokens: 1024,
        },
        mode: assistantMode,
      };

      if (resolvedConversationId) {
        requestPayload.conversationId = resolvedConversationId;
      }

      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // ignore parsing errors and use default error text
        }
        throw new Error(errorMessage);
      }

      const headerConversationId = response.headers.get('X-Conversation-Id');
      if (headerConversationId && headerConversationId !== resolvedConversationId) {
        resolvedConversationId = headerConversationId;
        setActiveConversationId(headerConversationId);
        onActiveConversationChange?.(headerConversationId);
      }

      if (!response.body) {
        throw new Error('AI service returned an empty response stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processChunk = (chunk: string) => {
        buffer += chunk;
        const segments = buffer.split('\n');
        buffer = segments.pop() ?? '';

        segments.forEach((segment) => {
          const line = segment.trim();
          if (!line || line === 'data: [DONE]') {
            return;
          }
          if (line.startsWith('event:')) {
            return;
          }
          if (!line.startsWith('data:')) {
            return;
          }

          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === '[DONE]') {
            return;
          }

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            accumulatedText += dataStr;
            updateAssistantContent(accumulatedText);
            return;
          }

          handlePayload(parsed);
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        processChunk(finalChunk);
      }
      if (buffer.length > 0) {
        processChunk('\n');
      }

      if (!accumulatedText.trim()) {
        accumulatedText = 'I was unable to generate a response. Please try again.';
        updateAssistantContent(accumulatedText);
      }

      const assistantTimestamp = assistantPlaceholder.timestamp ?? new Date();
      const finalAssistantMessage: Message = {
        id: pendingAssistantId,
        type: 'assistant',
        content: accumulatedText,
        timestamp: assistantTimestamp,
        mode: assistantMode,
      };

      if (resolvedConversationId) {
        const conversationId = resolvedConversationId;
        const updatedAt = new Date();
        setConversations((prev) => {
          const updatedMessages = [...requestMessages, finalAssistantMessage];
          const existing = prev.find((conversation) => conversation.id === conversationId);

          if (existing) {
            return prev.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, updatedAt, messages: updatedMessages }
                : conversation
            );
          }

          const seedConversation: Conversation = {
            id: conversationId,
            title: 'New Conversation',
            createdAt: updatedAt,
            updatedAt,
            messages: updatedMessages,
          };

          return [seedConversation, ...prev];
        });
      }

      // Refresh conversation metadata after streaming completes to keep titles in sync.
      await loadConversations();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const stopMessage = accumulatedText
          ? `${accumulatedText}\n\n_Generation stopped by user._`
          : 'Generation stopped.';
        updateAssistantContent(stopMessage);

        if (resolvedConversationId) {
          const conversationId = resolvedConversationId;
          const updatedAt = new Date();
          const stoppedMessage: Message = {
            id: pendingAssistantId,
            type: 'assistant',
            content: stopMessage,
            timestamp: assistantPlaceholder.timestamp ?? updatedAt,
            mode: assistantMode,
          };

          setConversations((prev) => {
            const updatedMessages = [...requestMessages, stoppedMessage];
            const existing = prev.find((conversation) => conversation.id === conversationId);

            if (existing) {
              return prev.map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, updatedAt, messages: updatedMessages }
                  : conversation
              );
            }

            const seedConversation: Conversation = {
              id: conversationId,
              title: 'New Conversation',
              createdAt: updatedAt,
              updatedAt,
              messages: updatedMessages,
            };

            return [seedConversation, ...prev];
          });
        }
        return;
      }

      console.error('Error sending message:', error);
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      let canRetry = false;

      if (error instanceof Error) {
        const message = error.message;
        if (message.includes('temporarily busy') || message.includes('rate')) {
          errorContent = '🤖 AI service is currently busy. Please wait a moment and try again.';
          canRetry = true;
        } else if (message.includes('Authentication')) {
          errorContent = '🔐 Authentication error. Please refresh the page and log in again.';
        } else if (message.includes('Database')) {
          errorContent = '💾 Database connection issue. Please try again in a few seconds.';
          canRetry = true;
        } else {
          errorContent = message;
        }
      }

      updateAssistantContent(errorContent);

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingAssistantId
            ? { ...message, canRetry, originalContent: content }
            : message
        )
      );

      if (resolvedConversationId) {
        const updatedAt = new Date();
        const assistantErrorMessage: Message = {
          id: pendingAssistantId,
          type: 'assistant',
          content: errorContent,
          timestamp: assistantPlaceholder.timestamp ?? updatedAt,
          canRetry,
          originalContent: content,
          mode: assistantMode,
        };

        setConversations((prev) => {
          const updatedMessages = [...requestMessages, assistantErrorMessage];
          const existing = prev.find((conversation) => conversation.id === resolvedConversationId);

          if (existing) {
            return prev.map((conversation) =>
              conversation.id === resolvedConversationId
                ? { ...conversation, updatedAt, messages: updatedMessages }
                : conversation
            );
          }

          const seedConversation: Conversation = {
            id: resolvedConversationId,
            title: 'New Conversation',
            createdAt: updatedAt,
            updatedAt,
            messages: updatedMessages,
          };

          return [seedConversation, ...prev];
        });
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [
    user,
    isProcessing,
    selectedTrades,
    assistantMode,
    messages,
    activeConversationId,
    model,
    onActiveConversationChange,
    loadConversations,
  ]);

  const handleRegenerateMessage = useCallback((messageId: string) => {
    if (!user) {
      return;
    }
    // Find the user message before the assistant message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex > 0 && messages[messageIndex].type === 'assistant') {
      const userMessage = messages[messageIndex - 1];
      if (userMessage.type === 'user') {
        // Remove the assistant message and resend
        const newMessages = messages.slice(0, messageIndex);
        setMessages(newMessages);
        handleSendMessage(userMessage.content);
      }
    }
  }, [messages, handleSendMessage, user]);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    if (!user) {
      return;
    }
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, content: newContent } : m)
    );

    if (activeConversationId) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConversationId
            ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === messageId ? { ...m, content: newContent } : m
              ),
              updatedAt: new Date()
            }
            : c
        )
      );
    }
  }, [activeConversationId, user]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!user) {
      return;
    }
    const newMessages = messages.filter(m => m.id !== messageId);
    setMessages(newMessages);

    if (activeConversationId) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConversationId
            ? { ...c, messages: newMessages, updatedAt: new Date() }
            : c
        )
      );
    }
  }, [messages, activeConversationId, user]);

  const handleCopyMessage = useCallback((content: string) => {
    if (!user) {
      return;
    }
    navigator.clipboard.writeText(content);
  }, [user]);

  const handleRateMessage = useCallback((messageId: string, rating: 'up' | 'down') => {
    if (!user) {
      return;
    }
    // In a real app, this would send feedback to the server
    console.log(`Rated message ${messageId}: ${rating}`);
  }, [user]);

  const handlePinMessage = useCallback((messageId: string) => {
    if (!user) {
      return;
    }
    // In a real app, this would pin the message
    console.log(`Pinned message ${messageId}`);
  }, [user]);

  const handleRetryMessage = useCallback(async (messageId: string) => {
    if (!user) {
      return;
    }
    const errorMessage = messages.find(m => m.id === messageId);
    if (errorMessage?.originalContent) {
      // Remove the error message and retry
      setMessages(prev => prev.filter(m => m.id !== messageId));
      await handleSendMessage(errorMessage.originalContent);
    }
  }, [messages, handleSendMessage, user]);

  const handleAttachTrades = useCallback((tradeIds: string[]) => {
    if (!user) {
      return;
    }
    setSelectedTradeIds(tradeIds);
  }, [user]);

  const handleVoiceInput = useCallback(() => {
    if (!user) {
      return;
    }
    setIsListening(!isListening);
    // In a real app, this would integrate with speech recognition
  }, [isListening, user]);

  const handleStopGeneration = useCallback(() => {
    if (!isProcessing) {
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsProcessing(false);
  }, [isProcessing]);

  // Create initial conversation if none exists and loaded
  useEffect(() => {
    if (conversations.length === 0 && user && !loading && !loadingConversations) {
      handleCreateConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, user, loading, loadingConversations]);

  useEffect(() => {
    onConversationsChange?.(conversations);
  }, [conversations, onConversationsChange]);

  useEffect(() => {
    if (externalActiveId === undefined) {
      return;
    }
    if (externalActiveId === null) {
      if (activeConversationId !== null) {
        setActiveConversationId(null);
        setMessages([]);
      }
      return;
    }
    if (externalActiveId !== activeConversationId) {
      handleSelectConversation(externalActiveId);
    }
  }, [externalActiveId, activeConversationId, handleSelectConversation]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  useImperativeHandle(
    ref,
    () => ({
      createConversation: handleCreateConversation,
      refreshConversations: loadConversations,
      selectConversation: handleSelectConversation,
    }),
    [handleCreateConversation, loadConversations, handleSelectConversation]
  );

  return (
    <ChatLayout
      className={className}
      hideSidebar={false}
      isGuest={isGuest}
      conversations={conversations}
      activeConversationId={activeConversationId || undefined}
      loadingConversations={loadingConversations || loading}
      onCreateConversation={handleCreateConversation}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onRenameConversation={handleRenameConversation}
      onPinConversation={handlePinConversation}
      onExportConversation={handleExportConversation}
      conversationTitle={activeConversation?.title || "New Conversation"}
      messages={messages}
      model={model}
      onModelChange={setModel}
      onSendMessage={handleSendMessage}
      onAttachTrades={handleAttachTrades}
      assistantMode={assistantMode}
      onAssistantModeChange={setAssistantMode}
      onRegenerateMessage={handleRegenerateMessage}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onCopyMessage={handleCopyMessage}
      onRateMessage={handleRateMessage}
      onPinMessage={handlePinMessage}
      onRetryMessage={handleRetryMessage}
      onExportChat={handleExportConversation}
      onVoiceInput={handleVoiceInput}
      isListening={isListening}
      isProcessing={isProcessing}
      onStopGeneration={handleStopGeneration}
      trades={trades}
      selectedTradeIds={selectedTradeIds}
      onTradeSelect={setSelectedTradeIds}
      summary={tradeSummary}
    />
  );
});

TradiaAIChat.displayName = 'TradiaAIChat';

export default TradiaAIChat;
