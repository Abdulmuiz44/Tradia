"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Menu, X, PenSquare, History, Search } from "lucide-react";
import type { Conversation } from "@/types/chat";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      const convList = Array.isArray(data) ? data : data.conversations || [];

      const formattedConversations = convList.map((conv: any) => ({
        id: conv.id,
        title: conv.title || "Untitled",
        messages: conv.messages || [],
        pinned: conv.pinned || false,
        createdAt: conv.created_at || new Date().toISOString(),
        updatedAt: conv.updated_at || new Date().toISOString(),
      }));

      setConversations(formattedConversations);
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

  const handleCreateConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Conversation",
          model: "gpt-4o-mini",
        }),
      });

      if (!res.ok) throw new Error("Failed to create conversation");
      const { conversation } = await res.json();

      const newConv: Conversation = {
        id: conversation.id,
        title: conversation.title,
        messages: [],
        pinned: false,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(conversation.id);
      router.push(`/dashboard/trades/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [router]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      router.push(`/dashboard/trades/chat/${id}`);
    },
    [router]
  );

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Delete this conversation?")) return;

      try {
        const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");

        setConversations((prev) => prev.filter((conv) => conv.id !== id));
        if (activeConversationId === id) {
          router.push("/dashboard/trades/chat");
        }
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    },
    [activeConversationId, router]
  );

  const filteredConversations = conversations.filter(
    (conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentConversations = filteredConversations.slice(0, 20);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white dark:bg-[#0D1117]">
        <div className="text-center text-gray-900 dark:text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0D1117] overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-0'} 
        flex-shrink-0 bg-gray-50 dark:bg-[#161B22] border-r border-gray-200 dark:border-[#2a2f3a]
        transition-all duration-300 overflow-hidden flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#2a2f3a]">
          <button
            onClick={handleCreateConversation}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#2a2f3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2f3a] transition text-gray-900 dark:text-white font-medium text-sm"
          >
            <PenSquare className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-[#2a2f3a]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-[#2a2f3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-2 py-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Recents
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`
                    w-full px-3 py-2.5 rounded-lg text-left transition group flex items-center justify-between
                    ${activeConversationId === conv.id
                      ? 'bg-gray-200 dark:bg-[#2a2f3a] text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d]'
                    }
                  `}
                >
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 dark:hover:bg-[#3a3f4a] transition"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-gray-200 dark:border-[#2a2f3a]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden absolute top-4 left-4 z-10 p-2 rounded-lg bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] text-gray-900 dark:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
