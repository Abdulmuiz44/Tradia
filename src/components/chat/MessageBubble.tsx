// src/components/chat/MessageBubble.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Copy,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Pin,
    Edit3,
    Trash2,
    Check,
    X,
    RefreshCw,
} from "lucide-react";
import { Message } from "@/types/chat";
import { Trade } from "@/types/trade";
import { getTradeDate } from '@/lib/trade-date-utils';

type ParsedSection =
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "spacer" };

const parseMessageContent = (content: string): ParsedSection[] => {
    const lines = content.split("\n");
    const sections: ParsedSection[] = [];
    let listBuffer: { ordered: boolean; items: string[] } | null = null;

    const commitList = () => {
        if (listBuffer && listBuffer.items.length > 0) {
            sections.push({ type: "list", ordered: listBuffer.ordered, items: [...listBuffer.items] });
        }
        listBuffer = null;
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
            commitList();
            sections.push({ type: "spacer" });
            return;
        }

        const headingMatch = line.match(/^\*\*(.+)\*\*$/);
        if (headingMatch) {
            commitList();
            sections.push({ type: "heading", text: headingMatch[1].trim() });
            return;
        }

        const bulletMatch = line.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
            if (!listBuffer || listBuffer.ordered) {
                commitList();
                listBuffer = { ordered: false, items: [] };
            }
            listBuffer.items.push(bulletMatch[1].trim());
            return;
        }

        const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
        if (orderedMatch) {
            if (!listBuffer || !listBuffer.ordered) {
                commitList();
                listBuffer = { ordered: true, items: [] };
            }
            listBuffer.items.push(orderedMatch[1].trim());
            return;
        }

        commitList();
        sections.push({ type: "paragraph", text: line });
    });

    commitList();

    return sections.filter((section, index, array) => {
        if (section.type !== "spacer") {
            return true;
        }
        const prev = array[index - 1];
        const next = array[index + 1];
        return Boolean(prev && prev.type !== "spacer") || Boolean(next && next.type !== "spacer");
    });
};

