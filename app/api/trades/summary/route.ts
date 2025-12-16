// src/app/api/trades/summary/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { withDerivedTradeTimes, getTradeCloseTime } from "@/lib/trade-field-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Parse query parameters for date range
    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const symbol = url.searchParams.get('symbol');
    const outcome = url.searchParams.get('outcome');

    // Build query
    let query = supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId);

    if (start) {
      query = query.gte("opentime", start);
    }
    if (end) {
      query = query.lte("closetime", end);
    }
    if (symbol) {
      query = query.ilike("symbol", `%${symbol}%`);
    }
    if (outcome) {
      query = query.eq("outcome", outcome);
    }

    const { data: trades, error } = await query;
    if (error) throw error;

    const processedTrades = (trades || []).map((row: any) => withDerivedTradeTimes(row));

    // Calculate metrics
    const metrics = calculateTradeMetrics(processedTrades);

    return NextResponse.json(metrics);
  } catch (err: unknown) {
    console.error("Failed to fetch trade summary:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to fetch trade summary" }, { status: 500 });
  }
}

function calculateTradeMetrics(trades: any[]) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netPnL: 0,
      avgRR: 0,
      maxDrawdown: 0,
      pnlChart: [],
      winLossHistogram: { wins: 0, losses: 0 }
    };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.outcome === 'win');
  const losingTrades = trades.filter(t => t.outcome === 'loss');
  const winRate = (winningTrades.length / totalTrades) * 100;

  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const netPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Average Risk-Reward ratio
  const avgRR = losingTrades.length > 0 ? (totalProfit / totalLoss) : 0;

  // Calculate drawdown
  const pnlChart = calculatePnLChart(trades);
  const maxDrawdown = calculateMaxDrawdown(pnlChart);

  // Win/Loss histogram
  const winLossHistogram = {
    wins: winningTrades.length,
    losses: losingTrades.length
  };

  return {
    totalTrades,
    winRate: Math.round(winRate * 10) / 10,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    netPnL: Math.round(netPnL * 100) / 100,
    avgRR: Math.round(avgRR * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    pnlChart,
    winLossHistogram
  };
}

function calculatePnLChart(trades: any[]) {
  // Sort trades by exit time
  const sortedTrades = [...trades].sort((a, b) => getSortableTime(a) - getSortableTime(b));

  let cumulativePnL = 0;
  const chart = sortedTrades.map(trade => {
    cumulativePnL += trade.pnl || 0;
    const closeTime = getTradeCloseTime(trade);
    return {
      date: closeTime,
      pnl: Math.round(cumulativePnL * 100) / 100
    };
  });

  return chart;
}

const getSortableTime = (trade: Record<string, any>): number => {
  const candidates = [
    getTradeCloseTime(trade),
    trade.updated_at,
    trade.created_at,
    trade.timestamp,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = new Date(candidate).getTime();
    if (!Number.isNaN(value)) {
      return value;
    }
  }

  return 0;
};

function calculateMaxDrawdown(pnlChart: any[]) {
  if (pnlChart.length === 0) return 0;

  let peak = pnlChart[0].pnl;
  let maxDrawdown = 0;

  for (const point of pnlChart) {
    if (point.pnl > peak) {
      peak = point.pnl;
    }
    const drawdown = peak - point.pnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}
