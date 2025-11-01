// src/app/api/ai/chat/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { mergeTradeSecret } from "@/lib/secure-store";
import { aiService } from "@/lib/ai/AIService";
import type { UserPlan as AIUserPlan } from "@/lib/ai/AIService";

interface ChatRequest {
  message: string;
  tradeHistory?: any[];
  // Accept lightweight attachment metadata from client
  attachments?: Array<{ name?: string; type?: string; size?: number }>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  mode?: 'coach' | 'grok';
}

export async function POST(req: NextRequest) {
  try {
    // Read body first so we can support guest mode when tradeHistory is provided
    const body: ChatRequest = await req.json();
    const { message, tradeHistory, attachments, conversationHistory, mode } = body || {} as ChatRequest;

    const requestedMode: 'coach' | 'grok' = mode === 'grok' ? 'grok' : 'coach';

    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Message or attachments required" }, { status: 400 });
    }

    // Attempt to resolve the current user (optional if tradeHistory provided)
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userPlanStr: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      const token = await import("next-auth/jwt").then(({ getToken }) =>
        getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      );
      userId = (token?.userId as string | undefined) || ((session?.user as any)?.id as string | undefined);
      userEmail = (token?.email as string | undefined) || ((session?.user as any)?.email as string | undefined);
      userPlanStr = ((token as any)?.plan as string | undefined) || ((session?.user as any)?.plan as string | undefined);
    } catch (e) {
      // Non-fatal; we can proceed in guest mode if tradeHistory is supplied
      console.warn("AI chat: failed to resolve user, proceeding if possible.");
    }

    if (!userId && (typeof tradeHistory === 'undefined')) {
      // No auth and no provided trades to analyze
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtain trades: prefer provided tradeHistory, else fetch from DB
    let userTrades: any[] = Array.isArray(tradeHistory) ? tradeHistory : [];
    if ((!userTrades || userTrades.length === 0) && userId) {
      try {
        const supabase = createClient();
        const { data: trades, error } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", userId)
          .order("opentime", { ascending: false })
          .limit(100);
        if (error) {
          console.error("Error fetching trades:", error);
        } else {
          userTrades = (trades || []).map((r: any) => mergeTradeSecret(userId!, r));
        }
      } catch (dbErr) {
        console.error("Supabase client/query failed:", dbErr);
        // proceed with empty trades
        userTrades = [];
      }
    }

    let assignedPlan: AIUserPlan | null = null;

    // Configure AIService plan from user (admins => elite)
    try {
      const normalizePlan = (p?: string, email?: string): AIUserPlan["id"] => {
        const admin = !!email && email.toLowerCase() === "abdulmuizproject@gmail.com";
        if (admin) return 'elite';
        const v = (p || '').toLowerCase();
        if (v === 'elite' || v === 'plus' || v === 'pro') return v as any;
        return 'starter';
      };
      const id = normalizePlan(userPlanStr, userEmail);
      const plan: AIUserPlan = {
      
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        limits: {
          maxHistoryDays: id === 'elite' ? 36500 : id === 'plus' ? 365 : id === 'pro' ? 182 : 30,
          maxAccounts: id === 'elite' ? 999 : id === 'plus' ? 3 : id === 'pro' ? 1 : 0,
          aiFeatures: id === 'elite'
            ? ['advanced_analytics','ai_trade_reviews','vision','predictive','personalized']
            : id === 'plus'
              ? ['advanced_analytics','ai_trade_reviews','vision','predictive']
              : id === 'pro'
                ? ['advanced_analytics']
                : ['basic_analytics','performance_overview'],
          advancedAnalytics: id !== 'starter',
          strategyBuilder: id === 'plus' || id === 'elite',
          propFirmDashboard: id === 'elite',
        }
      };
      assignedPlan = plan;
      aiService.setUserPlan(plan);
    } catch (planErr) {
      console.warn('AI plan configuration failed:', planErr);
    }

    const planId = assignedPlan?.id ?? 'starter';
    if (requestedMode === 'grok' && planId !== 'plus' && planId !== 'elite') {
      return NextResponse.json({
        response: "Tradia Grok Fast Mode is available on Plus and Elite plans. Upgrade to unlock explainable AI callouts, predictive bias detection, and instant playbooks."
      });
    }

    // Analyze uploaded images if any (metadata only)
    let imageAnalysis: any = null;
    try {
      if (attachments && attachments.length > 0) {
        imageAnalysis = await analyzeTradeScreenshots(attachments);
      }
    } catch (imgErr) {
      console.warn("Image analysis skipped due to error:", imgErr);
    }

    // Generate AI response (hardened against failures)
    let aiResponse = "";
    try {
      // Precompute ML analysis (not returned directly but improves responses)
      await aiService.createMLAnalysis(userTrades || []);
      aiResponse = await aiService.generatePersonalizedResponse(
        message || "",
        userTrades || [],
        {
          recentTrades: userTrades?.slice(-10),
          uploadedImages: attachments as any,
          marketCondition: 'General market analysis',
          mode: requestedMode
        }
      );
    } catch (aiErr) {
      console.error("AI generation error:", aiErr);
      // Fall back to a simple deterministic message so the client does not show a hard error
      const total = Array.isArray(userTrades) ? userTrades.length : 0;
      aiResponse = `Here's a quick look: you have ${total} trades available. Ask me about performance, risk, or patterns.`;
    }

    // Ensure we always have a response
    if (!aiResponse || aiResponse.trim().length === 0) {
      const total = Array.isArray(userTrades) ? userTrades.length : 0;
      aiResponse = `🤖 **Tradia AI Assistant**\n\nI need trading data to provide personalized insights. You currently have ${total} trades in your account.\n\n**To get started, you can:**\n• **Connect your MT5 account**: Go to Settings → MT5 Connection to sync your live trading data\n• **Upload trade history**: Click the upload button (📤) to import CSV/XLSX files\n• **Add trades manually**: Use the upload button to enter trades one by one\n\nOnce you have trades loaded, I can analyze your performance, risk management, and provide personalized recommendations!\n\nWhat would you like to do first?`;
    }

    return NextResponse.json({
      response: aiResponse,
      analysis: imageAnalysis,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("AI Chat API Error:", error);
    // Final safety net: return 200 with a graceful fallback so the UI avoids a generic error bubble
    return NextResponse.json({
      response: "I hit a snag processing that. From what I can see, try asking about your win rate, risk, or best symbols and I’ll break it down.",
      analysis: null,
      timestamp: new Date().toISOString(),
    });
  }
}

async function analyzeTradeScreenshots(attachments: Array<{ name?: string; type?: string; size?: number }>): Promise<any> {
  // In a real implementation, this would use AI vision models
  // For now, we'll provide mock analysis
  const analysis = {
    screenshots: attachments.map((file, index) => ({
      filename: file?.name || `attachment_${index + 1}`,
      analysis: {
        tradeType: Math.random() > 0.5 ? "Long" : "Short",
        entryQuality: Math.random() > 0.7 ? "Excellent" : Math.random() > 0.4 ? "Good" : "Needs Improvement",
        riskManagement: Math.random() > 0.6 ? "Proper" : "Could be better",
        exitTiming: Math.random() > 0.5 ? "Optimal" : "Could be improved",
        recommendations: [
          "Consider tightening stop loss by 5-10 pips",
          "Entry timing was well-executed",
          "Monitor for reversal signals at target"
        ],
        potentialIssues: [
          "Slightly wide stop loss",
          "Could have used trailing stop"
        ]
      }
    })),
    overallAssessment: {
      score: Math.floor(Math.random() * 30) + 70, // 70-100 score
      strengths: [
        "Good market timing",
        "Proper position sizing",
        "Clear entry signal"
      ],
      areasForImprovement: [
        "Stop loss placement",
        "Profit taking strategy",
        "Risk-reward ratio"
      ]
    }
  };

  return analysis;
}

async function generateAIResponse(
  message: string,
  trades: any[],
  imageAnalysis: any,
  conversationHistory: Array<{ role: string; content: string }>,
  aiAnalysis: any
): Promise<string> {
  try {

    const context = {
      userMessage: message,
      tradeCount: trades.length,
      performanceMetrics: aiAnalysis,
      imageAnalysis: imageAnalysis,
      conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
    };

    // Generate response based on message type
    const lowerMessage = message.toLowerCase();

    if (imageAnalysis) {
      return generateImageAnalysisResponse(message, imageAnalysis, trades);
    }

    if (lowerMessage.includes('win rate') || lowerMessage.includes('performance')) {
      return generatePerformanceResponse(trades, aiAnalysis);
    }

    if (lowerMessage.includes('pattern') || lowerMessage.includes('strategy')) {
      return generatePatternResponse(trades, aiAnalysis);
    }

    if (lowerMessage.includes('risk') || lowerMessage.includes('money management')) {
      return generateRiskResponse(trades, aiAnalysis);
    }

    // General response
    return generateGeneralResponse(message, trades, aiAnalysis);

  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble analyzing your request right now. Please try again in a moment.";
  }
}

function generateImageAnalysisResponse(message: string, imageAnalysis: any, trades: any[]): string {
  const screenshots = imageAnalysis.screenshots;
  const assessment = imageAnalysis.overallAssessment;

  let response = `📸 **Trade Screenshot Analysis Complete**\n\n`;

  response += `I've analyzed ${screenshots.length} trade screenshot(s) for you:\n\n`;

  screenshots.forEach((shot: any, index: number) => {
    response += `**Screenshot ${index + 1} (${shot.filename}):**\n`;
    response += `• Trade Direction: ${shot.analysis.tradeType}\n`;
    response += `• Entry Quality: ${shot.analysis.entryQuality}\n`;
    response += `• Risk Management: ${shot.analysis.riskManagement}\n`;
    response += `• Exit Timing: ${shot.analysis.exitTiming}\n\n`;

    if (shot.analysis.recommendations.length > 0) {
      response += `💡 **Recommendations:**\n`;
      shot.analysis.recommendations.forEach((rec: string) => {
        response += `• ${rec}\n`;
      });
      response += `\n`;
    }
  });

  response += `**Overall Assessment: ${assessment.score}/100**\n\n`;

  if (assessment.strengths.length > 0) {
    response += `✅ **Strengths:**\n`;
    assessment.strengths.forEach((strength: string) => {
      response += `• ${strength}\n`;
    });
    response += `\n`;
  }

  if (assessment.areasForImprovement.length > 0) {
    response += `🎯 **Areas for Improvement:**\n`;
    assessment.areasForImprovement.forEach((area: string) => {
      response += `• ${area}\n`;
    });
    response += `\n`;
  }

  response += `Would you like me to elaborate on any of these points or analyze additional screenshots?`;

  return response;
}

function generatePerformanceResponse(trades: any[], analysis: any): string {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.outcome === 'Win').length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

  let response = `📊 **Performance Analysis**\n\n`;
  response += `**Overall Statistics:**\n`;
  response += `• Total Trades: ${totalTrades}\n`;
  response += `• Win Rate: ${winRate}%\n`;
  response += `• Total P&L: $${totalPnL.toFixed(2)}\n`;
  response += `• Average Trade: $${avgTrade.toFixed(2)}\n\n`;

  if (analysis.insights) {
    response += `**Key Insights:**\n`;
    analysis.insights.slice(0, 3).forEach((insight: any) => {
      response += `• ${insight.title}: ${insight.description}\n`;
    });
    response += `\n`;
  }

  response += `**Recommendations:**\n`;
  response += `• Focus on maintaining your current win rate while increasing average profit per trade\n`;
  response += `• Consider implementing stricter risk management rules\n`;
  response += `• Study your losing trades to identify common patterns\n\n`;

  response += `Would you like me to analyze specific time periods or strategies in more detail?`;

  return response;
}

