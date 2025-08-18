// src/components/dashboard/OverviewCards.tsx
"use client";

import { useContext, useEffect, useState } from "react";
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
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface OverviewCardsProps {
  fromDate: string;
  toDate: string;
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

export default function OverviewCards({ fromDate, toDate }: OverviewCardsProps): JSX.Element | null {
  const { trades } = (useContext(TradeContext) as unknown as TradeContextShape) ?? { trades: [] };
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 1) Filter trades by selected date range
  const filtered: Trade[] = trades.filter((t: Trade) => {
    const open = new Date(t.openTime);
    const close = new Date(t.closeTime);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return open >= from && close <= to;
  });

  // 2) Basic metrics
  const totalTrades = filtered.length;
  const wins = filtered.filter((t: Trade) => t.outcome === "Win").length;
  const losses = filtered.filter((t: Trade) => t.outcome === "Loss").length;
  const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0";

  const nPnL = (v: number | string | undefined): number =>
    typeof v === "number" ? v : parseFloat(String(v ?? "0"));

  const totalPnl = filtered.reduce((sum: number, t: Trade) => sum + nPnL(t.pnl), 0);
  const pnlClass =
    totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : "text-white";

  const profitFactor = (() => {
    const prof = filtered
      .filter((t: Trade) => nPnL(t.pnl) >= 0)
      .reduce((s: number, t: Trade) => s + nPnL(t.pnl), 0);
    const loss = Math.abs(
      filtered
        .filter((t: Trade) => nPnL(t.pnl) < 0)
        .reduce((s: number, t: Trade) => s + nPnL(t.pnl), 0)
    );
    return loss > 0 ? (prof / loss).toFixed(2) : "∞";
  })();

  const MIN_TRADE: Trade = {
    openTime: "",
    closeTime: "",
    pnl: "-999999999",
    outcome: "Loss",
    symbol: "",
  };
  const MAX_TRADE: Trade = {
    openTime: "",
    closeTime: "",
    pnl: "999999999",
    outcome: "Win",
    symbol: "",
  };

  const best = filtered.reduce<Trade>(
    (b, c) => (nPnL(c.pnl) > nPnL(b.pnl) ? c : b),
    MIN_TRADE
  );
  const worst = filtered.reduce<Trade>(
    (w, c) => (nPnL(c.pnl) < nPnL(w.pnl) ? c : w),
    MAX_TRADE
  );
  const bestClass = nPnL(best.pnl) > 0 ? "text-green-400" : "text-white";
  const worstClass = nPnL(worst.pnl) < 0 ? "text-red-400" : "text-white";

  const dates = filtered
    .map((t: Trade) => new Date(t.openTime))
    .sort((a, b) => a.getTime() - b.getTime());
  const days =
    dates.length > 1 ? differenceInCalendarDays(dates[dates.length - 1]!, dates[0]!) + 1 : 1;
  const perDay = days ? (totalTrades / days).toFixed(2) : "0.00";

  const symbolCounts = filtered.reduce<Record<string, number>>((acc, t: Trade) => {
    const sym = t.symbol ?? "N/A";
    acc[sym] = (acc[sym] || 0) + 1;
    return acc;
  }, {});
  const mostTraded =
    Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // ---------- RR parsing and metrics ----------
  const parseRR = (t: Trade): number => {
    const candidates: Array<number | string | undefined> = [
      t.rr,
      t.RR,
      t.riskReward,
      t.risk_reward,
      t.rrRatio,
      t.rr_ratio,
      t.R_R,
      t.risk_reward_ratio,
      t.riskRewardRatio,
    ];

    for (const c of candidates) {
      if (c === undefined || c === null) continue;

      if (typeof c === "number" && !Number.isNaN(c)) return c;

      if (typeof c === "string") {
        const s = c.trim();
        const sClean = s.replace(/\s+/g, "");

        // "1:2" => 2 / 1
        if (sClean.includes(":")) {
          const parts = sClean.split(":");
          if (parts.length === 2) {
            const a = parseFloat(parts[0]!);
            const b = parseFloat(parts[1]!);
            if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
          }
        }

        // "1/2" => 2 / 1
        if (sClean.includes("/")) {
          const parts = sClean.split("/");
          if (parts.length === 2) {
            const a = parseFloat(parts[0]!);
            const b = parseFloat(parts[1]!);
            if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
          }
        }

        // "2R" => 2
        const withoutR = sClean.replace(/R$/i, "");
        const n = parseFloat(withoutR);
        if (!Number.isNaN(n)) return n;

        // fallback: first numeric
        const m = s.match(/-?\d+(\.\d+)?/);
        if (m) return parseFloat(m[0]!);
      }
    }

    return Number.NaN;
  };

  const rrValues = filtered.map((t) => parseRR(t)).filter((v) => !Number.isNaN(v));
  const totalTP = rrValues.filter((v) => v > 0).reduce((s, v) => s + v, 0);
  const totalSLCount = filtered.reduce((cnt: number, t: Trade) => {
    const rr = parseRR(t);
    return cnt + (rr === -1 ? 1 : 0);
  }, 0);
  const profitRR = totalTP - totalSLCount;
  // -------------------------------------------

  // Win/Loss trend data
  const trendLabels = filtered.map((t: Trade) => format(new Date(t.openTime), "MMM d"));
  const winLossData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Wins",
        data: filtered.map((t: Trade) => (t.outcome === "Win" ? 1 : 0)),
        borderColor: "#22c55e",
        backgroundColor: "#22c55e66",
      },
      {
        label: "Losses",
        data: filtered.map((t: Trade) => (t.outcome === "Loss" ? 1 : 0)),
        borderColor: "#ef4444",
        backgroundColor: "#ef444466",
      },
    ],
  };

  // Streak tracker data
  const streaks: number[] = [];
  let curr = 0;
  let last: "Win" | "Loss" | null = null;
  filtered.forEach((t: Trade) => {
    if (t.outcome === last) curr++;
    else {
      curr = 1;
      last = (t.outcome === "Win" || t.outcome === "Loss" ? t.outcome : null) ?? last;
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

  // PNL over time
  const pnlOverTime = {
    labels: trendLabels,
    datasets: [
      {
        label: "Cum. PnL",
        data: trendLabels.map((_, i) =>
          filtered.slice(0, i + 1).reduce((s, t) => s + nPnL(t.pnl), 0)
        ),
        borderColor: "#64748b",
        fill: false,
      },
    ],
  };

  // Render
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
          // New RR metrics
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
                className={
                  profitRR > 0 ? "text-green-400" : profitRR < 0 ? "text-red-400" : "text-white"
                }
              />
            ),
            label: "Profit (RR)",
            value: `${profitRR >= 0 ? "+" : ""}${profitRR.toFixed(2)}R`,
            className:
              profitRR > 0 ? "text-green-400" : profitRR < 0 ? "text-red-400" : "text-white",
          },
          // Existing best/worst + others
          {
            icon: <Star size={24} className="text-yellow-300" />,
            label: "Best Trade",
            value: `$${nPnL(best.pnl).toFixed(2)}`,
            className: bestClass,
          },
          {
            icon: <ThumbsDown size={24} className="text-red-500" />,
            label: "Worst Trade",
            value: `$${nPnL(worst.pnl).toFixed(2)}`,
            className: worstClass,
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
          <div
            key={label}
            className="bg-[#161B22] rounded-xl p-5 flex items-center gap-4 shadow-lg"
          >
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
          <Line data={winLossData} />
        </div>
        <div className="bg-[#161B22] rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Streak Tracker</h3>
          <Line data={streakData} />
        </div>
        <div className="bg-[#161B22] rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">PNL Over Time</h3>
          <Line data={pnlOverTime} />
        </div>
      </div>
    </div>
  );
}
