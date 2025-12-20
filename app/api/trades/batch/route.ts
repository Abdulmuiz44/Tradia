import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "@/types/trade";

export const dynamic = 'force-dynamic';

const coalesce = <T>(...values: (T | null | undefined)[]): T | undefined => {
    for (const value of values) {
        if (value !== null && value !== undefined) {
            return value;
        }
    }
    return undefined;
};

const CANONICAL_OUTCOMES = new Set(["win", "loss", "breakeven"]);

const normalizeOutcomeValue = (value: any) => {
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (CANONICAL_OUTCOMES.has(lower)) {
            return lower;
        }
    }
    return value;
};

const normalizeTags = (value: any) => {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
    }
    return value;
};

// Field mapping from frontend camelCase to database snake_case
const mapToSnakeCase = (data: any) => {
    const raw = (data.raw ?? {}) as any;
    return {
        symbol: coalesce(data.symbol, raw.symbol),
        direction: coalesce(data.direction, raw.direction),
        ordertype: coalesce(data.orderType, data.ordertype, data.order_type, raw.orderType, raw.ordertype),
        opentime: coalesce(data.openTime, data.opentime, data.entry_time, data.open_time, raw.openTime, raw.entry_time),
        closetime: coalesce(data.closeTime, data.closetime, data.exit_time, data.close_time, raw.closeTime, raw.exit_time),
        session: coalesce(data.session, raw.session),
        lotsize: coalesce(data.lotSize, data.lotsize, data.lot_size, raw.lotSize, raw.lot_size),
        entryprice: coalesce(data.entryPrice, data.entryprice, data.entry_price, raw.entryPrice, raw.entry_price),
        exitprice: coalesce(data.exitPrice, data.exitprice, data.exit_price, raw.exitPrice, raw.exit_price),
        stoplossprice: coalesce(
            data.stopLossPrice,
            data.stoplossprice,
            data.stop_loss_price,
            raw.stopLossPrice,
            raw.stop_loss_price
        ),
        takeprofitprice: coalesce(
            data.takeProfitPrice,
            data.takeprofitprice,
            data.take_profit_price,
            raw.takeProfitPrice,
            raw.take_profit_price
        ),
        pnl: coalesce(data.pnl, raw.pnl, data.profit, data.netProfit),
        profitloss: coalesce(data.profitLoss, data.profitloss, data.profit_loss, raw.profitLoss, raw.profit_loss),
        resultrr: coalesce(data.resultRR, data.resultrr, data.result_rr, raw.resultRR, raw.result_rr),
        rr: coalesce(data.rr, raw.rr),
        outcome: normalizeOutcomeValue(coalesce(data.outcome, raw.outcome)),
        duration: coalesce(data.duration, raw.duration),
        beforescreenshoturl: coalesce(
            data.beforeScreenshotUrl,
            data.beforescreenshoturl,
            data.before_screenshot_url,
            raw.beforeScreenshotUrl,
            raw.before_screenshot_url
        ),
        afterscreenshoturl: coalesce(
            data.afterScreenshotUrl,
            data.afterscreenshoturl,
            data.after_screenshot_url,
            raw.afterScreenshotUrl,
            raw.after_screenshot_url
        ),
        commission: coalesce(data.commission, raw.commission),
        swap: coalesce(data.swap, raw.swap),
        pinned: coalesce(data.pinned, raw.pinned),
        tags: normalizeTags(coalesce(data.tags, raw.tags)),
        reviewed: coalesce(data.reviewed, raw.reviewed),
        strategy: coalesce(data.strategy, raw.strategy),
        emotion: coalesce(data.emotion, data.emotion_label, raw.emotion, raw.emotion_label),
        reasonfortrade: coalesce(
            data.reasonForTrade,
            data.reasonfortrade,
            data.reason_for_trade,
            raw.reasonForTrade,
            raw.reason_for_trade
        ),
        journalnotes: coalesce(
            data.journalNotes,
            data.journalnotes,
            data.journal_notes,
            raw.journalNotes,
            raw.journal_notes
        ),
        notes: coalesce(data.notes, raw.notes),
    };
};

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

        const tradesToInsert = trades.map((t: Partial<Trade>, idx: number) => {
            // Map frontend fields to database fields
            const dbFields = mapToSnakeCase(t);

            // Build clean trade object with only valid database columns
            const tradeData: Record<string, any> = {
                user_id: session.user.id,
                account_id: dbFields.account_id || null,
                symbol: String(t.symbol || '').toUpperCase(),
                direction: dbFields.direction || "Buy",
                ordertype: dbFields.ordertype || "Market Execution",
                opentime: dbFields.opentime ? new Date(String(dbFields.opentime)).toISOString() : new Date().toISOString(),
                closetime: dbFields.closetime ? new Date(String(dbFields.closetime)).toISOString() : null,
                session: dbFields.session || "",
                lotsize: Number(dbFields.lotsize) || 0,
                entryprice: Number(dbFields.entryprice) || 0,
                exitprice: dbFields.exitprice ? Number(dbFields.exitprice) : null,
                stoplossprice: Number(dbFields.stoplossprice) || 0,
                takeprofitprice: Number(dbFields.takeprofitprice) || 0,
                pnl: Number(dbFields.pnl) || 0,
                outcome: (dbFields.outcome || "breakeven").toLowerCase(),
                resultrr: Number(dbFields.resultrr) || 0,
                duration: dbFields.duration || "",
                reasonfortrade: dbFields.reasonfortrade || "",
                strategy: dbFields.strategy || "",
                emotion: dbFields.emotion || "neutral",
                journalnotes: dbFields.journalnotes || "",
                beforescreenshoturl: dbFields.beforescreenshoturl || null,
                afterscreenshoturl: dbFields.afterscreenshoturl || null,
                commission: Number(dbFields.commission) || 0,
                swap: Number(dbFields.swap) || 0,
                pinned: Boolean(dbFields.pinned) || false,
                tags: Array.isArray(dbFields.tags) ? dbFields.tags : [],
                reviewed: Boolean(dbFields.reviewed) || false,
            };

            return tradeData;
        });

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
