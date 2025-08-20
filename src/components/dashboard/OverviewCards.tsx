"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { TradeContext } from "@/context/TradeContext";
import { differenceInCalendarDays, format } from "date-fns";
import {
  BarChart2,
  CheckCircle,
  XCircle,
  Percent,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
  PieChart,
  Calendar,
  Star,
  ThumbsDown,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, LineController, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface OverviewCardsProps {
  // optional: if provided, OverviewCards will use this array instead of the TradeContext trades
  tradesProp?: Trade[];
  // optional date range — when omitted (or invalid) no date filter will be applied
  fromDate?: string;
  toDate?: string;
}

type Outcome = "Win" | "Loss" | (string & {});
type RRString =
  | "rr"
  | "RR"
  | "riskReward"
  | "risk_reward"
  | "rrRatio"
  | "rr_ratio"
  | "R_R"
  | "risk_reward_ratio"
  | "riskRewardRatio";

type Trade = {
  openTime: string | Date;
  closeTime: string | Date;
  outcome?: Outcome;
  pnl?: number | string;
  symbol?: string;
} & Partial<Record<RRString, number | string>>;

type TradeContextShape = {
  trades: Trade[];
};

export default function OverviewCards({ tradesProp, fromDate, toDate }: OverviewCardsProps): JSX.Element | null {
  // HOOK ORDER: useContext -> useState -> useMemo -> useEffect (keeps hooks stable)
  const tradeCtx = (useContext(TradeContext) as unknown as TradeContextShape) ?? { trades: [] };
  const contextTrades = tradeCtx?.trades ?? [];

  const [mounted, setMounted] = useState<boolean>(false);

  // helper to safely parse pnl numbers
  const nPnL = (v: number | string | undefined): number => {
    if (typeof v === "number") return v;
    const parsed = parseFloat(String(v ?? "0"));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // All heavy metric calculations memoized and always executed (no early returns)
  const {
    filtered,
    sortedTrades,
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnl,
    pnlClass,
    profitFactor,
    bestTrade,
    worstTrade,
    perDay,
    mostTraded,
    totalTP,
    totalSLCount,
    profitRR,
    winLossData,
    streakData,
    pnlOverTime,
  } = useMemo(() => {
    // Which trades to operate on: explicit prop takes precedence over context
    const effectiveTrades: Trade[] = (tradesProp ?? contextTrades) || [];

    const safeDate = (d: string | Date | undefined | null): Date | null => {
      if (d == null) return null;
      const dt = new Date(d as any);
      return isNaN(dt.getTime()) ? null : dt;
    };

    // Decide whether to apply date filtering. Only apply if both fromDate and toDate are provided and valid.
    const fromCandidate = safeDate(fromDate ?? null);
    const toCandidate = safeDate(toDate ?? null);
    const doDateFilter = Boolean(fromCandidate && toCandidate);

    // normalize from/to to full-day boundaries if valid
    let from: Date | null = null;
    let to: Date | null = null;
    if (doDateFilter) {
      from = new Date(fromCandidate!.getTime());
      from.setHours(0, 0, 0, 0);
      to = new Date(toCandidate!.getTime());
      to.setHours(23, 59, 59, 999);
    }

    // Filtering: if doDateFilter true, include trades overlapping the date range; otherwise keep all trades
    const filteredTrades: Trade[] = doDateFilter
      ? effectiveTrades.filter((t) => {
          const open = safeDate(t.openTime);
          const close = safeDate(t.closeTime);
          if (!open && !close) return false; // skip invalid-date trades
          const o = open ?? close!;
          const c = close ?? open!;
          return o.getTime() <= (to as Date).getTime() && c.getTime() >= (from as Date).getTime();
        })
      : [...effectiveTrades];

    // Sort for time series visuals (by openTime ascending)
    const sorted = [...filteredTrades].sort((a, b) => {
      const A = safeDate(a.openTime)?.getTime() ?? 0;
      const B = safeDate(b.openTime)?.getTime() ?? 0;
      return A - B;
    });

    // Basic metrics
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter((t) => String(t.outcome).toLowerCase() === "win").length;
    const losses = filteredTrades.filter((t) => String(t.outcome).toLowerCase() === "loss").length;
    const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0";

    const totalPnl = filteredTrades.reduce((s, t) => s + nPnL(t.pnl), 0);
    const pnlClass = totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : "text-white";

    // Profit factor
    const grossProfit = filteredTrades.filter((t) => nPnL(t.pnl) > 0).reduce((s, t) => s + nPnL(t.pnl), 0);
    const grossLoss = Math.abs(
      filteredTrades.filter((t) => nPnL(t.pnl) < 0).reduce((s, t) => s + nPnL(t.pnl), 0)
    );
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0.00";

    // Best / Worst trades
    let bestTrade: Trade | null = null;
    let worstTrade: Trade | null = null;
    if (filteredTrades.length > 0) {
      bestTrade = filteredTrades.reduce((b, c) => (nPnL(c.pnl) > nPnL(b.pnl) ? c : b), filteredTrades[0]!);
      worstTrade = filteredTrades.reduce((w, c) => (nPnL(c.pnl) < nPnL(w.pnl) ? c : w), filteredTrades[0]!);
    }

    // Trades per day
    const dateList = sorted.map((t) => safeDate(t.openTime)).filter((d): d is Date => Boolean(d));
    const days = dateList.length > 1 ? differenceInCalendarDays(dateList[dateList.length - 1]!, dateList[0]!) + 1 : 1;
    const perDay = days ? (totalTrades / days).toFixed(2) : "0.00";

    // Most traded symbol
    const symbolCounts = filteredTrades.reduce<Record<string, number>>((acc, t) => {
      const sym = t.symbol ?? "N/A";
      acc[sym] = (acc[sym] || 0) + 1;
      return acc;
    }, {});
    const mostTraded = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    // RR parsing and metrics
    const rrKeys: RRString[] = [
      "rr",
      "RR",
      "riskReward",
      "risk_reward",
      "rrRatio",
      "rr_ratio",
      "R_R",
      "risk_reward_ratio",
      "riskRewardRatio",
    ];

    const parseRR = (t: Trade): number => {
      for (const k of rrKeys) {
        const c = (t as any)[k];
        if (c === undefined || c === null) continue;
        if (typeof c === "number" && Number.isFinite(c)) return c as number;
        if (typeof c === "string") {
          const s = c.trim();
          const sClean = s.replace(/\s+/g, "");

          if (sClean.includes(":")) {
            const parts = sClean.split(":");
            if (parts.length === 2) {
              const a = parseFloat(parts[0]!);
              const b = parseFloat(parts[1]!);
              if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
            }
          }

          if (sClean.includes("/")) {
            const parts = sClean.split("/");
            if (parts.length === 2) {
              const a = parseFloat(parts[0]!);
              const b = parseFloat(parts[1]!);
              if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
            }
          }

          const withoutR = sClean.replace(/R$/i, "");
          const n = parseFloat(withoutR);
          if (!Number.isNaN(n)) return n;

          const m = s.match(/-?\d+(?:\.\d+)?/);
          if (m) return parseFloat(m[0]!);
        }
      }
      return Number.NaN;
    };

    const rrValuesAll = filteredTrades.map((t) => parseRR(t));
    const rrValues = rrValuesAll.filter((v) => Number.isFinite(v));
    const totalTP = rrValues.filter((v) => v > 0).reduce((s, v) => s + v, 0);
    const totalSLCount = rrValues.filter((v) => v <= 0).length;
    const profitRR = totalTP - totalSLCount;

    // Win/Loss trend & charts (time-ordered)
    const labels = sorted.map((t) => format(new Date(t.openTime), "MMM d"));
    const winLossData = {
      labels,
      datasets: [
        {
          label: "Wins",
          data: sorted.map((t) => (String(t.outcome).toLowerCase() === "win" ? 1 : 0)),
          borderColor: "#22c55e",
          backgroundColor: "#22c55e66",
        },
        {
          label: "Losses",
          data: sorted.map((t) => (String(t.outcome).toLowerCase() === "loss" ? 1 : 0)),
          borderColor: "#ef4444",
          backgroundColor: "#ef444466",
        },
      ],
    };

    // Streaks
    const streaks: number[] = [];
    let curr = 0;
    let last: "win" | "loss" | null = null;
    sorted.forEach((t) => {
      const o = String(t.outcome).toLowerCase();
      if (o !== "win" && o !== "loss") {
        curr = 0;
        last = null;
        streaks.push(curr);
        return;
      }
      if (o === last) curr++;
      else {
        curr = 1;
        last = o as "win" | "loss";
      }
      streaks.push(curr);
    });
    const streakData = {
      labels: streaks.map((_, i) => `#${i + 1}`),
      datasets: [
        {
          label: "Streak",
          data: streaks,
          borderColor: "#3b82f6",
          fill: false,
        },
      ],
    };

    // Cumulative PnL over time
    const pnlOverTime = {
      labels,
      datasets: [
        {
          label: "Cum. PnL",
          data: sorted.map((_, i) => sorted.slice(0, i + 1).reduce((s, t) => s + nPnL(t.pnl), 0)),
          borderColor: "#64748b",
          fill: false,
        },
      ],
    };

    return {
      filtered: filteredTrades,
      sortedTrades: sorted,
      totalTrades,
      wins,
      losses,
      winRate,
      totalPnl,
      pnlClass,
      profitFactor,
      bestTrade,
      worstTrade,
      perDay,
      mostTraded,
      totalTP,
      totalSLCount,
      profitRR,
      winLossData,
      streakData,
      pnlOverTime,
    };
  }, [contextTrades, tradesProp, fromDate, toDate]); // depend on both source trades and date inputs

  // set mounted after first client render (keeps Chart SSR safe)
  useEffect(() => {
    setMounted(true);
  }, []);

  // RENDER
  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            icon: <BarChart2 size={24} className="text-blue-400" />,
            label: "Total Trades",
            value: totalTrades,
            className: "text-white",
          },
          {
            icon: <CheckCircle size={24} className="text-green-400" />,
            label: "Trades Won",
            value: wins,
            className: "text-green-400",
          },
          {
            icon: <XCircle size={24} className="text-red-400" />,
            label: "Trades Lost",
            value: losses,
            className: "text-red-400",
          },
          {
            icon: <Percent size={24} className="text-indigo-400" />,
            label: "Win Rate",
            value: `${winRate}%`,
            className: "text-white",
          },
          {
            icon: <DollarSign size={24} className={pnlClass} />,
            label: "PNL ($)",
            value: `$${totalPnl.toFixed(2)}`,
            className: pnlClass,
          },
          {
            icon: <Activity size={24} className="text-yellow-400" />,
            label: "Profit Factor",
            value: profitFactor,
            className: "text-white",
          },
          // RR metrics
          {
            icon: <ArrowUp size={24} className="text-green-400" />,
            label: "Total TP (RR)",
            value: `${totalTP.toFixed(2)}R`,
            className: "text-green-400",
          },
          {
            icon: <ArrowDown size={24} className="text-red-400" />,
            label: "Total SL (RR)",
            value: totalSLCount,
            className: "text-red-400",
          },
          {
            icon: (
              <Activity
                size={24}
                className={profitRR > 0 ? "text-green-400" : profitRR < 0 ? "text-red-400" : "text-white"}
              />
            ),
            label: "Profit (RR)",
            value: `${profitRR >= 0 ? "+" : ""}${profitRR.toFixed(2)}R`,
            className: profitRR > 0 ? "text-green-400" : profitRR < 0 ? "text-red-400" : "text-white",
          },
          // Best / Worst
          {
            icon: <Star size={24} className="text-yellow-300" />,
            label: "Best Trade",
            value: `$${(bestTrade ? nPnL(bestTrade.pnl) : 0).toFixed(2)}`,
            className: bestTrade && nPnL(bestTrade.pnl) > 0 ? "text-green-400" : "text-white",
          },
          {
            icon: <ThumbsDown size={24} className="text-red-500" />,
            label: "Worst Trade",
            value: `$${(worstTrade ? nPnL(worstTrade.pnl) : 0).toFixed(2)}`,
            className: worstTrade && nPnL(worstTrade.pnl) < 0 ? "text-red-400" : "text-white",
          },
          {
            icon: <Calendar size={24} className="text-blue-300" />,
            label: "Trades / Day",
            value: perDay,
            className: "text-white",
          },
          {
            icon: <PieChart size={24} className="text-pink-400" />,
            label: "Most Traded Pair",
            value: mostTraded,
            className: "text-white",
          },
        ].map(({ icon, label, value, className }) => (
          <div key={label} className="bg-[#161B22] rounded-xl p-5 flex items-center gap-4 shadow-lg">
            <div>{icon}</div>
            <div>
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-2xl font-semibold ${className}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <div className="bg-[#161B22] rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Win / Loss Trend</h3>
          {mounted ? <Line data={winLossData} /> : <div className="h-48" />}
        </div>

        <div className="bg-[#161B22] rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Streak Tracker</h3>
          {mounted ? <Line data={streakData} /> : <div className="h-48" />}
        </div>

        <div className="bg-[#161B22] rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">PNL Over Time</h3>
          {mounted ? <Line data={pnlOverTime} /> : <div className="h-48" />}
        </div>
      </div>
    </div>
  );
}
