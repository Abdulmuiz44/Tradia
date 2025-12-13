import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Trade } from "@/types/trade";

/**
 * GET /api/trades
 * Fetch all trades for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", session.user.id)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trades
 * Create a new trade
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const tradeData = {
      user_id: session.user.id,
      symbol: body.symbol || "",
      side: (body.direction || "buy").toLowerCase(),
      quantity: body.lotSize || 0,
      price: body.entryPrice || 0,
      pnl: body.pnl || 0,
      timestamp: body.openTime ? new Date(body.openTime).toISOString() : new Date().toISOString(),
      status: body.outcome === "closed" || body.closeTime ? "closed" : "open",
      metadata: {
        direction: body.direction || "Buy",
        orderType: body.orderType || "Market Execution",
        openTime: body.openTime || "",
        closeTime: body.closeTime || "",
        session: body.session || "",
        stopLossPrice: body.stopLossPrice || 0,
        takeProfitPrice: body.takeProfitPrice || 0,
        outcome: body.outcome || "Breakeven",
        resultRR: body.resultRR || 0,
        duration: body.duration || "",
        reasonForTrade: body.reasonForTrade || "",
        strategy: body.strategy || "",
        emotion: body.emotion || "neutral",
        journalNotes: body.journalNotes || body.notes || "",
        beforeScreenshotUrl: body.beforeScreenshotUrl,
        afterScreenshotUrl: body.afterScreenshotUrl,
        created_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from("trades")
      .insert([tradeData])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
