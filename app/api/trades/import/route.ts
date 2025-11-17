import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { createClient } from '@/utils/supabase/server';
import { makeSecret, splitTradeFields } from '@/lib/secure-store';

// Field mapping from frontend camelCase to database snake_case
const mapToSnakeCase = (data: any) => ({
  symbol: data.symbol,
  direction: data.direction,
  ordertype: data.orderType,
  opentime: data.openTime,
  closetime: data.closeTime,
  entry_time: data.entryTime || data.entry_time,
  exit_time: data.exitTime || data.exit_time,
  session: data.session,
  lotsize: data.lotSize,
  lot_size: data.lotSize || data.lot_size,
  quantity: data.quantity,
  entryprice: data.entryPrice,
  exitprice: data.exitPrice,
  stoplossprice: data.stopLossPrice,
  takeprofitprice: data.takeProfitPrice,
  pnl: data.pnl,
  profitloss: data.profitLoss,
  resultrr: data.resultRR,
  rr: data.rr,
  outcome: data.outcome,
  duration: data.duration,
  beforescreenshoturl: data.beforeScreenshotUrl,
  afterscreenshoturl: data.afterScreenshotUrl,
  commission: data.commission,
  swap: data.swap,
  pinned: data.pinned,
  tags: data.tags,
  reviewed: data.reviewed,
  strategy: data.strategy,
  emotion: data.emotion,
  reasonfortrade: data.reasonForTrade,
  journalnotes: data.journalNotes,
  comment: data.comment || data.journalNotes,
  notes: data.notes,
  market: data.market,
});

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

      // Normalize and validate trade data
      const { safe, sensitive } = splitTradeFields(dbFields);
      const secret = makeSecret(userId, 'trade', sensitive);

      const normalizedTrade = {
        id: tradeId,
        user_id: userId,
        ...safe,
        secret,
        symbol: String(tradeData.symbol || '').toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: source || 'import'
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
