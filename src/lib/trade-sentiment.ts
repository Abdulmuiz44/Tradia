// src/lib/trade-sentiment.ts
import type { Trade } from "@/types/trade";

export type SentimentFlags = {
  lossStreak: number;
  overtrading: boolean;
  revengeRisk: boolean;
  suggestion: string;
};

/**
 * Heuristic, client-safe analysis of recent trades to surface coaching prompts.
 * - lossStreak: longest consecutive losses at the end of the series
 * - overtrading: more than 10 trades in last 24h
 * - revengeRisk: large negative PnL after consecutive losses
 */
export function analyzeTradeSentiment(trades: Trade[]): SentimentFlags {
  const last = [...trades].slice(-20);
  // compute end-of-series loss streak
  let lossStreak = 0;
  for (let i = last.length - 1; i >= 0; i--) {
    const pnl = Number((last[i] as any).pnl) || 0;
    if (pnl < 0) lossStreak++; else break;
  }

  // simple overtrading: trades opened within last 24h
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const trades24h = last.filter((t) => {
    const ts = new Date((t as any).openTime || (t as any).open_time || (t as any).created_at || 0).getTime();
    return Number.isFinite(ts) && ts >= dayAgo;
  });
  const overtrading = trades24h.length >= 10;

  // revenge risk: at least 2 losses then a large negative outlier (2x avg abs loss)
  const losses = last.filter((t) => (Number((t as any).pnl) || 0) < 0).map((t) => Math.abs(Number((t as any).pnl) || 0));
  const avgLoss = losses.length ? losses.reduce((s, v) => s + v, 0) / losses.length : 0;
  let revengeRisk = false;
  if (lossStreak >= 2 && avgLoss > 0) {
    const recentBigNeg = last.slice(-1).some((t) => Math.abs(Number((t as any).pnl) || 0) >= 2 * avgLoss);
    revengeRisk = recentBigNeg;
  }

  // suggestion text
  let suggestion = "You're doing fine. Keep following your plan.";
  if (lossStreak >= 3) suggestion = "You're on a losing streak — pause for 10 mins?";
  if (overtrading) suggestion = "High activity today — consider a short mindfulness break.";
  if (revengeRisk) suggestion = "Big loss after losses — step back and reset before next trade.";

  return { lossStreak, overtrading, revengeRisk, suggestion };
}

