// src/components/chat/ChatLayout.tsx
"use client";

import React from "react";
import { Menu, Plus, X, Home } from "lucide-react";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { ChatArea } from "./ChatArea";
import { TradePickerPanel } from "./TradePickerPanel";
import { cn } from "@/lib/utils";
import { Conversation, Message } from "@/types/chat";
import { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatLayoutProps {
  className?: string;
  hideSidebar?: boolean;
  // Conversations
  conversations?: Conversation[];
  loadingConversations?: boolean;
  activeConversationId?: string;
  onCreateConversation?: () => void;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onPinConversation?: (id: string) => void;
  onExportConversation?: (id: string) => void;
  // Chat Area
  conversationTitle?: string;
  messages?: Message[];
  model?: string;
  onModelChange?: (model: string) => void;
  onSendMessage?: (content: string) => void;
  onAttachTrades?: (tradeIds: string[]) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCopyMessage?: (content: string) => void;
  onRateMessage?: (messageId: string, rating: 'up' | 'down') => void;
  onPinMessage?: (messageId: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onExportChat?: () => void;
  onVoiceInput?: () => void;
  isListening?: boolean;
  voiceTranscript?: string;
  // Trade Picker
  trades?: Trade[];
  selectedTradeIds?: string[];
  onTradeSelect?: (tradeIds: string[]) => void;
  summary?: any;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  className,
  hideSidebar = false,
  conversations = [],
  loadingConversations = false,
  activeConversationId,
  onCreateConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
  onExportConversation,
  conversationTitle,
  messages = [],
  model,
  onModelChange,
  onSendMessage,
  onAttachTrades,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onCopyMessage,
  onRateMessage,
  onPinMessage,
  onRetryMessage,
  onExportChat,
  onVoiceInput,
  isListening = false,
  voiceTranscript,
  trades = [],
  selectedTradeIds = [],
  onTradeSelect,
  summary,
}) => {
  const showTradePanel = trades.length > 0;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const { user, plan } = useUser();
  const { data: session } = useSession();

  const displayName = React.useMemo(() => {
    return (
      user?.name ||
      session?.user?.name ||
      user?.email?.split("@")[0] ||
      session?.user?.email?.split("@")[0] ||
      "Trader"
    );
  }, [session?.user?.email, session?.user?.name, user?.email, user?.name]);

  const displayEmail = React.useMemo(() => {
    return user?.email || session?.user?.email || "";
  }, [session?.user?.email, user?.email]);

  const planLabel = React.useMemo(() => {
    const inferred = plan || user?.plan || (session?.user as any)?.plan || "free";
    return String(inferred).toLowerCase();
  }, [plan, session?.user, user?.plan]);

  const avatarFallback = React.useMemo(() => displayName.charAt(0).toUpperCase(), [displayName]);

  const avatarImage = session?.user?.image
    ? session.user.image
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff&size=64`;

  const openMobileSidebar = () => {
    if (hideSidebar) return;
    setIsMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  const handleCreateConversation = () => {
    onCreateConversation?.();
    closeMobileSidebar();
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation?.(id);
    closeMobileSidebar();
  };

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col bg-white text-slate-900",
        "dark:bg-[#050b18] dark:text-white",
        "dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35)_0%,transparent_65%)]",
        className,
      )}
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-indigo-400/40 dark:bg-[#050b18]/95">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {!hideSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openMobileSidebar}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 md:hidden dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
                aria-label="Open conversations"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div className="flex items-center gap-3">
              <img
                src="/Tradia-logo-ONLY.png"
                alt="Tradia logo"
                className="h-9 w-auto select-none"
              />
              <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Tradia AI Assistant</p>
              <p className="text-xs text-slate-600 dark:text-indigo-100/80">Your AI Trading Performance Assistant</p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
          <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/dashboard'}
          className="h-9 rounded-full border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
          >
          <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
          size="sm"
          onClick={handleCreateConversation}
            className="h-9 rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-[1.02]"
          >
          <Plus className="mr-2 h-4 w-4" />
            New chat
            </Button>
          </div>

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100 p-0 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
              title="Dashboard"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCreateConversation}
              className="h-9 rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {!hideSidebar && (
        <div
          className={cn(
            "fixed inset-0 z-40 flex md:hidden",
            isMobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-black/60 transition-opacity",
              isMobileSidebarOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={closeMobileSidebar}
          />
          <div
          className={cn(
          "relative flex h-full w-72 max-w-full flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-transform duration-300 ease-out dark:border-indigo-400/40 dark:bg-[#050b18]/95",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-indigo-400/40">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Conversations</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileSidebar}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/20"
                aria-label="Close conversations"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationsSidebar
                conversations={conversations}
                loading={loadingConversations}
                activeConversationId={activeConversationId}
                onCreateConversation={handleCreateConversation}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={onDeleteConversation}
                onRenameConversation={onRenameConversation}
                onPinConversation={onPinConversation}
                onExportConversation={onExportConversation}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && (
          <aside className="hidden w-72 flex-none border-r border-slate-200 bg-slate-50/90 backdrop-blur md:flex dark:border-indigo-400/40 dark:bg-[#050b18]/90">
            <ConversationsSidebar
              conversations={conversations}
              loading={loadingConversations}
              activeConversationId={activeConversationId}
              onCreateConversation={handleCreateConversation}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onRenameConversation={onRenameConversation}
              onPinConversation={onPinConversation}
              onExportConversation={onExportConversation}
            />
          </aside>
        )}

        <main className="flex flex-1 overflow-hidden bg-white text-slate-900 dark:bg-transparent dark:text-white">
          <ChatArea
            conversationTitle={conversationTitle}
            messages={messages}
            model={model}
            onModelChange={onModelChange}
            onSendMessage={onSendMessage}
            onAttachTrades={onAttachTrades}
            selectedTradeIds={selectedTradeIds}
            onTradeSelect={onTradeSelect}
            onRegenerateMessage={onRegenerateMessage}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onCopyMessage={onCopyMessage}
            onRateMessage={onRateMessage}
            onPinMessage={onPinMessage}
            onRetryMessage={onRetryMessage}
            onExportConversation={onExportChat}
            onVoiceInput={onVoiceInput}
            isListening={isListening}
            voiceTranscript={voiceTranscript}
          />
        </main>

        {showTradePanel && (
          <aside className="hidden w-80 flex-none border-l border-slate-200 bg-slate-50/80 backdrop-blur xl:flex dark:border-white/10 dark:bg-[#050d1f]/70">
            <TradePickerPanel
              trades={trades}
              selectedTradeIds={selectedTradeIds}
              onTradeSelect={onTradeSelect}
              onAttachTrades={onAttachTrades}
              summary={summary}
            />
          </aside>
        )}
      </div>

      {!hideSidebar && (user || session?.user) && (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 hidden md:block">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_12px_40px_rgba(9,17,34,0.25)] backdrop-blur dark:border-white/10 dark:bg-[#050d1f]/90">
            <Avatar className="h-11 w-11 border border-slate-200 dark:border-white/10">
              <AvatarImage src={avatarImage} alt={displayName} />
              <AvatarFallback className="bg-[#2563eb] text-white">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
              {displayEmail && (
                <p className="truncate text-xs text-slate-600 dark:text-white/60">{displayEmail}</p>
              )}
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
              {planLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
