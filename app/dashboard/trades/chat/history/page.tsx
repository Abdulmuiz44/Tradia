"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { TradeProvider } from "@/context/TradeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Loader2, ArrowLeft, Clock, Trash2 } from "lucide-react";

function ConversationHistoryContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        fetchConversations();
    }, [status, router]);

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                const convList = Array.isArray(data) ? data : (data.conversations || []);
                setConversations(convList);
            }
        } catch (err) {
            console.error("Failed to load conversations:", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteConversation = async (convId: string) => {
        setDeleting(convId);
        try {
            const res = await fetch(`/api/conversations/${convId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setConversations(conversations.filter((c) => c.id !== convId));
            }
        } catch (err) {
            console.error("Failed to delete conversation:", err);
        } finally {
            setDeleting(null);
        }
    };

    if (!session && status !== "loading") {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-[#0D0D0D]">
                <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Loading conversations...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#0D0D0D] text-white">
            {/* Header */}
            <div className="border-b border-white/5 px-4 sm:px-6 md:px-8 py-6 bg-gray-900/50">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Chat</span>
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold">Conversation History</h1>
                <p className="text-gray-400 mt-2 text-sm">
                    {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} • Last updated {new Date().toLocaleDateString()}
                </p>
            </div>

            {/* Conversations List */}
            <div className="px-4 sm:px-6 md:px-8 py-6">
                {conversations.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                        <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-500 mb-4 opacity-50" />
                        <p className="text-gray-400 text-sm sm:text-base">No conversations yet. Start a new conversation to begin analyzing your trades.</p>
                        <button
                            onClick={() => router.push("/dashboard/trades/chat")}
                            className="mt-6 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 font-medium text-sm sm:text-base"
                        >
                            + Start a conversation
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            {conversations.map((conv) => (
                                <button
                                 key={conv.id}
                                 onClick={() =>
                                     router.push(`/dashboard/trades/chat/${conv.id}`)
                                 }
                                 className="group text-left p-4 sm:p-5 border border-white/10 rounded-lg hover:border-blue-400/50 hover:bg-blue-500/5 transition-all duration-200 active:scale-95"
                                >
                                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-base sm:text-lg text-white group-hover:text-blue-300 transition-colors truncate">
                                                {conv.title || "Untitled Conversation"}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-3 text-xs sm:text-sm text-gray-400">
                                                <Clock className="w-4 h-4 flex-shrink-0" />
                                                <time>
                                                    {new Date(conv.updated_at).toLocaleDateString()}{" "}
                                                    {new Date(conv.updated_at).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </time>
                                            </div>
                                            {conv.mode && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <span className="inline-block px-2.5 py-1 bg-blue-500/20 text-xs rounded-full font-medium text-blue-300 capitalize border border-blue-500/30">
                                                        {conv.mode}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteConversation(conv.id);
                                            }}
                                            disabled={deleting === conv.id}
                                            className="flex-shrink-0 p-2 sm:p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 hover:scale-110 active:scale-95 border border-transparent hover:border-red-500/30"
                                            title="Delete conversation"
                                            aria-label="Delete conversation"
                                        >
                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ConversationHistoryPage() {
    return (
        <LayoutClient>
            <NotificationProvider>
                <UserProvider>
                    <TradeProvider>
                        <ConversationHistoryContent />
                    </TradeProvider>
                </UserProvider>
            </NotificationProvider>
        </LayoutClient>
    );
}
