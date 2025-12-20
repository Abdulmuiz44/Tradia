// src/components/chat/ConversationsSidebar.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Plus,
    Search,
    Pin,
    Trash2,
    Edit3,
    ChevronDown,
    X,
    LogOut,
    User,
    Settings,
    CreditCard,
    History,
} from "lucide-react";
import { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { signOut, useSession } from "next-auth/react";

interface ConversationsSidebarProps {
    conversations?: Conversation[];
    loading?: boolean;
    activeConversationId?: string;
    onCreateConversation?: () => void;
    onSelectConversation?: (id: string) => void;
    onDeleteConversation?: (id: string) => void;
    onRenameConversation?: (id: string, newTitle: string) => void;
    onPinConversation?: (id: string) => void;
    onExportConversation?: (id: string) => void;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
    conversations = [],
    loading = false,
    activeConversationId,
    onCreateConversation,
    onSelectConversation,
    onDeleteConversation,
    onRenameConversation,
    onPinConversation,
    onExportConversation,
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    const { pinnedConversations, regularConversations } = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const filtered = conversations.filter((conversation) =>
            conversation.title.toLowerCase().includes(normalizedQuery)
        );

        return {
            pinnedConversations: filtered.filter((conversation) => conversation.pinned),
            regularConversations: filtered.filter((conversation) => !conversation.pinned),
        };
    }, [conversations, searchQuery]);

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#0D0D0D] text-white">
            <div className="border-b border-white/5 px-6 pb-6 pt-7">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Conversations</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        {conversations.length} chats
                    </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button
                        type="button"
                        onClick={onCreateConversation}
                        disabled={!onCreateConversation}
                        className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/2 disabled:text-white/40"
                    >
                        <Plus className="h-4 w-4" />
                        New Chat
                    </Button>
                    <Link
                        href="/dashboard/trades/history"
                        className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                        <History className="h-4 w-4" />
                        History
                    </Link>
                </div>

                <label className="relative mt-6 flex items-center">
                    <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/40" />
                    <Input
                        placeholder="Search conversations"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
                    />
                </label>
            </div>

            <ScrollArea className="flex-1 px-6 py-6">
                <div className="space-y-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/60">
                            <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                            Loading conversations...
                        </div>
                    )}

                    {!loading && conversations.length === 0 && (
                        <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/50">
                            Start a new chat to begin your AI coaching journey.
                        </div>
                    )}

                    {pinnedConversations.length > 0 && (
                        <Section
                            title="Pinned"
                            conversations={pinnedConversations}
                            activeConversationId={activeConversationId}
                            onSelectConversation={onSelectConversation}
                            onDeleteConversation={onDeleteConversation}
                            onRenameConversation={onRenameConversation}
                            onPinConversation={onPinConversation}
                            onExportConversation={onExportConversation}
                        />
                    )}

                    <Section
                        title="Recent"
                        conversations={regularConversations}
                        activeConversationId={activeConversationId}
                        onSelectConversation={onSelectConversation}
                        onDeleteConversation={onDeleteConversation}
                        onRenameConversation={onRenameConversation}
                        onPinConversation={onPinConversation}
                        onExportConversation={onExportConversation}
                    />
                </div>
            </ScrollArea>

            <div className="relative border-t border-white/5 px-6 py-6">
                <SidebarUserBadge />
            </div>
        </div>
    );
};

interface SectionProps {
    title: string;
    conversations: Conversation[];
    activeConversationId?: string;
    onSelectConversation?: (id: string) => void;
    onDeleteConversation?: (id: string) => void;
    onRenameConversation?: (id: string, title: string) => void;
    onPinConversation?: (id: string) => void;
    onExportConversation?: (id: string) => void;
}

const Section: React.FC<SectionProps> = ({
    title,
    conversations,
    activeConversationId,
    onSelectConversation,
    onDeleteConversation,
    onRenameConversation,
    onPinConversation,
    onExportConversation,
}) => {
    if (conversations.length === 0) return null;

    return (
        <div className="mb-6">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">{title}</p>
            <div className="space-y-2">
                {conversations.map((conversation) => (
                    <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === activeConversationId}
                        onSelect={() => onSelectConversation?.(conversation.id)}
                        onDelete={() => onDeleteConversation?.(conversation.id)}
                        onRename={(newTitle) => onRenameConversation?.(conversation.id, newTitle)}
                        onPin={() => onPinConversation?.(conversation.id)}
                        onExport={() => onExportConversation?.(conversation.id)}
                    />
                ))}
            </div>
        </div>
    );
};

interface ConversationItemProps {
    conversation: Conversation;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (newTitle: string) => void;
    onPin: () => void;
    onExport: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive,
    onSelect,
    onDelete,
    onRename,
    onPin,
    onExport,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(conversation.title);

    const normalizedUpdatedAt =
        conversation.updatedAt instanceof Date
            ? conversation.updatedAt
            : new Date(conversation.updatedAt);

