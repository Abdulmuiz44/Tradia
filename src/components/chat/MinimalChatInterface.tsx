'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, StopCircle, Sparkles, TrendingUp, Target, Brain } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Trade } from '@/types/trade';
import { useSession } from 'next-auth/react';

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
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const conversationIdFromRoute = (params?.id as string) || null;
    const conversationIdFromQuery = searchParams?.get('id') || null;
    const effectiveConversationId = conversationIdFromRoute || conversationIdFromQuery || conversationId;

    const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
    const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
    const [loadedConversationMessages, setLoadedConversationMessages] = useState<any[] | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const userName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Trader';

    const { messages, input, handleInputChange, isLoading, stop, error, setMessages } = useChat({
        api: '/api/tradia/ai',
        initialMessages: loadedConversationMessages || [],
        body: {
            mode,
            conversationId: effectiveConversationId,
            attachedTradeIds: selectedTrades,
        },
    });

    // Load existing conversation messages
    useEffect(() => {
        const loadConversationMessages = async () => {
            if (!effectiveConversationId || effectiveConversationId === 'undefined') {
                setLoadedConversationMessages(null);
                setInitialMessagesLoaded(true);
                return;
            }

            try {
                const res = await fetch(`/api/conversations/${effectiveConversationId}`);
                if (res.status === 404 || !res.ok) {
                    setLoadedConversationMessages(null);
                    setInitialMessagesLoaded(true);
                    return;
                }

                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    const loadedMessages = data.messages.map((msg: any) => ({
                        id: msg.id,
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.content,
                    }));
                    setLoadedConversationMessages(loadedMessages);
                } else {
                    setLoadedConversationMessages(null);
                }
            } catch (err) {
                console.error('Error loading conversation:', err);
                setLoadedConversationMessages(null);
            } finally {
                setInitialMessagesLoaded(true);
            }
        };

        if (!initialMessagesLoaded && effectiveConversationId) {
            loadConversationMessages();
        }
    }, [effectiveConversationId, initialMessagesLoaded]);

    // Auto scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                    conversationId: effectiveConversationId,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to get response');
            }

            const convoIdHeader = response.headers.get('X-Conversation-Id');
            if (convoIdHeader && convoIdHeader !== effectiveConversationId) {
                router.replace(`/dashboard/trades/chat/${convoIdHeader}`);
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

    const handleQuickPrompt = (prompt: string) => {
        handleInputChange({ target: { value: prompt } } as any);
    };

    const quickPrompts = [
        { icon: TrendingUp, label: "Analyze my recent trades", prompt: "Can you analyze my recent trading performance and identify patterns?" },
        { icon: Target, label: "Review my risk management", prompt: "Help me review and improve my risk management strategy" },
        { icon: Brain, label: "Trading psychology tips", prompt: "Give me tips for improving my trading psychology and emotional discipline" },
    ];

    const isEmptyChat = messages.length === 0;

    return (
        <div className="w-full h-full bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                {isEmptyChat ? (
                    /* Welcome Screen */
                    <div className="h-full flex flex-col items-center justify-center px-6 py-12">
                        <div className="text-center max-w-2xl">
                            {/* Greeting */}
                            <div className="mb-8">
                                <span className="text-4xl mb-4 block">👋</span>
                                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                                    Hello there, <span className="text-blue-500">{userName}!</span>
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg">
                                    How can I help you with your trading today?
                                </p>
                            </div>

                            {/* Input Box */}
                            <form onSubmit={handleSubmit} className="mb-8">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={handleInputChange}
                                        placeholder="Hey Tradia, can you..."
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className={cn(
                                            "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition",
                                            input.trim()
                                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                                : "bg-gray-200 dark:bg-[#2a2f3a] text-gray-400 cursor-not-allowed"
                                        )}
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </form>

                            {/* Quick Prompts */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {quickPrompts.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickPrompt(item.prompt)}
                                        className="group p-5 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl hover:border-blue-500/50 hover:bg-gray-100 dark:hover:bg-[#1c2128] transition text-left"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <item.icon className="w-4 h-4 text-blue-500" />
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.label}
                                        </span>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">
                                            <Sparkles className="w-3 h-3" />
                                            Try this prompt
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Messages */
                    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                        {messages.map((m: any) => (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex gap-4",
                                    m.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {m.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                        AI
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[75%] text-sm leading-relaxed px-4 py-3 rounded-2xl",
                                    m.role === 'user'
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-[#161B22] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2f3a]"
                                )}>
                                    {m.role === 'user' ? (
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="font-semibold mt-2 mb-1">{children}</h3>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
                                                    li: ({ children }) => <li>{children}</li>,
                                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                    code: ({ children }) => <code className="bg-gray-200 dark:bg-[#2a2f3a] px-1.5 py-0.5 rounded text-xs">{children}</code>,
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {m.role === 'user' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2a2f3a] flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                        {userName[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                    AI
                                </div>
                                <div className="bg-gray-100 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] px-4 py-3 rounded-2xl">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-500">
                                    !
                                </div>
                                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-2xl">
                                    An error occurred. Please try again.
                                </div>
                            </div>
                        )}

                        <div ref={scrollRef} />
                    </div>
                )}
            </div>

            {/* Input Area (when in conversation) */}
            {!isEmptyChat && (
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-[#2a2f3a] bg-white dark:bg-[#0D1117] p-4">
                    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Type your message..."
                                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e as any);
                                    }
                                }}
                            />
                            <div className="absolute right-2">
                                {isLoading ? (
                                    <button
                                        type="button"
                                        onClick={() => stop()}
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                        title="Stop"
                                    >
                                        <StopCircle className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className={cn(
                                            "p-2 rounded-lg transition",
                                            input.trim()
                                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                                : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        )}
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
