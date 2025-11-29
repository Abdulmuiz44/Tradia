// src/app/api/trades/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { makeSecret, mergeTradeSecret, splitTradeFields } from "@/lib/secure-store";

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

/**
 * GET /api/trades
 * Fetch user's trades from database
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();


    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const symbol = url.searchParams.get('symbol');
    const outcome = url.searchParams.get('outcome');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    // Build query
    let query = supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("opentime", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (symbol) {
      query = query.ilike("symbol", `%${symbol}%`);
    }

    if (outcome) {
      query = query.eq("outcome", outcome);
    }

    if (start) {
      query = query.gte("opentime", start);
    }

    if (end) {
      query = query.lte("closetime", end);
    }

    const { data: trades, error, count } = await query;

    if (error) throw error;

    const decrypted = (trades || []).map((row: any) => mergeTradeSecret(userId!, row));

    // Map database fields to frontend camelCase
    const mappedTrades = decrypted.map(mapToCamelCase);

    return NextResponse.json({
      trades: mappedTrades,
      total: count || 0,
      limit,
      offset
    });
  } catch (err: unknown) {
    console.error("Failed to fetch trades:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to fetch trades" }, { status: 500 });
  }
}

/**
 * POST /api/trades
 * Create a new trade manually
 */
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

// Field mapping from database snake_case to frontend camelCase
const mapToCamelCase = (data: any) => {
  const openTime = coalesce(data.opentime, data.open_time, data.entry_time);
  const closeTime = coalesce(data.closetime, data.close_time, data.exit_time);
  const outcome = normalizeOutcomeValue(data.outcome);
  const tags = normalizeTags(data.tags);

  return {
    id: data.id,
    user_id: data.user_id,
    symbol: data.symbol,
    direction: data.direction,
    orderType: coalesce(data.ordertype, data.order_type),
    openTime,
    closeTime,
    session: data.session,
    lotSize: data.lotsize ?? data.lot_size,
    entryPrice: data.entryprice ?? data.entry_price,
    exitPrice: data.exitprice ?? data.exit_price,
    stopLossPrice: data.stoplossprice ?? data.stop_loss_price,
    takeProfitPrice: data.takeprofitprice ?? data.take_profit_price,
    pnl: data.pnl,
    profitLoss: data.profitloss ?? data.profit_loss,
    resultRR: data.resultrr ?? data.result_rr,
    rr: data.rr,
    outcome,
    duration: data.duration,
    beforeScreenshotUrl: data.beforescreenshoturl ?? data.before_screenshot_url,
    afterScreenshotUrl: data.afterscreenshoturl ?? data.after_screenshot_url,
    commission: data.commission,
    swap: data.swap,
    pinned: data.pinned,
    tags,
    reviewed: data.reviewed,
    strategy: data.strategy,
    emotion: data.emotion,
    reasonForTrade: data.reasonfortrade ?? data.reason_for_trade,
    journalNotes: data.journalnotes ?? data.journal_notes,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at,
    entry_time: openTime,
    exit_time: closeTime,
    entry_price: data.entryprice ?? data.entry_price,
    exit_price: data.exitprice ?? data.exit_price,
    lot_size: data.lotsize ?? data.lot_size,
    stop_loss_price: data.stoplossprice ?? data.stop_loss_price,
    take_profit_price: data.takeprofitprice ?? data.take_profit_price,
    profit_loss: data.profitloss ?? data.profit_loss,
    result_rr: data.resultrr ?? data.result_rr,
    before_screenshot_url: data.beforescreenshoturl ?? data.before_screenshot_url,
    after_screenshot_url: data.afterscreenshoturl ?? data.after_screenshot_url,
    emotion_label: data.emotion_label,
    reason_for_trade: data.reason_for_trade,
    journal_notes: data.journal_notes,
    strategy_tags: data.strategy_tags,
  };
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tradeData = await req.json();
    const supabase = createClient();

    // Generate trade ID
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Map frontend fields to database fields
    const dbFields = mapToSnakeCase(tradeData);

    // Normalize and validate trade data
    const { safe, sensitive } = splitTradeFields(dbFields);
    const secret = makeSecret(userId, "trade", sensitive);

    const normalizedTrade = {
      id: tradeId,
      user_id: userId,
      ...safe,
      secret,
      symbol: String(tradeData.symbol || "").toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: "manual"
    };

    const { data, error } = await supabase
      .from("trades")
      .insert(normalizedTrade)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trade: mergeTradeSecret(userId, data) });
  } catch (err: unknown) {
    console.error("Failed to create trade:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to create trade" }, { status: 500 });
  }
}

/**
 * PATCH /api/trades
 * Update an existing trade
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ error: "Missing trade id" }, { status: 400 });

    const supabase = createClient();

    const { safe, sensitive } = splitTradeFields(updates);
    const secret = makeSecret(userId, "trade", sensitive);

    const { data, error } = await supabase
      .from("trades")
      .update({
        ...safe,
        secret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const decrypted = mergeTradeSecret(userId, data);
    const mappedTrade = mapToCamelCase(decrypted);

    return NextResponse.json({ trade: mappedTrade });
  } catch (err: unknown) {
    console.error("Failed to update trade:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to update trade" }, { status: 500 });
  }
}

/**
 * DELETE /api/trades?id=...
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete trade:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to delete trade" }, { status: 500 });
  }
}
