'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, StopCircle, Sparkles, TrendingUp, Target, Brain } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Trade } from '@/types/trade';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

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

    // All state managed locally - NO useChat hook
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const userName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Trader';

    // Debug: Log the conversation ID on every render
    console.log('[Chat] Component rendered with effectiveConversationId:', effectiveConversationId);
    console.log('[Chat] params:', params, 'conversationId prop:', conversationId);

    // Load conversation history on mount
    useEffect(() => {
        console.log('[Chat] useEffect triggered for ID:', effectiveConversationId);

        const loadConversation = async () => {
            console.log('[Chat] loadConversation called for:', effectiveConversationId);
            setIsLoadingHistory(true);
            setMessages([]);
            setError(null);

            if (!effectiveConversationId || effectiveConversationId === 'undefined') {
                console.log('[Chat] No valid conversation ID, skipping load');
                setIsLoadingHistory(false);
                return;
            }

            try {
                console.log('[Chat] Fetching from API:', `/api/conversations/${effectiveConversationId}`);
                const res = await fetch(`/api/conversations/${effectiveConversationId}`);
                console.log('[Chat] API response status:', res.status);

                if (res.status === 404) {
                    console.log('[Chat] Conversation not found (404)');
                    setIsLoadingHistory(false);
                    return;
                }

                if (!res.ok) {
                    console.log('[Chat] API response not OK:', res.status);
                    throw new Error('Failed to load conversation');
                }

                const data = await res.json();
                console.log('[Chat] API response data:', data);
                console.log('[Chat] Messages count:', data.messages?.length || 0);

                if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
                    const loadedMessages: Message[] = data.messages.map((msg: any) => ({
                        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.content || '',
                    }));
                    console.log('[Chat] Setting messages:', loadedMessages.length);
                    setMessages(loadedMessages);
                } else {
                    console.log('[Chat] No messages in response');
                }
            } catch (err) {
                console.error('[Chat] Error loading conversation:', err);
                setError('Failed to load conversation history');
            } finally {
                setIsLoadingHistory(false);
                console.log('[Chat] Loading complete');
            }
        };

        loadConversation();
    }, [effectiveConversationId]);


    // Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }, []);

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userContent = input.trim();
        setInput('');
        setError(null);

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: userContent,
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        abortControllerRef.current = new AbortController();

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
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to get response');
            }

            // Handle conversation ID redirect for new chats
            const convoIdHeader = response.headers.get('X-Conversation-Id');
            if (convoIdHeader && convoIdHeader !== effectiveConversationId) {
                router.replace(`/dashboard/trades/chat/${convoIdHeader}`);
            }

            // Stream the response
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            let assistantContent = '';
            const decoder = new TextDecoder();

            // Add placeholder assistant message
            const assistantId = `msg_${Date.now()}_assistant`;
            setMessages(prev => [...prev, {
                id: assistantId,
                role: 'assistant',
                content: '',
            }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;

                // Update the assistant message in real-time
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantId
                        ? { ...msg, content: assistantContent }
                        : msg
                ));
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                // User stopped generation
                return;
            }
            console.error('Chat error:', err);
            setError(err.message || 'An error occurred');
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}_error`,
                role: 'assistant',
                content: `Error: ${err.message || 'Unknown error occurred'}`,
            }]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        setInput(prompt);
    };

    const quickPrompts = [
        { icon: TrendingUp, label: "Analyze my recent trades", prompt: "Can you analyze my recent trading performance and identify patterns?" },
        { icon: Target, label: "Review my risk management", prompt: "Help me review and improve my risk management strategy" },
        { icon: Brain, label: "Trading psychology tips", prompt: "Give me tips for improving my trading psychology and emotional discipline" },
    ];

    const isEmptyChat = messages.length === 0 && !isLoadingHistory;

    // Show loading state while fetching history
    if (isLoadingHistory) {
        return (
            <div className="w-full h-full bg-white dark:bg-[#0D1117] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
                    <p className="text-gray-500 dark:text-gray-400">Loading conversation...</p>
                </div>
            </div>
        );
    }

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
                        {messages.map((m) => (
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
                                            {m.content ? (
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
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Thinking...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {m.role === 'user' && (
                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                        <AvatarImage src={session?.user?.image || ""} />
                                        <AvatarFallback className="bg-gray-200 dark:bg-[#2a2f3a] text-gray-600 dark:text-gray-400 text-xs">
                                            {userName[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {error && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-500">
                                    !
                                </div>
                                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-2xl">
                                    {error}
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
                                        onClick={stopGeneration}
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
