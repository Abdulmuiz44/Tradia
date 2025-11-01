// src/components/chat/ChatArea.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Mic,
  MicOff,
  NotebookPen,
  Plus,
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
import { AssistantMode, Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

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
  isGuest?: boolean;
  onRequestAuth?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversationTitle = "New Conversation",
  messages = [],
  model = "gpt-4o-mini",
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
}) => {
  const [inputMessage, setInputMessage] = useState(voiceTranscript);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
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
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="relative px-4 pb-10 pt-6">
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
            <div className="flex flex-col gap-3 rounded-3xl border border-indigo-500/40 bg-[#050b18] px-4 py-3 shadow-[0_18px_38px_rgba(5,11,24,0.6)]">
              <div className="flex items-start gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 rounded-full border border-indigo-500/40 bg-transparent p-0 text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
                      title="Customize Tradia AI"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60 border border-indigo-500/40 bg-[#050b18] p-2 text-sm text-white shadow-[0_20px_48px_rgba(5,11,24,0.65)]">
                    <DropdownMenuGroup>
                      <div className="px-2 pb-2 text-[11px] uppercase tracking-wide text-white/60">
                        Assistant mode
                      </div>
                      <DropdownMenuItem
                        className={`flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white ${assistantMode === "coach" ? "bg-indigo-500/20 text-white" : ""}`}
                        onSelect={() => onAssistantModeChange?.("coach")}
                      >
                        <Sparkles className="h-4 w-4" />
                        Coach mode
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white ${assistantMode === "mentor" ? "bg-indigo-500/20 text-white" : ""}`}
                        onSelect={() => onAssistantModeChange?.("mentor")}
                      >
                        <GraduationCap className="h-4 w-4" />
                        Mentor mode
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white ${assistantMode === "analysis" ? "bg-indigo-500/20 text-white" : ""}`}
                        onSelect={() => onAssistantModeChange?.("analysis")}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Trade analysis
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={`flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white ${assistantMode === "journal" ? "bg-indigo-500/20 text-white" : ""}`}
                        onSelect={() => onAssistantModeChange?.("journal")}
                      >
                        <NotebookPen className="h-4 w-4" />
                        Trade journal
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-2 bg-indigo-500/30" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white"
                      onSelect={handleAttachTrades}
                    >
                      <Upload className="h-4 w-4" />
                      Attach selected trades
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 rounded-lg text-sm text-white/90 focus:bg-indigo-500/15 focus:text-white"
                      onSelect={() => onTradeSelect?.([])}
                    >
                      <X className="h-4 w-4" />
                      Clear attached trades
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(event) => {
                    setInputMessage(event.target.value);
                    const target = event.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 180) + "px";
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
                  placeholder="Ask Tradia AI"
                  className="flex-1 min-h-[44px] resize-none bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none"
                  rows={1}
                  style={{ height: "auto", minHeight: "44px" }}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onVoiceInput}
                    className={`h-10 w-10 rounded-full border border-indigo-500/40 bg-transparent p-0 transition-colors ${
                      isListening
                        ? "text-white hover:text-white/80"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <div className="hidden flex-col pr-2 text-right text-[10px] uppercase tracking-[0.18em] text-white/80 sm:flex">
                    <span>{currentModeLabel}</span>
                    <span className="text-white/60">{modeDescription}</span>
                  </div>

                  <Select value={model} onValueChange={onModelChange}>
                    <SelectTrigger className="h-9 min-w-[150px] rounded-full border border-indigo-500/40 bg-[#050b18]/80 px-4 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-indigo-300 hover:bg-indigo-500/10 focus:outline-none focus:ring-0">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent
                      side="top"
                      className="border border-indigo-500/40 bg-[#050b18] text-white shadow-[0_20px_48px_rgba(5,11,24,0.65)]"
                    >
                      <SelectItem
                        value="gpt-4o-mini"
                        className="rounded-lg text-sm text-white focus:bg-indigo-500/15"
                      >
                        GPT-4o Mini
                      </SelectItem>
                      <SelectItem
                        value="gpt-4"
                        className="rounded-lg text-sm text-white focus:bg-indigo-500/15"
                      >
                        GPT-4
                      </SelectItem>
                      <SelectItem
                        value="gpt-3.5-turbo"
                        className="rounded-lg text-sm text-white focus:bg-indigo-500/15"
                      >
                        GPT-3.5 Turbo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={sendDisabled}
                  className="h-10 w-10 self-end rounded-full border border-transparent bg-transparent p-0 text-white transition hover:text-indigo-200 disabled:cursor-not-allowed disabled:text-white/40 sm:self-auto"
                >
                  {showStopIcon ? <Square className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-xs text-white/60">Shift + Enter for new line</span>
            <span className="text-xs text-white/60">{inputMessage.length} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
