// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { streamGrokResponse, parseGrokStream } from '@/lib/grokClient';
import { detectTraderEmotionWithSentiment } from '@/lib/emotionClassifier';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * 5-Step Coaching Framework Template
 */
const COACHING_FRAMEWORK = `
You are a battle-hardened trading psychology coach. Follow this 5-step framework ALWAYS:

1. ACKNOWLEDGE: Mirror their emotional state without judgment
2. PATTERN: Identify the behavior pattern (revenge trading, FOMO, fear, etc.)
3. REFRAME: Challenge the distorted thinking with trader-tested reality
4. MICRO-ACTION: Give ONE specific action they can do RIGHT NOW
5. TRIGGER LOCK: Create a mental anchor for next time this emotion arises

Keep responses SHORT and PUNCHY. No fluff. You're a tough mentor who's been through the trenches.
`;

/**
 * Build dynamic system prompt based on user stats and emotion
 */
function buildSystemPrompt(userStats: any, emotion: any): string {
  const { primary, score, tiltLevel } = emotion;
  
  let emotionContext = '';
  if (tiltLevel >= 1.4) {
    emotionContext = `
⚠️ ALERT: User is showing signs of TILT (${primary} at ${Math.round(score * 100)}% confidence).
Your priority: DE-ESCALATE. Get them to PAUSE. Use the 4-7-8 breathing technique.
`;
  } else if (primary !== 'neutral') {
    emotionContext = `
DETECTED EMOTION: ${primary} (${Math.round(score * 100)}% confidence, tilt level: ${tiltLevel.toFixed(1)})
Address this emotion head-on in your response.
`;
  }

  const statsContext = userStats ? `
TRADER STATS:
- Total Trades: ${userStats.totalTrades || 0}
- Win Rate: ${userStats.winRate || 0}%
- Net P&L: $${userStats.netPnL || 0}
- Avg R:R: ${userStats.avgRR || 0}
- Max Drawdown: $${userStats.maxDrawdown || 0}
- Recent Streak: ${userStats.recentStreak || 'N/A'}
` : '';

  return `${COACHING_FRAMEWORK}

${emotionContext}

${statsContext}

Remember: You're not a therapist. You're a trader mentor who's seen it all and lost it all before winning.
Be direct, be real, be actionable. Each response should feel like advice from a seasoned pro at the bar after closing bell.
`;
}

/**
 * POST /api/chat
 * Emotion-aware trading psychology coach
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Detect emotion in user message
    const emotion = await detectTraderEmotionWithSentiment(message);

    // Get user stats from Supabase
    const supabase = createAdminClient();
    const userStats = await getUserStats(supabase, userId);

    // Load conversation history (last 10 messages from localStorage or DB)
    const conversationHistory = Array.isArray(history) ? history.slice(-10) : [];

    // Build system prompt with emotion context
    const systemPrompt = buildSystemPrompt(userStats, emotion);

    // Prepare messages for Grok
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Check for rate limiting
    const rateLimitKey = `chat_rate_${userId}`;
    const isRateLimited = await checkRateLimit(supabase, rateLimitKey);

    if (isRateLimited) {
      return new Response(
        createSSEMessage({
          type: 'queued',
          message: 'Coach is thinking… (high demand)',
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Stream response from Grok
    const grokStream = await streamGrokResponse(messages, systemPrompt);

    // Transform to SSE format
    const encoder = new TextEncoder();
    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          // Send emotion data first
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'emotion',
                data: emotion,
              })
            )
          );

          // Stream Grok response
          let fullResponse = '';
          for await (const delta of parseGrokStream(grokStream)) {
            fullResponse += delta;
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'delta',
                  content: delta,
                })
              )
            );
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'done',
                content: fullResponse,
              })
            )
          );

          // Save conversation turn to database
          await saveConversationTurn(supabase, userId, {
            userMessage: message,
            assistantMessage: fullResponse,
            emotion,
          });

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'error',
                error: error instanceof Error ? error.message : 'Stream error',
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      return new Response(
        createSSEMessage({
          type: 'queued',
          message: 'Coach is thinking… (high demand). Retrying in 3s...',
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Create SSE message
 */
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Helper: Get user trading stats
 */
async function getUserStats(supabase: any, userId: string) {
  try {
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!trades || trades.length === 0) {
      return null;
    }

    const totalTrades = trades.length;
    const wins = trades.filter((t: any) => t.outcome === 'win').length;
    const winRate = (wins / totalTrades) * 100;
    const netPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

    // Calculate recent streak
    let recentStreak = 0;
    const lastOutcome = trades[0]?.outcome;
    for (const trade of trades) {
      if (trade.outcome === lastOutcome) {
        recentStreak++;
      } else {
        break;
      }
    }

    return {
      totalTrades,
      winRate: Math.round(winRate),
      netPnL: Math.round(netPnL * 100) / 100,
      avgRR: 0, // Could calculate if risk/reward data available
      maxDrawdown: 0, // Would need calculation
      recentStreak: `${recentStreak} ${lastOutcome}s`,
    };
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return null;
  }
}

/**
 * Helper: Check rate limit
 */
async function checkRateLimit(supabase: any, key: string): Promise<boolean> {
  // Simple rate limiting: 20 requests per minute
  const LIMIT = 20;
  const WINDOW = 60 * 1000; // 1 minute

  try {
    const now = Date.now();
    const { data } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (!data) {
      // First request
      await supabase.from('rate_limits').insert({
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
      });
      return false;
    }

    const windowStart = new Date(data.window_start).getTime();
    const isInWindow = now - windowStart < WINDOW;

    if (isInWindow && data.count >= LIMIT) {
      return true; // Rate limited
    }

    if (isInWindow) {
      // Increment count
      await supabase
        .from('rate_limits')
        .update({ count: data.count + 1 })
        .eq('key', key);
    } else {
      // Reset window
      await supabase
        .from('rate_limits')
        .update({
          count: 1,
          window_start: new Date(now).toISOString(),
        })
        .eq('key', key);
    }

    return false;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false; // Fail open
  }
}

/**
 * Helper: Save conversation turn with emotion tags
 */
async function saveConversationTurn(
  supabase: any,
  userId: string,
  data: {
    userMessage: string;
    assistantMessage: string;
    emotion: any;
  }
) {
  try {
    const conversationId = `conv_${Date.now()}_${userId}`;
    
    // Save to chat_history table (or use existing conversations table)
    await supabase.from('chat_history').insert({
      id: conversationId,
      user_id: userId,
      user_message: data.userMessage,
      assistant_message: data.assistantMessage,
      emotion_primary: data.emotion.primary,
      emotion_score: data.emotion.score,
      tilt_level: data.emotion.tiltLevel,
      emotion_triggers: data.emotion.triggers,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Don't throw - saving is optional
  }
}
