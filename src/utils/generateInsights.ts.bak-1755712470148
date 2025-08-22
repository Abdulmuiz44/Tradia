// src/utils/generateInsights.ts
import { Trade } from "@/types/trade";

/**
 * Insight shape returned to UI components
 */
export type Insight = {
  id: string;
  title: string;
  detail: string;
  score?: number; // 0..1 importance / confidence (optional)
  severity?: "info" | "warning" | "recommendation";
};

/**
 * Metrics computed from trades for programmatic consumption
 */
export type TradeMetrics = {
  totalTrades: number;
  totalPnL: number;
  avgPnL: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldHours: number;
  topSymbols: Array<{ symbol: string; trades: number; pnl: number }>;
  expectancy: number;
};

function toNumber(v?: string | number | null | unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v);
  const n = Number(s.replace(/[^0-9\.\-eE]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toDate(v?: string | number | null | unknown): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(Number(s));
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function computeMetrics(trades: Trade[]): TradeMetrics {
  const list = Array.isArray(trades) ? trades : [];
  const totalTrades = list.length;

  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let largestWin = -Infinity;
  let largestLoss = Infinity;
  let sumWin = 0;
  let sumLoss = 0;
  let totalHoldMs = 0;

  const symbolMap = new Map<string, { trades: number; pnl: number }>();

  for (const t of list) {
    const pnl =
      toNumber((t as unknown as Record<string, unknown>).pnl ?? (t as unknown as Record<string, unknown>).profit ?? (t as unknown as Record<string, unknown>).profitLoss ?? 0);
    totalPnL += pnl;
    if (pnl > 0) {
      wins++;
      sumWin += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      losses++;
      sumLoss += pnl;
      if (pnl < largestLoss) largestLoss = pnl;
    }

    const openDt = toDate((t as unknown as Record<string, unknown>).openTime ?? (t as unknown as Record<string, unknown>).open_time ?? (t as unknown as Record<string, unknown>).time);
    const closeDt = toDate((t as unknown as Record<string, unknown>).closeTime ?? (t as unknown as Record<string, unknown>).close_time ?? (t as unknown as Record<string, unknown>).close);

    if (openDt) {
      const end = closeDt ?? new Date();
      const ms = end.getTime() - openDt.getTime();
      if (!isNaN(ms) && ms > 0) totalHoldMs += ms;
    }

    const sym = (t as unknown as Record<string, unknown>).symbol ?? (t as unknown as Record<string, unknown>).instrument ?? "UNKNOWN";
    const symStr = String(sym);
    const existing = symbolMap.get(symStr) ?? { trades: 0, pnl: 0 };
    existing.trades += 1;
    existing.pnl += pnl;
    symbolMap.set(symStr, existing);
  }

  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  const avgWin = wins > 0 ? sumWin / wins : 0;
  const avgLoss = losses > 0 ? sumLoss / losses : 0;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;
  const avgHoldHours = totalTrades > 0 ? totalHoldMs / totalTrades / (1000 * 60 * 60) : 0;

  const topSymbols = Array.from(symbolMap.entries())
    .map(([symbol, { trades, pnl }]) => ({ symbol, trades, pnl }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 8);

  if (largestWin === -Infinity) largestWin = 0;
  if (largestLoss === Infinity) largestLoss = 0;

  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

  return {
    totalTrades,
    totalPnL,
    avgPnL,
    wins,
    losses,
    winRate,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgHoldHours,
    topSymbols,
    expectancy,
  };
}

export function generateInsights(trades: Trade[] | undefined | null): Insight[] {
  const list = Array.isArray(trades) ? trades : [];
  if (list.length === 0) return [];

  const m = computeMetrics(list);
  const insights: Insight[] = [];

  insights.push({
    id: "summary",
    title: `${m.totalTrades} trades — ${m.wins} wins / ${m.losses} losses`,
    detail: `Total PnL: ${m.totalPnL >= 0 ? "+" : ""}${m.totalPnL.toFixed(2)} — Avg: ${m.avgPnL.toFixed(
      2
    )} per trade. Win rate ${Math.round(m.winRate * 100)}%.`,
    score: 0.9,
    severity: "info",
  });

  insights.push({
    id: "expectancy",
    title: "Expectancy",
    detail: `Expectancy per trade: ${m.expectancy.toFixed(2)} (win rate ${Math.round(
      m.winRate * 100
    )}%, avg win ${m.avgWin.toFixed(2)}, avg loss ${m.avgLoss.toFixed(2)}).`,
    score: Math.min(0.9, Math.abs(m.expectancy) / (Math.abs(m.avgWin) + 1 || 1)),
    severity: "info",
  });

  if (m.largestLoss < 0) {
    insights.push({
      id: "largest-loss",
      title: `Largest loss: ${m.largestLoss.toFixed(2)}`,
      detail: `Your largest single losing trade was ${m.largestLoss.toFixed(
        2
      )}. Consider position-sizing or stop adjustments to limit exposure.`,
      score: 0.8,
      severity: "warning",
    });
  }

  if (m.largestWin > 0) {
    insights.push({
      id: "largest-win",
      title: `Largest win: ${m.largestWin.toFixed(2)}`,
      detail: `Your best trade returned ${m.largestWin.toFixed(
        2
      )}. Analyze which setup produced this to repeat the positive behavior.`,
      score: 0.6,
      severity: "recommendation",
    });
  }

  insights.push({
    id: "hold-time",
    title: `Average holding time: ${m.avgHoldHours.toFixed(2)} hours`,
    detail: `On average trades are held for ${m.avgHoldHours.toFixed(
      2
    )} hours. Shorter holding times often indicate scalping / intraday style.`,
    score: 0.5,
    severity: "info",
  });

  if (m.topSymbols.length > 0) {
    const best = m.topSymbols[0];
    const symbolList = m.topSymbols.map((s) => `${s.symbol} (${s.trades} trades, PnL ${s.pnl.toFixed(2)})`).join(", ");
    insights.push({
      id: "top-symbols",
      title: `Top symbols by PnL — ${best.symbol}`,
      detail: `Top symbols: ${symbolList}`,
      score: 0.7,
      severity: "recommendation",
    });
  }

  if (m.winRate < 0.4 && m.expectancy > 0) {
    insights.push({
      id: "low-win-high-expectancy",
      title: "Low win rate but positive expectancy",
      detail:
        "Your win rate is below 40%, but expectancy is positive — you may be using a strategy with small win rate but larger winners. Focus on risk management and scaling winners.",
      score: 0.8,
      severity: "recommendation",
    });
  }

  if (m.winRate > 0.6 && m.expectancy < 0) {
    insights.push({
      id: "high-win-negative-expectancy",
      title: "High win rate but negative expectancy",
      detail:
        "You win often but overall expectancy is negative. Likely many small winners and few big losers — consider improving stop-loss discipline or reducing position size on losing setups.",
      score: 0.85,
      severity: "warning",
    });
  }

  return insights.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** support both default and named imports */
export default generateInsights;
