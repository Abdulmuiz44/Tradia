"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Clock,
  Pin,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import TradiaAIChat, { TradiaAIChatHandle } from "@/components/ai/TradiaAIChat";
import { Conversation } from "@/types/chat";

interface ChatPageShellProps {
  displayName: string;
  displayEmail: string;
  userInitial: string;
  userPlan: string;
}

const formatRelativeTime = (date: Date) => {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes <= 0) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
};

const ChatPageShell: React.FC<ChatPageShellProps> = ({
  displayName,
  displayEmail,
  userInitial,
  userPlan,
}) => {
  const chatRef = useRef<TradiaAIChatHandle>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);

  const handleNewChat = useCallback(async () => {
    if (chatRef.current?.createConversation) {
      await chatRef.current.createConversation();
    }
  }, []);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (chatRef.current?.selectConversation) {
      await chatRef.current.selectConversation(conversationId);
    }
  }, []);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (!term) return true;
      return conversation.title.toLowerCase().includes(term);
    });
  }, [conversations, searchTerm]);

  const pinned = useMemo(
    () => filteredConversations.filter((conversation) => conversation.pinned),
    [filteredConversations]
  );

  const recent = useMemo(
    () => filteredConversations.filter((conversation) => !conversation.pinned),
    [filteredConversations]
  );

  const handleThemeToggle = useCallback(() => {
    try {
      const root = document.documentElement;
      const isDark = root.classList.contains("dark");
      if (isDark) {
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
      }
    } catch (error) {
      console.error("Failed to toggle theme", error);
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50/80 text-slate-700 dark:bg-[#0f1319] dark:text-slate-100">
      <aside
        className="hidden h-full shrink-0 flex-col border-r border-slate-200 bg-white/85 backdrop-blur dark:border-[#1f2937] dark:bg-[#0f1319]/75 md:flex"
        style={{ width: "clamp(260px, 20vw, 320px)" }}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-[#1f2937]">
          <a
            href="/"
            aria-label="Home"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1f2937]"
          >
            <Image
              src="/Tradia-logo-ONLY.png"
              alt="Tradia logo"
              width={24}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </a>
          <div className="leading-tight">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Tradia AI
            </p>
            <p className="text-base font-light text-slate-700 dark:text-slate-200">Chat workspace</p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>

          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-500 shadow-sm dark:border-[#1f2937] dark:bg-[#141c2b] dark:text-slate-300">
            <Search className="h-4 w-4" />
            <input
              type="search"
              placeholder="Search conversations"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-transparent text-sm font-light text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </label>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-6">
          <div className="px-3 text-xs font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            Conversations
          </div>

          {isLoadingSidebar && (
            <div className="px-3 py-4 text-xs font-medium text-slate-400 dark:text-slate-500">
              Loading conversations...
            </div>
          )}

          {pinned.length > 0 && (
            <div className="mt-4">
              <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amber-500">
                Pinned
              </p>
              <ul className="mt-2 space-y-1">
                {pinned.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`group flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition ${conversation.id === activeConversationId
                          ? "bg-slate-900 text-white shadow"
                          : "hover:bg-slate-100/70 dark:hover:bg-[#1b2436]"
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <Pin className="h-3.5 w-3.5" />
                          Pinned
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 transition group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
                        {conversation.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
              Recent
            </p>
            <ul className="mt-2 space-y-1">
              {recent.length === 0 && !isLoadingSidebar ? (
                <li className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                  No conversations yet.
                </li>
              ) : (
                recent.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`group flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition ${conversation.id === activeConversationId
                          ? "bg-slate-900 text-white shadow"
                          : "hover:bg-slate-100/70 dark:hover:bg-[#1b2436]"
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 transition group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
                        {conversation.title}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </nav>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-[#1f2937]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-medium text-white">
              {userInitial}
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-700 dark:text-slate-200">{displayName}</p>
              <p className="truncate text-xs font-light text-slate-400 dark:text-slate-500">{displayEmail}</p>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-[#1f2937] dark:hover:text-slate-200"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-xs text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-200">
              {userPlan} Plan
            </div>
            <p className="mt-2 font-light leading-relaxed">
              Enjoy premium analytics, chart uploads, and priority insights.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-5 py-4 backdrop-blur dark:border-[#1f2937] dark:bg-[#0f1319]/80">
          <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-[0.3em]">Trading Copilot</span>
            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100">Ready when you are.</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800 dark:border-[#1f2937] dark:bg-[#141c2b] dark:text-slate-300 dark:hover:border-slate-500"
            >
              <Sun className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden bg-white dark:bg-[#0f1319]">
          <TradiaAIChat
            ref={chatRef}
            className="h-full w-full"
            activeConversationId={activeConversationId}
            onActiveConversationChange={setActiveConversationId}
            onConversationsChange={setConversations}
            onLoadingChange={setIsLoadingSidebar}
          />
        </main>
      </div>
    </div>
  );
};

export default ChatPageShell;
