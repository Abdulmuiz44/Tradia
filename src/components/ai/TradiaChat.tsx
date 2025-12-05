// src/components/ai/TradiaChat.tsx
"use client";

import React, { useState } from 'react';
import { TradiaMode } from '@/lib/modes';
import { ChatMessage, ChatResponse } from '@/types/mistral';
import { ModeSelector, ModeInfo } from './ModeSelector';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradiaChatProps {
  userId?: string;
  initialMode?: TradiaMode;
  className?: string;
}

/**
 * Example React component for Tradia Chat with Mistral AI
 * 
 * This component demonstrates how to:
 * - Select AI modes
 * - Send messages to the Tradia Chat API
 * - Display conversation history
 * - Handle errors and loading states
 */
export function TradiaChat({ userId, initialMode = 'assistant', className }: TradiaChatProps) {
  const [mode, setMode] = useState<TradiaMode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModeInfo, setShowModeInfo] = useState(true);

  /**
   * Send message to Tradia Chat API
   */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    setShowModeInfo(false);

    try {
      const response = await fetch('/api/tradia/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId,
          mode: mode,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data: ChatResponse = await response.json();

      // Add AI response to conversation
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Clear conversation
   */
  const clearConversation = () => {
    setMessages([]);
    setError(null);
    setShowModeInfo(true);
  };

  return (
    <div className={cn("flex flex-col h-full bg-[#061226]", className)}>
      {/* Header with Mode Selector */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Tradia AI Chat</h2>
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
        <ModeSelector
          currentMode={mode}
          onModeChange={setMode}
          disabled={loading}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Show mode info initially */}
        {showModeInfo && messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <ModeInfo mode={mode} />
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-white border border-white/10'
              )}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div className="text-xs opacity-50 mt-1">
                {new Date(message.timestamp || '').toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 text-white border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${mode} mode anything...`}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg",
              "bg-white/5 border border-white/10 text-white",
              "placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200",
              "flex items-center gap-2"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-400 text-center">
          Mode: <span className="capitalize font-medium">{mode}</span> | Press Enter to send
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using Tradia Chat API in other components
 */
export function useTradiaChat(userId?: string, mode: TradiaMode = 'assistant') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string, conversationHistory?: ChatMessage[]): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tradia/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          mode,
          conversationHistory: conversationHistory?.slice(-10)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data: ChatResponse = await response.json();
      return data.response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error in useTradiaChat:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendMessage,
    loading,
    error
  };
}
