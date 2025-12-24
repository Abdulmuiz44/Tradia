'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, forwardRef } from 'react';
import { Send, User, Bot, StopCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface TradiaAIChatProps {
    className?: string;
    activeConversationId?: string | null;
    onActiveConversationChange?: (id: string | null) => void;
    onConversationsChange?: (conversations: any[]) => void;
    onLoadingChange?: (loading: boolean) => void;
}

export interface TradiaAIChatHandle {
    focus: () => void;
    createConversation?: () => Promise<void>;
    selectConversation?: (conversationId: string) => Promise<void>;
}

const TradiaAIChat = forwardRef<TradiaAIChatHandle, TradiaAIChatProps>(
    ({ className, activeConversationId, onActiveConversationChange, onConversationsChange, onLoadingChange }, ref) => {
        const { messages, input, handleInputChange, handleSubmit, isLoading, stop, error } = useChat({
            api: '/api/chat',
            initialMessages: [
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
                },
            ],
        });

        const scrollRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLTextAreaElement>(null);

        useEffect(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, [messages]);

        useEffect(() => {
            if (onLoadingChange) {
                onLoadingChange(isLoading);
            }
        }, [isLoading, onLoadingChange]);

        return (
            <div className={cn("flex flex-col h-[calc(100vh-80px)] w-full max-w-4xl mx-auto bg-[#0f1319] border border-gray-800 rounded-lg overflow-hidden shadow-2xl", className)}>
                {/* Header */}
                <div className="bg-[#0f1319] p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                            <Bot className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">Tradia AI Coach</h2>
                            <p className="text-xs text-gray-400">Powered by Mistral AI</p>
                        </div>
                    </div>
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                        </div>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                                m.role === 'user' ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                            )}>
                                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>

                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                m.role === 'user'
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-[#1e293b] text-gray-200 border border-gray-700/50 rounded-tl-none"
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
                            <button onClick={() => window.location.reload()} className="block mx-auto mt-2 text-xs underline hover:text-red-300">Retry</button>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0f1319] border-t border-gray-800">
                    <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            className="flex-1 min-h-[50px] max-h-[200px] w-full bg-[#1e293b] text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none custom-scrollbar placeholder:text-gray-500"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask about your strategy, risk management, or psychology..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }
                            }}
                        />

                        <div className="flex flex-col gap-2 pb-1">
                            {isLoading ? (
                                <button
                                    type="button"
                                    onClick={() => stop()}
                                    className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/30"
                                    title="Stop generating"
                                >
                                    <StopCircle className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-95"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-500">
                            AI can make mistakes. Consider checking important information.
                        </p>
                    </div>
                </div>
            </div>
        );
    }
);

TradiaAIChat.displayName = 'TradiaAIChat';

export default TradiaAIChat;
