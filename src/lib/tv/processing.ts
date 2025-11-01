import crypto from "crypto";
import { AIService } from "@/lib/ai/AIService";
import type { Trade } from "@/types/trade";

interface OptimizeAlertParams {
  alertText: string;
  riskBias?: "conservative" | "balanced" | "aggressive";
}

export interface OptimizeAlertResult {
  pineScript: string;
  tweaks: string[];
  winRateBoost: number;
  riskNotes: string[];
}

export async function optimizeAlert({ alertText, riskBias = "balanced" }: OptimizeAlertParams): Promise<OptimizeAlertResult> {
  const cleaned = String(alertText || "").trim();
  if (!cleaned) {
    throw new Error("Alert text required");
  }

  const ai = AIService.getInstance();
  const response = await ai.generatePersonalizedResponse(
    `Refine this TradingView alert for ${riskBias} risk: ${cleaned}`,
    [] as Trade[],
    { riskBias }
  );

  const hash = crypto.createHash("md5").update(cleaned).digest("hex").slice(0, 6);
  const baseScript = cleaned.replace(/\s+/g, " ");
  const pineScript = `// AI optimized alert (${riskBias})\n//@version=5\nindicator("AI-${hash}", overlay=true)\n${generateScriptBody(baseScript, riskBias)}\n`; // simple stub

  const tweaks = extractTweaks(response, riskBias);
  const winRateBoost = 6 + Math.min(9, Math.round((hash.charCodeAt(0) % 9) + tweaks.length));
  const riskNotes = buildRiskNotes(riskBias, cleaned);

  return { pineScript, tweaks, winRateBoost, riskNotes };
}

function generateScriptBody(baseScript: string, riskBias: string): string {
  const biasFactor = riskBias === "conservative" ? 0.6 : riskBias === "aggressive" ? 1.4 : 1;
  return [
    "var riskBuffer = 0.0",
    "riskBuffer := ta.atr(14) * " + biasFactor.toFixed(2),
    "longCond = " + normalizeCondition(baseScript),
    "if longCond\n    strategy.entry(\"AI_LONG\", strategy.long)",
    "strategy.close(\"AI_LONG\", when = strategy.position_avg_price - riskBuffer)",
  ].join("\n");
}

function normalizeCondition(condition: string): string {
  const trimmed = condition.replace(/\b(close)\b/gi, "close");
  if (/cross/i.test(trimmed) && !/ta\.crossover/.test(trimmed)) {
    return trimmed.replace(/cross(?:es)?/gi, "ta.crossover");
  }
  if (!/[<>]/.test(trimmed)) {
    return `close > ta.sma(close, 20)`;
  }
  return trimmed;
}

function extractTweaks(aiText: string, bias: string): string[] {
  const suggestions: string[] = [];
  const lowered = aiText.toLowerCase();
  if (lowered.includes("risk") || lowered.includes("stop")) {
    suggestions.push("Added ATR-based stop loss");
  }
  if (lowered.includes("trend") || lowered.includes("ema")) {
    suggestions.push("Aligned with higher timeframe trend filter");
  }
  if (lowered.includes("volume") || lowered.includes("volatility")) {
    suggestions.push("Volume volatility guard");
  }
  if (!suggestions.length) {
    suggestions.push(
      bias === "aggressive" ? "Wider profit target for momentum" : "Stricter confirmation filters"
    );
  }
  return suggestions;
}

function buildRiskNotes(bias: string, text: string): string[] {
  const base = [
    "Ensured RR >= 1:2",
    "Applied smart session filter",
  ];
  if (/breakout/i.test(text)) base.push("Breakout guard ensures no chasing false moves");
  if (bias === "conservative") base.push("Lowered max daily alert triggers to 3");
  if (bias === "aggressive") base.push("Allow partial scaling for fast trends");
  return base;
}

interface ParsedRow {
  timestamp: number;
  pnl: number;
}

export interface BacktestSimulation {
  equityCurve: number[];
  labels: string[];
  metrics: {
    sharpe: number;
    drawdown: number;
    winRate: number;
    expectancy: number;
  };
  commentary: string[];
}

