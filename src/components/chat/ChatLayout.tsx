// src/components/chat/ChatLayout.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Menu, Plus, X, Home, LogIn, ChevronDown, Share2, NotebookPen, BarChart3, Crown, ShieldCheck } from "lucide-react";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChatPlanValidator, CHAT_PLAN_LIMITS } from "@/lib/chatPlanLimits";
import { normalizePlanType } from "@/lib/planAccess";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
  conversations: initialConversations = [],
  loadingConversations: initialLoading = false,
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
  const [conversations, setConversations] = React.useState(initialConversations);
  const [loadingConversations, setLoadingConversations] = React.useState(initialLoading);
  const { user, plan, setPlan } = useUser();
  const { data: session } = useSession();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const isAuthenticated = Boolean(session);
  const requestAuth = React.useCallback(() => {
    // Navigate to the dedicated login flow to avoid silent failures when NextAuth cannot launch
    router.push("/login");
  }, [router]);
  const email = session?.user?.email || "";
  const userDisplayName = (user?.name?.trim?.() || session?.user?.name?.trim?.() || (email ? email.split("@")[0] : "Trader")) as string;
  const isAdmin = React.useMemo(() => user?.email?.toLowerCase() === "abdulmuizproject@gmail.com", [user?.email]);
  const planDisplay = React.useMemo(() => (plan || "starter").toUpperCase(), [plan]);
  const activeConversation = React.useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  }, [activeConversationId, conversations]);
  const requireActiveConversation = React.useCallback(() => {
    if (!activeConversationId || !activeConversation) {
      alert("Please select a conversation first.");
      return false;
    }
    return true;
  }, [activeConversationId, activeConversation]);
  const handleShareActiveConversation = React.useCallback(() => {
    if (!requireActiveConversation()) return;
    if (activeConversationId) {
      onExportConversation?.(activeConversationId);
    }
  }, [requireActiveConversation, activeConversationId, onExportConversation]);
  const renameActiveConversation = React.useCallback((newTitle: string) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversationId ? { ...conversation, title: newTitle } : conversation,
      ),
    );
    onRenameConversation?.(activeConversationId, newTitle);
  }, [activeConversationId, onRenameConversation]);
  const promptRenameActiveConversation = React.useCallback(() => {
    if (!requireActiveConversation()) return;
    const proposed = prompt("Rename conversation", activeConversation?.title ?? "Conversation");
    const trimmed = proposed?.trim();
    if (trimmed) {
      renameActiveConversation(trimmed);
    }
  }, [requireActiveConversation, activeConversation?.title, renameActiveConversation]);
  const handleShowPlanInfo = React.useCallback(() => {
    alert(`Current plan: ${planDisplay}`);
  }, [planDisplay]);
  const handleUpgradePlanNavigation = React.useCallback(() => {
    router.push("/dashboard/billing");
  }, [router]);
  const handleAdminEliteUpgrade = React.useCallback(async () => {
    if (!isAdmin) {
      alert("Only administrators can upgrade to the Elite plan.");
      return;
    }
    await setPlan("elite");
    alert("Admin plan upgraded to Elite.");
  }, [isAdmin, setPlan]);

  // Fetch conversations from Supabase
  React.useEffect(() => {
    if (session?.user?.id) {
      setLoadingConversations(true);
      supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error('Error fetching conversations:', error);
          else setConversations(data || []);
          setLoadingConversations(false);
        });
    }
  }, [session?.user?.id, supabase]);
  const authButtonLabel = isAuthenticated ? "Dashboard" : "Login";
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

  const handleCreateConversationWithMode = async (mode: string) => {
    if (!isAuthenticated) {
      requestAuth();
      return;
    }

    // Initialize plan validator with current user plan
    const normalizedPlan = normalizePlanType(plan);
    const validator = new ChatPlanValidator(normalizedPlan);

    // Check mode access based on plan
    const modeCheck = validator.canAccessMode(mode);
    if (!modeCheck.allowed) {
      alert(modeCheck.message || `Your ${normalizedPlan} plan doesn't support ${mode} mode.`);
      return;
    }

    // Check conversation limit
    const convCheck = validator.canCreateConversation(conversations.length);
    if (!convCheck.allowed) {
      alert(convCheck.message || 'You have reached the maximum number of conversations for your plan.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: session?.user?.id,
          title: `New ${mode.charAt(0).toUpperCase() + mode.slice(1)} Conversation`,
          messages: [],
          mode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      onCreateConversation?.();
      closeMobileSidebar();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleCreateConversation = async () => {
    if (!isAuthenticated) {
      requestAuth();
      return;
    }

    // Initialize plan validator with current user plan
    const normalizedPlan = normalizePlanType(plan);
    const validator = new ChatPlanValidator(normalizedPlan);

    // Check conversation limit
    const convCheck = validator.canCreateConversation(conversations.length);
    if (!convCheck.allowed) {
      alert(convCheck.message || 'You have reached the maximum number of conversations for your plan.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: session?.user?.id,
          title: 'New Conversation',
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      onCreateConversation?.();
      closeMobileSidebar();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
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
              <Image
                src="/TRADIA-LOGO.png"
                alt="Tradia logo"
                width={36}
                height={36}
                className="h-9 w-auto select-none"
                priority
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-10 rounded-xl bg-[#1D9BF0] px-8 text-xs font-semibold text-[#FFFFFF] shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition hover:bg-[#15202B] hover:scale-105"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {secondaryLabel}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#15202B] border-[#15202B] text-[#FFFFFF]">
                <DropdownMenuItem onClick={() => handleCreateConversationWithMode('coach')} className="hover:bg-[#1D9BF0]">
                  Coach Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateConversationWithMode('mentor')} className="hover:bg-[#1D9BF0]">
                  Mentor Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateConversationWithMode('assistant')} className="hover:bg-[#1D9BF0]">
                  Assistant Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            userName={userDisplayName}
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
