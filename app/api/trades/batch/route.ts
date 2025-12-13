import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "@/types/trade";

/**
 * POST /api/trades/batch
 * Create multiple trades at once (for CSV import)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    const body = await request.json();
    const trades = body.trades || [];

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json(
        { error: "No trades provided" },
        { status: 400 }
      );
    }

    const tradesToInsert = trades.map((t: Partial<Trade>) => ({
      user_id: session.user.id,
      symbol: t.symbol || "",
      side: (t.direction || "buy").toLowerCase(),
      quantity: t.lotSize || 0,
      price: t.entryPrice || 0,
      pnl: t.pnl || 0,
      timestamp: t.openTime ? new Date(t.openTime).toISOString() : new Date().toISOString(),
      status: t.closeTime ? "closed" : "open",
      metadata: {
        direction: t.direction || "Buy",
        orderType: t.orderType || "Market Execution",
        openTime: t.openTime || "",
        closeTime: t.closeTime || "",
        session: t.session || "",
        stopLossPrice: t.stopLossPrice || 0,
        takeProfitPrice: t.takeProfitPrice || 0,
        outcome: t.outcome || "Breakeven",
        resultRR: t.resultRR || 0,
        duration: t.duration || "",
        reasonForTrade: t.reasonForTrade || "",
        strategy: t.strategy || "",
        emotion: t.emotion || "neutral",
        journalNotes: t.journalNotes || t.notes || "",
        beforeScreenshotUrl: t.beforeScreenshotUrl,
        afterScreenshotUrl: t.afterScreenshotUrl,
        created_at: new Date().toISOString(),
      },
    }));

    const { data, error } = await supabase
      .from("trades")
      .insert(tradesToInsert)
      .select();

    if (error) {
      console.error("Supabase batch insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Trades imported successfully",
        count: data?.length || 0,
        trades: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
