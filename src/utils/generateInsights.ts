import { format } from "date-fns";

type TradeLike = {
  id?: string;
  symbol?: string;
  pnl?: number | string;
  openTime?: string; // ISO or parseable
  strategy?: string | null;
  reasonForTrade?: string | null;
  emotion?: string | null;
  outcome?: string | null;
  // keep raw if present
  [k: string]: any;
};

const parsePL = (v: any): number => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9\.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const hourOf = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours();
};

type Insight = {
  id: string;
  text: string;
  severity?: "info" | "recommendation" | "warning";
  details?: any;
};

/**
 * generateInsights
 * - trades: array of normalized trade objects
 * - options: thresholds and windows
 */
export function generateInsights(
  trades: TradeLike[],
  options?: {
    minTradesForPattern?: number;
    winRateDeltaPct?: number; // e.g. 10 for +10% better than baseline
    timeBucketSizeHours?: number; // e.g. 3 for 3-hour buckets
  }
): Insight[] {
  const minTradesForPattern = options?.minTradesForPattern ?? 6;
  const winRateDeltaPct = options?.winRateDeltaPct ?? 10;
  const timeBucketSizeHours = options?.timeBucketSizeHours ?? 3;

  if (!Array.isArray(trades) || trades.length === 0) {
    return [
      {
        id: "no-trades",
        text: "No trades available to analyze. Add trades or sync your account to get AI insights.",
        severity: "info",
      },
    ];
  }

  // Helper aggregates
  const total = trades.length;

  // === FIXED: never mix ?? and || without parentheses ===
  // prefer: a ?? b ?? (c || 0)
  const parsedPLs = trades.map((t) =>
    parsePL(t.pnl ?? t.profit ?? (t.prof || 0))
  );

  const netPL = parsedPLs.reduce((s, v) => s + v, 0);
  const avgPL = total ? netPL / total : 0;

  // wins: normalize fallback the same way
  const wins = trades.filter(
    (t) =>
      String((t.outcome ?? "").toLowerCase()).includes("win") ||
      parsePL(t.pnl ?? t.profit ?? (t.prof || 0)) > 0
  ).length;

  const globalWinRate = total ? (wins / total) * 100 : 0;

  const insights: Insight[] = [];

  // Top-level summary insight
  insights.push({
    id: "summary",
    text: `Overall: ${total} trades · Win rate ${globalWinRate.toFixed(
      1
    )}% · Avg P/L ${avgPL >= 0 ? "+" : ""}${avgPL.toFixed(2)}.`,
    severity: "info",
    details: { total, globalWinRate, avgPL, netPL },
  });

  // 1) Symbol-level performance & hotspots by time-of-day
  const symbolMap = new Map<
    string,
    { trades: TradeLike[]; wins: number; total: number; netPL: number }
  >();
  trades.forEach((t) => {
    const s = (t.symbol ?? "UNKNOWN").toUpperCase();
    const pl = parsePL(t.pnl ?? t.profit ?? (t.prof || 0));
    if (!symbolMap.has(s)) symbolMap.set(s, { trades: [], wins: 0, total: 0, netPL: 0 });
    const rec = symbolMap.get(s)!;
    rec.trades.push(t);
    rec.total++;
    rec.netPL += pl;
    if (pl > 0 || String((t.outcome ?? "").toLowerCase()).includes("win")) rec.wins++;
  });

  // evaluate each symbol
  const symbolStats = Array.from(symbolMap.entries())
    .map(([sym, { trades: ts, wins: w, total: tot, netPL: npl }]) => ({
      symbol: sym,
      total: tot,
      wins: w,
      winRate: tot ? (w / tot) * 100 : 0,
      avgPL: tot ? npl / tot : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // highlight best performing symbols (with minTrades threshold)
  const notableSymbols = symbolStats.filter(
    (s) => s.total >= Math.max(minTradesForPattern, 3) && s.winRate >= Math.max(60, globalWinRate + winRateDeltaPct)
  );
  if (notableSymbols.length) {
    notableSymbols.slice(0, 3).forEach((s) => {
      insights.push({
        id: `symbol-${s.symbol}`,
        text: `High performer: ${s.symbol} → ${s.winRate.toFixed(
          1
        )}% win rate (${s.total} trades), avg P/L ${s.avgPL.toFixed(
          2
        )}. Consider focusing sizing/edge here.`,
        severity: "recommendation",
        details: s,
      });
    });
  } else {
    // show underperformers also
    const under = symbolStats.filter(
      (s) => s.total >= minTradesForPattern && s.winRate <= Math.min(40, globalWinRate - winRateDeltaPct)
    );
    under.slice(0, 3).forEach((s) => {
      insights.push({
        id: `symbol-low-${s.symbol}`,
        text: `Weak performer: ${s.symbol} → ${s.winRate.toFixed(
          1
        )}% win rate (${s.total} trades). Review entries, timeframe, or avoid scaling this symbol.`,
        severity: "warning",
        details: s,
      });
    });
  }

  // 2) Time-of-day hotspots (per symbol)
  // create buckets: 0..23 -> bucket index floor(hour / bucketSize)
  const bucketSize = timeBucketSizeHours;
  type BucketKey = string; // e.g. "GBPUSD|1" bucket id
  const bucketMap = new Map<
    BucketKey,
    { symbol: string; bucketIndex: number; trades: TradeLike[]; wins: number; total: number; netPL: number }
  >();
  trades.forEach((t) => {
    const s = (t.symbol ?? "UNKNOWN").toUpperCase();
    // cleaned fallback chain for different possible fields
    const hour = hourOf(t.openTime ?? t.open_time ?? t.time ?? "");
    if (hour === null) return;
    const bi = Math.floor(hour / bucketSize);
    const key = `${s}|${bi}`;
    const pl = parsePL(t.pnl ?? t.profit ?? (t.prof || 0));
    if (!bucketMap.has(key)) bucketMap.set(key, { symbol: s, bucketIndex: bi, trades: [], wins: 0, total: 0, netPL: 0 });
    const rec = bucketMap.get(key)!;
    rec.trades.push(t);
    rec.total++;
    rec.netPL += pl;
    if (pl > 0 || String((t.outcome ?? "").toLowerCase()).includes("win")) rec.wins++;
  });

  // compute bucket stats and find best bucket(s) with enough trades
  const bucketStats = Array.from(bucketMap.values())
    .map((b) => ({
      symbol: b.symbol,
      bucketIndex: b.bucketIndex,
      total: b.total,
      wins: b.wins,
      winRate: b.total ? (b.wins / b.total) * 100 : 0,
      avgPL: b.total ? b.netPL / b.total : 0,
    }))
    .filter((b) => b.total >= Math.max(minTradesForPattern, 4));

  // find standout buckets > baseline + delta or absolute threshold
  const interestingBuckets = bucketStats
    .filter((b) => b.winRate >= Math.max(60, globalWinRate + winRateDeltaPct))
    .sort((a, b) => b.winRate - a.winRate);
  if (interestingBuckets.length) {
    const top = interestingBuckets[0];
    const startHour = top.bucketIndex * bucketSize;
    const endHour = Math.min(23, (top.bucketIndex + 1) * bucketSize - 1);
    insights.push({
      id: `time-${top.symbol}-${top.bucketIndex}`,
      text: `Timing edge: For ${top.symbol}, your win rate is ${top.winRate.toFixed(
        1
      )}% between ${startHour}:00–${endHour}:59 (${top.total} trades). Consider prioritizing this window.`,
      severity: "recommendation",
      details: top,
    });
  }

  // 3) Strategy & reason analysis
  const stratMap = new Map<string, { trades: TradeLike[]; wins: number; total: number; netPL: number }>();
  trades.forEach((t) => {
    // ensure the nullish coalescing result is parenthesized before mixing with ||
    const strat = (t.strategy ?? t.reasonForTrade ?? "Unlabeled") || "Unlabeled";
    const pl = parsePL(t.pnl ?? t.profit ?? (t.prof || 0));
    if (!stratMap.has(strat)) stratMap.set(strat, { trades: [], wins: 0, total: 0, netPL: 0 });
    const rec = stratMap.get(strat)!;
    rec.trades.push(t);
    rec.total++;
    rec.netPL += pl;
    if (pl > 0 || String((t.outcome ?? "").toLowerCase()).includes("win")) rec.wins++;
  });

  const stratStats = Array.from(stratMap.entries())
    .map(([name, val]) => ({
      strategy: name,
      total: val.total,
      winRate: val.total ? (val.wins / val.total) * 100 : 0,
      avgPL: val.total ? val.netPL / val.total : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const goodStrats = stratStats.filter(
    (s) => s.total >= Math.max(minTradesForPattern, 3) && s.winRate >= Math.max(55, globalWinRate + winRateDeltaPct / 2)
  );
  if (goodStrats.length) {
    insights.push({
      id: `strategy-good-${goodStrats[0].strategy}`,
      text: `Strategy highlight: "${goodStrats[0].strategy}" has ${goodStrats[0].winRate.toFixed(
        1
      )}% wins over ${goodStrats[0].total} trades. Consider documenting and scaling rules for this strategy.`,
      severity: "recommendation",
      details: goodStrats[0],
    });
  }

  // 4) Emotion correlation
  const emoMap = new Map<string, { count: number; wins: number; netPL: number }>();
  trades.forEach((t) => {
    const e = (t.emotion ?? "neutral").toLowerCase();
    const pl = parsePL(t.pnl ?? t.profit ?? (t.prof || 0));
    if (!emoMap.has(e)) emoMap.set(e, { count: 0, wins: 0, netPL: 0 });
    const rec = emoMap.get(e)!;
    rec.count++;
    rec.netPL += pl;
    if (pl > 0 || String((t.outcome ?? "").toLowerCase()).includes("win")) rec.wins++;
  });
  const emoStats = Array.from(emoMap.entries())
    .map(([emo, val]) => ({
      emotion: emo,
      count: val.count,
      winRate: val.count ? (val.wins / val.count) * 100 : 0,
      avgPL: val.count ? val.netPL / val.count : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  if (emoStats.length) {
    const best = emoStats[0];
    const worst = emoStats[emoStats.length - 1];
    if (best.count >= 3 && best.winRate >= Math.max(60, globalWinRate + 8)) {
      insights.push({
        id: `emo-best-${best.emotion}`,
        text: `Behavioral finding: When you reported being "${best.emotion}", your win rate was ${best.winRate.toFixed(
          1
        )}% (n=${best.count}). Aim to replicate the processes that lead to that state.`,
        severity: "recommendation",
        details: best,
      });
    }
    if (worst.count >= 3 && worst.winRate <= Math.min(40, globalWinRate - 8)) {
      insights.push({
        id: `emo-worst-${worst.emotion}`,
        text: `Warning: When you reported being "${worst.emotion}", your win rate dropped to ${worst.winRate.toFixed(
          1
        )}% (n=${worst.count}). Consider avoiding trading while in this state or create rules to reduce size.`,
        severity: "warning",
        details: worst,
      });
    }
  }

  // 5) Consistency and variance suggestion
  const plStdDev = (() => {
    const mu = avgPL;
    const vs = parsedPLs.reduce((s, v) => s + Math.pow(v - mu, 2), 0) / (parsedPLs.length || 1);
    return Math.sqrt(vs);
  })();
  insights.push({
    id: "consistency",
    text: `Consistency: your P/L standard deviation is ${plStdDev.toFixed(
      2
    )}. Consider position-sizing or stop rules to tighten variability.`,
    severity: "info",
    details: { stdev: plStdDev },
  });

  // 6) Actionable next steps (automatically generated)
  insights.push({
    id: "next-steps",
    text: `Suggested actions: 1) Focus on top-performing symbol/time windows; 2) Document and scale the top strategy; 3) Avoid trading in emotional states listed as underperforming; 4) Backtest entries around top windows to validate edges.`,
    severity: "recommendation",
  });

  return insights;
}
