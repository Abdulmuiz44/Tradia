// src/components/chat/MessageBubble.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  RefreshCw
} from 'lucide-react';
import { Message } from '@/types/chat';
import { Trade } from '@/types/trade';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onRate?: (rating: 'up' | 'down') => void;
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

  const isUser = message.type === 'user';
  const isAssistant = message.type === 'assistant';

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(editContent.trim());
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
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] bg-gray-800 border-gray-600"
            autoFocus
          />
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSaveEdit}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Render markdown-like content
    return (
      <div className="prose max-w-none text-slate-900 dark:prose-invert dark:text-white">
        {message.content.split('\n').map((line, index) => {
          // Simple markdown parsing
          if (line.startsWith('**') && line.endsWith('**')) {
            return <h3 key={index} className="text-lg font-semibold mb-2">{line.slice(2, -2)}</h3>;
          }
          if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-4">{line.slice(2)}</li>;
          }
          if (line.trim() === '') {
            return <br key={index} />;
          }
          return <p key={index} className="mb-2">{line}</p>;
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
        <div className="text-sm text-gray-400 font-medium">Attached Trades:</div>
        {message.attachedTrades.map((trade) => (
          <TradeCard key={trade.id} trade={trade} />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`group relative ${isUser ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`rounded-2xl px-4 py-3 shadow-sm transition ${
          isUser
            ? 'bg-indigo-600 text-white'
            : isAssistant
            ? 'bg-slate-50 text-slate-900 dark:bg-gray-800 dark:text-gray-100'
            : 'bg-slate-200 text-slate-800 dark:bg-gray-700 dark:text-gray-300'
        }`}
      >
        {renderContent()}
        {renderAttachedTrades()}

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${
          isUser ? 'text-indigo-100 dark:text-indigo-200' : 'text-slate-500 dark:text-gray-400'
        }`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`absolute top-0 ${
          isUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
        } flex flex-col space-y-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900`}>
          {isAssistant && onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
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
                onClick={() => onRate('up')}
                className="h-8 w-8 p-0"
                title="Good response"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRate('down')}
                className="h-8 w-8 p-0"
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
          className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300"
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
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{trade.symbol}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            trade.outcome === 'win'
              ? 'bg-green-600 text-white'
              : trade.outcome === 'loss'
              ? 'bg-red-600 text-white'
              : 'bg-gray-600 text-white'
          }`}>
            {trade.outcome.toUpperCase()}
          </span>
        </div>
        <span className={`font-medium ${
          trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
        }`}>
          ${trade.pnl.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-gray-400">
        {new Date(trade.entry_time).toLocaleDateString()} • {trade.strategy_tags?.join(', ')}
      </div>
    </div>
  );
};