    const handleSaveEdit = () => {
        const trimmed = editTitle.trim();
        if (trimmed && trimmed !== conversation.title) {
            onRename(trimmed);
        }
        setIsEditing(false);
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            handleSaveEdit();
        }
        if (event.key === "Escape") {
            setEditTitle(conversation.title);
            setIsEditing(false);
        }
    };

    return (
        <div
            className={cn(
                "group relative cursor-pointer rounded-lg border px-4 py-3 transition-colors duration-150",
                isActive
                    ? "border-blue-400/50 bg-blue-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
            )}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {isEditing ? (
                        <Input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            onKeyDown={handleKeyPress}
                            onBlur={handleSaveEdit}
                            className="h-7 w-full rounded-md border border-transparent bg-white/90 px-3 text-sm font-medium text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                        />
                    ) : (
                        <div className="truncate text-sm font-medium text-white">
                            {conversation.title || "Untitled conversation"}
                        </div>
                    )}
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-white/40">
                        {conversation.messages.length} messages
                    </div>
                </div>

                <div className="flex flex-none items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium text-white/60">
                    <Pin className={cn("h-3 w-3", conversation.pinned ? "text-blue-400" : "text-white/40")} />
                </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <SidebarAction
                    label={conversation.pinned ? "Unpin" : "Pin"}
                    onClick={(event) => {
                        event.stopPropagation();
                        onPin();
                    }}
                >
                    <Pin className="h-3 w-3" />
                </SidebarAction>
                <SidebarAction
                    label="Rename"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsEditing(true);
                    }}
                >
                    <Edit3 className="h-3 w-3" />
                </SidebarAction>
                <SidebarAction
                    label="Export"
                    onClick={(event) => {
                        event.stopPropagation();
                        onExport();
                    }}
                >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v12m0 0-4-4m4 4 4-4M4 17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
                        />
                    </svg>
                </SidebarAction>
                <SidebarAction
                    label="Delete"
                    className="text-red-400 hover:border-red-400/40 hover:bg-red-500/20 hover:text-white"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                    }}
                >
                    <Trash2 className="h-3 w-3" />
                </SidebarAction>
            </div>
        </div>
    );
};

interface SidebarActionProps {
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
    className?: string;
}

const SidebarAction: React.FC<SidebarActionProps> = ({ label, onClick, children, className }) => (
    <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
            "h-7 rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white",
            className,
        )}
    >
        <span className="mr-1 inline-flex items-center justify-center">{children}</span>
        {label}
    </Button>
);

export const SidebarUserBadge: React.FC = () => {
    const { user, plan } = useUser();
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    const resolvedUser =
        user ?? (session?.user ? { name: session.user.name ?? "", email: session.user.email ?? "" } : null);
    const email = resolvedUser?.email || session?.user?.email || "";

    if (!resolvedUser && !session?.user) {
        return null;
    }

    const name =
        resolvedUser?.name?.trim() ||
        session?.user?.name?.trim() ||
        (email ? email.split("@")[0] : "Trader");

    const planLabel = (plan || (session?.user as Record<string, unknown>)?.plan || "Free") as string;
    const planDisplay = planLabel ? planLabel.toString().replace(/_/g, " ").toUpperCase() : "FREE";
    const userInitial = (name || email).charAt(0).toUpperCase() || "T";
    const avatarSrc =
        session?.user?.image ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=050b18&color=ffffff&size=64`;

    return (
        <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
        >
            <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:border-white/20 hover:bg-white/10"
            >
                <Avatar className="h-10 w-10 border border-white/10 bg-white/5">
                    <AvatarImage src={avatarSrc} alt={name} />
                    <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">{userInitial}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{name}</p>
                    {email && <p className="truncate text-xs text-white/40">{email}</p>}
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        {planDisplay}
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-white/40 transition-transform",
                            menuOpen ? "rotate-180 text-white/60" : ""
                        )}
                    />
                </div>
            </button>

            {menuOpen && (
                <div className="absolute bottom-[calc(100%+12px)] left-0 z-50 w-64 rounded-lg border border-white/10 bg-[#0D0D0D] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">Signed in as</p>
                        <p className="truncate text-sm font-semibold text-white">{email || "Unknown"}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">Plan • {planDisplay}</p>
                    </div>

                    <nav className="mt-3 space-y-1 text-sm">
                        <Link
                            href="/dashboard/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
                                <User className="h-4 w-4" />
                            </span>
                            <div className="flex-1">
                                <p className="font-medium">Profile</p>
                                <p className="text-xs text-white/40">Update account details</p>
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/settings"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
                                <Settings className="h-4 w-4" />
                            </span>
                            <div className="flex-1">
                                <p className="font-medium">Settings</p>
                                <p className="text-xs text-white/40">Configure preferences</p>
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/billing"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
                                <CreditCard className="h-4 w-4" />
                            </span>
                            <div className="flex-1">
                                <p className="font-medium">Billing & Usage</p>
                                <p className="text-xs text-white/40">Manage plan & invoices</p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                signOut({ callbackUrl: "/" }).catch(() => { });
                            }}
                            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
                                <LogOut className="h-4 w-4" />
                            </span>
                            <div className="flex-1 text-left">
                                <p className="font-medium">Sign out</p>
                                <p className="text-xs text-white/40">Log out of Tradia</p>
                            </div>
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};



