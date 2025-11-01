// src/components/ai/TradiaAIChat.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import * as TradeContextModule from '../../context/TradeContext';
import { useUser } from '@/context/UserContext';
import { ChatLayout } from '../chat/ChatLayout';
import { Message, Conversation, TradiaAIRequest } from '@/types/chat';
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

const TradiaAIChatContent: React.FC<TradiaAIChatProps> = ({
  className = "",
  activeConversationId: externalActiveId,
  onActiveConversationChange,
  onConversationsChange,
  onLoadingChange,
}) => {
  const tradeContext = TradeContextModule.useTrade();
  const trades: Trade[] = tradeContext.trades;
  const { user, loading } = useUser();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState('gpt-4o-mini');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [tradeSummary, setTradeSummary] = useState<any>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

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
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Conversation',
          model,
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
  }, [model, onActiveConversationChange]);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
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
          attachedTrades: [], // Will be populated if needed
        })));
        setModel(data.conversation.model || 'gpt-4o-mini');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, []);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
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
  }, [activeConversationId, onActiveConversationChange]);

  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
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
  }, []);

  const handlePinConversation = useCallback(async (conversationId: string) => {
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
  }, [conversations]);

  const handleExportConversation = useCallback((conversationId?: string) => {
    const targetId = conversationId ?? activeConversationId;
    if (!targetId) {
      return;
    }

    const conversation = conversations.find((c) => c.id === targetId);
    if (conversation) {
      const dataStr = JSON.stringify(conversation, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `tradia-conversation-${conversation.title.replace(/\s+/g, '-').toLowerCase()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }, [conversations, activeConversationId]);

  // Message handlers
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      attachedTrades: selectedTrades,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setSelectedTradeIds([]); // Clear selected trades after sending

    // Update conversation
    if (activeConversationId) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConversationId
            ? { ...c, messages: newMessages, updatedAt: new Date() }
            : c
        )
      );
    }

    // Send to AI
    try {
      const request: TradiaAIRequest = {
        messages: newMessages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        attachedTradeIds: selectedTrades.map(t => t.id),
        options: {
          model,
          max_tokens: 1024,
        }
      };

      if (activeConversationId) {
        request.conversationId = activeConversationId;
      }

      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Ignore
        }
        throw new Error(errorMessage);
      }

      // Handle JSON response
      const data = await response.json();
      const aiContent = data.response;
      const conversationId = data.conversationId;

      // Update active conversation ID if it was newly created
      if (conversationId && !activeConversationId) {
        setActiveConversationId(conversationId);
        onActiveConversationChange?.(conversationId);
        // Also update the conversations list to reflect the new conversation
        loadConversations();
      }

      // Create the assistant message
      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        content: aiContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation with final messages (but messages are already saved to DB)
      const finalMessages = [...newMessages, aiMessage];

      if (activeConversationId || conversationId) {
        const convId = activeConversationId || conversationId;
        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? { ...c, updatedAt: new Date() }
              : c
          )
        );
      }

    } catch (error) {
      console.error('Error sending message:', error);
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      let canRetry = false;

      if (error instanceof Error) {
        if (error.message.includes('AI service temporarily unavailable')) {
          errorContent = '🤖 AI service is currently busy. Please wait a moment and try again.';
          canRetry = true;
        } else if (error.message.includes('Authentication error')) {
          errorContent = '🔐 Authentication error. Please refresh the page and log in again.';
        } else if (error.message.includes('Database error')) {
          errorContent = '💾 Database connection issue. Please try again in a few seconds.';
          canRetry = true;
        } else {
          errorContent = error.message;
        }
      }

      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        type: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        canRetry,
        originalContent: content, // Store for retry
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);

      if (activeConversationId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConversationId
              ? { ...c, messages: finalMessages, updatedAt: new Date() }
              : c
          )
        );
      }
    }
  }, [messages, selectedTrades, activeConversationId, model, conversations, onActiveConversationChange, loadConversations]);

  const handleRegenerateMessage = useCallback((messageId: string) => {
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
  }, [messages, handleSendMessage]);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
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
  }, [activeConversationId]);

  const handleDeleteMessage = useCallback((messageId: string) => {
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
  }, [messages, activeConversationId]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleRateMessage = useCallback((messageId: string, rating: 'up' | 'down') => {
    // In a real app, this would send feedback to the server
    console.log(`Rated message ${messageId}: ${rating}`);
  }, []);

  const handlePinMessage = useCallback((messageId: string) => {
    // In a real app, this would pin the message
    console.log(`Pinned message ${messageId}`);
  }, []);

  const handleRetryMessage = useCallback(async (messageId: string) => {
    const errorMessage = messages.find(m => m.id === messageId);
    if (errorMessage?.originalContent) {
      // Remove the error message and retry
      setMessages(prev => prev.filter(m => m.id !== messageId));
      await handleSendMessage(errorMessage.originalContent);
    }
  }, [messages, handleSendMessage]);

  const handleAttachTrades = useCallback((tradeIds: string[]) => {
    setSelectedTradeIds(tradeIds);
  }, []);

  const handleVoiceInput = useCallback(() => {
    setIsListening(!isListening);
    // In a real app, this would integrate with speech recognition
  }, [isListening]);

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

  // Note: forwardRef functionality removed for simplicity

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Loading Tradia AI...</p>
        </div>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <ChatLayout
      hideSidebar={false}
      conversations={conversations}
      loadingConversations={loadingConversations}
      activeConversationId={activeConversationId || undefined}
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
      trades={trades}
      selectedTradeIds={selectedTradeIds}
      onTradeSelect={setSelectedTradeIds}
      summary={tradeSummary}
    />
  );
};

// Set display name for debugging
TradiaAIChatContent.displayName = 'TradiaAIChat';

// Export the component directly
export default TradiaAIChatContent;
