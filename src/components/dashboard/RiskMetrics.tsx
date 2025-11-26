// components/dashboard/RiskMetrics.tsx

"use client";

import { useMemo, useState } from "react";
import { useTrade } from "@/context/TradeContext";
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
import { Info } from "lucide-react";

interface RiskMetricsProps {
  trades?: Trade[];
}

export default function RiskMetrics({ trades: tradesProp }: RiskMetricsProps = {}) {
  const { trades: contextTrades } = useTrade();
  const trades = useMemo(() => {
    if (Array.isArray(tradesProp)) return tradesProp;
    if (Array.isArray(contextTrades)) return contextTrades;
    return [];
  }, [tradesProp, contextTrades]);
  const [chartType, setChartType] = useState("bar");

  const track = async (name: string, properties?: Record<string, any>) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'action', name, path: window.location.pathname, meta: properties })
      });
    } catch { }
  };

  const equitySeries = useMemo(() => {
    let balance = 0;
    return trades.map((t) => {
      balance += t.pnl ?? 0;

      // Safely handle date formatting with fallbacks
      let dateToFormat: Date;
      const closeTime = t.closeTime;
      const openTime = t.openTime;

      if (closeTime && closeTime.trim() !== '') {
        dateToFormat = new Date(closeTime);
      } else if (openTime && openTime.trim() !== '') {
        dateToFormat = new Date(openTime);
      } else {
        // Fallback to current date if both are invalid
        dateToFormat = new Date();
      }

      // Check if the date is valid
      if (isNaN(dateToFormat.getTime())) {
        dateToFormat = new Date(); // Use current date as fallback
      }

      return {
        date: format(dateToFormat, "dd/MM/yyyy"),
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

  // NEW: VaR Calculations
  const varEstimates = useMemo(() => {
    const pnls = trades
      .map((t) => {
        const n = typeof t.pnl === "number" ? t.pnl : Number(t.pnl);
        return Number.isFinite(n) ? n : 0;
      })
      .sort((a, b) => a - b);
    const percentile = 0.05;
    const index = Math.floor(percentile * pnls.length);
    const historicalVaR = pnls.length > 0 && pnls[index] !== undefined ? (-pnls[index]).toFixed(2) : "—";

    const mean = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
    const stdDev = pnls.length > 0 ? Math.sqrt(pnls.reduce((s, r) => s + (r - mean) ** 2, 0) / pnls.length) : 0;
    const monteCarloVaR = pnls.length > 0 ? (-1 * (mean - 1.65 * stdDev)).toFixed(2) : "—"; // 95% confidence

    return { historicalVaR, monteCarloVaR };
  }, [trades]);

  // NEW: Rolling Drawdown Metrics (last 7 days)
  const rollingMetrics = useMemo(() => {
    const recent = drawdownSeries.slice(-7);
    const avg = recent.reduce((a, b) => a + b.drawdown, 0) / recent.length || 0;
    const max = Math.max(...recent.map((d) => d.drawdown));
    return {
      avgDrawdown7d: avg.toFixed(2),
      maxDrawdown7d: max.toFixed(2),
    };
  }, [drawdownSeries]);

  const stats = useMemo(() => {
    const pnls = trades.map((t) => {
      const n = typeof t.pnl === "number" ? t.pnl : Number(t.pnl);
      return Number.isFinite(n) ? n : 0;
    });
    const avg = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
    const variance = pnls.length > 0 ? pnls.reduce((sum, r) => sum + (r - avg) ** 2, 0) / pnls.length : 0;
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

    const rrs = trades.map((t) => {
      const n = typeof t.rr === "number" ? t.rr : Number(t.rr);
      return Number.isFinite(n) ? n : 0;
    });
    const avgRR = (rrs.reduce((a, b) => a + b, 0) / rrs.length || 0).toFixed(2);

    let streak = 0,
      maxWinStreak = 0,
      maxLossStreak = 0;
    trades.forEach((t) => {
      const p = typeof t.pnl === "number" ? t.pnl : Number(t.pnl);
      const isWin = Number.isFinite(p) ? p > 0 : false;
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

    const sharpeNum = Number(sharpe);
    const profitFactorNum = typeof profitFactor === "string" ? (isNaN(Number(profitFactor)) ? 0 : Number(profitFactor)) : Number(profitFactor);

    const performanceGrade = sharpeNum > 1.5 && profitFactorNum > 1.5
      ? "Excellent"
      : sharpeNum > 1 && profitFactorNum > 1.2
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

  const pnlData = trades.map((t, i) => {
    const p = typeof t.pnl === "number" ? t.pnl : Number(t.pnl);
    return { idx: i + 1, pnl: Number.isFinite(p) ? p : 0 };
  });

  const pieData = [
    { name: "Winning Trades", value: pnlData.filter((t) => t.pnl > 0).length },
    { name: "Losing Trades", value: pnlData.filter((t) => t.pnl < 0).length },
  ];

  const colors = ["#10b981", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">Risk Metrics Summary</CardTitle>
          <Popover>
            <PopoverTrigger data-track="riskmetrics_info_open">
              <Info className="h-5 w-5 text-muted-foreground cursor-pointer" />
            </PopoverTrigger>
            <PopoverContent className="max-w-md text-sm">
              These are key risk metrics calculated based on your uploaded trading history.
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
          {/* NEW: Rolling Metrics */}
          <div><p>Avg Drawdown (7d)</p><p>{rollingMetrics.avgDrawdown7d}%</p></div>
          <div><p>Max Drawdown (7d)</p><p>{rollingMetrics.maxDrawdown7d}%</p></div>
          {/* NEW: VaR */}
          <div><p>Historical VaR (95%)</p><p>${varEstimates.historicalVaR}</p></div>
          <div><p>Monte Carlo VaR (95%)</p><p>${varEstimates.monteCarloVaR}</p></div>
        </CardContent>
      </Card>

      {/* Chart Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Select Chart Type</CardTitle>
        </CardHeader>
        <CardContent className="w-48">
          <Select defaultValue={chartType} onValueChange={(val) => { setChartType(val); track('riskmetrics_chart_type', { value: val }); }}>
            <SelectTrigger data-track="riskmetrics_charttype_open" data-track-meta={`{"value":"${chartType}"}`}>
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
          <CardTitle>Trade Outcome Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {chartType === "bar" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlData}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="pnl">
                  {pnlData.map((entry, index) => (
                    <Cell key={index} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartType === "pie" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
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
              <XAxis dataKey="date" />
              <YAxis unit="%" />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Legend />
              <Line type="monotone" dataKey="drawdown" stroke="#fb7185" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
