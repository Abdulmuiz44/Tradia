'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Trade } from '@/types/trade';

interface MinimalChatInterfaceProps {
    trades?: Trade[];
    mode?: 'coach' | 'mentor' | 'analysis' | 'journal' | 'grok' | 'assistant';
    conversationId?: string;
}

export function MinimalChatInterface({
    trades = [],
    mode = 'analysis',
    conversationId,
}: MinimalChatInterfaceProps = {}) {
    const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
    const [showTradeSelector, setShowTradeSelector] = useState(false);

    const { messages, input, handleInputChange, isLoading, stop, error, setMessages } = useChat({
        api: '/api/tradia/ai',
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
            },
        ],
        body: {
            mode,
            conversationId,
            attachedTradeIds: selectedTrades,
        },
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userContent = input;
        handleInputChange({ target: { value: '' } } as any);

        const userMessage = {
            id: `msg_${Date.now()}`,
            role: 'user' as const,
            content: userContent,
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await fetch('/api/tradia/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    attachedTradeIds: selectedTrades,
                    mode,
                    conversationId,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to get response');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            let assistantContent = '';
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                assistantContent += decoder.decode(value, { stream: true });
            }

            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: assistantContent,
            }]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            }]);
        }
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full h-screen bg-[#0D0D0D] dark:bg-[#0D0D0D] text-white flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
                {messages.map((m: any) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex gap-4",
                            m.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        {m.role === 'assistant' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                AI
                            </div>
                        )}

                        <div className={cn(
                            "max-w-2xl text-sm leading-relaxed font-semibold text-white px-4 py-3 rounded-lg",
                            m.role === 'user'
                                ? "bg-white/10"
                                : "bg-white/10"
                        )}>
                            {m.role === 'user' ? (
                                <div className="whitespace-pre-wrap">{m.content}</div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        {m.role === 'user' && (
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                                U
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 items-center">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
                            AI
                        </div>
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-sm text-gray-400">Analyzing...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400">
                            !
                        </div>
                        <div className="text-sm text-red-400">
                            An error occurred. Please try again.
                        </div>
                    </div>
                )}

                <div ref={scrollRef} />
            </div>

            {/* Input Area - Sticks to Bottom */}
            <div className="flex-shrink-0 w-full px-4 sm:px-6 md:px-8 py-4 border-t border-white/5">
                <form onSubmit={handleSubmit} className="flex items-end gap-3">
                    <textarea
                        className="flex-1 min-h-[44px] max-h-[120px] bg-white/5 text-white border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none placeholder:text-gray-500"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask about your trading..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                            }
                        }}
                    />

                    {isLoading ? (
                        <button
                            type="button"
                            onClick={() => stop()}
                            className="flex-shrink-0 p-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                            title="Stop generating"
                        >
                            <StopCircle className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 p-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send message"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    )}
                </form>

                {/* Powered by Mistral AI */}
                <div className="text-center mt-2 text-xs text-gray-400">
                    Powered by Mistral AI
                </div>
            </div>
        </div>
    );
}