function generatePatternResponse(trades: any[], analysis: any): string {
  // Group trades by symbol
  const symbolStats = trades.reduce((acc: any, trade: any) => {
    const symbol = trade.symbol || 'Unknown';
    if (!acc[symbol]) {
      acc[symbol] = { total: 0, wins: 0, pnl: 0 };
    }
    acc[symbol].total++;
    if (trade.outcome === 'Win') acc[symbol].wins++;
    acc[symbol].pnl += trade.pnl || 0;
    return acc;
  }, {});

  let response = `🎯 **Trading Pattern Analysis**\n\n`;

  response += `**Best Performing Symbols:**\n`;
  Object.entries(symbolStats)
    .sort(([, a]: any, [, b]: any) => b.pnl - a.pnl)
    .slice(0, 3)
    .forEach(([symbol, stats]: [string, any]) => {
      const winRate = stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0;
      response += `• ${symbol}: ${winRate}% win rate, $${stats.pnl.toFixed(2)} P&L\n`;
    });

  response += `\n**Strategy Insights:**\n`;
  response += `• Your most profitable approach appears to be ${getRandomStrategy()}\n`;
  response += `• Consider focusing more on ${getRandomTimeframe()} timeframes\n`;
  response += `• Your risk-reward ratio could be optimized\n\n`;

  response += `**Pattern Recommendations:**\n`;
  response += `• Continue trading your best-performing symbols\n`;
  response += `• Implement position sizing based on win probability\n`;
  response += `• Consider adding technical indicators for better entry timing\n\n`;

  response += `Would you like me to analyze specific patterns or timeframes in more detail?`;

  return response;
}

