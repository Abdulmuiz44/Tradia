// src/lib/mistral.ts
/**
 * Mistral AI Client for Tradia
 * 
 * This module provides a reusable client for interacting with Mistral AI's API.
 * It handles chat completions with mode-based system prompts and error handling.
 */

import { getSystemPrompt, isValidMode, type TradiaMode } from './modes';

// Mistral API configuration
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const DEFAULT_MODEL = 'mistral-small-latest'; // Fast and cost-effective
const ADVANCED_MODEL = 'mistral-large-latest'; // For complex analysis

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if Mistral API key is configured
 */
export function isMistralConfigured(): boolean {
  return !!MISTRAL_API_KEY && MISTRAL_API_KEY.length > 0;
}

/**
 * Log warning if Mistral API key is missing
 */
function checkMistralConfig(): void {
  if (!isMistralConfigured()) {
    console.warn(
      '⚠️  MISTRAL_API_KEY is not configured. Please add it to your .env.local file.\n' +
      '   Get your API key from: https://console.mistral.ai/\n' +
      '   Add to .env.local: MISTRAL_API_KEY=your_key_here'
    );
  }
}

// Check configuration on module load (server-side only)
if (typeof window === 'undefined') {
  checkMistralConfig();
}

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new window
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      resetIn: Math.ceil((userLimit.resetTime - now) / 1000)
    };
  }

  // Increment count
  userLimit.count++;
  return { allowed: true };
}

/**
 * Interface for chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface for Mistral API response
 */
interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat message to Mistral AI
 * 
 * @param mode - The AI mode (coach, mentor, assistant, analysis, journal)
 * @param userId - User identifier for rate limiting and personalization
 * @param message - The user's message
 * @param options - Optional configuration
 * @returns The AI response text
 */
export async function sendChatMessage(
  mode: TradiaMode | string,
  userId: string,
  message: string,
  options?: {
    conversationHistory?: ChatMessage[];
    context?: {
      userName?: string;
      tradingGoal?: string;
      experience?: string;
      riskTolerance?: string;
      preferredMarkets?: string[];
      tradeData?: any;
    };
    temperature?: number;
    maxTokens?: number;
    useAdvancedModel?: boolean;
  }
): Promise<string> {
  // Validate inputs
  if (!message || message.trim().length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  // Validate mode
  if (!isValidMode(mode)) {
    console.warn(`Invalid mode "${mode}", defaulting to "assistant"`);
    mode = 'assistant';
  }

  // Check if Mistral is configured
  if (!isMistralConfigured()) {
    throw new Error('Mistral API is not configured. Please set MISTRAL_API_KEY environment variable.');
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${rateLimit.resetIn} seconds.`
    );
  }

  try {
    // Build system prompt based on mode and context
    const systemPrompt = getSystemPrompt(mode as TradiaMode, options?.context);

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (options?.conversationHistory && options.conversationHistory.length > 0) {
      // Only include recent history (last 10 messages to stay within token limits)
      const recentHistory = options.conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // Add trade data context if provided
    if (options?.context?.tradeData) {
      const tradeContext = formatTradeContext(options.context.tradeData);
      if (tradeContext) {
        messages.push({
          role: 'system',
          content: `Trading Data Context:\n${tradeContext}`
        });
      }
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Select model based on mode and options
    const model = options?.useAdvancedModel || mode === 'analysis'
      ? ADVANCED_MODEL
      : DEFAULT_MODEL;

    // Call Mistral API
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        safe_prompt: false // Allow trading-related content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid Mistral API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('Mistral API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: MistralResponse = await response.json();

    // Extract response text
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from Mistral AI');
    }

    // Log token usage for monitoring
    console.log(`Mistral API usage - Model: ${model}, Tokens: ${data.usage.total_tokens}`);

    return aiResponse.trim();

  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    
    // Re-throw known errors
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    
    if (error instanceof Error && error.message.includes('Mistral API')) {
      throw error;
    }

    // Wrap unknown errors
    throw new Error(`Failed to get response from Mistral AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format trade data for context
 */
function formatTradeContext(tradeData: any): string | null {
  if (!tradeData) return null;

  try {
    // Handle array of trades
    if (Array.isArray(tradeData)) {
      const totalTrades = tradeData.length;
      const winningTrades = tradeData.filter(t => t.outcome === 'Win' || t.pnl > 0).length;
      const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0';
      const totalPnL = tradeData.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2);

      // Get top symbols
      const symbolCounts: Record<string, number> = {};
      tradeData.forEach(t => {
        if (t.symbol) {
          symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
        }
      });
      const topSymbols = Object.entries(symbolCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([symbol]) => symbol);

      return `
Total Trades: ${totalTrades}
Win Rate: ${winRate}%
Total P&L: $${totalPnL}
Most Traded Symbols: ${topSymbols.join(', ') || 'N/A'}
Recent Trades: ${Math.min(10, totalTrades)} available for analysis
`.trim();
    }

    // Handle single trade
    if (typeof tradeData === 'object') {
      return `
Symbol: ${tradeData.symbol || 'N/A'}
Type: ${tradeData.type || 'N/A'}
Outcome: ${tradeData.outcome || 'Unknown'}
P&L: $${tradeData.pnl || 0}
Entry: ${tradeData.openprice || 'N/A'}
Exit: ${tradeData.closeprice || 'N/A'}
`.trim();
    }

    return null;
  } catch (error) {
    console.error('Error formatting trade context:', error);
    return null;
  }
}

/**
 * Test Mistral API connection
 */
export async function testMistralConnection(): Promise<{ success: boolean; message: string }> {
  if (!isMistralConfigured()) {
    return {
      success: false,
      message: 'Mistral API key is not configured'
    };
  }

  try {
    const testMessage = 'Hello, this is a test message.';
    const response = await sendChatMessage('assistant', 'test-user', testMessage, {
      maxTokens: 50
    });

    return {
      success: true,
      message: `Connection successful. Response: ${response.substring(0, 100)}...`
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Stream a chat message (for future implementation)
 * Note: Mistral API supports streaming, but this is a basic implementation
 */
export async function streamChatMessage(
  mode: TradiaMode | string,
  userId: string,
  message: string,
  options?: Parameters<typeof sendChatMessage>[3]
): Promise<ReadableStream<string>> {
  // For now, fall back to non-streaming
  // TODO: Implement streaming when needed
  const response = await sendChatMessage(mode, userId, message, options);
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(response);
      controller.close();
    }
  });
}
