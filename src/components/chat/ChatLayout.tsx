// src/components/chat/ChatLayout.tsx
"use client";

import React from "react";
import { Menu, Plus, X, Home, LogIn } from "lucide-react";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { ChatArea } from "./ChatArea";
import { TradePickerPanel } from "./TradePickerPanel";
import { cn } from "@/lib/utils";
import { AssistantMode, Conversation, Message } from "@/types/chat";
import { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";


interface ChatLayoutProps {
  className?: string;
  isGuest?: boolean;
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
  assistantMode?: AssistantMode;
  onAssistantModeChange?: (mode: AssistantMode) => void;
  isProcessing?: boolean;
  onStopGeneration?: () => void;
  // Trade Picker
  trades?: Trade[];
  selectedTradeIds?: string[];
  onTradeSelect?: (tradeIds: string[]) => void;
  summary?: any;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  className,
  isGuest = false,
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
  assistantMode,
  onAssistantModeChange,
  isProcessing,
  onStopGeneration,
  trades = [],
  selectedTradeIds = [],
  onTradeSelect,
  summary,
}) => {
  const showTradePanel = trades.length > 0;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const { user, plan } = useUser();
  const { data: session } = useSession();
  const router = useRouter();
  const isAuthenticated = Boolean(session);
  const requestAuth = React.useCallback(() => {
    signIn(undefined, { callbackUrl: "/chat" }).catch(() => {});
  }, []);
  const authButtonLabel = React.useMemo(() => {
    if (isAuthenticated) {
      return "Dashboard";
    }
    return Math.random() < 0.5 ? "Login" : "Sign In";
  }, [isAuthenticated]);
  const PrimaryIcon = isAuthenticated ? Home : LogIn;
  const handlePrimaryAction = React.useCallback(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }
    requestAuth();
  }, [isAuthenticated, router, requestAuth]);
  const secondaryLabel = isAuthenticated ? "New chat" : "Start chatting";



  const openMobileSidebar = () => {
    if (hideSidebar) return;
    setIsMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  const handleCreateConversation = () => {
    if (!isAuthenticated) {
      requestAuth();
      return;
    }
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
      "relative flex h-screen w-full flex-col overflow-hidden bg-[#050b18] text-white",
      className,
    )}
    >
      <header className="sticky top-0 z-30 h-[68px] border-b border-indigo-500/40 bg-[#050b18]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {!hideSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openMobileSidebar}
                className="h-10 w-10 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-white transition hover:border-indigo-400 hover:bg-indigo-500/20 md:hidden"
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
                <p className="text-sm font-semibold tracking-tight text-white">Tradia AI Mentor</p>
                <p className="text-xs text-indigo-200/80">Personalized insights from your trading data</p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button
            variant="ghost"
            size="sm"
            onClick={handlePrimaryAction}
            className="h-10 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-6 text-xs font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
            >
              <PrimaryIcon className="mr-2 h-4 w-4" />
              {authButtonLabel}
            </Button>
            <Button
            size="sm"
            onClick={handleCreateConversation}
            className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-8 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-indigo-400/40"
            >
              <Plus className="mr-2 h-4 w-4" />
              {secondaryLabel}
            </Button>
          </div>

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrimaryAction}
              className="h-9 w-9 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-0 text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
              title={authButtonLabel}
            >
              <PrimaryIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCreateConversation}
              className="h-9 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.03]"
              title={secondaryLabel}
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
              "absolute inset-0 bg-[#050b18]/90 transition-opacity",
              isMobileSidebarOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={closeMobileSidebar}
          />
          <div
          className={cn(
          "relative flex h-full w-72 max-w-full flex-col border-r border-indigo-500/40 bg-[#050b18] transition-transform duration-300 ease-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          >
            <div className="flex items-center justify-between border-b border-[#15202B] px-4 py-4">
              <p className="text-sm font-semibold text-white">Conversations</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileSidebar}
                className="h-9 w-9 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
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
          <aside className="hidden w-72 flex-none border-r border-indigo-500/40 bg-[#050b18] md:flex">
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

        <main className="relative flex flex-1 overflow-hidden bg-[#050b18] text-white">
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
            assistantMode={assistantMode}
            onAssistantModeChange={onAssistantModeChange}
            isProcessing={isProcessing}
            onStopGeneration={onStopGeneration}
            isGuest={isGuest}
            onRequestAuth={requestAuth}
          />
        </main>

        {showTradePanel && (
          <aside className="hidden w-80 flex-none border-l border-indigo-500/40 bg-[#050b18] xl:flex">
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


    </div>
  );
};
