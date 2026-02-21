// src/types/mistral.ts
/**
 * TypeScript types for Mistral AI integration
 */

import { TradiaMode } from '@/lib/modes';

/**
 * Chat message interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

/**
 * Chat request to API
 */
export interface ChatRequest {
  message: string;
  userId?: string;
  mode?: TradiaMode;
  conversationHistory?: ChatMessage[];
}

/**
 * Chat response from API
 */
export interface ChatResponse {
  response: string;
  mode: TradiaMode;
  timestamp: string;
  metadata?: {
    responseTime: number;
    tradeCount: number;
    [key: string]: any;
  };
}

/**
 * Error response from API
 */
export interface ChatErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * User context for personalization
 */
export interface UserContext {
  userName?: string;
  tradingGoal?: string;
  experience?: string;
  riskTolerance?: string;
  preferredMarkets?: string[];
  tradeData?: any;
}

/**
 * Mistral API configuration
 */
export interface MistralConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  safePrompt?: boolean;
}

/**
 * Mode selector props
 */
export interface ModeSelectorProps {
  currentMode: TradiaMode;
  onModeChange: (mode: TradiaMode) => void;
  disabled?: boolean;
}

/**
 * Chat message component props
 */
export interface ChatMessageProps {
  message: ChatMessage;
  mode?: TradiaMode;
  isUser?: boolean;
}
