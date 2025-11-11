// src/components/chat/ChatArea.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUp,
  BarChart3,
  Bot,
  Crown,
  Mic,
  MicOff,
  NotebookPen,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  GraduationCap,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AssistantMode, Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useUser } from "@/context/UserContext";



interface ChatAreaProps {
  conversationTitle?: string;
  messages?: Message[];
  model?: string;
  onModelChange?: (model: string) => void;
  onSendMessage?: (content: string) => void;
  onAttachTrades?: (tradeIds: string[]) => void;
  selectedTradeIds?: string[];
  onTradeSelect?: (tradeIds: string[]) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCopyMessage?: (content: string) => void;
  onRateMessage?: (messageId: string, rating: "up" | "down") => void;
  onPinMessage?: (messageId: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onExportConversation?: () => void;
  onVoiceInput?: () => void;
  isListening?: boolean;
  voiceTranscript?: string;
  assistantMode?: AssistantMode;
  onAssistantModeChange?: (mode: AssistantMode) => void;
  isProcessing?: boolean;
  onStopGeneration?: () => void;
  conversationId?: string;
  onRenameCurrentConversation?: (newTitle: string) => void;
  isGuest?: boolean;
  onRequestAuth?: () => void;
  userName?: string;
}

export const ChatArea = ({
conversationTitle = "New Conversation",
messages = [],
model = "openai:gpt-4o-mini",
onModelChange,
onSendMessage,
onAttachTrades,
selectedTradeIds = [],
onTradeSelect,
onRegenerateMessage,
onEditMessage,
onDeleteMessage,
onCopyMessage,
onRateMessage,
onPinMessage,
onRetryMessage,
onExportConversation,
onVoiceInput,
isListening = false,
voiceTranscript = "",
assistantMode = "coach",
onAssistantModeChange,
isProcessing = false,
onStopGeneration,
conversationId,
onRenameCurrentConversation,
isGuest,
onRequestAuth,
userName,
}: ChatAreaProps) => {
  const [inputMessage, setInputMessage] = useState(voiceTranscript);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { user, plan, setPlan } = useUser();
  const isAdmin = useMemo(() => user?.email?.toLowerCase() === "abdulmuizproject@gmail.com", [user?.email]);
  const planLabel = useMemo(() => (plan ? plan.toUpperCase() : "FREE"), [plan]);
  const recognitionRef = useRef<any>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Only scroll to bottom after initial load is complete
  useEffect(() => {
    if (!initialLoadComplete && messages.length > 0) {
      setInitialLoadComplete(true);
      return;
    }
    if (initialLoadComplete && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, initialLoadComplete]);

  useEffect(() => {
    if (voiceTranscript) {
      setInputMessage(voiceTranscript);
      textareaRef.current?.focus();
    }
  }, [voiceTranscript]);

  const handleSendMessage = () => {
    if (isProcessing) {
      onStopGeneration?.();
      return;
    }
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    onSendMessage?.(trimmed);
    setInputMessage("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachTrades = () => {
    if (selectedTradeIds.length > 0) {
      onAttachTrades?.(selectedTradeIds);
    }
  };

  const ensureActiveConversation = () => {
    if (!conversationId) {
      alert("Select a conversation first to use this action.");
      return false;
    }
    return true;
  };

  const handleShareConversation = async () => {
    if (!ensureActiveConversation()) return;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: conversationTitle,
          text: `Here's my Tradia AI insight: ${conversationTitle}`,
        });
        return;
      }
    } catch (error) {
      console.warn("Share dialog dismissed or unsupported:", error);
    }
    onExportConversation?.();
  };

  const handleRenameConversation = () => {
    if (!ensureActiveConversation()) return;
    if (!onRenameCurrentConversation) {
      console.warn("Rename handler not available");
      return;
    }
    const proposed = prompt("Rename conversation", conversationTitle);
    const trimmed = proposed?.trim();
    if (trimmed) {
      onRenameCurrentConversation(trimmed);
    }
  };

  const handleViewPlan = () => {
    alert(`Current plan: ${planLabel}`);
  };

  const handleUpgradePlan = () => {
    router.push("/dashboard/billing");
  };

  const handleUpgradeAdminPlan = async () => {
    if (!isAdmin) {
      alert("Only administrators can elevate to the Elite plan.");
      return;
    }
    await setPlan("elite");
    alert("Admin plan upgraded to Elite.");
  };

  const startVoiceRecognition = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(prev => prev + transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current.onend = () => {
      // Auto-send if configured, or just append
    };

    recognitionRef.current.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const currentModeLabel = useMemo(() => {
    switch (assistantMode) {
      case "mentor":
        return "Mentor";
      case "analysis":
        return "Trade Analysis";
      case "journal":
        return "Trade Journal";
      case "grok":
        return "Grok";
      default:
        return "Coach";
    }
  }, [assistantMode]);

  const modeDescription = useMemo(() => {
    switch (assistantMode) {
      case "mentor":
        return "Guides strategic decisions";
      case "analysis":
        return "Dissects trades and metrics";
      case "journal":
        return "Reflects on trading habits";
      case "grok":
        return "Adds wit to market insight";
      default:
        return "Keeps you accountable";
    }
  }, [assistantMode]);

  const sendDisabled = !inputMessage.trim() && !isProcessing;
  const showStopIcon = isProcessing;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12 pb-8">
          {messages.map((message, index) => (
          <MessageBubble
          key={message.id}
          message={message}
          onEdit={(newContent) => onEditMessage?.(message.id, newContent)}
          onDelete={() => onDeleteMessage?.(message.id)}
          onRegenerate={() => onRegenerateMessage?.(message.id)}
          onCopy={() => onCopyMessage?.(message.content)}
          onRate={(rating) => onRateMessage?.(message.id, rating)}
          onPin={() => onPinMessage?.(message.id)}
          onRetry={() => onRetryMessage?.(message.id)}
          isLast={index === messages.length - 1}
          />
          ))}
          {isProcessing && <TypingIndicator userName={userName} />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-20 flex-shrink-0 bg-[#050b18] px-4 pb-6 pt-4 border-t border-indigo-500/20">
        
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {selectedTradeIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-500/40 bg-[#050b18] px-4 py-3 text-sm text-white shadow-[0_12px_32px_rgba(5,11,24,0.55)]">
              <Upload className="h-4 w-4" />
              <span>
                {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? "s" : ""} attached
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTradeSelect?.([])}
                className="h-6 rounded-full border border-indigo-500/40 bg-[#050b18] px-3 text-xs text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAttachTrades}
                className="h-6 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 text-xs font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
              >
                Attach to next prompt
              </Button>
            </div>
          )}

          <div className="relative">
            <div className="rounded-3xl border border-indigo-500/30 bg-[#050b18] px-4 py-4 shadow-[0_12px_32px_rgba(5,11,24,0.6)]">
              <div className="flex w-full items-end gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11 rounded-full border border-indigo-500/40 bg-transparent p-0 text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
                      title="Customize Tradia AI"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 border border-indigo-500/40 bg-[#050b18] p-3 text-sm font-semibold text-white shadow-[0_24px_48px_rgba(5,11,24,0.65)]">
                    <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      Conversation
                    </div>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={handleShareConversation}
                    >
                      <Share2 className="h-4 w-4" />
                      Share conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={handleRenameConversation}
                    >
                      <NotebookPen className="h-4 w-4" />
                      Rename conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/60 focus:bg-transparent focus:text-white/70"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Plan • {planLabel}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={handleUpgradePlan}
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade plan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={handleUpgradeAdminPlan}
                    >
                      <ShieldCheck className={`h-4 w-4 ${isAdmin ? "text-emerald-300" : "text-white/70"}`} />
                      Admin: set Elite
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-3 bg-indigo-500/30" />
                    <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      Assistant mode
                    </div>
                    <DropdownMenuItem
                      className={`flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white ${assistantMode === "coach" ? "bg-indigo-500/20 text-white" : ""}`}
                      onSelect={() => onAssistantModeChange?.("coach")}
                    >
                      <Sparkles className="h-4 w-4" />
                      Coach mode
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={`flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white ${assistantMode === "mentor" ? "bg-indigo-500/20 text-white" : ""}`}
                      onSelect={() => onAssistantModeChange?.("mentor")}
                    >
                      <GraduationCap className="h-4 w-4" />
                      Mentor mode
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={`flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white ${assistantMode === "assistant" ? "bg-indigo-500/20 text-white" : ""}`}
                      onSelect={() => onAssistantModeChange?.("assistant")}
                    >
                      <Bot className="h-4 w-4" />
                      Assistant mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-3 bg-indigo-500/30" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={handleAttachTrades}
                    >
                      <Upload className="h-4 w-4" />
                      Attach selected trades
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm font-semibold text-white/90 focus:bg-indigo-500/20 focus:text-white"
                      onSelect={() => onTradeSelect?.([])}
                    >
                      <X className="h-4 w-4" />
                      Clear attached trades
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(event) => {
                      setInputMessage(event.target.value);
                      const target = event.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 220) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    onDrop={(event) => {
                      event.preventDefault();
                      const data = event.dataTransfer.getData("application/json");
                      if (!data) return;
                      try {
                        const trade = JSON.parse(data);
                        if (trade?.id) {
                          const ids = new Set(selectedTradeIds);
                          ids.add(trade.id);
                          onTradeSelect?.(Array.from(ids));
                        }
                      } catch (error) {
                        console.error("Failed to parse dropped trade:", error);
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    placeholder={`${currentModeLabel}: Ask Tradia AI${userName ? ", " + userName : ""}`}
                    className="w-full min-h-[68px] resize-none bg-transparent px-4 py-3 text-sm text-[#FFFFFF] placeholder:text-[#71767B] focus:outline-none"
                    rows={1}
                    style={{ height: "auto", minHeight: "68px" }}
                  />
                  <div className="mt-2 hidden text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:block">
                    <span>{currentModeLabel}</span>
                    <span className="ml-2 text-white/60">{modeDescription}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                    className={`h-11 w-11 rounded-full border border-indigo-500/30 bg-transparent p-0 transition-colors ${
                      isListening
                        ? "text-[#FFFFFF] hover:text-[#71767B]"
                        : "text-[#71767B] hover:text-[#FFFFFF]"
                    }`}
                    title={isListening ? "Stop voice input" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-11 w-11 rounded-full border border-indigo-500/30 bg-transparent p-0 text-[#FFFFFF] transition hover:bg-indigo-500/10 ${isProcessing ? 'animate-pulse' : ''}`}
                        title="Select Model"
                      >
                        <Bot className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border border-indigo-500/40 bg-[#050b18] text-[#FFFFFF]">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-white">Select AI Model</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-2 text-sm font-semibold">
                        <Button
                          variant={model === 'openai:gpt-4o-mini' ? 'default' : 'ghost'}
                          onClick={() => { onModelChange?.('openai:gpt-4o-mini'); setModelDialogOpen(false); }}
                          className="justify-start"
                        >
                          OpenAI · GPT-4o mini (fast)
                        </Button>
                        <Button
                          variant={model === 'openai:gpt-4o' ? 'default' : 'ghost'}
                          onClick={() => { onModelChange?.('openai:gpt-4o'); setModelDialogOpen(false); }}
                          className="justify-start"
                        >
                          OpenAI · GPT-4o (balanced)
                        </Button>
                        <Button
                          variant={model === 'openai:gpt-4.1-mini' ? 'default' : 'ghost'}
                          onClick={() => { onModelChange?.('openai:gpt-4.1-mini'); setModelDialogOpen(false); }}
                          className="justify-start"
                        >
                          OpenAI · GPT-4.1 mini (analysis)
                        </Button>
                        <Button
                          variant={model === 'xai:grok-beta' ? 'default' : 'ghost'}
                          onClick={() => { onModelChange?.('xai:grok-beta'); setModelDialogOpen(false); }}
                          className="justify-start"
                        >
                          xAI · Grok Beta (creative)
                        </Button>
                        <Button
                          variant={model === 'gateway:meta-llama-3-70b-instruct' ? 'default' : 'ghost'}
                          onClick={() => { onModelChange?.('gateway:meta-llama-3-70b-instruct'); setModelDialogOpen(false); }}
                          className="justify-start"
                        >
                          Vercel Gateway · Llama 3 70B (structured)
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isProcessing ? onStopGeneration : handleSendMessage}
                    disabled={sendDisabled}
                    title={isProcessing ? "Stop generation" : "Send message"}
                    aria-label={isProcessing ? "Stop generation" : "Send message"}
                    className={`h-11 w-11 rounded-2xl border p-0 transition-all duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-50 ${
                      isProcessing
                        ? "border-red-400/60 bg-red-500/20 text-red-100 hover:border-red-300 hover:bg-red-500/30"
                        : "border-indigo-500/40 bg-indigo-500/10 text-white hover:border-indigo-300 hover:bg-indigo-500/20"
                    }`}
                  >
                    {showStopIcon ? <Square className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Shift + Enter for new line</span>
                <span>{inputMessage.length} characters</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
