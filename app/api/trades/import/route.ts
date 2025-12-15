import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { createClient } from '@/utils/supabase/server';

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

// Field mapping from frontend camelCase to database snake_case (unified with main route)
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

export async function POST(request: Request) {
  try {
    const { trades, source } = await request.json();

    if (!trades || !Array.isArray(trades)) {
      return NextResponse.json({ error: 'Invalid request body. Missing trades.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const supabase = createClient();

    // Process each trade
    const insertedTrades = [];
    for (const tradeData of trades) {
      // Generate trade ID
      const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Map frontend fields to database fields
      const dbFields = mapToSnakeCase(tradeData);

      const normalizedTrade = {
        id: tradeId,
        user_id: userId,
        ...dbFields,
        symbol: String(tradeData.symbol || '').toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('trades')
        .insert(normalizedTrade)
        .select()
        .single();

      if (error) {
        console.error('Error inserting trade:', error);
        continue; // Skip failed trades
      }

      insertedTrades.push(data);
    }

    return NextResponse.json({
      newTrades: insertedTrades.length,
      updatedTrades: 0,
      message: `Successfully imported ${insertedTrades.length} trades.`
    });
  } catch (error: any) {
    console.error('Error importing trades:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
