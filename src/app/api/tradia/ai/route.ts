// src/app/api/tradia/ai/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getToken } from "next-auth/jwt";
import { createAdminClient } from "@/utils/supabase/admin";
import { mergeTradeSecret } from "@/lib/secure-store";
import { withDerivedTradeTimes, getTradeCloseTime, getTradeOpenTime } from "@/lib/trade-field-utils";

// Use direct fetch API instead of OpenAI SDK to avoid compatibility issues
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    console.log('Tradia AI API called');

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return NextResponse.json({ error: "🤖 AI service is not properly configured. Please contact support or try again later." }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    let userId = session?.user?.id as string | undefined;

    if (!userId) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? authOptions.secret });
      userId = (token?.userId as string | undefined) ?? (token?.sub as string | undefined);
    }

    if (!userId) {
      console.error('Unauthorized: no user session');
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 403 });
    }

    console.log('User authenticated:', userId);

    const body = await req.json();
    const {
      conversationId,
      messages,
      attachedTradeIds = [],
      options = {}
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const normalizeTrade = (row: any) => withDerivedTradeTimes(mergeTradeSecret(userId!, row));

    // Ensure conversation exists
    let currentConversationId = conversationId;
    if (!conversationId) {
      console.log('Creating new conversation');
      // Create new conversation
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { error: convError } = await supabase
        .from("conversations")
        .insert({
          id: newConvId,
          user_id: userId,
          title: "New Conversation",
          model: options.model || "gpt-4o-mini",
          temperature: options.temperature ?? 0.2,
        });

      if (convError) {
        console.error('Failed to create conversation:', convError);
        throw convError;
      }
      console.log('Created conversation:', newConvId);
      currentConversationId = newConvId;
    } else {
      console.log('Using existing conversation:', conversationId);
    }

    // Save user message to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          id: messageId,
          conversation_id: currentConversationId,
          user_id: userId,
          type: 'user',
          content: lastMessage.content,
          attached_trade_ids: attachedTradeIds,
        });

      if (msgError) throw msgError;
    }

    // Fetch attached trades or get relevant ones
    let attachedTrades = [];
    if (attachedTradeIds.length > 0) {
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .in("id", attachedTradeIds);

      if (error) throw error;
      attachedTrades = (trades || []).map(normalizeTrade);
    } else {
      // Get top 10 most relevant trades (heuristic: recent wins/losses)
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const normalizedTrades = (trades || []).map(normalizeTrade);
      attachedTrades = normalizedTrades
        .sort((a, b) => getSortableTime(b) - getSortableTime(a))
        .slice(0, 10);
    }

    // Get account summary
    const accountSummary = await getAccountSummary(userId);

    // Build system message with context
    const systemMessage = buildSystemMessage(accountSummary, attachedTrades);

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: "system", content: systemMessage },
      ...messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }))
    ];

    // Set default options
    const defaultOptions = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1024,
      stream: true,
      ...options
    };

    console.log('Calling OpenAI API with model:', defaultOptions.model);

    // Use direct fetch to OpenAI API to avoid SDK compatibility issues
    let completion;
    try {
      console.log('Making direct fetch call to OpenAI API');

      const response = await Promise.race([
        fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            ...defaultOptions,
            stream: false,
            messages: openaiMessages,
          }),
        }),
        // Timeout after 25 seconds
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        )
      ]) as Response;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 429) {
          throw new Error('🤖 AI service is currently busy (rate limited). Please wait 30 seconds and try again.');
        }

        if (response.status === 401) {
          throw new Error('🔐 AI service authentication failed. Please contact support.');
        }

        if (response.status >= 500) {
          throw new Error('🤖 AI service is temporarily down for maintenance. Please try again later.');
        }

        if (response.status === 400) {
          throw new Error('❌ Invalid request to AI service. Please try rephrasing your question.');
        }

        throw new Error(`🤖 AI service error (${response.status}): ${errorData?.error?.message || response.statusText}`);
      }

      completion = await response.json();
      console.log('OpenAI API call successful, response structure:', {
        choices: completion.choices?.length,
        hasContent: !!completion.choices?.[0]?.message?.content,
        model: completion.model,
        usage: completion.usage,
      });

    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);

      if (openaiError?.message?.includes('timeout') ||
          openaiError?.message?.includes('Request timeout')) {
        throw new Error('⏱️ AI service took too long to respond. Please try again.');
      }

      if (openaiError?.message?.includes('fetch')) {
        throw new Error('🌐 Network connection issue. Please check your internet connection and try again.');
      }

      // Re-throw if it's already a custom error message
      if (openaiError?.message?.startsWith('🤖') ||
          openaiError?.message?.startsWith('⏱️') ||
          openaiError?.message?.startsWith('🌐')) {
        throw openaiError;
      }

      // Generic fallback
      throw new Error(`🤖 AI service error: ${openaiError?.message || 'Unknown error occurred'}`);
    }

    console.log('OpenAI API call successful');

    const aiResponse = completion.choices?.[0]?.message?.content;

    // Provide fallback response if OpenAI returned empty content
    const finalResponse = aiResponse || 'I apologize, but I was unable to generate a meaningful response. Please try asking your question differently or try again later.';

    // Save AI response to database
    const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { error: aiMsgError } = await supabase
      .from("chat_messages")
      .insert({
        id: aiMessageId,
        conversation_id: currentConversationId,
        user_id: userId,
        type: 'assistant',
        content: finalResponse,
      });

    if (aiMsgError) {
      console.error('Failed to save AI message:', aiMsgError);
      throw aiMsgError;
    }

    // Update conversation metadata
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", currentConversationId);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
      // Don't throw here, response is already generated
    }

    // Return the response
    return NextResponse.json({
      response: finalResponse,
      conversationId: currentConversationId
    });

  } catch (error) {
  console.error("Tradia AI API Error:", error);

  let errorMessage = "Sorry, I encountered an error. Please try again.";
  let statusCode = 500;

  if (error instanceof Error) {
  // Handle OpenAI SDK specific errors
  if (error.message.includes("getHeader")) {
    errorMessage = "🤖 AI service connection issue. This is a temporary technical problem. Please try again.";
  statusCode = 503;
  } else if (error.message.includes("OpenAI")) {
    errorMessage = "🤖 AI service temporarily unavailable. Please try again in a moment.";
  statusCode = 503;
  } else if (error.message.includes("rate limited") || error.message.includes("429")) {
  errorMessage = "🤖 AI service is busy right now. Please wait 30 seconds and try again.";
    statusCode = 429;
    } else if (error.message.includes("Unauthorized")) {
        errorMessage = "🔐 Authentication error. Please refresh the page and try again.";
      statusCode = 403;
  } else if (error.message.includes("database") || error.message.includes("supabase")) {
    errorMessage = "💾 Database connection issue. Please try again.";
      statusCode = 500;
      } else if (error.message.includes("timeout")) {
        errorMessage = "⏱️ Request timed out. Please try again.";
        statusCode = 408;
      } else {
        // Use the custom error message if it's one we threw
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

async function getAccountSummary(userId: string) {
  const supabase = createAdminClient();

  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  const decryptedTrades = (trades || []).map((row: any) => withDerivedTradeTimes(mergeTradeSecret(userId!, row)));

  if (decryptedTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      netPnL: 0,
      avgRR: 0,
      maxDrawdown: 0
    };
  }

  const totalTrades = decryptedTrades.length;
  const winningTrades = decryptedTrades.filter(t => t.outcome === 'win');
  const winRate = (winningTrades.length / totalTrades) * 100;

  const netPnL = decryptedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  const losingTrades = decryptedTrades.filter(t => t.outcome === 'loss');
  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const avgRR = losingTrades.length > 0 ? totalProfit / totalLoss : 0;

  // Calculate max drawdown
  const sortedTrades = [...decryptedTrades].sort((a, b) => getSortableTime(a) - getSortableTime(b));

  let peak = 0;
  let maxDrawdown = 0;
  let cumulativePnL = 0;

  for (const trade of sortedTrades) {
    cumulativePnL += trade.pnl || 0;
    if (cumulativePnL > peak) peak = cumulativePnL;
    const drawdown = peak - cumulativePnL;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return {
    totalTrades,
    winRate: Math.round(winRate * 10) / 10,
    netPnL: Math.round(netPnL * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100
  };
}

function buildSystemMessage(accountSummary: any, attachedTrades: any[]) {
  let context = `You are Tradia AI, a professional trading assistant with access to the user's complete trading history.

ACCOUNT SUMMARY:
- Total Trades: ${accountSummary.totalTrades}
- Win Rate: ${accountSummary.winRate}%
- Net P&L: $${accountSummary.netPnL}
- Average Risk-Reward Ratio: ${accountSummary.avgRR}
- Maximum Drawdown: $${accountSummary.maxDrawdown}

`;

  if (attachedTrades.length > 0) {
    context += `ATTACHED TRADES FOR ANALYSIS:\n`;
    attachedTrades.forEach((trade, index) => {
      const entryTime = getTradeOpenTime(trade) || "Unknown entry";
      const exitTime = getTradeCloseTime(trade) || "Unknown exit";
      context += `${index + 1}. ${trade.symbol} ${trade.outcome === 'win' ? 'WIN' : 'LOSS'} $${trade.pnl} (${entryTime} to ${exitTime})\n`;
      if (trade.notes) context += `   Notes: ${trade.notes}\n`;
      if (trade.strategy_tags) context += `   Tags: ${trade.strategy_tags.join(', ')}\n`;
    });
    context += `\n`;
  }

  context += `INSTRUCTIONS:
- Provide actionable trading advice based on the user's data
- Be specific about patterns, risk management, and improvements
- Use the attached trades as context for your analysis
- Suggest strategies, risk management techniques, and market analysis
- Keep responses focused and professional
- Use markdown formatting for clarity
- Limit response length to stay under token limits`;

  return context;
}

const getSortableTime = (trade: Record<string, any>): number => {
  const candidates = [
    getTradeCloseTime(trade),
    getTradeOpenTime(trade),
    trade.updated_at,
    trade.created_at,
    trade.timestamp,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const time = new Date(candidate).getTime();
    if (!Number.isNaN(time)) {
      return time;
    }
  }

  return 0;
};
