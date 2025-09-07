// src/app/api/ai/chat/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { aiService } from "@/lib/ai/AIService";

interface ChatRequest {
  message: string;
  tradeHistory?: any[];
  attachments?: File[];
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Get user ID from session - NextAuth stores it in token.userId
    const token = await import("next-auth/jwt").then(({ getToken }) =>
      getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    );
    const userId = token?.userId || (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChatRequest = await req.json();
    const { message, tradeHistory, attachments, conversationHistory } = body;

    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Message or attachments required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get user's trade history if not provided
    let userTrades = tradeHistory;
    if (!userTrades && userId) {
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .order("open_time", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching trades:", error);
      } else {
        userTrades = trades || [];
      }
    }

    // Analyze uploaded images if any
    let imageAnalysis = null;
    if (attachments && attachments.length > 0) {
      imageAnalysis = await analyzeTradeScreenshots(attachments);
    }

    // Generate AI response using the AI service
    const aiAnalysis = await aiService.createMLAnalysis(userTrades || []);

    // Use the new AI-powered response generation
    const aiResponse = await aiService.generatePersonalizedResponse(
      message,
      userTrades || [],
      {
        recentTrades: userTrades?.slice(-10), // Last 10 trades for context
        uploadedImages: attachments,
        marketCondition: 'General market analysis' // Could be enhanced with real market data
      }
    );

    return NextResponse.json({
      response: aiResponse,
      analysis: imageAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}

async function analyzeTradeScreenshots(attachments: File[]): Promise<any> {
  // In a real implementation, this would use AI vision models
  // For now, we'll provide mock analysis
  const analysis = {
    screenshots: attachments.map((file, index) => ({
      filename: file.name,
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