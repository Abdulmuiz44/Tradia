// src/components/dashboard/OverviewCards.tsx

"use client";

import { useContext, useEffect, useState } from "react";
import { TradeContext } from "@/context/TradeContext";
import { differenceInCalendarDays } from "date-fns";
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
  Clock,
  Calendar,
} from "lucide-react";

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-700 rounded mt-1">
      <div
        className={`h-full rounded ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

export default function OverviewCards() {
  const { trades } = useContext(TradeContext);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.outcome === "Win");
  const losses = trades.filter((t) => t.outcome === "Loss");

  const totalWins = wins.length;
  const totalLosses = losses.length;
  const winRate = totalTrades ? (totalWins / totalTrades) * 100 : 0;

  const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
  const pnlColor = totalPnl > 0 ? "text-green-400" : totalPnl < 0 ? "text-red-400" : "text-white";

  const sumProfits = wins.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
  const sumLosses = Math.abs(losses.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0));
  const profitFactor = sumLosses > 0 ? sumProfits / sumLosses : Infinity;
  const pfColor = profitFactor > 1 ? "text-green-400" : profitFactor < 1 ? "text-red-400" : "text-white";

  const totalTP_RR = trades
    .filter((t) => parseFloat(t.rr || "0") > 0)
    .reduce((sum, t) => sum + parseFloat(t.rr || "0"), 0);

  const totalSL_RR = trades
    .filter((t) => parseFloat(t.rr || "0") < 0)
    .reduce((sum) => sum - 1, 0); // Each SL = -1 RR

  const rrProfit = totalTP_RR + totalSL_RR;
  const rrColor = rrProfit > 0 ? "text-green-400" : rrProfit < 0 ? "text-red-400" : "text-white";

  const avgHoldTime =
    totalTrades > 0
      ? (
          trades.reduce((sum, t) => sum + parseFloat(t.duration || "0"), 0) / totalTrades
        ).toFixed(2)
      : "0.00";

  const dates = trades
    .map((t) => new Date(t.openTime))
    .sort((a, b) => a.getTime() - b.getTime());

  const first = dates[0];
  const last = dates[dates.length - 1];
  const days = dates.length > 1 ? differenceInCalendarDays(last, first) + 1 : 1;
  const tradesPerDay = days > 0 ? (totalTrades / days).toFixed(2) : "0.00";

  const symbolCounts = trades.reduce<Record<string, number>>((acc, t) => {
    acc[t.symbol] = (acc[t.symbol] || 0) + 1;
    return acc;
  }, {});
  const mostTraded = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const metrics = [
    {
      label: "Total Trades",
      value: totalTrades,
      icon: <BarChart2 size={20} />,
    },
    {
      label: "Trades Won",
      value: totalWins,
      icon: <CheckCircle size={20} className="text-green-400" />,
    },
    {
      label: "Trades Lost",
      value: totalLosses,
      icon: <XCircle size={20} className="text-red-400" />,
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      percent: winRate,
      icon: <Percent size={20} />,
    },
    {
      label: "PNL ($)",
      value: `$${totalPnl.toFixed(2)}`,
      icon: <DollarSign size={20} />,
      color: pnlColor,
      percent: Math.min((Math.abs(totalPnl) / 50000) * 100, 100),
    },
    {
      label: "Profit Factor",
      value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
      icon: <Activity size={20} />,
      color: pfColor,
      percent: Math.min(profitFactor * 20, 100),
    },
    {
      label: "Total TPs (RR)",
      value: totalTP_RR.toFixed(2),
      icon: <ArrowUp size={20} className="text-green-400" />,
    },
    {
      label: "Total SLs (RR)",
      value: totalSL_RR.toFixed(2),
      icon: <ArrowDown size={20} className="text-red-400" />,
    },
    {
      label: "Profit (RR)",
      value: rrProfit.toFixed(2),
      icon: <PieChart size={20} />,
      color: rrColor,
      percent: Math.min((Math.abs(rrProfit) / 100) * 100, 100),
    },
    {
      label: "Avg Hold Time (min)",
      value: avgHoldTime,
      icon: <Clock size={20} />,
    },
    {
      label: "Trades/Day",
      value: tradesPerDay,
      icon: <Calendar size={20} />,
    },
    {
      label: "Most Traded Pair",
      value: mostTraded,
      icon: <PieChart size={20} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {metrics.map(({ label, value, icon, color, percent }) => (
        <div
          key={label}
          className="bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h3 className="text-sm text-gray-400">{label}</h3>
              <p className={`text-2xl font-semibold ${color || "text-white"}`}>{value}</p>
            </div>
          </div>
          {typeof percent === "number" && (
            <ProgressBar
              percent={percent}
              color={color?.replace("text-", "bg-") || "bg-white"}
            />
          )}
        </div>
      ))}
    </div>
  );
}
