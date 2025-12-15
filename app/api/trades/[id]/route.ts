import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "@/types/trade";

/**
 * GET /api/trades/[id]
 * Fetch a single trade by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const tradeId = params.id;

    const { data: trade, error } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .eq("user_id", session.user.id)
      .single();

    if (error || !trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trades/[id]
 * Update a trade by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const tradeId = params.id;
    const body = await request.json();

    // Fetch existing trade to verify ownership
    const { data: existingTrade, error: fetchError } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !existingTrade) {
      return NextResponse.json(
        { error: "Trade not found or unauthorized" },
        { status: 404 }
      );
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, any> = {};

    if (body.symbol !== undefined) updateData.symbol = body.symbol;
    if (body.direction !== undefined) updateData.direction = body.direction;
    if (body.orderType !== undefined) updateData.ordertype = body.orderType;
    if (body.openTime !== undefined) updateData.opentime = new Date(body.openTime).toISOString();
    if (body.closeTime !== undefined) updateData.closetime = body.closeTime ? new Date(body.closeTime).toISOString() : null;
    if (body.session !== undefined) updateData.session = body.session;
    if (body.lotSize !== undefined) updateData.lotsize = body.lotSize;
    if (body.entryPrice !== undefined) updateData.entryprice = body.entryPrice;
    if (body.exitPrice !== undefined) updateData.exitprice = body.exitPrice;
    if (body.stopLossPrice !== undefined) updateData.stoplossprice = body.stopLossPrice;
    if (body.takeProfitPrice !== undefined) updateData.takeprofitprice = body.takeProfitPrice;
    if (body.pnl !== undefined) updateData.pnl = body.pnl;
    if (body.outcome !== undefined) updateData.outcome = body.outcome;
    if (body.resultRR !== undefined) updateData.resultrr = body.resultRR;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.reasonForTrade !== undefined) updateData.reasonfortrade = body.reasonForTrade;
    if (body.strategy !== undefined) updateData.strategy = body.strategy;
    if (body.emotion !== undefined) updateData.emotion = body.emotion;
    if (body.journalNotes !== undefined) updateData.journalnotes = body.journalNotes;
    if (body.beforeScreenshotUrl !== undefined) updateData.beforescreenshoturl = body.beforeScreenshotUrl;
    if (body.afterScreenshotUrl !== undefined) updateData.afterscreenshoturl = body.afterScreenshotUrl;
    if (body.commission !== undefined) updateData.commission = body.commission;
    if (body.swap !== undefined) updateData.swap = body.swap;
    if (body.pinned !== undefined) updateData.pinned = body.pinned;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.reviewed !== undefined) updateData.reviewed = body.reviewed;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: updatedTrade, error: updateError } = await supabase
      .from("trades")
      .update(updateData)
      .eq("id", tradeId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update trade" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTrade, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trades/[id]
 * Delete a trade by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const tradeId = params.id;

    // Verify ownership before deleting
    const { data: trade, error: fetchError } = await supabase
      .from("trades")
      .select("id")
      .eq("id", tradeId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !trade) {
      return NextResponse.json(
        { error: "Trade not found or unauthorized" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId)
      .eq("user_id", session.user.id);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete trade" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Trade deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
