// src/components/dashboard/OverviewCards.tsx
"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { TradeContext } from "@/context/TradeContext";
import type { Trade as TradeType } from "@/types/trade";
import { differenceInCalendarDays, format } from "date-fns";
import {
  BarChart2,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Star,
  ThumbsDown,
  PieChart,
  Calendar,
  Info,
  X,
  TrendingUp,
  Award,
  Clock,
  Percent,
} from "lucide-react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

interface OverviewCardsProps {
  trades?: TradeType[];
  fromDate?: string;
  toDate?: string;
}

/* ---------- Helpers (robust parsing & safety) ---------- */
const toNumber = (v: unknown): number => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9eE\.\-+]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const toStringSafe = (v: unknown): string => {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};
const toDateOrNull = (v: unknown): Date | null => {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const s = String(v);
    if (/^\d{10}$/.test(s)) return new Date(Number(v) * 1000);
    if (/^\d{13}$/.test(s)) return new Date(Number(v));
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};
const getField = (t: TradeType, key: string): unknown => (t as unknown as Record<string, unknown>)[key];

const tradeTime = (t: TradeType) => toDateOrNull(getField(t, "openTime")) ?? toDateOrNull(getField(t, "closeTime"));
const endOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
};

function bucketCounts(values: number[], buckets: number[]): number[] {
  const counts = new Array(buckets.length - 1).fill(0);
  for (const v of values) {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (v >= buckets[i] && v < buckets[i + 1]) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}

/* RR parsing (robust) */
const rrFromTrade = (t: TradeType): number => {
  const outcome = toStringSafe(getField(t, "outcome"));
  const candidates: unknown[] = [
    getField(t, "resultRR"),
    getField(t, "rr"),
    getField(t, "RR"),
    getField(t, "riskReward"),
    getField(t, "risk_reward"),
    getField(t, "rrRatio"),
    getField(t, "rr_ratio"),
    getField(t, "R_R"),
    getField(t, "risk_reward_ratio"),
    getField(t, "riskRewardRatio"),
  ];

  let parsed: number | null = null;
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) {
      parsed = c;
      break;
    }
    if (typeof c === "string") {
      const s = c.trim();
      const sClean = s.replace(/\s+/g, "");
      if (sClean.includes(":") || sClean.includes("/")) {
        const sep = sClean.includes(":") ? ":" : "/";
        const parts = sClean.split(sep);
        if (parts.length === 2) {
          const a = parseFloat(parts[0]);
          const b = parseFloat(parts[1]);
          if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) {
            parsed = b / a;
            break;
          }
        }
      }
      const withoutR = sClean.replace(/R{1,2}$/i, "");
      const n = parseFloat(withoutR);
      if (!Number.isNaN(n)) {
        parsed = n;
        break;
      }
      const m = s.match(/-?\d+(\.\d+)?/);
      if (m) {
        const n2 = parseFloat(m[0]);
        if (!Number.isNaN(n2)) {
          parsed = n2;
          break;
        }
      }
    }
  }

  if (outcome === "Loss") return -1;
  if (outcome === "Breakeven") return 0;
  if (outcome === "Win") {
    return parsed !== null && Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return parsed !== null && Number.isFinite(parsed) ? parsed : Number.NaN;
};

