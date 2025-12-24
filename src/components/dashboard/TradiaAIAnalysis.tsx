"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TradiaAIAnalysisProps {
  trades: Trade[];
  userId?: string;
}

export default function TradiaAIAnalysis({ trades, userId }: TradiaAIAnalysisProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeWithAI = useCallback(async (customPrompt?: string) => {
    const userPrompt = customPrompt || prompt;
    if (!userPrompt.trim()) return;
    if (trades.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to conversation
      const newUserMessage: Message = { role: 'user', content: userPrompt };
      setMessages(prev => [...prev, newUserMessage]);

      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages: [...messages, newUserMessage],
          mode: 'analysis',
          options: {
            temperature: 0.3,
            max_tokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      // Get conversation ID from response header
      const convId = response.headers.get('X-Conversation-Id');
      if (convId && !conversationId) {
        setConversationId(convId);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        // Update streaming response in real-time
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === 'assistant') {
            updated[updated.length - 1].content = fullResponse;
          } else {
            updated.push({ role: 'assistant', content: fullResponse });
          }
          return updated;
        });
      }

      if (!customPrompt) setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
      console.error('AI Analysis Error:', err);
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [trades, prompt, messages, conversationId]);

  const quickAnalyses = [
    { label: 'Performance', prompt: 'Analyze my trading performance: win rate, P&L, consistency. What are my strengths and areas to improve?' },
    { label: 'Risk Check', prompt: 'Evaluate my risk management. How\'s my risk-to-reward ratio? What can I optimize?' },
    { label: 'Patterns', prompt: 'What patterns do you see? Which symbols, times, or conditions work best for me?' },
    { label: 'Action Plan', prompt: 'Create a personalized action plan for next week based on my trading history.' }
  ];

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0D1117]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-[#0f1319] dark:text-white">Tradia AI</h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{trades.length} trades analyzed</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={handleClearChat}
              variant="outline"
              size="sm"
              className="text-gray-600 dark:text-gray-400"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {error && (
          <div className="p-3 md:p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-gray-700 dark:text-gray-300 font-medium mb-2">Start your analysis</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
              Ask me anything about your trades or select a quick analysis
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
              {quickAnalyses.map((item) => (
                <button
                  key={item.label}
                  onClick={() => analyzeWithAI(item.prompt)}
                  disabled={loading || trades.length === 0}
                  className="p-3 text-sm text-left rounded-lg bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 text-blue-900 dark:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${msg.role === 'user'
                    ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-800 text-[#0f1319] dark:text-white rounded-bl-none'
                    }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
                          h2: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-3" {...props} />,
                          h3: ({ node, ...props }) => <h4 className="text-sm font-semibold mb-1 mt-2" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2 text-sm" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 text-sm" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 text-sm" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1 text-sm" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                          code: ({ node, ...props }) => <code className={`px-1 py-0.5 rounded text-xs ${msg.role === 'assistant' ? 'bg-gray-200 dark:bg-[#0f1319]' : 'bg-blue-400'}`} {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className={`border-l-4 pl-3 italic text-sm my-2 ${msg.role === 'assistant' ? 'border-gray-400' : 'border-blue-300'}`} {...props} />,
                          table: ({ node, ...props }) => <div className="overflow-x-auto mb-2"><table className="w-full text-xs" {...props} /></div>,
                          thead: ({ node, ...props }) => <thead className="font-semibold" {...props} />,
                          th: ({ node, ...props }) => <th className="px-2 py-1 text-left" {...props} />,
                          td: ({ node, ...props }) => <td className="px-2 py-1" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 text-[#0f1319] dark:text-white rounded-lg rounded-bl-none p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-white dark:bg-[#0D1117]">
        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && prompt.trim()) {
                analyzeWithAI();
              }
            }}
            placeholder={trades.length === 0 ? "No trades yet. Add trades to get started." : "Ask anything about your trades... (Ctrl+Enter to send)"}
            disabled={trades.length === 0 || loading}
            className="flex-1 bg-gray-50 dark:bg-[#0f1319] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-[#0f1319] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            rows={2}
          />
          <Button
            onClick={() => analyzeWithAI()}
            disabled={loading || !prompt.trim() || trades.length === 0}
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white self-end"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
