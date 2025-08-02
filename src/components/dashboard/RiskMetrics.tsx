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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { Trade } from "@/types/trade";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

export default function RiskMetrics() {
  const { trades } = useContext(TradeContext);
  const [chartType, setChartType] = useState("bar");

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
      return { date: p.date, drawdown: Number(dd.toFixed(2)) };
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

    let streak = 0,
      maxWinStreak = 0,
      maxLossStreak = 0;
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

    const riskScore = maxDD > 50
      ? "Very High Risk"
      : maxDD > 30
      ? "High Risk"
      : maxDD > 15
      ? "Moderate Risk"
      : "Low Risk";

    const performanceGrade = sharpe > 1.5 && profitFactor > 1.5
      ? "Excellent"
      : sharpe > 1 && profitFactor > 1.2
      ? "Good"
      : "Needs Improvement";

    return {
      sharpe,
      profitFactor,
      winLossRatio,
      maxDD: maxDD.toFixed(2),
      avgRR,
      maxWinStreak,
      maxLossStreak,
      riskScore,
      performanceGrade,
    };
  }, [trades, drawdownSeries]);

  const pnlData = trades.map((t, i) => ({
    idx: i + 1,
    pnl: parseFloat(t.pnl as string),
  }));

  const pieData = [
    { name: "Winning Trades", value: pnlData.filter((t) => t.pnl > 0).length },
    { name: "Losing Trades", value: pnlData.filter((t) => t.pnl < 0).length },
  ];

  const colors = ["#10b981", "#ef4444"];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">Risk Metrics Summary</CardTitle>
          <Popover>
            <PopoverTrigger>
              <Info className="h-5 w-5 text-muted-foreground cursor-pointer" />
            </PopoverTrigger>
            <PopoverContent className="max-w-md text-sm">
              These are key risk metrics calculated based on your uploaded trading history. They help evaluate how consistent, risky, and efficient your trading system is.
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 font-semibold text-base">
          <div><p>Max Drawdown (%)</p><p>{stats.maxDD}</p></div>
          <div><p>Sharpe Ratio</p><p>{stats.sharpe}</p></div>
          <div><p>Profit Factor</p><p>{stats.profitFactor}</p></div>
          <div><p>Win/Loss Ratio</p><p>{stats.winLossRatio}</p></div>
          <div><p>Avg R/R</p><p>{stats.avgRR}</p></div>
          <div><p>Longest Win Streak</p><p>{stats.maxWinStreak}</p></div>
          <div><p>Longest Loss Streak</p><p>{stats.maxLossStreak}</p></div>
          <div><p>Risk Score</p><p>{stats.riskScore}</p></div>
          <div><p>Performance Grade</p><p>{stats.performanceGrade}</p></div>
        </CardContent>
      </Card>

      {/* Chart Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Select Chart Type</CardTitle>
        </CardHeader>
        <CardContent className="w-48">
          <Select defaultValue={chartType} onValueChange={(val) => setChartType(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="donut">Donut Chart</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Chart Renderer */}
      <Card>
        <CardHeader>
          <CardTitle>
            Trade Outcome Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {chartType === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlData}>
                <XAxis dataKey="idx" label={{ value: "Trade #", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "PnL", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="pnl">
                  {pnlData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartType === "pie" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {chartType === "donut" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={drawdownSeries}>
              <XAxis dataKey="date" label={{ value: "Date", position: "insideBottom", offset: -5 }} />
              <YAxis unit="%" label={{ value: "Drawdown %", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="#fb7185"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
