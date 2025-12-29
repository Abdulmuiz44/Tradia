import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Crown,
  User as UserIcon,
  Copy,
  Trash2,
  Edit3,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  userImage?: string;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

// Simple markdown renderer
const renderMarkdown = (text: string) => {
  // Basic markdown parsing - can be replaced with a proper library
  return text
    .split('\n')
    .map((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        return <pre key={index} className="bg-gray-900 p-2 rounded text-xs overflow-x-auto"><code>{line.slice(3)}</code></pre>;
      }
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Links
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300">$1</a>');
      // Lists
      if (line.startsWith('- ')) {
        return <li key={index} dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
      }
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold mb-2" dangerouslySetInnerHTML={{ __html: line.slice(4) }} />;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mb-2" dangerouslySetInnerHTML={{ __html: line.slice(3) }} />;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />;
      }

      return <p key={index} dangerouslySetInnerHTML={{ __html: line || '<br>' }} />;
    });
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  userImage,
  onDelete,
  onEdit,
  canEdit = true,
  canDelete = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const showActions = (canEdit || canDelete) && message.type === 'user' && message.id !== 'ai-welcome';

  return (
    <div
      className={cn(
        "flex items-start gap-3 group",
        message.type === 'user' ? "justify-end" : "justify-start"
      )}
      role="listitem"
      aria-label={`${message.type} message`}
    >
      {message.type === 'assistant' && (
        <Avatar className="w-8 h-8">
          <AvatarImage src="/TRADIA-LOGO.png" />
          <AvatarFallback>TA</AvatarFallback>
        </Avatar>
      )}
      <div className="relative max-w-[70%]">
        <div
          className={cn(
            "p-3 rounded-xl",
            message.type === 'user'
              ? "bg-[#1D9BF0] text-[#FFFFFF] rounded-br-none"
              : "bg-[#15202B] text-[#FFFFFF] rounded-bl-none",
            message.variant === 'upgrade' && "bg-[#17BF63]/30 border border-[#17BF63] text-[#FFFFFF]",
            message.variant === 'system' && "bg-[#15202B]/30 border border-[#15202B] text-[#71767B] text-sm italic",
            isEditing && "ring-2 ring-[#1D9BF0]"
          )}
        >
          {message.variant === 'upgrade' && <Crown className="w-4 h-4 inline-block mr-2 text-[#FFFFFF]" />}
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-transparent border-none text-inherit resize-none min-h-[60px] p-0 focus:ring-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
            />
          ) : (
            <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
              {renderMarkdown(message.content)}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span
              className={cn(
                "text-xs text-[#71767B]"
              )}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isEditing && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveEdit}
                  className="h-6 w-6 p-0 text-[#17BF63] hover:text-[#FFFFFF]"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-6 w-6 p-0 text-[#F4212E] hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {showActions && !isEditing && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-[#71767B] hover:text-[#FFFFFF]"
                  aria-label="Message actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#15202B] border-[#15202B]">
                <DropdownMenuItem onClick={handleCopy} className="text-[#71767B] hover:text-[#FFFFFF]">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={handleEdit} className="text-[#71767B] hover:text-[#FFFFFF]">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(message.id)}
                    className="text-[#F4212E] hover:text-[#FFFFFF]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {message.type === 'user' && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={userImage} />
          <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";
