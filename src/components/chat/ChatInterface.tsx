'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Send, User, Bot, StopCircle, RefreshCw, Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Trade } from '@/types/trade';

interface ChatInterfaceProps {
    trades?: Trade[];
    mode?: 'coach' | 'mentor' | 'analysis' | 'journal' | 'grok' | 'assistant';
    conversationId?: string;
}

export function ChatInterface({ trades = [], mode = 'coach', conversationId }: ChatInterfaceProps = {}) {
    const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
    const [showTradeSelector, setShowTradeSelector] = useState(false);

    const { messages, input, handleInputChange, isLoading, stop, reload, error, setMessages } = useChat({
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

        // Add user message
        const userMessage = {
            id: `msg_${Date.now()}`,
            role: 'user' as const,
            content: userContent,
        };

        setMessages(prev => [...prev, userMessage]);

        // Call the API with selected trades
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-screen w-full bg-[#061226] overflow-hidden">
            {/* Header */}
            <div className="bg-[#0f172a] px-6 py-3 border-b border-gray-800 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                            <Bot className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white text-sm">Tradia AI</h2>
                            <p className="text-xs text-gray-400">Trading analysis</p>
                        </div>
                    </div>
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Analyzing...</span>
                        </div>
                    )}
                </div>

                {/* Mode selector */}
                <div className="flex gap-1.5 flex-wrap mb-2">
                    {(['coach', 'mentor', 'analysis', 'journal'] as const).map((m) => (
                        <button
                            key={m}
                            className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                mode === m
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700/40 text-gray-300 hover:bg-gray-700/60"
                            )}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Trade selector */}
                {trades && trades.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTradeSelector(!showTradeSelector)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 text-xs text-gray-300 transition-colors"
                        >
                            <BarChart3 size={12} />
                            {selectedTrades.length}/{trades.length} trades
                        </button>
                        {selectedTrades.length > 0 && (
                            <button
                                onClick={() => setSelectedTrades([])}
                                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Trade selector dropdown */}
                {showTradeSelector && trades && trades.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 max-h-40 overflow-y-auto">
                        <div className="text-xs text-gray-300 mb-2 font-medium">Select trades:</div>
                        <div className="space-y-2">
                            {trades.slice(0, 10).map((trade) => (
                                <label key={trade.id} className="flex items-center gap-2 text-xs text-white hover:text-gray-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedTrades.includes(trade.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTrades([...selectedTrades, trade.id]);
                                            } else {
                                                setSelectedTrades(selectedTrades.filter(id => id !== trade.id));
                                            }
                                        }}
                                        className="w-3 h-3 rounded"
                                    />
                                    <span>{trade.symbol}</span>
                                    <span className={trade.outcome === 'Win' || trade.outcome === 'win' ? 'text-green-400' : 'text-red-400'}>
                                        ${trade.pnl?.toFixed(2) || '0.00'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                {messages.map((m: any) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex gap-3",
                            m.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                            m.role === 'user' ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        )}>
                            {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>

                        <div className={cn(
                            "max-w-md lg:max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed shadow-sm text-white",
                            m.role === 'user'
                                ? "bg-blue-600 rounded-br-none"
                                : "bg-gray-800 border border-gray-700 rounded-bl-none"
                        )}>
                            {m.role === 'user' ? (
                                <div className="whitespace-pre-wrap">{m.content}</div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mx-auto max-w-md text-center">
                        An error occurred. Please try again or check your connection.
                        <button onClick={() => reload()} className="block mx-auto mt-2 text-xs underline hover:text-red-300">Retry</button>
                    </div>
                )}

                <div ref={scrollRef} />
            </div>

            {/* Quick suggestions (show when no messages) */}
            {messages.length === 1 && (
                <div className="px-6 py-3 bg-[#0f172a]/50 border-t border-gray-800/50 flex-shrink-0">
                    <div className="text-xs text-gray-400 mb-2">Quick analysis:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { icon: TrendingUp, label: "Win Analysis", prompt: "Which symbols or strategies give me the best win rate and why?" },
                            { icon: TrendingDown, label: "Loss Analysis", prompt: "Where am I losing the most? What patterns do you see?" },
                            { icon: BarChart3, label: "Performance", prompt: "Analyze my overall trading performance and give me 3 key improvements." },
                            { icon: Bot, label: "Risk Check", prompt: "Review my risk management - am I risking too much per trade?" },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        handleInputChange({ target: { value: item.prompt } } as any);
                                    }}
                                    className="p-2 rounded-lg bg-gray-700/40 hover:bg-gray-700 border border-gray-600 text-xs text-white hover:text-gray-100 transition-colors flex flex-col items-center gap-1"
                                >
                                    <Icon size={16} />
                                    <span className="text-[10px]">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-3 bg-[#0f172a] border-t border-gray-800 flex-shrink-0">
                <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
                    <textarea
                        className="flex-1 min-h-[48px] max-h-[200px] w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none custom-scrollbar placeholder:text-gray-500"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask about your trading strategy, performance, patterns..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                            }
                        }}
                    />

                    <div className="flex gap-2">
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={() => stop()}
                                className="p-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/40"
                                title="Stop generating"
                            >
                                <StopCircle className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </form>
                <div className="text-center mt-2 text-xs text-gray-400">
                    Select trades above for detailed analysis • Shift+Enter for new line
                </div>
            </div>
        </div>
    );
}
