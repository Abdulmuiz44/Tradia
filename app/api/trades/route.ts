import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "@/types/trade";

export const dynamic = 'force-dynamic';

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

        // Validate that account_id is provided
        const accountId = body.account_id || body.accountId;
        if (!accountId) {
            return NextResponse.json(
                {
                    error: "Trading account is required",
                    message: "You must select a trading account before adding a trade. Create or select an account first."
                },
                { status: 400 }
            );
        }

        // Calculate RR if not provided
        const calculateRR = (entryPrice: number, stopLossPrice: number, takeProfitPrice: number): number => {
            if (!entryPrice || !stopLossPrice || entryPrice === 0 || stopLossPrice === 0) {
                return 0;
            }
            const risk = Math.abs(entryPrice - stopLossPrice);
            if (risk === 0) return 0;
            if (takeProfitPrice && takeProfitPrice !== 0) {
                const reward = Math.abs(takeProfitPrice - entryPrice);
                return Math.round((reward / risk) * 100) / 100;
            }
            return 0;
        };

        const entryPrice = body.entryPrice || 0;
        const stopLossPrice = body.stopLossPrice || 0;
        const takeProfitPrice = body.takeProfitPrice || 0;
        const resultRR = body.resultRR || calculateRR(entryPrice, stopLossPrice, takeProfitPrice);

        const tradeData = {
            user_id: session.user.id,
            account_id: accountId,
            symbol: body.symbol || "",
            direction: body.direction || "Buy",
            ordertype: body.orderType || "Market Execution",
            opentime: body.openTime ? new Date(body.openTime).toISOString() : new Date().toISOString(),
            closetime: body.closeTime ? new Date(body.closeTime).toISOString() : null,
            session: body.session || "",
            lotsize: body.lotSize || 0,
            entryprice: entryPrice,
            exitprice: body.exitPrice || null,
            stoplossprice: stopLossPrice,
            takeprofitprice: takeProfitPrice,
            pnl: body.pnl || 0,
            outcome: body.outcome || "breakeven",
            resultrr: resultRR,
            duration: body.duration || "",
            reasonfortrade: body.reasonForTrade || "",
            strategy: body.strategy || "",
            emotion: body.emotion || "neutral",
            journalnotes: body.journalNotes || body.notes || "",
            beforescreenshoturl: body.beforeScreenshotUrl || null,
            afterscreenshoturl: body.afterScreenshotUrl || null,
            commission: body.commission || 0,
            swap: body.swap || 0,
            pinned: body.pinned || false,
            tags: body.tags || [],
            reviewed: body.reviewed || false,
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
        if (body.lotSize !== undefined) updateData.lotsize = body.lotSize;
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
        if (body.account_id !== undefined) updateData.account_id = body.account_id;
        if (body.accountId !== undefined) updateData.account_id = body.accountId;

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

        return NextResponse.json(data, { status: 200 });
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
