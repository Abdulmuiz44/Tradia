/**
 * app/api/chat/route.ts
 * AI Chat API with Mode Support
 * Supports coach, mentor, and assistant modes with personalized prompts
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { buildModePrompt, buildContextualMessage, type AIMode, type UserProfile, type StatsSummary } from "@/lib/modePrompts";
import { callMistral, type MistralMessage } from "@/lib/mistralClient";

export const dynamic = 'force-dynamic';

interface ChatRequest {
  userId?: string;
  mode: AIMode;
  message: string;
  contextType?: 'trade' | 'performance' | 'general';
  additionalContext?: string;
  statsSummary?: StatsSummary;
}

interface ChatResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

/**
 * POST /api/chat
 * Send a message to the AI in the specified mode
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
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
    const body: ChatRequest = await request.json();
    const { mode, message, contextType, additionalContext, statsSummary } = body;

    // Validate inputs
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    if (!mode || !['coach', 'mentor', 'assistant'].includes(mode)) {
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

    // Get trade count if not provided in stats
    let stats = statsSummary;
    if (!stats) {
      const { count, error: countError } = await supabase
        .from("trades")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", session.user.id);

      if (!countError) {
        userProfile.tradeCount = count || 0;
      }
    }

    // Build mode-specific system prompt
    const systemPrompt = buildModePrompt(mode, userProfile, stats);

    // Build contextualized user message
    const contextualMessage = buildContextualMessage(message, contextType, additionalContext);

    // Prepare messages for AI
    const messages: MistralMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: contextualMessage,
      },
    ];

    // Call AI service
    const aiReply = await callMistral({
      messages,
      temperature: mode === 'coach' ? 0.8 : mode === 'mentor' ? 0.7 : 0.6,
      max_tokens: 800,
    });

    return NextResponse.json({
      success: true,
      reply: aiReply,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
