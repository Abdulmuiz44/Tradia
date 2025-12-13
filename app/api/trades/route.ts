import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "@/types/trade";

/**
 * GET /api/trades
 * Fetch all trades for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = createClient();
        const userId = session.user.id;

        const { data, error } = await supabase
            .from("trades")
            .select("*")
            .eq("user_id", userId)
            .order("opentime", { ascending: false });

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
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = createClient();
        const body = await request.json();

        const tradeData = {
            user_id: session.user.id,
            symbol: body.symbol || "",
            side: (body.direction || "buy").toLowerCase(),
            quantity: body.lotSize || 0,
            price: body.entryPrice || 0,
            pnl: body.pnl || 0,
            opentime: body.openTime ? new Date(body.openTime).toISOString() : new Date().toISOString(),
            closetime: body.closeTime ? new Date(body.closeTime).toISOString() : null,
            status: body.closeTime ? "closed" : "open",
            direction: body.direction || "Buy",
            ordertype: body.orderType || "Market Execution",
            session: body.session || "",
            entryprice: body.entryPrice || 0,
            exitprice: body.exitPrice || null,
            stoplossprice: body.stopLossPrice || 0,
            takeprofitprice: body.takeProfitPrice || 0,
            outcome: body.outcome || "breakeven",
            resultrr: body.resultRR || 0,
            duration: body.duration || "",
            reasonfortrade: body.reasonForTrade || "",
            strategy: body.strategy || "",
            emotion: body.emotion || "neutral",
            journalnotes: body.journalNotes || body.notes || "",
            beforescreenshoturl: body.beforeScreenshotUrl || null,
            afterscreenshoturl: body.afterScreenshotUrl || null,
            lotsize: body.lotSize || 0,
            commission: body.commission || 0,
            swap: body.swap || 0,
            pinned: body.pinned || false,
            tags: body.tags || [],
            reviewed: body.reviewed || false,
            metadata: {
                direction: body.direction || "Buy",
                orderType: body.orderType || "Market Execution",
                openTime: body.openTime || "",
                closeTime: body.closeTime || "",
                session: body.session || "",
                stopLossPrice: body.stopLossPrice || 0,
                takeProfitPrice: body.takeProfitPrice || 0,
                outcome: body.outcome || "breakeven",
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

        return NextResponse.json({ trade: data }, { status: 201 });
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/trades
 * Update a trade
 */
export async function PATCH(request: NextRequest) {
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

        if (!body.id) {
            return NextResponse.json(
                { error: "Trade ID is required" },
                { status: 400 }
            );
        }

        // Fetch existing trade
        const { data: existingTrade, error: fetchError } = await supabase
            .from("trades")
            .select("*")
            .eq("id", body.id)
            .eq("user_id", session?.user?.id || "")
            .single();

        if (fetchError) {
            return NextResponse.json(
                { error: "Trade not found" },
                { status: 404 }
            );
        }

        const updateData: Record<string, any> = {};

        if (body.symbol) updateData.symbol = body.symbol;
        if (body.direction) updateData.direction = body.direction;
        if (body.side) updateData.side = body.side.toLowerCase();
        if (body.lotSize !== undefined) updateData.quantity = body.lotSize;
        if (body.lotsize !== undefined) updateData.lotsize = body.lotsize;
        if (body.entryPrice !== undefined) updateData.entryprice = body.entryPrice;
        if (body.exitPrice !== undefined) updateData.exitprice = body.exitPrice;
        if (body.stopLossPrice !== undefined) updateData.stoplossprice = body.stopLossPrice;
        if (body.takeProfitPrice !== undefined) updateData.takeprofitprice = body.takeProfitPrice;
        if (body.pnl !== undefined) updateData.pnl = body.pnl;
        if (body.openTime) updateData.opentime = new Date(body.openTime).toISOString();
        if (body.closeTime) updateData.closetime = new Date(body.closeTime).toISOString();
        if (body.outcome) updateData.outcome = body.outcome;
        if (body.orderType) updateData.ordertype = body.orderType;
        if (body.session) updateData.session = body.session;
        if (body.duration) updateData.duration = body.duration;
        if (body.reasonForTrade) updateData.reasonfortrade = body.reasonForTrade;
        if (body.strategy) updateData.strategy = body.strategy;
        if (body.emotion) updateData.emotion = body.emotion;
        if (body.journalNotes !== undefined) updateData.journalnotes = body.journalNotes;
        if (body.beforeScreenshotUrl !== undefined) updateData.beforescreenshoturl = body.beforeScreenshotUrl;
        if (body.afterScreenshotUrl !== undefined) updateData.afterscreenshoturl = body.afterScreenshotUrl;
        if (body.commission !== undefined) updateData.commission = body.commission;
        if (body.swap !== undefined) updateData.swap = body.swap;
        if (body.pinned !== undefined) updateData.pinned = body.pinned;
        if (body.tags !== undefined) updateData.tags = body.tags;
        if (body.reviewed !== undefined) updateData.reviewed = body.reviewed;
        if (body.resultRR !== undefined) updateData.resultrr = body.resultRR;

        updateData.metadata = {
            ...(existingTrade?.metadata || {}),
            ...Object.fromEntries(
                Object.entries(body).filter(([key]) => !['id', 'user_id', 'created_at'].includes(key))
            ),
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("trades")
            .update(updateData)
            .eq("id", body.id)
            .eq("user_id", session?.user?.id || "")
            .select()
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ trade: data }, { status: 200 });
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/trades
 * Delete a trade
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = createClient();
        const { searchParams } = new URL(request.url);
        const tradeId = searchParams.get("id");

        if (!tradeId) {
            return NextResponse.json(
                { error: "Trade ID is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("trades")
            .delete()
            .eq("id", tradeId)
            .eq("user_id", session?.user?.id || "");

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
