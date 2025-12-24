"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Search, Trash2, Pin } from "lucide-react";
import Link from "next/link";
import type { Conversation } from "@/types/chat";
import LayoutClient from "@/components/LayoutClient";

interface ConversationWithStats extends Conversation {
  messageCount?: number;
  lastMessageAt?: string;
}

export default function ConversationHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      const convList = Array.isArray(data) ? data : data.conversations || [];

      const formatted = convList.map((conv: any) => ({
        id: conv.id,
        title: conv.title || "Untitled",
        messages: conv.messages || [],
        pinned: conv.pinned || false,
        createdAt: conv.created_at || new Date().toISOString(),
        updatedAt: conv.updated_at || new Date().toISOString(),
        messageCount: conv.message_count || (conv.messages?.length || 0),
        lastMessageAt: conv.last_message_at || conv.updated_at,
      }));

      setConversations(formatted);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      loadConversations();
    }
  }, [status, router, loadConversations]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this conversation? This action cannot be undone.")) return;

      try {
        setDeleting(id);
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete conversation");

        setConversations((prev) => prev.filter((conv) => conv.id !== id));
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        alert("Failed to delete conversation");
      } finally {
        setDeleting(null);
      }
    },
    []
  );

  const handlePin = useCallback(async (id: string) => {
    try {
      const conversation = conversations.find((c) => c.id === id);
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !conversation?.pinned }),
      });

      if (!res.ok) throw new Error("Failed to pin conversation");
      const { conversation: updated } = await res.json();

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, pinned: updated.pinned } : conv
        )
      );
    } catch (error) {
      console.error("Failed to pin conversation:", error);
    }
  }, [conversations]);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConvs = filteredConversations.filter((c) => c.pinned);
  const regularConvs = filteredConversations.filter((c) => !c.pinned);

  if (status === "loading") {
    return (
      <LayoutClient>
        <div className="flex items-center justify-center w-full h-screen bg-[#061226]">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading...
          </div>
        </div>
      </LayoutClient>
    );
  }

  return (
    <LayoutClient>
      <div className="w-full h-screen flex flex-col bg-[#0D0D0D]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-indigo-500/20 bg-[#0f1319]/50 px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/dashboard/trades/chat"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Conversation History</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-indigo-500/40 bg-[#050b18] text-white placeholder:text-white/50 focus:border-indigo-300 focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/80">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                Loading conversations...
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/70">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm text-white/60 mt-2">
                  Start a new chat to begin your journey
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pinned Section */}
              {pinnedConvs.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 mb-4">
                    Pinned
                  </h2>
                  <div className="space-y-3">
                    {pinnedConvs.map((conv) => (
                      <ConversationCard
                        key={conv.id}
                        conversation={conv}
                        onPin={() => handlePin(conv.id)}
                        onDelete={() => handleDelete(conv.id)}
                        isDeleting={deleting === conv.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Section */}
              {regularConvs.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60 mb-4">
                    Recent
                  </h2>
                  <div className="space-y-3">
                    {regularConvs.map((conv) => (
                      <ConversationCard
                        key={conv.id}
                        conversation={conv}
                        onPin={() => handlePin(conv.id)}
                        onDelete={() => handleDelete(conv.id)}
                        isDeleting={deleting === conv.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredConversations.length === 0 && searchQuery && (
                <div className="text-center text-white/70">
                  <p>No conversations match your search.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LayoutClient>
  );
}

interface ConversationCardProps {
  conversation: ConversationWithStats;
  onPin: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ConversationCard({
  conversation,
  onPin,
  onDelete,
  isDeleting,
}: ConversationCardProps) {
  const createdAt = new Date(conversation.createdAt);
  const updatedAt = new Date(conversation.updatedAt);
  const lastMessage =
    conversation.messages && conversation.messages.length > 0
      ? conversation.messages[conversation.messages.length - 1]
      : null;

  return (
    <Link href={`/dashboard/trades/chat?id=${conversation.id}`}>
      <div className="group cursor-pointer rounded-2xl border border-indigo-500/20 bg-[#0b152f] p-4 transition-all hover:border-indigo-400/50 hover:bg-indigo-500/15">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {conversation.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span>
                Created {createdAt.toLocaleDateString()} at{" "}
                {createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>•</span>
              <span>{conversation.messageCount || 0} messages</span>
            </div>

            {lastMessage && (
              <p className="mt-3 line-clamp-2 text-xs text-white/70">
                {lastMessage.content}
              </p>
            )}
          </div>

          <div
            className="flex flex-none items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.preventDefault()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPin();
              }}
              className="p-2 rounded-lg border border-indigo-500/40 bg-[#050b18] text-white/80 hover:border-indigo-300 hover:bg-indigo-500/10 transition-colors"
              title={conversation.pinned ? "Unpin" : "Pin"}
            >
              <Pin
                className={`w-4 h-4 ${conversation.pinned ? "fill-current" : ""
                  }`}
              />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="p-2 rounded-lg border border-indigo-500/40 bg-[#050b18] text-red-400 hover:border-red-400/60 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// For the missing icon
import { MessageCircle } from "lucide-react";
