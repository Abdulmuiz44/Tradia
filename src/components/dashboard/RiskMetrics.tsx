// components/dashboard/RiskMetrics.tsx

"use client";

import { useContext, useMemo, useState } from "react";
import { TradeContext } from "@/context/TradeContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { Trade } from "@/types/trade";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ["#22c55e", "#ef4444"];

const MetricInfo = ({ text }: { text: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Info className="ml-1 w-3 h-3 cursor-pointer inline-block text-muted-foreground" />
    </PopoverTrigger>
    <PopoverContent className="text-xs max-w-xs">{text}</PopoverContent>
  </Popover>
);

export default function RiskMetrics() {
  const { trades } = useContext(TradeContext);
  const [selectedChart, setSelectedChart] = useState<"drawdown" | "equity">("drawdown");
  const [chartType, setChartType] = useState<"bar" | "pie" | "donut">("bar");

  const equitySeries = useMemo(() => {
    let balance = 0;
    return trades.map((t) => {
      balance += parseFloat(t.pnl as string);
      return {
        date: format(new Date(t.closeTime), "dd/MM/yyyy"),
        equity: Number(balance.toFixed(2)),
      };
    });
  }, [trades]);

  const drawdownSeries = useMemo(() => {
    let peak = equitySeries[0]?.equity || 0;
    return equitySeries.map((p) => {
      peak = Math.max(peak, p.equity);
      const dd = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0;
      return {
        date: p.date,
        drawdown: Number(dd.toFixed(2)),
      };
    });
  }, [equitySeries]);

  const stats = useMemo(() => {
    const pnls = trades.map((t) => parseFloat(t.pnl as string));
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length || 0;
    const variance = pnls.reduce((sum, r) => sum + (r - avg) ** 2, 0) / pnls.length || 0;
    const stdDev = Math.sqrt(variance) || 1;
    const sharpe = (avg / stdDev).toFixed(2);

    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0).map((p) => Math.abs(p));
    const profit = wins.reduce((a, b) => a + b, 0);
    const loss = losses.reduce((a, b) => a + b, 0);
    const profitFactor = loss > 0 ? (profit / loss).toFixed(2) : "—";
    const winLossRatio = losses.length > 0 ? (wins.length / losses.length).toFixed(2) : "—";

    let maxDD = 0;
    drawdownSeries.forEach((d) => (maxDD = Math.max(maxDD, d.drawdown)));

    const rrs = trades.map((t) => parseFloat(t.rr as string) || 0);
    const avgRR = (rrs.reduce((a, b) => a + b, 0) / rrs.length || 0).toFixed(2);

    let streak = 0, maxWinStreak = 0, maxLossStreak = 0;
    trades.forEach((t) => {
      const isWin = parseFloat(t.pnl as string) > 0;
      if (isWin) {
        streak = streak > 0 ? streak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, streak);
      } else {
        streak = streak < 0 ? streak - 1 : -1;
        maxLossStreak = Math.max(maxLossStreak, -streak);
      }
    });

    return {
      sharpe,
      profitFactor,
      winLossRatio,
      maxDD: maxDD.toFixed(2),
      avgRR,
      maxWinStreak,
      maxLossStreak,
      totalTrades: trades.length,
      winRate: ((wins.length / trades.length) * 100).toFixed(1),
      lossRate: ((losses.length / trades.length) * 100).toFixed(1),
      riskProfile:
        Number(maxDD.toFixed(2)) < 10
          ? "Conservative"
          : Number(sharpe) > 1.5
          ? "Balanced"
          : "Aggressive",
    };
  }, [trades, drawdownSeries]);

  const pnlData = trades.map((t, i) => ({
    idx: i + 1,
    pnl: parseFloat(t.pnl as string),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">📊 Risk Metrics Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {Object.entries({
            "Max Drawdown (%)": stats.maxDD,
            "Sharpe Ratio": stats.sharpe,
            "Profit Factor": stats.profitFactor,
            "Win/Loss Ratio": stats.winLossRatio,
            "Avg R/R": stats.avgRR,
            "Win Streak": stats.maxWinStreak,
            "Loss Streak": stats.maxLossStreak,
            "Total Trades": stats.totalTrades,
            "Risk Profile": stats.riskProfile,
          }).map(([label, value]) => (
            <div key={label}>
              <div className="text-muted-foreground flex items-center">
                {label}
                <MetricInfo text={`Explanation of ${label}`} />
              </div>
              <div className="font-bold">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">📈 Equity vs Drawdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedChart("drawdown")}
              className={`px-3 py-1 rounded text-xs ${
                selectedChart === "drawdown" ? "bg-pink-500 text-white" : "bg-gray-200"
              }`}
            >
              Drawdown
            </button>
            <button
              onClick={() => setSelectedChart("equity")}
              className={`px-3 py-1 rounded text-xs ${
                selectedChart === "equity" ? "bg-emerald-500 text-white" : "bg-gray-200"
              }`}
            >
              Equity
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {selectedChart === "drawdown" ? (
              <LineChart data={drawdownSeries}>
                <XAxis dataKey="date" label={{ value: "Date", position: "insideBottom", offset: -5 }} />
                <YAxis unit="%" label={{ value: "Drawdown %", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(val: number) => `${val}%`} />
                <Legend />
                <ReferenceLine y={parseFloat(stats.maxDD)} stroke="#ef4444" strokeDasharray="3 3" label="Max DD" />
                <Line type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <AreaChart data={equitySeries}>
                <XAxis dataKey="date" label={{ value: "Date", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Equity ($)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                <Legend />
                <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" label="Break-even" />
                <Area type="monotone" dataKey="equity" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground">
            💡{" "}
            {selectedChart === "drawdown"
              ? parseFloat(stats.maxDD) < 20
                ? "Your drawdown is under control. Well done!"
                : "Your drawdown is high. Consider reducing risk."
              : "You're steadily growing equity. Maintain your discipline."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <CardTitle className="text-lg font-bold">📊 Profit & Loss Per Trade</CardTitle>
          <Select value={chartType} onValueChange={(val) => setChartType(val as any)}>
            <SelectTrigger className="w-[120px] text-xs">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="pie">Pie</SelectItem>
              <SelectItem value="donut">Donut</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            {chartType === "bar" ? (
              <BarChart data={pnlData}>
                <XAxis dataKey="idx" label={{ value: "Trade #", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "PnL ($)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="pnl" isAnimationActive>
                  {pnlData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={pnlData}
                  dataKey="pnl"
                  nameKey="idx"
                  cx="50%"
                  cy="50%"
                  outerRadius={chartType === "donut" ? 60 : 80}
                  innerRadius={chartType === "donut" ? 40 : 0}
                  label
                >
                  {pnlData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            💡 Based on {trades.length} trades, {stats.winRate}% win rate and{" "}
            {stats.profitFactor !== "—"
              ? `a Profit Factor of ${stats.profitFactor}`
              : "insufficient data for Profit Factor"}.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
