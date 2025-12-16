"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ConversationsSidebar } from "@/components/chat/ConversationsSidebar";
import type { Conversation } from "@/types/chat";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      const convList = Array.isArray(data) ? data : data.conversations || [];
      
      // Transform the conversation data to ensure proper format
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

  // Load conversations on mount
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

      // Add to conversations list
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
      
      // Navigate to new conversation
      router.push(`/dashboard/trades/chat?id=${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [router]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      setSidebarOpen(false);
      router.push(`/dashboard/trades/chat?id=${id}`);
    },
    [router]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (!confirm("Delete this conversation? This action cannot be undone.")) return;

      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete conversation");
        
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

  const handleRenameConversation = useCallback(
    async (id: string, newTitle: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!res.ok) throw new Error("Failed to update conversation");
        const { conversation } = await res.json();

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === id ? { ...conv, title: conversation.title } : conv
          )
        );
      } catch (error) {
        console.error("Failed to rename conversation:", error);
      }
    },
    []
  );

  const handlePinConversation = useCallback(
    async (id: string) => {
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
    },
    [conversations]
  );

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-[#061226]">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0D0D0D] overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Chat content */}
         <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
