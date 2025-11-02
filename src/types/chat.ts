// src/types/chat.ts

export type AssistantMode = 'coach' | 'mentor' | 'analysis' | 'journal' | 'grok' | 'assistant';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: AssistantMode;
  attachedTrades?: Trade[];
  canRetry?: boolean;
  originalContent?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  pinned?: boolean;
  tags?: string[];
}

export interface ChatOptions {
  model: string;
  max_tokens: number;
}

export interface TradiaAIRequest {
  conversationId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  attachedTradeIds?: string[];
  options?: Partial<ChatOptions>;
  mode?: AssistantMode;
}

export interface TradiaAIResponse {
  response: string;
  analysis?: any;
  timestamp: string;
}

import { Trade } from './trade';
