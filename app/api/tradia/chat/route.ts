// app/api/tradia/chat/route.ts
/**
 * Tradia Chat API Route
 * 
 * Handles chat requests with Mistral AI integration.
 * Supports all 5 modes: coach, mentor, assistant, analysis, journal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { sendChatMessage, isMistralConfigured } from '@/lib/mistral';
import { isValidMode, getDefaultMode, type TradiaMode } from '@/lib/modes';
import { createClient } from '@/utils/supabase/server';

// Rate limiting map (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute

/**
 * Check rate limit for a user
 */
function checkRateLimit(identifier: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      resetIn: Math.ceil((userLimit.resetTime - now) / 1000)
    };
  }

  userLimit.count++;
  return { allowed: true };
}

/**
 * Validate request body
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return { valid: false, error: 'Message is required and must be a non-empty string' };
  }

  if (body.message.length > 5000) {
    return { valid: false, error: 'Message is too long (max 5000 characters)' };
  }

  if (body.mode && !isValidMode(body.mode)) {
    return { valid: false, error: `Invalid mode. Must be one of: coach, mentor, assistant, analysis, journal` };
  }

  return { valid: true };
}

/**
 * Get user's trading data from database
 */
async function getUserTradingData(userId: string) {
  try {
    const supabase = createClient();
    
    // Fetch recent trades
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('opentime', { ascending: false })
      .limit(100);

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      return { trades: [] };
    }

    // Fetch user profile for additional context
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('email, plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    return {
      trades: trades || [],
      profile: profile || null
    };
  } catch (error) {
    console.error('Error in getUserTradingData:', error);
    return { trades: [] };
  }
}

/**
 * POST handler for chat requests
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { message, userId: providedUserId, mode: requestedMode } = body;

    // Check if Mistral is configured
    if (!isMistralConfigured()) {
      return NextResponse.json(
        {
          error: 'Mistral AI is not configured',
          message: 'The Mistral API key is missing. Please contact the administrator.'
        },
        { status: 503 }
      );
    }

    // Get authenticated user
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userPlan: string | undefined;

    try {
      const session = await getServerSession(authOptions);
      const token = await import('next-auth/jwt').then(({ getToken }) =>
        getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      );

      userId = (token?.userId as string) || (session?.user as any)?.id;
      userEmail = (token?.email as string) || (session?.user as any)?.email;
      userPlan = ((token as any)?.plan as string) || ((session?.user as any)?.plan as string);
    } catch (authError) {
      console.warn('Authentication check failed:', authError);
    }

    // Allow providedUserId from request if authenticated (for admin testing)
    if (!userId && providedUserId) {
      // In production, you might want to restrict this
      userId = providedUserId;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`
        },
        { status: 429 }
      );
    }

    // Determine mode
    const mode: TradiaMode = isValidMode(requestedMode) 
      ? requestedMode 
      : getDefaultMode();

    // Get user's trading data
    const userData = await getUserTradingData(userId);

    // Build context for Mistral
    const context = {
      userName: userEmail?.split('@')[0] || 'Trader',
      tradeData: userData.trades,
      experience: userPlan === 'elite' || userPlan === 'plus' ? 'Advanced' : 
                  userPlan === 'pro' ? 'Intermediate' : 'Beginner',
      // Add more context as needed
    };

    // Get conversation history from request (if provided)
    const conversationHistory = body.conversationHistory || [];

    // Send message to Mistral
    const startTime = Date.now();
    const aiResponse = await sendChatMessage(
      mode,
      userId,
      message,
      {
        context,
        conversationHistory,
        temperature: 0.7,
        maxTokens: 1000,
        useAdvancedModel: mode === 'analysis' || userPlan === 'elite'
      }
    );
    const responseTime = Date.now() - startTime;

    // Log for analytics
    console.log(`Chat response generated - Mode: ${mode}, Time: ${responseTime}ms, User: ${userId}`);

    // Return response
    return NextResponse.json({
      response: aiResponse,
      mode,
      timestamp: new Date().toISOString(),
      metadata: {
        responseTime,
        tradeCount: userData.trades?.length || 0
      }
    });

  } catch (error) {
    console.error('Tradia Chat API Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: error.message
          },
          { status: 429 }
        );
      }

      if (error.message.includes('Invalid Mistral API key')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: 'The AI service is not properly configured.'
          },
          { status: 503 }
        );
      }

      if (error.message.includes('Mistral API')) {
        return NextResponse.json(
          {
            error: 'AI service error',
            message: 'The AI service is temporarily unavailable. Please try again.'
          },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - return API info
 */
export async function GET() {
  return NextResponse.json({
    service: 'Tradia Chat API',
    version: '1.0.0',
    modes: ['coach', 'mentor', 'assistant', 'analysis', 'journal'],
    status: isMistralConfigured() ? 'ready' : 'not_configured',
    documentation: {
      endpoint: '/api/tradia/chat',
      method: 'POST',
      body: {
        message: 'string (required) - The user message',
        userId: 'string (optional) - User identifier',
        mode: 'string (optional) - AI mode: coach | mentor | assistant | analysis | journal',
        conversationHistory: 'array (optional) - Previous messages in conversation'
      },
      response: {
        response: 'string - AI response',
        mode: 'string - Mode used',
        timestamp: 'string - ISO timestamp',
        metadata: 'object - Additional info'
      }
    }
  });
}
