/**
 * app/api/aiFlows/route.ts
 * Quick AI Flows API
 * Provides 30-trade summary and 3-point improvement plan
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { computePerformanceSummary, formatSummaryText, type Trade, type PerformanceSummary } from "@/lib/performanceSummary";
import { buildModePrompt, extractActionPoints, type AIMode, type UserProfile } from "@/lib/modePrompts";
import { callMistral, type MistralMessage } from "@/lib/mistralClient";

export const dynamic = 'force-dynamic';

interface AIFlowRequest {
  mode?: AIMode;
  tradeLimit?: number;
}

interface AIFlowResponse {
  success: boolean;
  summary?: PerformanceSummary;
  summaryText?: string;
  aiInsights?: string;
  actionPlan?: string[];
  error?: string;
}

/**
 * POST /api/aiFlows
 * Generate 30-trade summary and improvement plan
 */
export async function POST(request: NextRequest): Promise<NextResponse<AIFlowResponse>> {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: AIFlowRequest = await request.json();
    const { mode = 'coach', tradeLimit = 30 } = body;

    // Validate mode
    if (!['coach', 'mentor', 'assistant'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid mode. Must be 'coach', 'mentor', or 'assistant'" },
        { status: 400 }
      );
    }

    // Get user profile
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, metadata, plan")
      .eq("id", session.user.id)
      .single();

    if (userError) {
      console.error("Failed to fetch user data:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Build user profile
    const userProfile: UserProfile = {
      id: userData.id,
      marketPreference: userData.metadata?.market_preference || 'both',
      plan: userData.plan || 'free',
    };

    // Fetch recent trades
    const { data: tradesData, error: tradesError } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", session.user.id)
      .order("timestamp", { ascending: false })
      .limit(tradeLimit);

    if (tradesError) {
      console.error("Failed to fetch trades:", tradesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    // Check if user has trades
    if (!tradesData || tradesData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No trades found. Please import or add trades first." 
        },
        { status: 404 }
      );
    }

    // Map database trades to Trade interface
    const trades: Trade[] = tradesData.map((t: any) => ({
      id: t.id,
      symbol: t.symbol || 'UNKNOWN',
      side: t.side || 'buy',
      entry_price: parseFloat(t.price || t.entry_price || 0),
      exit_price: t.exit_price ? parseFloat(t.exit_price) : undefined,
      quantity: parseFloat(t.quantity || 0),
      lot_size: t.lot_size ? parseFloat(t.lot_size) : undefined,
      pnl: t.pnl !== undefined ? parseFloat(t.pnl) : undefined,
      timestamp: t.timestamp || t.opentime || new Date().toISOString(),
      exit_timestamp: t.exit_timestamp || t.closetime,
      status: t.status || 'closed',
      metadata: t.metadata || {},
    }));

    // Compute performance summary
    const summary = computePerformanceSummary(trades, tradeLimit);
    const summaryText = formatSummaryText(summary);

    // Build prompt for AI insights
    const systemPrompt = buildModePrompt(mode, userProfile, summary);
    const userMessage = `Based on my last ${summary.totalTrades} trades, please provide:

1. A brief assessment of my current trading performance
2. Three specific, actionable improvements I should focus on
3. One strength to build on

Here's my performance data:
${summaryText}

Please be specific and reference the actual numbers from my performance.`;

    const messages: MistralMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call AI service
    const aiInsights = await callMistral({
      messages,
      temperature: mode === 'coach' ? 0.8 : mode === 'mentor' ? 0.7 : 0.6,
      max_tokens: 1000,
    });

    // Extract action points
    const actionPlan = extractActionPoints(aiInsights);

    return NextResponse.json({
      success: true,
      summary,
      summaryText,
      aiInsights,
      actionPlan,
    });
  } catch (error) {
    console.error("AI Flows API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/aiFlows
 * Get performance summary without AI insights (faster)
 */
export async function GET(request: NextRequest): Promise<NextResponse<AIFlowResponse>> {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get trade limit from query params
    const { searchParams } = new URL(request.url);
    const tradeLimit = parseInt(searchParams.get('limit') || '30', 10);

    // Fetch recent trades
    const supabase = createClient();
    const { data: tradesData, error: tradesError } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", session.user.id)
      .order("timestamp", { ascending: false })
      .limit(tradeLimit);

    if (tradesError) {
      console.error("Failed to fetch trades:", tradesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch trades" },
        { status: 500 }
      );
    }

    if (!tradesData || tradesData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No trades found" 
        },
        { status: 404 }
      );
    }

    // Map database trades to Trade interface
    const trades: Trade[] = tradesData.map((t: any) => ({
      id: t.id,
      symbol: t.symbol || 'UNKNOWN',
      side: t.side || 'buy',
      entry_price: parseFloat(t.price || t.entry_price || 0),
      exit_price: t.exit_price ? parseFloat(t.exit_price) : undefined,
      quantity: parseFloat(t.quantity || 0),
      lot_size: t.lot_size ? parseFloat(t.lot_size) : undefined,
      pnl: t.pnl !== undefined ? parseFloat(t.pnl) : undefined,
      timestamp: t.timestamp || t.opentime || new Date().toISOString(),
      exit_timestamp: t.exit_timestamp || t.closetime,
      status: t.status || 'closed',
      metadata: t.metadata || {},
    }));

    // Compute performance summary
    const summary = computePerformanceSummary(trades, tradeLimit);
    const summaryText = formatSummaryText(summary);

    return NextResponse.json({
      success: true,
      summary,
      summaryText,
    });
  } catch (error) {
    console.error("AI Flows GET error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
