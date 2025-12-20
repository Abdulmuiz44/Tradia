'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, StopCircle, Menu, Clock, Plus, MessageCircle } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    
    // Support both route param [id] and query param ?id=
    const conversationIdFromRoute = (params?.id as string) || null;
    const conversationIdFromQuery = searchParams?.get('id') || null;
    const effectiveConversationId = conversationIdFromRoute || conversationIdFromQuery || conversationId;
    
    const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
    const [showTradeSelector, setShowTradeSelector] = useState(false);
    const [showHistoryMenu, setShowHistoryMenu] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
    const [initialMessages, setInitialMessages] = useState<any[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
        },
    ]);

    // Load existing conversation messages
    useEffect(() => {
        const loadConversationMessages = async () => {
            // Only load if conversationId is provided
            if (!effectiveConversationId || effectiveConversationId === 'undefined') {
                console.log('No conversation ID, starting fresh');
                setInitialMessagesLoaded(true);
                return;
            }

            try {
                console.log('Attempting to load conversation:', effectiveConversationId);
                const res = await fetch(`/api/conversations/${effectiveConversationId}`);
                
                if (res.status === 404) {
                    console.log('Conversation not found (404), will create new one on first message');
                    setInitialMessagesLoaded(true);
                    return;
                }
                
                if (!res.ok) {
                    const errorText = await res.text();
                    console.error(`Failed to fetch conversation: ${res.status}`, errorText);
                    setInitialMessagesLoaded(true);
                    return;
                }
                
                const data = await res.json();
                console.log('Successfully loaded conversation:', data.conversation?.id);
                
                if (data.messages && data.messages.length > 0) {
                    const loadedMessages = data.messages.map((msg: any) => ({
                        id: msg.id,
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.content,
                    }));
                    console.log(`Setting ${loadedMessages.length} messages from conversation`);
                    setInitialMessages(loadedMessages);
                    setMessages(loadedMessages);
                } else {
                    // No messages yet, show welcome message
                    console.log('Conversation exists but has no messages yet');
                    const welcomeMessage = {
                        id: 'welcome',
                        role: 'assistant' as const,
                        content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
                    };
                    setInitialMessages([welcomeMessage]);
                    setMessages([welcomeMessage]);
                }
            } catch (err) {
                console.error('Error loading conversation:', err);
                // Mark as loaded and show welcome
                const welcomeMessage = {
                    id: 'welcome',
                    role: 'assistant' as const,
                    content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
                };
                setInitialMessages([welcomeMessage]);
                setMessages([welcomeMessage]);
            } finally {
                setInitialMessagesLoaded(true);
            }
        };

        // Only load if we have a conversation ID and haven't loaded yet
        if (!initialMessagesLoaded && effectiveConversationId) {
            loadConversationMessages();
        }
    }, [effectiveConversationId, initialMessagesLoaded, setInitialMessages]);

    const { messages, input, handleInputChange, isLoading, stop, error, setMessages } = useChat({
        api: '/api/tradia/ai',
        initialMessages,
        body: {
            mode,
            conversationId: effectiveConversationId,
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
                    conversationId: effectiveConversationId,
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

    // Fetch conversation history
    useEffect(() => {
        const fetchConversations = async () => {
            setLoadingHistory(true);
            try {
                const res = await fetch('/api/conversations');
                if (!res.ok) {
                    throw new Error(`Failed to fetch conversations: ${res.status}`);
                }
                const data = await res.json();

                // Handle both array and object responses
                const convList = Array.isArray(data) ? data : (data.conversations || []);

                // Filter out "New Conversation" entries that have no messages (optional filter for cleaner UX)
                // But keep them if they have messages - user might be actively using them
                const filteredConvs = convList.slice(0, 10); // Last 10 conversations

                setConversations(filteredConvs);
                console.log(`Loaded ${filteredConvs.length} conversations for user`);
            } catch (err) {
                console.error('Failed to load conversations:', err);
                setConversations([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        if (showHistoryMenu) {
            fetchConversations();
        }
    }, [showHistoryMenu]);

    const startNewConversation = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Hello! I am your Tradia AI Coach powered by Mistral AI. I can help you analyze your trading psychology, risk management, strategy, and performance. What would you like to discuss today?',
            },
        ]);
        setShowHistoryMenu(false);
    };

    return (
        <div className="w-full h-screen bg-[#0D0D0D] dark:bg-[#0D0D0D] text-white flex flex-col">
            {/* Header with Menu */}
            <div className="flex-shrink-0 flex items-center justify-start px-3 sm:px-6 md:px-8 py-4 border-b border-white/5 bg-gray-900/50">
                <div className="relative flex items-center gap-2">
                    <button
                        onClick={() => setShowHistoryMenu(!showHistoryMenu)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:scale-105 active:scale-95"
                        title="Conversation history and new chat"
                        aria-label="Open conversation menu"
                    >
                        <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                                         <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                         <span className="hidden sm:inline text-gray-300">Tradia AI Chat</span>
                                     </div>

                    {/* History Menu Dropdown - Mobile & Desktop */}
                    {showHistoryMenu && (
                        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-gray-900 border border-white/10 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Clock className="w-4 h-4" />
                                    Conversations
                                </div>
                                <button
                                    onClick={startNewConversation}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    title="New conversation"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {loadingHistory ? (
                                    <div className="p-4 text-center text-sm text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                                        Loading...
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-400">No conversations yet</div>
                                ) : (
                                    conversations.map((conv: any) => (
                                         <button
                                             key={conv.id}
                                             onClick={() => {
                                                 router.push(`/dashboard/trades/chat/${conv.id}`);
                                                 setShowHistoryMenu(false);
                                             }}
                                             className="w-full text-left px-3 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0 active:bg-white/20"
                                         >
                                            <div className="text-sm font-semibold text-white truncate">{conv.title || 'Untitled Conversation'}</div>
                                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(conv.updated_at).toLocaleDateString()} {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {conv.mode && <div className="text-xs text-blue-300 mt-1 capitalize">{conv.mode} mode</div>}
                                        </button>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    router.push('/dashboard/trades/chat/history');
                                    setShowHistoryMenu(false);
                                }}
                                className="w-full p-3 text-sm font-medium text-center text-blue-400 hover:bg-white/10 hover:text-blue-300 border-t border-white/10 transition-colors active:bg-white/20"
                            >
                                View all conversations →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area - Centered */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 pb-40 flex flex-col items-center">
                <div className="w-full max-w-4xl px-4 sm:px-6 md:px-8">
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-4 mb-6",
                                m.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {m.role === 'assistant' && (
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                    AI
                                </div>
                            )}

                            <div className={cn(
                                "max-w-2xl text-sm leading-relaxed font-semibold px-4 py-3 rounded-lg",
                                m.role === 'user'
                                    ? "bg-white/10 text-white"
                                    : "bg-gray-800/70 text-white"
                            )}>
                                {m.role === 'user' ? (
                                    <div className="whitespace-pre-wrap text-white">{m.content}</div>
                                ) : (
                                    <div className="text-white space-y-4 [&_p]:mb-4 [&_li]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="text-white leading-relaxed">{children}</p>,
                                                h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-3">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-base font-bold text-white mt-3 mb-2">{children}</h2>,
                                                h3: ({ children }) => <h3 className="font-semibold text-white mt-2 mb-2">{children}</h3>,
                                                ul: ({ children }) => <ul className="list-disc list-inside text-white space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside text-white space-y-1">{children}</ol>,
                                                li: ({ children }) => <li className="text-white">{children}</li>,
                                                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                                em: ({ children }) => <em className="italic text-white">{children}</em>,
                                                code: ({ children }) => <code className="bg-gray-700 text-white px-2 py-1 rounded text-xs">{children}</code>,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
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
                        <div className="flex gap-4 animate-in fade-in duration-300 mb-6">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                AI
                            </div>
                            <div className="max-w-2xl text-sm leading-relaxed font-semibold px-4 py-3 rounded-lg bg-gray-800/70 text-white">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                    <span>Generating response...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex gap-4 mb-6">
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
            </div>

            {/* Input Area - Sticks to Bottom & Centered */}
            <div className="flex-shrink-0 border-t border-white/5 bg-[#0D0D0D] py-4 flex justify-center">
                <form onSubmit={handleSubmit} className="flex items-end gap-3 w-full max-w-4xl px-4 sm:px-6 md:px-8">
                    <textarea
                        className="flex-1 min-h-[44px] max-h-[120px] bg-white/5 text-white border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none placeholder:text-gray-500 focus:bg-white/10 transition-colors"
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
            </div>
        </div>
    );
}
