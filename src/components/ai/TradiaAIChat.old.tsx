/* eslint-disable */
// src/components/ai/TradiaAIChat.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTrade } from '@/context/TradeContext';
import { useUser } from '@/context/UserContext';
import { ChatLayout } from '../chat/ChatLayout';
import { Message, Conversation, TradiaAIRequest } from '@/types/chat';
import { Trade } from '@/types/trade';

interface TradiaAIChatProps {
  className?: string;
}

const TradiaAIChatContent: React.FC<TradiaAIChatProps> = ({ className = "" }) => {
const { trades } = useTrade();
const { user, loading } = useUser();

// State
const [conversations, setConversations] = useState<Conversation[]>([]);
const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);
const [model, setModel] = useState('gpt-4o-mini');
const [temperature, setTemperature] = useState(0.2);
const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const limits = useMemo(() => getPlanLimits(userTier), [userTier]);
  const userId = user?.id; // Use only the proper user ID from Supabase

  // Always call hooks in the same order, regardless of authentication status
  const { state, dispatch } = useChatReducer(userTier, userEmail, trades.length);

  // Supabase hooks must come before useChatActions since saveMessage is needed
  const onMessagesLoaded = useCallback((messages: Message[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  }, [dispatch]);

  const onError = useCallback((error: string) => {
    setErrorMessage(error);
  }, []);

  const {
    saveMessage,
    deleteMessage: deleteFromDb,
    updateMessage: updateInDb,
    getUsageStats: fetchUsageStats,
    loadMessages,
  } = useSupabaseChat({
    userId,
    userTier,
    onMessagesLoaded,
    onError,
  });

  const {
    pushSystemMessage,
    handleSendMessage: sendMessageFromHook,
  } = useChatActions({
    state,
    dispatch,
    trades,
    saveMessage,
  });

  // Provide default implementations for missing functions
  const sendMessage = useCallback(async (content: string, type: 'user' | 'assistant' = 'user') => {
    if (type === 'user' && usageStats.messages >= limits.maxMessagesPerDay) {
      pushSystemMessage(
        `You've reached your daily message limit of ${limits.maxMessagesPerDay}. Upgrade to send more messages.`,
        'upgrade'
      );
      return;
    }

    const message: Message = {
      id: `${Date.now()}-${type}`,
      type,
      content,
      timestamp: new Date(),
      mode: type === 'assistant' ? state.assistantMode : undefined,
    };

    dispatch({ type: 'ADD_MESSAGE', payload: message });
    await saveMessage(message);

    if (type === 'user') {
      dispatch({ type: 'SET_TYPING', payload: true });
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            tradeHistory: trades,
            mode: state.assistantMode,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse: string = data.response || "Sorry, I couldn't generate a response.";

        const aiMessage: Message = {
          id: `${Date.now() + 1}-assistant`,
          type: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          mode: state.assistantMode,
        };
        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
        await saveMessage(aiMessage);
      } catch (error: any) {
        console.error('Error sending message:', error);
        pushSystemMessage(`Sorry, I encountered an issue: ${error.message}. Please try again.`, 'system');
      } finally {
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    }
  }, [state.assistantMode, trades, dispatch, saveMessage, pushSystemMessage, limits, usageStats]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.filter(msg => msg.id !== messageId) });
      await deleteFromDb(messageId);
    } catch (error: any) {
      console.error('Error deleting message:', error);
      setErrorMessage(`Failed to delete message: ${error.message}`);
    }
  }, [state.messages, dispatch, deleteFromDb]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      dispatch({
        type: 'SET_MESSAGES',
        payload: state.messages.map(msg => msg.id === messageId ? { ...msg, content } : msg)
      });
      await updateInDb(messageId, content);
    } catch (error: any) {
      console.error('Error updating message:', error);
      setErrorMessage(`Failed to update message: ${error.message}`);
    }
  }, [state.messages, dispatch, updateInDb]);

  const exportChat = useCallback(async () => {
    return state.messages;
  }, [state.messages]);

  const clearChat = useCallback(async () => {
    try {
      // Clear from DB - assuming we delete all for user
      for (const msg of state.messages) {
        await deleteFromDb(msg.id);
      }
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      setErrorMessage(`Failed to clear chat: ${error.message}`);
    }
  }, [state.messages, dispatch, deleteFromDb]);

  const regenerateMessage = useCallback(async (messageId: string) => {
    const msgIndex = state.messages.findIndex(msg => msg.id === messageId);
    if (msgIndex === -1 || state.messages[msgIndex].type !== 'assistant') return;

    // Find the previous user message
    let userMsgIndex = msgIndex - 1;
    while (userMsgIndex >= 0 && state.messages[userMsgIndex].type !== 'user') {
      userMsgIndex--;
    }
    if (userMsgIndex < 0) return;

    const userMessage = state.messages[userMsgIndex];
    // Delete the assistant message
    await deleteMessage(messageId);
    // Resend the user message (which will generate new AI response)
    await sendMessage(userMessage.content, 'user');
  }, [state.messages, deleteMessage, sendMessage]);

  const setAssistantMode = useCallback((mode: 'coach' | 'grok') => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, [dispatch]);

  const setGrokUnlocked = useCallback((unlocked: boolean) => {
    dispatch({ type: 'SET_GROK_UNLOCKED', payload: unlocked });
  }, [dispatch]);

  const searchMessages = useCallback((query: string) => {
    const results = state.messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  }, [state.messages, dispatch]);

  const loadChatHistory = useCallback(async () => {
    try {
      await loadMessages();
    } catch (error: any) {
      console.error('Error loading chat history:', error);
      setErrorMessage(`Failed to load chat history: ${error.message}`);
    }
  }, [loadMessages]);

  const addFileToMessage = useCallback(async (messageId: string, file: File) => {
    try {
      // For now, just log; full implementation would upload to Supabase storage
      console.log('Adding file to message:', messageId, file.name);
      // TODO: Implement file upload and attach to message
    } catch (error: any) {
      console.error('Error adding file:', error);
      setErrorMessage(`Failed to add file: ${error.message}`);
    }
  }, []);

  const deleteFileFromMessage = useCallback(async (messageId: string, fileId: string) => {
    try {
      // TODO: Implement file deletion from storage and message
      console.log('Deleting file from message:', messageId, fileId);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setErrorMessage(`Failed to delete file: ${error.message}`);
    }
  }, []);

  const debouncedSearch = useDebouncedInput(searchQuery, 300);

  // Voice input/output hooks
  const { startListening, stopListening, isListening, transcript } = useVoiceInput();
  const { speak, stopSpeaking, isSpeaking } = useVoiceOutput();

  // Refs - must be declared before any conditional returns
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  console.log('TradiaAIChat user data:', { userId, userEmail, user, loading });

  // Since the page already checks authentication server-side,
  // we can proceed immediately if we have basic user info
  // Only show sign-in prompt if we're sure the user is not authenticated
  if (!loading && !userId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to use the AI chat</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isSearchMode) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, isSearchMode]);

  // Load messages on mount and when user changes
  useEffect(() => {
    if (userId) {
      loadChatHistory();
    }
  }, [userId, loadChatHistory]);

  // Update user tier when user changes
  useEffect(() => {
    if (user?.plan) {
      const newTier = normalizeTier(user.plan);
      if (newTier !== userTier) {
        setUserTier(newTier);
        dispatch({ type: 'SET_USER_TIER', payload: newTier });
      }
    }
  }, [user?.plan, userTier, dispatch]);

  // Update user email when user changes
  useEffect(() => {
    if (user?.email && user.email !== userEmail) {
      setUserEmail(user.email);
      dispatch({ type: 'SET_USER_EMAIL', payload: user.email });
    }
  }, [user?.email, userEmail, dispatch]);

  // Update usage stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (userId) {
        fetchUsageStats(new Date().toISOString())
          .then(stats => {
            setUsageStats(stats);
          })
          .catch(error => {
            console.error('Failed to fetch usage stats:', error);
            setErrorMessage('Could not retrieve usage stats. Please check your connection.');
          });
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [userId, fetchUsageStats]);

  // Handle search
  useEffect(() => {
    if (debouncedSearch && isSearchMode) {
      searchMessages(debouncedSearch);
    } else if (!debouncedSearch && isSearchMode) {
      // Clear search results when search is empty
      dispatch({ type: 'CLEAR_SEARCH' });
    }
  }, [debouncedSearch, isSearchMode, searchMessages, dispatch]);

  // Handle voice input
  useEffect(() => {
    if (transcript && !isListening) {
      // Set voice transcript as input message instead of sending immediately
      setInputMessage(transcript);
    }
  }, [transcript, isListening]);

  const handleSendMessage = useCallback(async (content?: string) => {
    const messageToSend = content || inputMessage;
    if (!messageToSend.trim()) return;

    try {
      await sendMessage(messageToSend, 'user');
      setInputMessage(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message. Please try again.');
    }
  }, [inputMessage, sendMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, []);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!limits.canUploadFiles) {
      setErrorMessage('File uploads are not available on your plan. Upgrade to upload files.');
      return;
    }

    if (file.size > limits.maxFileSizeMB * 1024 * 1024) {
      setErrorMessage(`File size exceeds the limit of ${limits.maxFileSizeMB}MB.`);
      return;
    }

    if (usageStats.uploads >= limits.maxFileUploadsPerDay) {
      setErrorMessage(`You've reached your daily upload limit of ${limits.maxFileUploadsPerDay}. Upgrade for more uploads.`);
      return;
    }

    try {
      // Add file to current message or create new message
      const currentMessageId = state.messages[state.messages.length - 1]?.id;
      await addFileToMessage(currentMessageId, file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage('Failed to upload file. Please try again.');
    }
  }, [state.messages, addFileToMessage, limits, usageStats]);

  const handleExport = useCallback(async () => {
    if (!limits.canExportChat) {
      setErrorMessage('Chat export is not available on your plan. Upgrade to export chats.');
      return;
    }

    try {
      const data = await exportChat();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradia-chat-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting chat:', error);
      setErrorMessage('Failed to export chat. Please try again.');
    }
  }, [exportChat, limits]);

  const filteredMessages = useMemo(() => {
    if (!isSearchMode || !debouncedSearch) {
      return state.messages;
    }
    return state.searchResults || [];
  }, [state.messages, state.searchResults, isSearchMode, debouncedSearch]);

  const renderMessages = () => {
    return filteredMessages.map((message, index) => (
      <MessageBubble
        key={message.id}
        message={message}
        onDelete={() => deleteMessage(message.id)}
        onEdit={(newContent) => updateMessage(message.id, newContent)}
        onRegenerate={() => regenerateMessage(message.id)}
        onRemoveFile={(fileId) => deleteFileFromMessage(message.id, fileId)}
        canEdit={true}
        isLast={index === filteredMessages.length - 1}
      />
    ));
  };

  return (
    <ErrorBoundary>
      <div className={cn("flex h-full bg-gray-950 text-white", className)}>
        {/* Sidebar */}
        <Sidebar
          onExport={handleExport}
          canExport={limits.canExportChat}
          onChatHistory={() => setShowChatHistory(!showChatHistory)}
          onSettings={() => setShowSettings(!showSettings)}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <ChatHeader
            userTier={state.userTier}
            userEmail={state.userEmail}
            isAdmin={state.isAdmin}
            assistantMode={state.assistantMode}
            grokUnlocked={state.grokUnlocked}
            onAssistantModeChange={setAssistantMode}
            onGrokUnlock={() => setGrokUnlocked(true)}
            onUpgrade={() => {
              setUpgradeReason('ai-limit');
              setIsUpgradeModalOpen(true);
            }}
          />

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {renderMessages()}
              {state.isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <QuickActions onSelectAction={handleSendMessage} />

          {/* Chat Input */}
          <ChatInput
            inputMessage={inputMessage}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            isTyping={state.isTyping}
            onOpenAddTrade={() => setIsAddTradeModalOpen(true)}
            voiceInputSupported={true}
            isListening={isListening}
            onVoiceInput={startListening}
            voiceTranscript={transcript}
            voiceOutputSupported={true}
            isSpeaking={isSpeaking}
            onVoiceOutput={speak}
          />
        </div>
      </div>

      {/* Modals */}
      <AddTradeModal
        isOpen={isAddTradeModalOpen}
        onClose={() => setIsAddTradeModalOpen(false)}
        onAddTrade={addTrade}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={upgradeReason}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <p>{errorMessage}</p>
          <button
            onClick={() => setErrorMessage('')}
            className="ml-4 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </ErrorBoundary>
  );
};

// Main export component with error boundary
const TradiaAIChat: React.FC<TradiaAIChatProps> = (props) => {
  return (
    <ErrorBoundary>
      <TradiaAIChatContent {...props} />
    </ErrorBoundary>
  );
};

export default TradiaAIChat;
