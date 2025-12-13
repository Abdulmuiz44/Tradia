import { useCallback, useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";

/**
 * Custom hook to fetch and process trade data
 * Can be used across multiple pages like trade-journal, trade-analytics, etc.
 */
export function useTradeData() {
  const { trades, loading, error, refreshTrades } = useTrade();

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
        profitTrades: 0,
        lossTrades: 0,
        breakevenTrades: 0,
        avgRR: 0,
        symbols: [],
        bestTrade: null,
        worstTrade: null,
      };
    }

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let rrSum = 0;
    let rrCount = 0;
    const symbols = new Set<string>();
    let bestTrade: Trade | null = null;
    let worstTrade: Trade | null = null;
    let bestPnL = -Infinity;
    let worstPnL = Infinity;

    trades.forEach((trade) => {
      const pnl = Number(trade.pnl) || 0;
      totalPnL += pnl;

      if (pnl > 0) {
        wins++;
        if (pnl > bestPnL) {
          bestPnL = pnl;
          bestTrade = trade;
        }
      } else if (pnl < 0) {
        losses++;
        if (pnl < worstPnL) {
          worstPnL = pnl;
          worstTrade = trade;
        }
      } else {
        breakeven++;
      }

      if (trade.symbol) {
        symbols.add(trade.symbol);
      }

      const rr = Number(trade.resultRR) || 0;
      if (isFinite(rr)) {
        rrSum += rr;
        rrCount++;
      }
    });

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
    const avgRR = rrCount > 0 ? rrSum / rrCount : 0;

    return {
      totalTrades,
      totalWins: wins,
      totalLosses: losses,
      winRate,
      totalPnL,
      avgPnL,
      profitTrades: wins,
      lossTrades: losses,
      breakevenTrades: breakeven,
      avgRR,
      symbols: Array.from(symbols),
      bestTrade,
      worstTrade,
    };
  }, [trades]);

  // Filter trades by outcome
  const filterByOutcome = useCallback(
    (outcome: "Win" | "Loss" | "Breakeven") => {
      return trades.filter(
        (t) => t.outcome?.toLowerCase() === outcome.toLowerCase()
      );
    },
    [trades]
  );

  // Filter trades by symbol
  const filterBySymbol = useCallback(
    (symbol: string) => {
      return trades.filter((t) => t.symbol === symbol);
    },
    [trades]
  );

  // Filter trades by date range
  const filterByDateRange = useCallback(
    (startDate: Date, endDate: Date) => {
      return trades.filter((t) => {
        const tradeDate = new Date(t.openTime || t.created_at || "");
        return tradeDate >= startDate && tradeDate <= endDate;
      });
    },
    [trades]
  );

  // Filter trades by session
  const filterBySession = useCallback(
    (session: string) => {
      return trades.filter((t) => t.session === session);
    },
    [trades]
  );

  // Filter trades by strategy
  const filterByStrategy = useCallback(
    (strategy: string) => {
      return trades.filter(
        (t) =>
          t.strategy?.toLowerCase() === strategy.toLowerCase() ||
          t.reasonForTrade?.toLowerCase().includes(strategy.toLowerCase())
      );
    },
    [trades]
  );

  // Get trading performance by symbol
  const performanceBySymbol = useMemo(() => {
    const perf: Record<
      string,
      { trades: Trade[]; wins: number; losses: number; winRate: number; pnl: number }
    > = {};

    trades.forEach((trade) => {
      if (!trade.symbol) return;
      if (!perf[trade.symbol]) {
        perf[trade.symbol] = { trades: [], wins: 0, losses: 0, winRate: 0, pnl: 0 };
      }
      perf[trade.symbol].trades.push(trade);
      const pnl = Number(trade.pnl) || 0;
      perf[trade.symbol].pnl += pnl;
      if (trade.outcome?.toLowerCase() === "win") {
        perf[trade.symbol].wins++;
      } else if (trade.outcome?.toLowerCase() === "loss") {
        perf[trade.symbol].losses++;
      }
    });

    // Calculate win rates
    Object.values(perf).forEach((p) => {
      const total = p.wins + p.losses;
      p.winRate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
    });

    return perf;
  }, [trades]);

  // Get trades by direction
  const tradesByDirection = useMemo(() => {
    const buys = trades.filter((t) => t.direction?.toLowerCase() === "buy");
    const sells = trades.filter((t) => t.direction?.toLowerCase() === "sell");
    return { buys, sells };
  }, [trades]);

  return {
    trades,
    loading,
    error,
    refreshTrades,
    metrics,
    filterByOutcome,
    filterBySymbol,
    filterByDateRange,
    filterBySession,
    filterByStrategy,
    performanceBySymbol,
    tradesByDirection,
  };
}