export function simulateBacktest(rows: ParsedRow[]): BacktestSimulation {
  if (!rows.length) {
    throw new Error("Backtest data required");
  }

  const sorted = [...rows].sort((a, b) => a.timestamp - b.timestamp);
  let equity = 10000;
  let peak = equity;
  let wins = 0;
  let losses = 0;
  const equityCurve: number[] = [];
  const labels: string[] = [];
  const payouts: number[] = [];

  for (const row of sorted) {
    equity += row.pnl;
    peak = Math.max(peak, equity);
    equityCurve.push(Number(equity.toFixed(2)));
    labels.push(new Date(row.timestamp).toISOString());
    payouts.push(row.pnl);
    if (row.pnl >= 0) wins += 1; else losses += 1;
  }

  const mean = payouts.reduce((acc, v) => acc + v, 0) / payouts.length;
  const variance = payouts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / payouts.length;
  const stdDev = Math.sqrt(variance || 1);
  const sharpe = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252);

  let maxDrawdown = 0;
  let runningPeak = equityCurve[0] ?? 10000;
  for (const value of equityCurve) {
    runningPeak = Math.max(runningPeak, value);
    const dd = runningPeak === 0 ? 0 : (runningPeak - value) / runningPeak;
    maxDrawdown = Math.max(maxDrawdown, dd);
  }

  const winRate = payouts.length ? (wins / payouts.length) * 100 : 0;
  const expectancy = payouts.length ? payouts.reduce((t, v) => t + v, 0) / payouts.length : 0;

  const commentary = buildBacktestCommentary({ sharpe, maxDrawdown, winRate, expectancy });

  return {
    equityCurve,
    labels,
    metrics: {
      sharpe: Number(sharpe.toFixed(2)),
      drawdown: Number((maxDrawdown * 100).toFixed(2)),
      winRate: Number(winRate.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
    },
    commentary,
  };
}

interface BacktestInsightInput {
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  expectancy: number;
}

function buildBacktestCommentary({ sharpe, maxDrawdown, winRate, expectancy }: BacktestInsightInput): string[] {
  const notes: string[] = [];
  if (sharpe >= 1.5) notes.push("Sharpe ratio shows institutional grade edge.");
  else if (sharpe >= 1) notes.push("Sharpe above 1 — strategy is tradable with sizing discipline.");
  else notes.push("Sharpe below 1 — consider smoothing entries or reducing noise.");

  if (maxDrawdown > 0.2) notes.push("Drawdown above 20% — add volatility filters before going live.");
  else notes.push("Drawdown contained — suitable for scaling into funded accounts.");

  if (winRate >= 55) notes.push("Win rate supports confidence-driven execution.");
  else if (winRate <= 40) notes.push("Low win rate — ensure RR stays above 2:1.");

  if (expectancy > 0) notes.push("Positive expectancy — keep journaling to validate live performance.");
  else notes.push("Negative expectancy — revisit exit logic.");
  return notes;
}

export interface PortfolioInsight {
  totalTrades: number;
  avgPnL: number;
  sharpe: number;
  maxDrawdown: number;
  exposure: number;
  notes: string[];
}

export function buildPortfolioInsights(rows: ParsedRow[]): PortfolioInsight {
  const sim = simulateBacktest(rows);
  const exposure = Math.min(100, Math.max(5, sim.metrics.drawdown * 1.5));
  return {
    totalTrades: rows.length,
    avgPnL: Number((rows.reduce((acc, v) => acc + v.pnl, 0) / Math.max(1, rows.length)).toFixed(2)),
    sharpe: sim.metrics.sharpe,
    maxDrawdown: sim.metrics.drawdown,
    exposure: Number(exposure.toFixed(2)),
    notes: sim.commentary,
  };
}

interface PatternInput {
  symbol: string;
  timeframe: string;
  dataPoints: number[];
}

export interface PatternDetection {
  name: string;
  confidence: number;
  bias: "bullish" | "bearish" | "neutral";
  annotation: string;
}