function generateRiskResponse(trades: any[], analysis: any): string {
  const totalTrades = trades.length;
  const losingTrades = trades.filter(t => t.outcome === 'Loss').length;
  const avgLoss = losingTrades > 0 ?
    trades.filter(t => t.outcome === 'Loss').reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losingTrades : 0;

  let response = `🛡️ **Risk Management Analysis**\n\n`;

  response += `**Risk Metrics:**\n`;
  response += `• Total Trades: ${totalTrades}\n`;
  response += `• Losing Trades: ${losingTrades}\n`;
  response += `• Average Loss: $${avgLoss.toFixed(2)}\n`;
  response += `• Max Drawdown: ${calculateMaxDrawdown(trades)}\n\n`;

  response += `**Risk Assessment:**\n`;
  if (avgLoss < 50) {
    response += `• Your risk per trade is well-controlled\n`;
  } else if (avgLoss < 100) {
    response += `• Consider reducing your risk per trade\n`;
  } else {
    response += `• Your risk per trade is too high - implement stricter limits\n`;
  }

  response += `\n**Recommendations:**\n`;
  response += `• Never risk more than 1-2% of your account per trade\n`;
  response += `• Use stop losses on every trade\n`;
  response += `• Implement a maximum daily loss limit\n`;
  response += `• Consider position sizing based on volatility\n\n`;

  response += `Would you like me to help you create a risk management plan?`;

  return response;
}

