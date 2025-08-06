// components/dashboard/OverviewCards.tsx

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

export default function OverviewCards({ fromDate, toDate }: OverviewCardsProps) {
  const { trades } = useContext(TradeContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 1) Filter trades by selected date range
  const filtered = trades.filter((t) => {
    const open = new Date(t.openTime),
      close = new Date(t.closeTime),
      from = new Date(fromDate),
      to = new Date(toDate);
    return open >= from && close <= to;
  });

  // 2) Basic metrics
  const totalTrades = filtered.length;
  const wins = filtered.filter((t) => t.outcome === "Win").length;
  const losses = filtered.filter((t) => t.outcome === "Loss").length;
  const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0";

  const totalPnl = filtered.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
  const pnlClass =
    totalPnl > 0
      ? "text-green-400"
      : totalPnl < 0
      ? "text-red-400"
      : "text-white";

  const profitFactor = (() => {
    const prof = filtered
      .filter((t) => parseFloat(t.pnl || "0") >= 0)
      .reduce((s, t) => s + parseFloat(t.pnl || "0"), 0);
    const loss = Math.abs(
      filtered
        .filter((t) => parseFloat(t.pnl || "0") < 0)
        .reduce((s, t) => s + parseFloat(t.pnl || "0"), 0)
    );
    return loss > 0 ? (prof / loss).toFixed(2) : "∞";
  })();

  const best = filtered.reduce(
    (b, c) =>
      parseFloat(c.pnl || "0") > parseFloat(b.pnl || "-9999") ? c : b,
    { pnl: "-9999" }
  );
  const worst = filtered.reduce(
    (w, c) =>
      parseFloat(c.pnl || "0") < parseFloat(w.pnl || "9999") ? c : w,
    { pnl: "9999" }
  );
  const bestClass = parseFloat(best.pnl || "0") > 0 ? "text-green-400" : "text-white";
  const worstClass = parseFloat(worst.pnl || "0") < 0 ? "text-red-400" : "text-white";

  const dates = filtered
    .map((t) => new Date(t.openTime))
    .sort((a, b) => a.getTime() - b.getTime());
  const days =
    dates.length > 1
      ? differenceInCalendarDays(dates[dates.length - 1], dates[0]) + 1
      : 1;
  const perDay = days ? (totalTrades / days).toFixed(2) : "0.00";

  const symbolCounts = filtered.reduce<Record<string, number>>((acc, t) => {
    acc[t.symbol] = (acc[t.symbol] || 0) + 1;
    return acc;
  }, {});
  const mostTraded =
    Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Win/Loss trend data
  const trendLabels = filtered.map((t) => format(new Date(t.openTime), "MMM d"));
  const winLossData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Wins",
        data: filtered.map((t) => (t.outcome === "Win" ? 1 : 0)),
        borderColor: "#22c55e",
        backgroundColor: "#22c55e66",
      },
      {
        label: "Losses",
        data: filtered.map((t) => (t.outcome === "Loss" ? 1 : 0)),
        borderColor: "#ef4444",
        backgroundColor: "#ef444466",
      },
    ],
  };

  // Streak tracker data
  const streaks: number[] = [];
  let curr = 0,
    last: "Win" | "Loss" | null = null;
  filtered.forEach((t) => {
    if (t.outcome === last) curr++;
    else {
      curr = 1;
      last = t.outcome as "Win" | "Loss";
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
          filtered
            .slice(0, i + 1)
            .reduce((s, t) => s + parseFloat(t.pnl || "0"), 0)
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
          {
            icon: <Star size={24} className="text-yellow-300" />,
            label: "Best Trade",
            value: `$${parseFloat(best.pnl || "0").toFixed(2)}`,
            className: bestClass,
          },
          {
            icon: <ThumbsDown size={24} className="text-red-500" />,
            label: "Worst Trade",
            value: `$${parseFloat(worst.pnl || "0").toFixed(2)}`,
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