/* Presentational progress bar */
function ProgressBar({ value, color = "bg-green-500" }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full bg-slate-900/60 rounded h-2 overflow-hidden">
      <div className={`${color} h-2 transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ColoredValue now accepts an optional override class so specific cards can force color */
function ColoredValue({ value, forceClass }: { value: React.ReactNode; forceClass?: string }) {
  let num: number | null = null;
  if (typeof value === "number") num = value;
  else if (typeof value === "string") {
    const m = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (m) num = Number(m[0]);
  }
  const cls = forceClass
    ? forceClass
    : num !== null
    ? num > 0
      ? "text-green-400"
      : num < 0
      ? "text-red-400"
      : "text-white"
    : "text-white";
  return <span className={cls}>{value}</span>;
}

/* Metric explanations */
const METRIC_EXPLANATIONS: Record<string, { title: string; body: string }> = {
  totalTrades: { title: "Total trades", body: "Total number of trades in the selected range." },
  wins: { title: "Wins", body: "Number of trades marked as Win." },
  losses: { title: "Losses", body: "Number of trades marked as Loss." },
  pnl: { title: "PNL ($)", body: "Net profit / loss across selected trades." },
  profitFactor: { title: "Profit Factor", body: "Profit / Loss (absolute). Values >1 are preferable." },
  rrTP: { title: "Total TP (RR)", body: "Sum of winning trades' reward-to-risk (R) values." },
  rrSL: { title: "Total SL (RR)", body: "Count of trades that resulted in -1R (stop loss)." },
  best: { title: "Best trade", body: "Single trade with highest positive PnL." },
  worst: { title: "Worst trade", body: "Single trade with largest negative PnL." },
  tradesPerDay: { title: "Trades per day", body: "Average trades taken per active day." },
  mostTraded: { title: "Most traded pair", body: "Symbol with the most trades in the selected range." },
  rrOverTime: { title: "RR performance over time", body: "Average R (reward-to-risk) per day shown across the date range." },
  tradiaScore: { title: "Tradia Score", body: "Composite score combining win rate, profit factor, avg RR and consistency." },
};

const getGreeting = (name = "Trader") => {
  const hr = new Date().getHours();
  if (hr < 12) return `Good morning, ${name}`;
  if (hr < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
};

export default function OverviewCards({ trades: propTrades, fromDate, toDate }: OverviewCardsProps) {
  const ctx = useContext(TradeContext) as any;
  const contextTrades = Array.isArray(ctx?.trades) ? (ctx.trades as TradeType[]) : [];

  const [mounted, setMounted] = useState(false);

  const [pnlMode, setPnlMode] = useState<"cumulative" | "perTrade">("cumulative");
  const [showRR, setShowRR] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(1000);
  const [explainKey, setExplainKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allTrades: TradeType[] = Array.isArray(propTrades) ? propTrades : Array.isArray(contextTrades) ? contextTrades : [];

  const metrics = useMemo(() => {
    const from = fromDate && !Number.isNaN(new Date(fromDate).getTime()) ? new Date(fromDate) : new Date(-8640000000000000);
    const to = toDate && !Number.isNaN(new Date(toDate).getTime()) ? endOfDay(new Date(toDate)) : new Date(8640000000000000);

    const inRange = (t: TradeType) => {
      const tt = tradeTime(t);
      if (!tt) return false;
      return tt >= from && tt <= to;
    };

    const filtered = allTrades.filter(inRange);

    const total = filtered.length;
    const wins = filtered.filter((t) => toStringSafe(getField(t, "outcome")) === "Win").length;
    const losses = filtered.filter((t) => toStringSafe(getField(t, "outcome")) === "Loss").length;
    const breakevens = filtered.filter((t) => toStringSafe(getField(t, "outcome")) === "Breakeven").length;
    const winRate = total ? (wins / total) * 100 : 0;

    const pnlOf = (t: TradeType) => toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
    const totalPnl = filtered.reduce((s, t) => s + pnlOf(t), 0);
    const profit = filtered.filter((t) => pnlOf(t) >= 0).reduce((s, t) => s + pnlOf(t), 0);
    const loss = Math.abs(filtered.filter((t) => pnlOf(t) < 0).reduce((s, t) => s + pnlOf(t), 0));
    const profitFactor = loss > 0 ? profit / loss : Infinity;

    let best: TradeType | null = null;
    let worst: TradeType | null = null;
    for (const t of filtered) {
      if (!best || pnlOf(t) > pnlOf(best)) best = t;
      if (!worst || pnlOf(t) < pnlOf(worst)) worst = t;
    }

    const times = filtered.map((t) => tradeTime(t)).filter(Boolean) as Date[];
    times.sort((a, b) => a.getTime() - b.getTime());
    const days = times.length > 1 ? differenceInCalendarDays(times[times.length - 1]!, times[0]!) + 1 : times.length === 1 ? 1 : 0;
    const tradesPerDay = days ? (total / days).toFixed(2) : "0.00";

    const symCounts = filtered.reduce<Record<string, number>>((acc, t) => {
      const s = toStringSafe(getField(t, "symbol")) || "N/A";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const mostTraded = Object.entries(symCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    const rrVals = filtered.map(rrFromTrade).filter((v) => Number.isFinite(v));
    const avgRR = rrVals.length ? rrVals.reduce((s, v) => s + v, 0) / rrVals.length : 0;
    const rrBucketsEdges = [-5, -1, 0, 0.5, 1, 1.5, 2, 3, 5];
    const rrCounts = bucketCounts(rrVals, rrBucketsEdges);
    const rrLabels = rrBucketsEdges.slice(0, -1).map((b, i) => `${b}–${rrBucketsEdges[i + 1]}`);
    const totalTP = rrVals.filter((r) => r > 0).reduce((s, r) => s + r, 0);
    const totalSLCount = rrVals.filter((r) => r === -1).length;
    const profitRR = totalTP - totalSLCount;

    const chrono = [...filtered].sort((a, b) => (tradeTime(a)?.getTime() ?? 0) - (tradeTime(b)?.getTime() ?? 0));
    const labelsChrono = chrono.map((t) => (tradeTime(t) ? format(tradeTime(t)!, "MMM d") : ""));
    const perTradePnls = chrono.map((t) => pnlOf(t));
    const cumPnls = perTradePnls.map((_, i) => perTradePnls.slice(0, i + 1).reduce((s, v) => s + v, 0));

    // streaks
    const streaks: number[] = [];
    let curr = 0;
    let last: "Win" | "Loss" | null = null;
    for (const t of chrono) {
      const oc = toStringSafe(getField(t, "outcome"));
      if (oc !== "Win" && oc !== "Loss") {
        if (curr > 0) streaks.push(curr);
        curr = 0;
        last = null;
        continue;
      }
      if (oc === last) curr++;
      else {
        if (curr > 0) streaks.push(curr);
        curr = 1;
        last = oc as "Win" | "Loss";
      }
    }
    if (curr > 0) streaks.push(curr);
    const longestWinStreak = streaks.length ? Math.max(...streaks) : 0;

    // daily aggregation for RR-over-time & daily net
    const dayMapPnL = new Map<string, number>();
    const dayMapRR = new Map<string, number[]>();
    for (const t of filtered) {
      const dt = tradeTime(t);
      if (!dt) continue;
      const key = dt.toISOString().slice(0, 10);
      const p = pnlOf(t);
      dayMapPnL.set(key, (dayMapPnL.get(key) ?? 0) + p);
      const rr = rrFromTrade(t);
      if (Number.isFinite(rr)) {
        const arr = dayMapRR.get(key) ?? [];
        arr.push(rr);
        dayMapRR.set(key, arr);
      }
    }
    const dayKeys = Array.from(new Set([...dayMapPnL.keys(), ...dayMapRR.keys()])).sort();
    const dailyLabels = dayKeys;
    const dailyNet = dayKeys.map((k) => dayMapPnL.get(k) ?? 0);
    const cumulativeDaily = dailyNet.reduce<number[]>((acc, v, i) => {
      const prev = i > 0 ? acc[i - 1] : 0;
      acc.push(prev + v);
      return acc;
    }, []);
    const rrOverTime = dayKeys.map((k) => {
      const arr = dayMapRR.get(k) ?? [];
      if (!arr.length) return 0;
      return arr.reduce((s, v) => s + v, 0) / arr.length;
    });

    const recent = chrono.slice(-8);
    const recentLabels = recent.map((t) => (tradeTime(t) ? format(tradeTime(t)!, "d") : ""));
    const recentPnls = recent.map((t) => pnlOf(t));

    const consistency = days > 0 ? Math.min(1, dayKeys.length / Math.max(1, days)) : 0;
    const pfVal = Number.isFinite(profitFactor) ? profitFactor : 3;
    const tradiaScore = (() => {
      const winScore = winRate;
      const pfScore = Math.min(3, pfVal) / 3 * 100;
      const ar = Math.max(-1, Math.min(3, avgRR));
      const rrScore = ((ar + 1) / 4) * 100;
      const score = winScore * 0.3 + pfScore * 0.3 + rrScore * 0.25 + consistency * 100 * 0.15;
      return Math.round(Math.max(0, Math.min(100, score)));
    })();

    // --- NEW: avg trade duration (hours) & avg PnL per trade
    const durationsMs: number[] = [];
    for (const t of filtered) {
      const o = toDateOrNull(getField(t, "openTime"));
      const c = toDateOrNull(getField(t, "closeTime"));
      if (o && c && c.getTime() > o.getTime()) {
        durationsMs.push(c.getTime() - o.getTime());
      }
    }
    const avgDurationHours = durationsMs.length ? durationsMs.reduce((s, v) => s + v, 0) / durationsMs.length / (1000 * 60 * 60) : 0;
    const avgPnlPerTrade = total ? totalPnl / total : 0;

    const doughnutData = {
      labels: ["Wins", "Losses", "Breakeven"],
      datasets: [{ data: [wins, losses, breakevens], backgroundColor: ["#16a34a", "#ef4444", "#94a3b8"] }],
    };
    const pnlLineData = {
      labels: labelsChrono,
      datasets: [
        {
          label: pnlMode === "cumulative" ? "Cumulative PnL" : "Per-trade PnL",
          data: pnlMode === "cumulative" ? cumPnls : perTradePnls,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96,165,250,0.08)",
          tension: 0.2,
          fill: pnlMode === "cumulative",
        },
      ],
    };
    const dailyAreaData = {
      labels: dailyLabels,
      datasets: [
        { label: "Daily Net", data: dailyNet, borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.08)", fill: true, tension: 0.2 },
        { label: "Cumulative", data: cumulativeDaily, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.04)", fill: false, tension: 0.2 },
      ],
    };
    const rrOverTimeData = {
      labels: dayKeys,
      datasets: [
        {
          label: "Avg RR / day",
          data: rrOverTime,
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124,58,237,0.06)",
          fill: true,
          tension: 0.2,
        },
      ],
    };

    return {
      filtered,
      total,
      wins,
      losses,
      breakevens,
      winRate,
      totalPnl,
      profitFactor,
      best,
      worst,
      tradesPerDay,
      mostTraded,
      rrVals,
      rrCounts,
      rrLabels,
      totalTP,
      totalSLCount,
      profitRR,
      avgRR,
      streaks,
      longestWinStreak,
      dailyLabels,
      dailyNet,
      cumulativeDaily,
      doughnutData,
      pnlLineData,
      dailyAreaData,
      rrOverTimeData,
      streakData: {
        labels: chrono.map((_, i) => i + 1),
        datasets: [
          {
            label: "Streak length",
            data: (() => {
              const arr: number[] = [];
              let c = 0;
              let last2: "Win" | "Loss" | null = null;
              for (const t of chrono) {
                const oc = toStringSafe(getField(t, "outcome"));
                if (oc !== "Win" && oc !== "Loss") {
                  arr.push(0);
                  last2 = null;
                  c = 0;
                  continue;
                }
                if (oc === last2) c++;
                else c = 1;
                last2 = oc as "Win" | "Loss";
                arr.push(c);
              }
              return arr;
            })(),
            borderColor: "#f43f5e",
            fill: false,
            tension: 0.2,
          },
        ],
      },
      recentLabels,
      recentPnls,
      tradiaScore,
      consistency,
      // new
      avgDurationHours,
      avgPnlPerTrade,
    };
  }, [allTrades, fromDate, toDate, pnlMode]);

  const equityData = useMemo(() => {
    const d = metrics.pnlLineData;
    const dataset = Array.isArray(d.datasets) ? d.datasets[0] : undefined;
    const data = Array.isArray(dataset?.data) ? (dataset.data as number[]).map((v) => Number(v) || 0) : [];
    return {
      labels: d.labels ?? [],
      datasets: [
        {
          label: "Equity (Cumulative)",
          data,
          borderColor: "#34d399",
          backgroundColor: "rgba(52,211,153,0.08)",
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }, [metrics.pnlLineData]);

  if (!mounted) return null;

  // center container
  const containerClass = "space-y-5 px-4 sm:px-0 max-w-7xl mx-auto";

  // card base with border + subtle left accent space reserved
  const cardBase = "bg-white/4 backdrop-blur-sm rounded-md p-3 shadow-sm transition-shadow duration-200 hover:shadow-lg border border-zinc-700 relative overflow-hidden";
  const positiveClass = "text-green-400";
  const negativeClass = "text-red-400";
  const neutralClass = "text-white";

  const greeting = getGreeting("Trader");
  const progressPct = Math.max(0, Math.min(100, Math.round((metrics.totalPnl / (monthlyTarget || 1)) * 100)));

  const ExplanationModal: React.FC<{ k: string; onClose: () => void }> = ({ k, onClose }) => {
    if (!k) return null;
    const def = METRIC_EXPLANATIONS[k] ?? { title: k, body: "No explanation available." };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative z-10 bg-slate-900 p-4 rounded-md w-full max-w-md shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{def.title}</h3>
              <p className="text-sm text-zinc-300 mt-2">{def.body}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded bg-zinc-800">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // render metric card: responsive (stack on mobile, horizontal on >=sm), tighter gap between icon & text
  const renderMetricCard = (opts: {
    keyId: string;
    icon: React.ReactNode;
    title: string;
    value: React.ReactNode;
    small?: React.ReactNode;
    color?: string;
    valueClass?: string;
  }) => {
    const leftColor = opts.color ?? "#0ea5a4";

    return (
      <div
        key={opts.keyId}
        className={`${cardBase} flex flex-col sm:flex-row items-center gap-2 sm:gap-3`}
        role="article"
        aria-label={opts.title}
      >
        {/* vertical bar on desktop, horizontal on mobile */}
        <div className="w-full sm:w-auto">
          <div className="block sm:hidden h-1 w-full rounded-sm" style={{ background: leftColor }} />
          <div className="hidden sm:block" style={{ width: 6, background: leftColor, height: "100%", borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
        </div>

        {/* icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded bg-white/6">
            {opts.icon}
          </div>
        </div>

        {/* center text always centered for better mobile UX */}
        <div className="flex-1 text-center">
          <div className="text-xs text-zinc-400">{opts.title}</div>
          <div className="text-lg font-semibold mt-1">
            <ColoredValue value={opts.value} forceClass={opts.valueClass} />
          </div>
          <div className="text-xs text-zinc-400 mt-1">{typeof opts.small === "string" ? opts.small : opts.small}</div>
        </div>

        {/* explanation button top-right for desktop and floating in card for mobile */}
        <button
          onClick={() => setExplainKey(opts.keyId)}
          className="absolute top-2 right-2 p-1 rounded bg-zinc-800"
          title="Explain"
        >
          <Info size={14} />
        </button>
      </div>
    );
  };

  /* ---------- PROGRESS CALENDAR (GitHub-like, last 52 weeks / 1 year) ---------- */
  function ProgressCalendarCard() {
    // build a date->value map using metrics.dailyLabels and metrics.dailyNet
    const dailyMap = new Map<string, number>();
    (metrics.dailyLabels || []).forEach((k, i) => {
      dailyMap.set(k, metrics.dailyNet?.[i] ?? 0);
    });

    // compute last Sunday as start of first column
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365 + 1);

    // find Sunday on or before oneYearAgo
    const start = new Date(oneYearAgo);
    const dayOfWeek = start.getDay(); // 0..6
    start.setDate(start.getDate() - dayOfWeek);

    // generate 53 weeks, 7 rows (Sunday->Saturday)
    const weeks = 53;
    const cells: { date: Date; value: number }[] = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        const key = dt.toISOString().slice(0, 10);
        const val = dailyMap.get(key) ?? 0;
        cells.push({ date: dt, value: val });
      }
    }

    // compute absolute max for intensity
    const absVals = Array.from(dailyMap.values()).map((v) => Math.abs(v));
    const maxAbs = Math.max(...absVals, 1);

    const cellClass = (val: number) => {
      if (val === 0) return "bg-zinc-800/40 border border-zinc-700";
      // positive => green shades; negative => red shades
      const intensity = Math.min(1, Math.abs(val) / maxAbs);
      const level = Math.ceil(intensity * 4); // 1..4
      if (val > 0) {
        // green shades
        switch (level) {
          case 1:
            return "bg-[rgba(110,231,183,0.30)] border border-[rgba(110,231,183,0.16)]";
          case 2:
            return "bg-[rgba(52,211,153,0.45)] border border-[rgba(52,211,153,0.16)]";
          case 3:
            return "bg-[rgba(16,185,129,0.6)] border border-[rgba(16,185,129,0.16)]";
          default:
            return "bg-[rgba(5,150,105,0.85)] border border-[rgba(5,150,105,0.16)]";
        }
      } else {
        switch (level) {
          case 1:
            return "bg-[rgba(249,205,190,0.28)] border border-[rgba(249,205,190,0.12)]";
          case 2:
            return "bg-[rgba(248,113,113,0.45)] border border-[rgba(248,113,113,0.12)]";
          case 3:
            return "bg-[rgba(239,68,68,0.6)] border border-[rgba(239,68,68,0.12)]";
          default:
            return "bg-[rgba(185,28,28,0.85)] border border-[rgba(185,28,28,0.12)]";
        }
      }
    };

    // legend scale
    const legend = [
      { label: "Less", cls: "bg-zinc-800/40 border border-zinc-700" },
      { label: "Low", cls: "bg-[rgba(110,231,183,0.30)]" },
      { label: "Medium", cls: "bg-[rgba(52,211,153,0.45)]" },
      { label: "High", cls: "bg-[rgba(16,185,129,0.6)]" },
      { label: "Very High", cls: "bg-[rgba(5,150,105,0.85)]" },
    ];

    return (
      <div className={cardBase}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Progress Tracker</div>
            <div className="text-xs text-zinc-400">Year view — daily net heatmap (green = profit, red = loss)</div>
          </div>
          <div className="text-xs text-zinc-400">Target: ${monthlyTarget}</div>
        </div>

        <div className="flex gap-4">
          <div className="overflow-x-auto">
            <div className="flex gap-1">
              {/* render columns as vertical groups of 7 */}
              {Array.from({ length: weeks }).map((_, colIdx) => (
                <div key={`week-${colIdx}`} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((__, rowIdx) => {
                    const idx = colIdx * 7 + rowIdx;
                    const cell = cells[idx];
                    const isFuture = cell.date > new Date();
                    const title = `${format(cell.date, "MMM d, yyyy")}: ${cell.value >= 0 ? "+" : ""}${cell.value.toFixed(2)}`;
                    return (
                      <div
                        key={`cell-${colIdx}-${rowIdx}`}
                        title={title}
                        className={`w-3 h-3 rounded-sm ${isFuture ? "opacity-30" : ""} ${cellClass(cell.value)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2">
            <div className="text-xs text-zinc-400">Legend</div>
            <div className="flex items-center gap-2">
              {legend.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-sm ${l.cls}`} />
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-zinc-400">
              Profitable days: <span className="font-medium text-green-400">{(metrics.dailyNet || []).filter((v) => v > 0).length}</span>
              <br />
              Loss days: <span className="font-medium text-red-400">{(metrics.dailyNet || []).filter((v) => v < 0).length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-slate-800 p-3">
              <Award size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{greeting}</h2>
              <div className="text-xs text-zinc-400">Overview for the selected date range</div>
            </div>
          </div>

          <div className="mt-3 w-full sm:w-2/3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-zinc-400">Monthly PnL target</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-32">
                    <input
                      type="number"
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                      className="w-full bg-transparent p-2 rounded border border-zinc-800 text-sm"
                      aria-label="monthly target"
                    />
                  </div>
                  <div className="flex-1">
                    <ProgressBar
                      value={progressPct}
                      color={progressPct > 75 ? "bg-green-500" : progressPct > 40 ? "bg-yellow-500" : "bg-red-500"}
                    />
                    <div className="text-xs text-zinc-400 mt-1">{progressPct}% of ${monthlyTarget}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/4 backdrop-blur-sm rounded-md p-3 shadow-sm flex items-center gap-3 border border-zinc-700">
            <div className="p-2 rounded bg-white/6">
              <TrendingUp size={18} className="text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-zinc-400">Tradia Score</div>
                <button onClick={() => setExplainKey("tradiaScore")} className="p-1 rounded bg-zinc-800">
                  <Info size={14} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-lg font-semibold">{metrics.tradiaScore}</div>
                <div className="w-28">
                  <ProgressBar value={metrics.tradiaScore} color={metrics.tradiaScore > 70 ? "bg-green-500" : metrics.tradiaScore > 40 ? "bg-yellow-500" : "bg-red-500"} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {renderMetricCard({
          keyId: "totalTrades",
          icon: <BarChart2 size={16} className="text-sky-400" />,
          title: "Total Trades",
          value: metrics.total,
          small: `${metrics.filtered.length} filtered`,
          color: "#0ea5ff",
        })}
        {renderMetricCard({
          keyId: "wins",
          icon: <CheckCircle size={16} className="text-green-400" />,
          title: "Wins",
          value: metrics.wins,
          small: `${metrics.winRate.toFixed(1)}% win rate`,
          color: "#059669",
        })}
        {renderMetricCard({
          keyId: "losses",
          icon: <XCircle size={16} className="text-red-400" />,
          title: "Losses",
          value: metrics.losses,
          small: `SLs ${metrics.totalSLCount}`,
          color: "#ef4444",
          valueClass: negativeClass,
        })}
        {renderMetricCard({
          keyId: "pnl",
          icon: <DollarSign size={16} />,
          title: "PNL ($)",
          value: `$${metrics.totalPnl.toFixed(2)}`,
          small: `PF ${metrics.profitFactor === Infinity ? "∞" : Number(metrics.profitFactor).toFixed(2)}`,
          color: metrics.totalPnl > 0 ? "#10b981" : metrics.totalPnl < 0 ? "#ef4444" : "#64748b",
          valueClass: metrics.totalPnl > 0 ? positiveClass : metrics.totalPnl < 0 ? negativeClass : neutralClass,
        })}
        {renderMetricCard({
          keyId: "rrTP",
          icon: <ArrowUp size={16} className="text-green-400" />,
          title: "Total TP (RR)",
          value: `${metrics.totalTP.toFixed(2)}R`,
          small: `Avg ${metrics.avgRR.toFixed(2)}R`,
          color: "#16a34a",
          valueClass: positiveClass,
        })}
        {renderMetricCard({
          keyId: "rrSL",
          icon: <ArrowDown size={16} className="text-red-400" />,
          title: "Total SL (RR)",
          value: metrics.totalSLCount,
          small: `Net ${metrics.profitRR >= 0 ? "+" : ""}${metrics.profitRR.toFixed(2)}R`,
          color: "#ef4444",
          valueClass: negativeClass,
        })}
        {renderMetricCard({
          keyId: "best",
          icon: <Star size={16} className="text-yellow-300" />,
          title: "Best Trade",
          value: metrics.best ? `$${toNumber(getField(metrics.best, "pnl")).toFixed(2)}` : "$0.00",
          small: metrics.best ? toStringSafe(getField(metrics.best, "symbol")) : "",
          color: "#f59e0b",
        })}
        {renderMetricCard({
          keyId: "worst",
          icon: <ThumbsDown size={16} className="text-red-500" />,
          title: "Worst Trade",
          value: metrics.worst ? `$${toNumber(getField(metrics.worst, "pnl")).toFixed(2)}` : "$0.00",
          small: metrics.worst ? toStringSafe(getField(metrics.worst, "symbol")) : "",
          color: "#ef4444",
          valueClass: negativeClass,
        })}
        {renderMetricCard({
          keyId: "mostTraded",
          icon: <PieChart size={16} className="text-pink-400" />,
          title: "Most Traded",
          value: metrics.mostTraded,
          small: "Symbol with most trades",
          color: "#ec4899",
        })}
        {renderMetricCard({
          keyId: "tradesPerDay",
          icon: <Calendar size={16} className="text-blue-300" />,
          title: "Trades / Day",
          value: metrics.tradesPerDay,
          small: `${metrics.dailyLabels.length} active days`,
          color: "#60a5fa",
        })}
      </div>

      {/* NEW: two small visual metrics moved above the performance chart for better visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {renderMetricCard({
          keyId: "avgPnlPerTrade",
          icon: <Percent size={16} className="text-yellow-300" />,
          title: "Avg PnL / Trade",
          value: `$${(metrics.avgPnlPerTrade ?? 0).toFixed(2)}`,
          small: `${metrics.total ?? 0} trades`,
          color: (metrics.avgPnlPerTrade ?? 0) > 0 ? "#10b981" : (metrics.avgPnlPerTrade ?? 0) < 0 ? "#ef4444" : "#64748b",
          valueClass: (metrics.avgPnlPerTrade ?? 0) > 0 ? positiveClass : (metrics.avgPnlPerTrade ?? 0) < 0 ? negativeClass : neutralClass,
        })}
        {renderMetricCard({
          keyId: "avgTradeDuration",
          icon: <Clock size={16} className="text-sky-400" />,
          title: "Avg Trade Duration",
          value: metrics.avgDurationHours ? `${metrics.avgDurationHours.toFixed(2)} h` : "N/A",
          small: "Average across closed trades",
          color: "#60a5fa",
        })}
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">Performance</div>
                <div className="text-xs text-zinc-400">{metrics.filtered.length} trades</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPnlMode("cumulative")}
                  className={`px-2 py-1 rounded ${pnlMode === "cumulative" ? "bg-slate-700 text-white" : "text-zinc-300"}`}
                >
                  Cumulative
                </button>
                <button
                  onClick={() => setPnlMode("perTrade")}
                  className={`px-2 py-1 rounded ${pnlMode === "perTrade" ? "bg-slate-700 text-white" : "text-zinc-300"}`}
                >
                  Per-trade
                </button>
              </div>
            </div>
            <div className="h-56">
              <Line data={metrics.pnlLineData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
            </div>
          </div>

          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">Equity Curve</div>
                <div className="text-xs text-zinc-400">{metrics.filtered.length} trades · {metrics.winRate.toFixed(1)}% win rate</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-zinc-400">PNL</div>
                <div className={`font-semibold ${metrics.totalPnl > 0 ? positiveClass : metrics.totalPnl < 0 ? negativeClass : neutralClass}`}>${metrics.totalPnl.toFixed(2)}</div>
                <button onClick={() => setExplainKey("pnl")} className="p-1 rounded bg-zinc-800">
                  <Info size={14} />
                </button>
              </div>
            </div>
            <div className="h-44">
              <Line data={equityData} options={{ plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } }, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">Daily Net</div>
                <div className="text-xs text-zinc-400">{metrics.dailyLabels.length} days</div>
              </div>
            </div>
            <div className="h-36">
              <Line data={metrics.dailyAreaData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
            </div>
          </div>

          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">Win / Loss / BE</div>
                <div className="text-xs text-zinc-400">{metrics.wins}W • {metrics.losses}L • {metrics.breakevens}BE</div>
              </div>
            </div>
            <div className="h-36">
              <Doughnut data={metrics.doughnutData} options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>

      {/* Streak + RR-over-time + Progress Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {showStreak && (
          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Streak Tracker</div>
              <div className="text-xs text-zinc-400">Longest {metrics.longestWinStreak}</div>
            </div>
            <div className="h-36">
              <Line data={metrics.streakData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { display: false } } }} />
            </div>
          </div>
        )}

        {showRR && (
          <div className={`${cardBase}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">RR Performance Over Time</div>
              <div className="text-xs text-zinc-400">Avg RR per day</div>
            </div>
            <div className="h-36">
              <Line data={metrics.rrOverTimeData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
            </div>
          </div>
        )}

        <div>
          <ProgressCalendarCard />
        </div>
      </div>

      {explainKey && <ExplanationModal k={explainKey} onClose={() => setExplainKey(null)} />}
    </div>
  );
}