interface MessageBubbleProps {
    message: Message;
    onEdit?: (newContent: string) => void;
    onDelete?: () => void;
    onRegenerate?: () => void;
    onCopy?: () => void;
    onRate?: (rating: "up" | "down") => void;
    onPin?: () => void;
    onRetry?: () => void;
    isLast?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onEdit,
    onDelete,
    onRegenerate,
    onCopy,
    onRate,
    onPin,
    onRetry,
    isLast = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showActions, setShowActions] = useState(false);
    const parsedSections = useMemo(() => parseMessageContent(message.content), [message.content]);

    const isUser = message.type === "user";
    const isAssistant = message.type === "assistant";

    const bubbleClass = isUser
        ? "rounded-2xl border border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-r from-indigo-100 via-blue-100 to-purple-100 dark:from-indigo-500/40 dark:via-blue-500/40 dark:to-purple-500/40 px-5 py-4 text-gray-900 dark:text-white shadow-sm dark:shadow-[0_18px_42px_rgba(5,11,24,0.65)]"
        : "bg-transparent px-1 py-1 text-gray-900 dark:text-white shadow-none";

    const handleSaveEdit = () => {
        const trimmed = editContent.trim();
        if (trimmed && trimmed !== message.content) {
            onEdit?.(trimmed);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(message.content);
        setIsEditing(false);
    };

    const renderContent = () => {
        if (isEditing) {
            return (
                <div className="space-y-2">
                    <Textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        className="min-h-[120px] rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-white dark:bg-[#050b18] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/50 focus:border-indigo-400 dark:focus:border-indigo-300 focus:outline-none"
                        autoFocus
                    />
                    <div className="flex space-x-2">
                        <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Save
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="rounded-full border border-indigo-500/40 px-4 text-white/80 transition hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-white"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3 text-sm leading-6 text-white">
                {parsedSections.map((section, index) => {
                    if (section.type === "heading") {
                        return (
                            <h3 key={`heading-${index}`} className="text-base font-semibold text-white">
                                {section.text}
                            </h3>
                        );
                    }

                    if (section.type === "paragraph") {
                        return (
                            <p key={`paragraph-${index}`} className="text-white/90">
                                {section.text}
                            </p>
                        );
                    }

                    if (section.type === "list") {
                        const ListTag = section.ordered ? "ol" : "ul";
                        const listClass = section.ordered ? "list-decimal" : "list-disc";
                        return (
                            <ListTag
                                key={`list-${index}`}
                                className={`${listClass} space-y-2 pl-5 text-white/90 marker:text-white/60`}
                            >
                                {section.items.map((item, itemIndex) => (
                                    <li key={`list-${index}-${itemIndex}`}>{item}</li>
                                ))}
                            </ListTag>
                        );
                    }

                    return <div key={`spacer-${index}`} className="h-2" />;
                })}
            </div>
        );
    };

    const renderAttachedTrades = () => {
        if (!message.attachedTrades || message.attachedTrades.length === 0) {
            return null;
        }

        return (
            <div className="mt-3 space-y-2">
                <div className="text-sm font-semibold text-white/80">Attached Trades:</div>
                {message.attachedTrades.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                ))}
            </div>
        );
    };

    return (
        <div
            className={`group relative ${isUser ? "ml-auto" : "mr-auto"} max-w-[80%]`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`${bubbleClass} transition-all duration-200`}>
                {renderContent()}
                {renderAttachedTrades()}
                <div className={`mt-3 text-xs font-medium ${isUser ? "text-white/80" : "text-white/50"}`}>
                    {message.timestamp.toLocaleTimeString()}
                </div>
            </div>

            {showActions && (
                <div
                    className={`absolute top-0 ${isUser ? "left-0 -translate-x-full" : "right-0 translate-x-full"
                        } flex flex-col space-y-1 rounded-lg border border-indigo-500/40 bg-[#050b18] p-1 shadow-[0_16px_32px_rgba(5,11,24,0.6)]`}
                >
                    {isAssistant && onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                            title="Regenerate"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                    )}

                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                            title="Edit"
                        >
                            <Edit3 className="h-3 w-3" />
                        </Button>
                    )}

                    {onCopy && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCopy}
                            className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                            title="Copy"
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    )}

                    {isAssistant && onRate && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRate("up")}
                                className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                                title="Good response"
                            >
                                <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRate("down")}
                                className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                                title="Poor response"
                            >
                                <ThumbsDown className="h-3 w-3" />
                            </Button>
                        </>
                    )}

                    {onPin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onPin}
                            className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                            title="Pin message"
                        >
                            <Pin className="h-3 w-3" />
                        </Button>
                    )}

                    {(message as any).canRetry && onRetry && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRetry}
                            className="h-8 w-8 p-0 text-white/70 transition hover:text-white"
                            title="Retry"
                        >
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    )}

                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            className="h-8 w-8 p-0 text-red-400 transition hover:text-white"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

interface TradeCardProps {
    trade: Trade;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade }) => {
    const outcomeLabel = trade.outcome?.toUpperCase() ?? "N/A";
    const pnlValue = trade.pnl ?? 0;
    const entryDate = getTradeDate(trade);
    const strategyTags = trade.strategy_tags?.filter(Boolean).join(", ");

    return (
        <div className="rounded-xl border border-white/15 bg-transparent p-3 text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{trade.symbol}</span>
                    <span className="rounded px-2 py-1 text-xs text-white/80">{outcomeLabel}</span>
                </div>
                <span className="font-medium text-white">${pnlValue.toFixed(2)}</span>
            </div>
            <div className="mt-1 text-sm text-white/60">
                {entryDate ? entryDate.toLocaleDateString() : "Date unavailable"}
                {strategyTags ? ` • ${strategyTags}` : ""}
            </div>
        </div>
    );
};
