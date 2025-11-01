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
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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
    <div className="flex h-full flex-col overflow-hidden bg-[#050b18] text-white">
      <div className="border-b border-indigo-500/40 px-6 pb-6 pt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Workspace</h2>
          <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
            {conversations.length} chats
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={onCreateConversation}
            disabled={!onCreateConversation}
            className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:border-indigo-500/20 disabled:bg-indigo-500/5 disabled:text-white/50"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          <Button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-[#050b18] px-4 py-3 text-sm font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>

        <label className="relative mt-6 flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/60" />
          <Input
            placeholder="Search conversation titles"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-full border border-indigo-500/40 bg-[#050b18] pl-10 text-sm text-white placeholder:text-white/50 focus:border-indigo-300 focus:outline-none"
          />
        </label>
      </div>

      <ScrollArea className="flex-1 px-6 py-6">
        <div className="space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-500/40 bg-[#050b18] px-4 py-8 text-sm text-white/80">
              <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/40 border-t-white/80" />
              Loading conversations...
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-indigo-500/40 bg-[#050b18] px-4 py-6 text-center text-sm text-white/70">
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

      <div className="relative border-t border-indigo-500/20 px-6 py-6">
        <SidebarUserBadge />
      </div>

      <HistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        conversations={conversations}
        onSelectConversation={onSelectConversation}
      />
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
        "group relative cursor-pointer rounded-2xl border px-4 py-4 transition-colors duration-150",
        isActive
          ? "border-white/40 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
          : "border-indigo-500/20 bg-[#0b152f] text-indigo-100 hover:border-indigo-400/50 hover:bg-indigo-500/15"
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
              className="h-7 w-full rounded-md border border-transparent bg-white/90 px-3 text-sm font-medium text-[#050b18] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          ) : (
            <div className="truncate text-sm font-medium text-white">
              {conversation.title || "Untitled conversation"}
            </div>
          )}
          <div className="mt-1 text-[11px] uppercase tracking-wide text-indigo-300/70">
            Updated {normalizedUpdatedAt.toLocaleDateString()} • {conversation.messages.length} messages
          </div>
        </div>

        <div className="flex flex-none items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-200">
          <Pin className={cn("h-3 w-3", conversation.pinned ? "text-white" : "text-indigo-300")} />
          {conversation.pinned ? "Pinned" : "Chat"}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
      "h-7 rounded-full border border-indigo-500/40 bg-[#050b18] px-3 text-[11px] text-white/80 transition-colors hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-white",
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
        className="flex w-full items-center gap-3 rounded-2xl border border-indigo-500/40 bg-[#050b18] px-4 py-3 text-left text-sm text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
      >
        <Avatar className="h-10 w-10 border border-indigo-500/40 bg-[#050b18]">
          <AvatarImage src={avatarSrc} alt={name} />
          <AvatarFallback className="bg-indigo-500/20 text-sm font-semibold text-white">{userInitial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {email && <p className="truncate text-xs text-white/60">{email}</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-indigo-500/40 bg-[#050b18] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
            {planDisplay}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/70 transition-transform",
              menuOpen ? "rotate-180 text-white" : ""
            )}
          />
        </div>
      </button>

      {menuOpen && (
        <div className="absolute bottom-[calc(100%+12px)] left-0 z-50 w-64 rounded-2xl border border-indigo-500/40 bg-[#050b18] p-3 shadow-[0_24px_60px_rgba(5,11,24,0.6)]">
          <div className="rounded-xl border border-indigo-500/40 bg-[#050b18] px-3 py-2 text-xs text-white/70">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Signed in as</p>
            <p className="truncate text-sm font-semibold text-white">{email || "Unknown"}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">Plan • {planDisplay}</p>
          </div>

          <nav className="mt-3 space-y-1 text-sm">
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-indigo-500/40 bg-[#050b18] px-3 py-2 text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/40 bg-[#050b18] text-white/70">
                <User className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Profile</p>
                <p className="text-xs text-white/60">Update account details</p>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-indigo-500/40 bg-[#050b18] px-3 py-2 text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/40 bg-[#050b18] text-white/70">
                <Settings className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Settings</p>
                <p className="text-xs text-white/60">Configure preferences</p>
              </div>
            </Link>

            <Link
              href="/dashboard/billing"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-indigo-500/40 bg-[#050b18] px-3 py-2 text-white transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/40 bg-[#050b18] text-white/70">
                <CreditCard className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Billing & Usage</p>
                <p className="text-xs text-white/60">Manage plan & invoices</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: "/" }).catch(() => {});
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-indigo-500/40 bg-[#050b18] px-3 py-2 text-white/70 transition hover:border-red-400/60 hover:bg-red-500/20 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/40 bg-[#050b18] text-white/70">
                <LogOut className="h-4 w-4" />
              </span>
              <div className="flex-1 text-left">
                <p className="font-medium">Sign out</p>
                <p className="text-xs text-white/60">Log out of Tradia</p>
              </div>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectConversation?: (id: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  open,
  onClose,
  conversations,
  onSelectConversation,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-indigo-500/40 bg-[#050b18] text-white shadow-[0_40px_90px_rgba(5,11,24,0.65)]">
        <div className="flex items-center justify-between border-b border-indigo-500/40 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Conversation history</h3>
            <p className="text-xs text-white/60">Browse and jump back into previous sessions.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-indigo-500/40 text-white/70 hover:border-indigo-300 hover:text-white"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[420px] px-6 py-6">
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-500/40 bg-[#050b18] px-6 py-10 text-center text-sm text-white/70">
              No conversations yet. Start chatting to build your history.
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => {
                const updatedAt =
                  conversation.updatedAt instanceof Date
                    ? conversation.updatedAt
                    : new Date(conversation.updatedAt);

                const lastMessage = conversation.messages[conversation.messages.length - 1];

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      onSelectConversation?.(conversation.id);
                      onClose();
                    }}
                    className="w-full rounded-2xl border border-indigo-500/40 bg-[#050b18] px-4 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-500/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {conversation.title || "Untitled conversation"}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Updated {updatedAt.toLocaleString()}
                        </p>
                      </div>
                      {conversation.pinned && (
                        <span className="ml-3 rounded-full border border-indigo-500/40 bg-[#050b18] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs text-white/70">
                      {lastMessage?.content || "No message preview available."}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/60">
                      <span>{conversation.messages.length} messages</span>
                      <span>ID • {conversation.id.slice(0, 8)}...</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 border-t border-indigo-500/40 px-6 py-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 rounded-full border border-indigo-500/40 px-4 text-sm font-semibold text-white/80 hover:border-indigo-300 hover:text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

