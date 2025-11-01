export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: 'coach' | 'grok';
  variant?: 'default' | 'upgrade' | 'system';
}

export interface UserTier {
  type: 'free' | 'starter' | 'pro' | 'plus' | 'elite';
}

export interface PlanLimits {
  maxMessagesPerDay: number;
  maxFileUploadsPerDay: number;
  maxFileSizeMB: number;
  canUploadFiles: boolean;
  canUseGrok: boolean;
  canExportChat: boolean;
  messageHistoryDays: number;
}

export interface ChatState {
  messages: Message[];
  searchResults?: Message[];
  inputMessage: string;
  isTyping: boolean;
  assistantMode: 'coach' | 'grok';
  userTier: UserTier['type'];
  userEmail: string;
  isAdmin: boolean;
  grokUnlocked: boolean;
}

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_MODE'; payload: 'coach' | 'grok' }
  | { type: 'SET_USER_TIER'; payload: UserTier['type'] }
  | { type: 'SET_USER_EMAIL'; payload: string }
  | { type: 'SET_GROK_UNLOCKED'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: Message[] }
  | { type: 'CLEAR_SEARCH' };

export interface TradiaAIChatProps {
  className?: string;
}
