import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// Access control: Only Plus and Elite plans can access Tradia Predict
const ALLOWED_PLANS = ["plus", "elite"];

export async function GET(request: NextRequest) {
  try {
    // Check authentication and plan access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: "Unauthorized", 
        message: "Please sign in to access Tradia Predict" 
      }, { status: 401 });
    }

    const userPlan = ((session.user as any)?.plan || "free").toLowerCase();
    
    // Enforce Plus and Elite only access
    if (!ALLOWED_PLANS.includes(userPlan)) {
      return NextResponse.json({ 
        error: "Upgrade Required", 
        message: "Tradia Predict is available for Plus and Elite members only. Please upgrade your plan.",
        requiredPlans: ["plus", "elite"],
        currentPlan: userPlan
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pair = searchParams.get("pair");

    if (!pair) {
      return NextResponse.json({ error: "Pair query parameter is required" }, { status: 400 });
    }

    // Use OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
    return NextResponse.json({
      error: "OpenAI API key not configured",
        message: "OpenAI API key is missing. Please configure OPENAI_API_KEY in environment variables."
      }, { status: 500 });
    }

    try {
      const prompt = `As an expert forex trader and market analyst, provide a market prediction for the ${pair} currency pair. Analyze current market conditions, technical indicators, and macroeconomic factors to predict the next likely direction. Consider support/resistance levels, momentum, and recent price action.

Provide your analysis in the following JSON format:
{
    "pair": "${pair}",
    "direction": "Bullish" or "Bearish",
    "bull_prob": probability as number 0-100,
    "confidence": confidence level 0-100,
    "horizon": hours ahead (1-24),
    "analysis": "brief explanation",
  "signals": {
    "technical": score 0-100,
    "momentum": score 0-100,
    "macro": score 0-100
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: "PREDICTION_FAILED",
        message: `OpenAI API error: ${errorData?.error?.message || response.statusText}`,
        status: response.status
      }, { status: 500 });
    }

    const completion = await response.json();

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({
        error: "PREDICTION_FAILED",
        message: "No response from OpenAI",
        model: "OpenAI GPT-4"
      }, { status: 500 });
    }

    let prediction;
    try {
      prediction = JSON.parse(content);
    } catch (parseError) {
      // If not JSON, create a structured response
      prediction = {
        pair,
        direction: content.toLowerCase().includes("bullish") ? "Bullish" : "Bearish",
        bull_prob: content.toLowerCase().includes("bullish") ? 65 : 35,
        confidence: 70,
        horizon: 4,
        analysis: content,
        signals: {
          technical: 70,
          momentum: 65,
          macro: 60
        }
      };
    }

    // Add metadata
    const result = {
      ...prediction,
      model: "OpenAI GPT-4",
      userPlan,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({
        error: "PREDICTION_ERROR",
        message: error?.message || "Failed to generate prediction",
        model: "OpenAI GPT-4"
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      error: "INTERNAL_ERROR", 
      message: error?.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}
