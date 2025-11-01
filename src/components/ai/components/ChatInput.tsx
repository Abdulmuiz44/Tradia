import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, ArrowUpCircle, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onOpenAddTrade: () => void;
  isTyping: boolean;
  // Voice props
  voiceInputSupported?: boolean;
  isListening?: boolean;
  onVoiceInput?: () => void;
  voiceTranscript?: string;
  voiceOutputSupported?: boolean;
  isSpeaking?: boolean;
  onVoiceOutput?: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  inputMessage,
  onInputChange,
  onSendMessage,
  onOpenAddTrade,
  isTyping,
  voiceInputSupported = false,
  isListening = false,
  onVoiceInput,
  voiceTranscript = '',
  voiceOutputSupported = false,
  isSpeaking = false,
  onVoiceOutput,
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="border-t border-gray-800 p-4 bg-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Voice transcript display */}
        {voiceTranscript && (
          <div className="mb-2 p-2 bg-blue-900/50 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-200">
              <Mic className="w-4 h-4 inline mr-1" />
              {voiceTranscript}
            </p>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenAddTrade}
            className="flex-shrink-0 text-gray-300 hover:text-white border-gray-700 hover:bg-gray-800"
            title="Upload/Add Trade History"
            aria-label="Upload trade history"
          >
            <UploadCloud className="w-5 h-5" />
          </Button>

          {/* Voice Input Button */}
          {voiceInputSupported && (
            <Button
              variant="outline"
              size="icon"
              onClick={onVoiceInput}
              className={cn(
                "flex-shrink-0 border-gray-700 hover:bg-gray-800",
                isListening
                  ? "text-red-400 border-red-400 animate-pulse"
                  : "text-gray-300 hover:text-white"
              )}
              title={isListening ? "Stop listening" : "Start voice input"}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}

          <Textarea
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Message Tradia AI..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-600 resize-none"
            rows={1}
            autoFocus
            aria-label="Type your message"
          />

          {/* Voice Output Button */}
          {voiceOutputSupported && inputMessage.trim() && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onVoiceOutput?.(inputMessage)}
              className={cn(
                "flex-shrink-0 border-gray-700 hover:bg-gray-800",
                isSpeaking
                  ? "text-green-400 border-green-400"
                  : "text-gray-300 hover:text-white"
              )}
              title={isSpeaking ? "Stop speaking" : "Read message aloud"}
              aria-label={isSpeaking ? "Stop text-to-speech" : "Start text-to-speech"}
              disabled={!inputMessage.trim()}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          )}

          <Button
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 transition-colors"
            size="icon"
            aria-label="Send message"
          >
            <ArrowUpCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
