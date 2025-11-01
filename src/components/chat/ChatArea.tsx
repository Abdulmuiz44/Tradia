// src/components/chat/ChatArea.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Paperclip, Send } from "lucide-react";
import { Message } from "@/types/chat";
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white text-slate-900 dark:bg-transparent dark:text-white">
      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
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

      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {selectedTradeIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-50 px-4 py-2 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
              <Paperclip className="h-4 w-4" />
              <span>
                {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? "s" : ""} attached
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTradeSelect?.([])}
                className="h-6 rounded-full px-3 text-xs text-sky-700 hover:bg-sky-100 dark:text-white/70 dark:hover:bg-white/10"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAttachTrades}
                className="h-6 rounded-full border-sky-500/40 bg-white px-3 text-xs text-sky-700 hover:bg-sky-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Attach to next prompt
              </Button>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-3 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAttachTrades}
                className="h-10 w-10 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                title="Attach trades"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

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
                placeholder="Ask about your trading performance..."
                className="flex-1 min-h-[44px] resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                rows={1}
                style={{ height: "auto", minHeight: "44px" }}
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onVoiceInput}
                  className={`h-10 w-10 rounded-full p-0 transition-colors ${
                    isListening
                      ? "text-rose-500 hover:text-rose-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white/80"
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Select value={model} onValueChange={onModelChange}>
                  <SelectTrigger className="h-8 w-[110px] rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-0 dark:border-0 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    side="top"
                    className="border border-slate-200 bg-white text-slate-800 shadow-[0_12px_40px_rgba(15,23,42,0.2)] backdrop-blur dark:border-white/10 dark:bg-[#040A18]/95 dark:text-white"
                  >
                    <SelectItem
                      value="gpt-4o-mini"
                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-100 focus:text-slate-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
                    >
                      GPT-4o Mini
                    </SelectItem>
                    <SelectItem
                      value="gpt-4"
                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-100 focus:text-slate-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
                    >
                      GPT-4
                    </SelectItem>
                    <SelectItem
                      value="gpt-3.5-turbo"
                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-100 focus:text-slate-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
                    >
                      GPT-3.5 Turbo
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="h-10 w-10 rounded-full bg-sky-500 p-0 text-white shadow-[0_8px_24px_rgba(56,189,248,0.35)] transition hover:bg-sky-400 hover:shadow-[0_8px_24px_rgba(56,189,248,0.5)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/40"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-xs text-white/50">Shift + Enter for new line</span>
              <span className="text-xs text-white/50">{inputMessage.length} characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
