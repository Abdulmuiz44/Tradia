// src/app/api/trades/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { Trade } from "@/types/trade";

interface ImportRequest {
  trades: Partial<Trade>[];
  source: string;
  accountInfo?: any;
  syncId?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ImportRequest = await req.json();
    const { trades, source, accountInfo, syncId } = body;

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: "No trades to import" }, { status: 400 });
    }

    const supabase = createClient();

    let newTrades = 0;
    let updatedTrades = 0;
    let skippedTrades = 0;
    const importedTrades: Trade[] = [];

    // Process each trade
    for (const tradeData of trades) {
      try {
        // Validate and normalize trade data
        const normalizedTrade = await normalizeAndValidateTrade(tradeData, userId);

        if (!normalizedTrade) {
          skippedTrades++;
          continue;
        }

        // Check if trade already exists (by symbol, openTime, and closeTime)
        const existingTrade = await findExistingTrade(supabase, normalizedTrade, userId);

        if (existingTrade) {
          // Update existing trade
          const { error: updateError } = await supabase
            .from("trades")
            .update({
              ...normalizedTrade,
              updated_at: new Date().toISOString(),
              source,
              sync_id: syncId
            })
            .eq("id", existingTrade.id);

          if (updateError) {
            console.error("Failed to update trade:", updateError);
            skippedTrades++;
          } else {
            updatedTrades++;
            importedTrades.push({ ...existingTrade, ...normalizedTrade } as Trade);
          }
        } else {
          // Insert new trade
          const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const { error: insertError } = await supabase
            .from("trades")
            .insert({
              id: tradeId,
              ...normalizedTrade,
              user_id: userId,
              source,
              sync_id: syncId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error("Failed to insert trade:", insertError);
            skippedTrades++;
          } else {
            newTrades++;
            importedTrades.push({
              ...normalizedTrade,
              id: tradeId,
              symbol: normalizedTrade.symbol || 'UNKNOWN',
              openTime: normalizedTrade.openTime || new Date().toISOString(),
              pnl: normalizedTrade.pnl || 0,
              lotSize: normalizedTrade.lotSize || 0.01,
              entryPrice: normalizedTrade.entryPrice || 0
            } as Trade);
          }
        }
      } catch (err) {
        console.error("Error processing trade:", err);
        skippedTrades++;
      }
    }

    // Update sync session if provided
    if (syncId) {
      await supabase
        .from("mt5_sync_sessions")
        .update({
          total_trades: trades.length,
          new_trades: newTrades,
          updated_trades: updatedTrades,
          completed_at: new Date().toISOString()
        })
        .eq("id", syncId);
    }

    return NextResponse.json({
      success: true,
      totalTrades: trades.length,
      newTrades,
      updatedTrades,
      skippedTrades,
      importedTrades
    });

  } catch (err) {
    console.error("Trade import error:", err);
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Normalize and validate trade data
 */
async function normalizeAndValidateTrade(tradeData: Partial<Trade>, userId: string): Promise<Partial<Trade> | null> {
  try {
    // Required fields validation
    if (!tradeData.symbol || !tradeData.openTime) {
      console.warn("Trade missing required fields:", tradeData);
      return null;
    }

    // Normalize outcome
    let outcome: 'Win' | 'Loss' | 'Breakeven' = 'Breakeven';
    if (tradeData.outcome) {
      const outcomeStr = String(tradeData.outcome).toLowerCase();
      if (outcomeStr.includes('win')) outcome = 'Win';
      else if (outcomeStr.includes('loss')) outcome = 'Loss';
    } else if (tradeData.pnl !== undefined) {
      // Determine outcome from P&L if not provided
      if (tradeData.pnl > 0) outcome = 'Win';
      else if (tradeData.pnl < 0) outcome = 'Loss';
    }

    // Calculate resultRR if not provided
    let resultRR = tradeData.resultRR;
    if (resultRR === undefined || resultRR === null) {
      resultRR = calculateResultRR(tradeData, outcome);
    }

    // Normalize dates
    const openTime = normalizeDate(tradeData.openTime);
    const closeTime = tradeData.closeTime ? normalizeDate(tradeData.closeTime) : undefined;

    // Calculate duration if not provided
    let duration = tradeData.duration;
    if (!duration && openTime && closeTime) {
      const durationMs = closeTime.getTime() - openTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      duration = `${durationMinutes} min`;
    }

    // Normalize numeric fields
    const normalized: Partial<Trade> = {
      symbol: tradeData.symbol ? String(tradeData.symbol).toUpperCase() : '',
      direction: tradeData.direction || (tradeData.pnl && tradeData.pnl >= 0 ? 'Buy' : 'Sell'),
      orderType: tradeData.orderType || 'Market Execution',
      openTime: openTime?.toISOString(),
      closeTime: closeTime?.toISOString(),
      session: tradeData.session || 'Regular',
      lotSize: normalizeNumber(tradeData.lotSize) || 0.01,
      entryPrice: normalizeNumber(tradeData.entryPrice),
      exitPrice: normalizeNumber(tradeData.exitPrice),
      stopLossPrice: normalizeNumber(tradeData.stopLossPrice),
      takeProfitPrice: normalizeNumber(tradeData.takeProfitPrice),
      pnl: normalizeNumber(tradeData.pnl) || 0,
      outcome,
      resultRR: normalizeNumber(resultRR),
      duration: duration || '',
      reasonForTrade: tradeData.reasonForTrade || '',
      emotion: tradeData.emotion || 'neutral',
      journalNotes: tradeData.journalNotes || tradeData.notes || '',
      commission: normalizeNumber(tradeData.commission) || 0,
      swap: normalizeNumber(tradeData.swap) || 0
    };

    return normalized;
  } catch (err) {
    console.error("Error normalizing trade:", err);
    return null;
  }
}

/**
 * Find existing trade by key fields
 */
async function findExistingTrade(supabase: any, trade: Partial<Trade>, userId: string) {
  if (!trade.symbol || !trade.openTime) return null;

  const { data, error } = await supabase
    .from("trades")
    .select("id")
    .eq("user_id", userId)
    .eq("symbol", trade.symbol)
    .eq("open_time", trade.openTime)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error finding existing trade:", error);
    return null;
  }

  return data;
}

/**
 * Calculate result RR from trade data
 */
function calculateResultRR(trade: Partial<Trade>, outcome: 'Win' | 'Loss' | 'Breakeven'): number {
  if (outcome === 'Loss') return -1;
  if (outcome === 'Breakeven') return 0;

  // For wins, calculate RR based on entry/exit prices
  const entry = normalizeNumber(trade.entryPrice);
  const exit = normalizeNumber(trade.exitPrice);
  const sl = normalizeNumber(trade.stopLossPrice);

  if (!entry || !exit) return 1; // Default 1R for wins without price data

  // Calculate risk (entry to stop loss)
  const risk = sl ? Math.abs(entry - sl) : entry * 0.02; // Default 2% risk
  if (risk === 0) return 1;

  // Calculate reward (entry to exit)
  const reward = Math.abs(exit - entry);

  return reward / risk;
}

/**
 * Normalize number values
 */
function normalizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9eE.+-]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

/**
 * Normalize date values
 */
function normalizeDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === "number") {
    if (value < 1e11) return new Date(value * 1000); // seconds to milliseconds
    return new Date(value);
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}