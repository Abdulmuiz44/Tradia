// src/components/chat/ConversationsSidebar.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Pin, Trash2, Edit3 } from "lucide-react";
import { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useSession } from "next-auth/react";


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
  const [searchQuery, setSearchQuery] = useState('');

  const { pinnedConversations, regularConversations } = useMemo(() => {
    const filtered = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      pinnedConversations: filtered.filter((conv) => conv.pinned),
      regularConversations: filtered.filter((conv) => !conv.pinned),
    };
  }, [conversations, searchQuery]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <div className="border-b border-indigo-400/40 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-300/80">History</p>
            <h2 className="text-lg font-semibold text-white">Chats</h2>
          </div>
          <Button
            size="sm"
            className="h-9 rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-[1.02]"
            onClick={() => onCreateConversation?.()}
          >
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>

        <label className="relative mt-5 flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-indigo-300/60" />
          <Input
            placeholder="Search conversation titles"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-full border border-indigo-500/30 bg-indigo-500/10 pl-10 text-sm text-white placeholder:text-indigo-300/60 focus:border-indigo-400 focus:outline-none focus:ring-0"
          />
        </label>
      </div>

      <ScrollArea className="flex-1 px-4 py-5">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-indigo-100/70">
            <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            Loading conversations...
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/10 px-4 py-6 text-center text-sm text-indigo-100/70">
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
      </ScrollArea>

      <div className="border-t border-indigo-400/40 px-6 py-5">
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
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-300/80">{title}</p>
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

        <div className="border-t border-white/10 px-6 py-5">
          <SidebarUserBadge />
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

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
      "group relative cursor-pointer rounded-xl border border-indigo-500/30 px-4 py-3 transition-colors duration-150",
      isActive
      ? "bg-gradient-to-r from-indigo-500/30 via-indigo-500/10 to-transparent text-white shadow-[0_0_0_1px_rgba(129,140,248,0.45)]"
      : "bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSaveEdit}
              className="h-7 rounded-md border-indigo-500/40 bg-indigo-500/10 text-sm text-white focus-visible:ring-0 focus:border-indigo-400"
              autoFocus
            />
          ) : (
            <div className="truncate text-sm font-medium text-white">
              {conversation.title || 'Untitled conversation'}
            </div>
          )}
          <div className="mt-1 text-[11px] uppercase tracking-wide text-indigo-300/80">
            Updated {conversation.updatedAt.toLocaleDateString()} • {conversation.messages.length} messages
          </div>
        </div>

        <div className="flex flex-none items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-1 text-[11px] font-medium text-indigo-100">
          <Pin className={cn("h-3 w-3", conversation.pinned ? "text-sky-300" : "text-white/40")} />
          {conversation.pinned ? "Pinned" : "Chat"}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <SidebarAction
          label="Pin"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
        >
          <Pin className="h-3 w-3" />
        </SidebarAction>
        <SidebarAction
          label="Rename"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit3 className="h-3 w-3" />
        </SidebarAction>
        <SidebarAction
          label="Export"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4 4-4M4 17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        </SidebarAction>
        <SidebarAction
          label="Delete"
          className="text-red-300 hover:text-red-200"
          onClick={(e) => {
            e.stopPropagation();
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
      "h-7 rounded-full border border-white/10 px-3 text-[11px] text-white/70 transition-colors hover:bg-white/10",
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

if (!user) {
  return null;
  }

const name = user.name || session?.user?.name || user.email?.split("@")[0] || session?.user?.email?.split("@")[0] || "Trader";
const email = user.email || session?.user?.email || "";
  const userInitial = name.charAt(0).toUpperCase();

const avatarSrc = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=32`;

return (
<div className="flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
<Avatar className="w-10 h-10">
<AvatarImage
  src={avatarSrc}
    alt={name}
  />
<AvatarFallback className="bg-blue-600 text-white text-sm font-medium">{userInitial}</AvatarFallback>
</Avatar>
  <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-indigo-100/70">{email}</p>
      </div>
      <span className="ml-auto rounded-full border border-indigo-500/40 bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
        {plan}
      </span>
    </div>
  );
};
