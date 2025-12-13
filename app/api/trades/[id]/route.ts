import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET /api/trades/[id]
 * Fetch a single trade by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trade not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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
 * Update a trade
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch existing trade to get metadata
    const { data: existingTrade, error: fetchError } = await supabase
      .from("trades")
      .select("metadata")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    const updateData = {
      symbol: body.symbol || existingTrade?.metadata?.symbol,
      side: body.direction ? (body.direction || "buy").toLowerCase() : undefined,
      quantity: body.lotSize !== undefined ? body.lotSize : undefined,
      price: body.entryPrice !== undefined ? body.entryPrice : undefined,
      pnl: body.pnl !== undefined ? body.pnl : undefined,
      timestamp: body.openTime ? new Date(body.openTime).toISOString() : undefined,
      status: body.outcome === "closed" || body.closeTime ? "closed" : undefined,
      metadata: {
        ...(existingTrade?.metadata || {}),
        direction: body.direction || undefined,
        orderType: body.orderType || undefined,
        openTime: body.openTime || undefined,
        closeTime: body.closeTime || undefined,
        session: body.session || undefined,
        stopLossPrice: body.stopLossPrice !== undefined ? body.stopLossPrice : undefined,
        takeProfitPrice: body.takeProfitPrice !== undefined ? body.takeProfitPrice : undefined,
        outcome: body.outcome || undefined,
        resultRR: body.resultRR !== undefined ? body.resultRR : undefined,
        duration: body.duration || undefined,
        reasonForTrade: body.reasonForTrade || undefined,
        strategy: body.strategy || undefined,
        emotion: body.emotion || undefined,
        journalNotes: body.journalNotes !== undefined ? body.journalNotes : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        beforeScreenshotUrl: body.beforeScreenshotUrl !== undefined ? body.beforeScreenshotUrl : undefined,
        afterScreenshotUrl: body.afterScreenshotUrl !== undefined ? body.afterScreenshotUrl : undefined,
        updated_at: new Date().toISOString(),
      },
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]
    );

    const { data, error } = await supabase
      .from("trades")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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
 * Delete a trade
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: error.message },
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
