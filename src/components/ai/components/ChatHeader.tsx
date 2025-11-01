import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Bot, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserTier } from '../types';

interface ChatHeaderProps {
  userTier: UserTier['type'];
  isAdmin: boolean;
  assistantMode: 'coach' | 'grok';
  grokUnlocked: boolean;
  onToggleMode: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
  userTier,
  isAdmin,
  assistantMode,
  grokUnlocked,
  onToggleMode,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="/Tradia-logo-ONLY.png" />
          <AvatarFallback>TA</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold text-white">Tradia AI Coach</h3>
          <p className="text-sm text-gray-400">Online</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && <Badge variant="secondary" className="bg-red-600 text-white">ADMIN</Badge>}
        <Badge
          className={cn(
            "text-xs",
            (userTier === 'free' || userTier === 'starter') && "bg-gray-700 text-gray-300",
            userTier === 'pro' && "bg-blue-700 text-blue-100",
            userTier === 'plus' && "bg-purple-700 text-purple-100",
            userTier === 'elite' && "bg-yellow-700 text-yellow-100",
          )}
        >
          <Crown className="w-3 h-3 mr-1" /> {userTier.toUpperCase()}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMode}
          disabled={!grokUnlocked && assistantMode === 'coach'}
          className={cn(
            "flex items-center gap-1",
            assistantMode === 'grok' ? "text-purple-400 hover:text-purple-300" : "text-blue-400 hover:text-blue-300",
            !grokUnlocked && "opacity-50 cursor-not-allowed"
          )}
          title={grokUnlocked ? "Toggle AI Mode" : "Upgrade to unlock Grok"}
          aria-label={`Switch to ${assistantMode === 'coach' ? 'Grok' : 'Coach'} mode`}
        >
          {assistantMode === 'grok' ? <Sparkles className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          {assistantMode === 'grok' ? 'Grok Mode' : 'Coach Mode'}
          {!grokUnlocked && <Lock className="w-3 h-3 ml-1" />}
        </Button>
      </div>
    </div>
  );
});