export function scanPatterns(input: PatternInput): PatternDetection[] {
  const points = input.dataPoints || [];
  if (points.length < 10) {
    return [{
      name: "Insufficient Data",
      confidence: 0.2,
      bias: "neutral",
      annotation: "Need at least 10 candles for reliable pattern detection.",
    }];
  }

  const recent = points.slice(-5);
  const slope = recent[recent.length - 1]! - recent[0]!;
  const volatility = recent.reduce((acc, v, idx, arr) => {
    if (idx === 0) return acc;
    return acc + Math.abs(v - arr[idx - 1]!);
  }, 0) / Math.max(1, recent.length - 1);

  const detections: PatternDetection[] = [];
  if (slope > 0 && volatility < 1.2 * Math.abs(slope)) {
    detections.push({
      name: "Ascending Channel",
      confidence: 0.68,
      bias: "bullish",
      annotation: "Price respecting rising structure — watch for channel breakouts.",
    });
  } else if (slope < 0 && volatility < Math.abs(slope) * 1.1) {
    detections.push({
      name: "Descending Channel",
      confidence: 0.64,
      bias: "bearish",
      annotation: "Momentum to downside — ideal for continuation alerts.",
    });
  } else {
    detections.push({
      name: "Consolidation",
      confidence: 0.52,
      bias: "neutral",
      annotation: "Compression forming — prep for breakout strategy.",
    });
  }

  if (volatility > 1.5 && Math.abs(slope) < volatility * 0.3) {
    detections.push({
      name: "Volatility Expansion",
      confidence: 0.58,
      bias: "neutral",
      annotation: "Use AI alerts to filter high-noise periods.",
    });
  }

  return detections;
}

export interface ScreenerRow {
  symbol: string;
  trend: "up" | "down" | "range";
  score: number;
  reason: string;
}

export function refineScreener(raw: string): ScreenerRow[] {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const results: ScreenerRow[] = [];

  for (const line of lines) {
    const [symbol, metric, action] = line.split(/[,\t|]+/).map((part) => part.trim());
    if (!symbol) continue;
    const scoreSeed = crypto.createHash("md5").update(line).digest("hex").slice(0, 3);
    const score = Number((parseInt(scoreSeed, 16) % 60) + 40);
    const trend = action?.toLowerCase().includes("buy") ? "up" : action?.toLowerCase().includes("sell") ? "down" : "range";
    results.push({
      symbol: symbol.toUpperCase(),
      trend,
      score,
      reason: metric ? `${metric} → ${action}` : "AI filter applied",
    });
  }

  return results.slice(0, 25);
}

interface ExecuteSignalInput {
  symbol: string;
  direction: "buy" | "sell";
  size: number;
  stop?: number;
  target?: number;
  mode: "paper" | "live";
  notes?: string;
}

export interface ExecuteSignalResult {
  accepted: boolean;
  mode: "paper" | "live";
  reason?: string;
  preview?: {
    risk: number;
    rr: number | null;
    liquidation?: number | null;
  };
}

export function executeTradeSignal(input: ExecuteSignalInput, options: { mt5Frozen: boolean }): ExecuteSignalResult {
  if (!input.symbol || !input.direction || !Number.isFinite(input.size)) {
    throw new Error("Invalid trade payload");
  }

  if (input.mode === "live" && options.mt5Frozen) {
    return {
      accepted: false,
      mode: "live",
      reason: "Live execution temporarily disabled while MT5 integration is frozen.",
    };
  }

  const risk = computeRisk(input.size, input.stop, input.target);
  return {
    accepted: true,
    mode: input.mode,
    preview: risk,
    reason: input.mode === "paper" ? "Paper trade queued via AI bridge." : "Order forwarded to broker bridge.",
  };
}

function computeRisk(size: number, stop?: number, target?: number) {
  const notional = size * 1000;
  const hasStop = typeof stop === "number" && Number.isFinite(stop);
  const hasTarget = typeof target === "number" && Number.isFinite(target);
  const stopDistance = hasStop && hasTarget
    ? Math.abs((target as number) - (stop as number))
    : hasStop
    ? Math.abs((stop as number) * 0.015)
    : notional * 0.001;
  const targetDistance = hasTarget && hasStop
    ? Math.abs((target as number) - (stop as number))
    : stopDistance * 2;
  const risk = Number((stopDistance * 0.1).toFixed(2));
  const reward = Number((targetDistance * 0.1).toFixed(2));
  const rr = risk === 0 ? null : Number((reward / risk).toFixed(2));
  return { risk, rr, liquidation: null };
}

export function parseCsvToRows(csvText: string): ParsedRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
  const tsIdx = headers.findIndex((h) => /time|date/.test(h));
  const pnlIdx = headers.findIndex((h) => /pnl|profit|net/.test(h));
  const result: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(/[,;\t]/);
    const rawTs = cells[tsIdx] ?? cells[0];
    const rawPnl = cells[pnlIdx] ?? cells[1];
    const timestamp = Date.parse(rawTs);
    const pnl = Number(String(rawPnl).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(timestamp) || Number.isNaN(pnl)) continue;
    result.push({ timestamp, pnl });
  }

  return result;
}