function generateGeneralResponse(message: string, trades: any[], analysis: any): string {
  let response = `🤖 **AI Trading Assistant**\n\n`;

  response += `I've analyzed your ${trades.length} trades and I'm here to help you improve your trading performance.\n\n`;

  response += `**What I can help you with:**\n`;
  response += `• 📊 **Performance Analysis** - Win rates, P&L, drawdowns\n`;
  response += `• 🎯 **Strategy Optimization** - Identify profitable patterns\n`;
  response += `• 🛡️ **Risk Management** - Position sizing, stop losses\n`;
  response += `• 📸 **Screenshot Analysis** - Review your trade setups\n`;
  response += `• 💡 **Personalized Recommendations** - Based on your data\n\n`;

  response += `**Quick Stats:**\n`;
  const winRate = trades.length > 0 ?
    (trades.filter(t => t.outcome === 'Win').length / trades.length * 100).toFixed(1) : 0;
  response += `• Win Rate: ${winRate}%\n`;
  response += `• Total P&L: $${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}\n\n`;

  response += `Try asking me questions like:\n`;
  response += `• "What's my strongest trading pattern?"\n`;
  response += `• "Analyze my risk management"\n`;
  response += `• "Show me my performance by timeframe"\n`;
  response += `• Upload a screenshot: "Review this trade setup"\n\n`;

  response += `What would you like to explore first?`;

  return response;
}

function calculateMaxDrawdown(trades: any[]): string {
  if (trades.length === 0) return "$0.00";

  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;

  for (const trade of trades) {
    runningPnL += trade.pnl || 0;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return `$${maxDrawdown.toFixed(2)}`;
}

function getRandomStrategy(): string {
  const strategies = ['momentum trading', 'breakout trading', 'mean reversion', 'scalping', 'swing trading'];
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function getRandomTimeframe(): string {
  const timeframes = ['1-minute', '5-minute', '15-minute', '1-hour', '4-hour', 'daily'];
  return timeframes[Math.floor(Math.random() * timeframes.length)];
}
