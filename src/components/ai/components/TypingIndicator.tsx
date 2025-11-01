import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const TypingIndicator: React.FC = React.memo(() => {
  return (
    <div className="flex items-start gap-3 justify-start" aria-live="polite" aria-label="AI is typing">
      <Avatar className="w-8 h-8">
        <AvatarImage src="/Tradia-logo-ONLY.png" />
        <AvatarFallback>TA</AvatarFallback>
      </Avatar>
      <div className="relative p-3 rounded-xl rounded-bl-none bg-gray-800 text-gray-100 max-w-[70%]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-sm text-gray-300 ml-2">Tradia AI is thinking...</span>
      </div>
    </div>
  );
});
