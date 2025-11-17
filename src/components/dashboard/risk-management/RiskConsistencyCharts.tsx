"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { Trade } from '@/types/trade';

interface RiskConsistencyChartsProps {
  trades: Trade[];
}

const RiskConsistencyCharts: React.FC<RiskConsistencyChartsProps> = ({ trades }) => {
  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return {
        riskOverTime: [],
        equityCurve: [],
        riskDistribution: []
      };
    }

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.closeTime || a.openTime || 0).getTime() - new Date(b.closeTime || b.openTime || 0).getTime()
    );

    // Risk per trade over time
    const riskOverTime = sortedTrades.map((trade, index) => {
      const risk = trade.pnl && trade.pnl < 0 ? Math.abs(trade.pnl) : 0;
      const riskPercent = trade.entryPrice ? (risk / trade.entryPrice) * 100 : 0;

      return {
        trade: index + 1,
        date: new Date(trade.closeTime || trade.openTime || Date.now()).toLocaleDateString(),
        riskAmount: risk,
        riskPercent: riskPercent,
        symbol: trade.symbol,
        outcome: trade.outcome
      };
    });

    // Equity curve with drawdown
    let cumulativePnL = 0;
    let peak = 0;
    const equityCurve = sortedTrades.map((trade, index) => {
      cumulativePnL += trade.pnl || 0;
      if (cumulativePnL > peak) peak = cumulativePnL;
      const drawdown = peak - cumulativePnL;

      return {
        trade: index + 1,
        date: new Date(trade.closeTime || trade.openTime || Date.now()).toLocaleDateString(),
        equity: cumulativePnL + 10000, // Starting equity of $10k
        drawdown: -drawdown, // Negative for visualization
        pnl: trade.pnl || 0
      };
    });

    // Risk distribution histogram data
    const riskValues = sortedTrades.map(trade => {
      const risk = trade.pnl && trade.pnl < 0 ? Math.abs(trade.pnl) : 0;
      return trade.entryPrice ? (risk / trade.entryPrice) * 100 : 0;
    }).filter(risk => risk > 0);

    // Create histogram bins
    const riskDistribution = [];
    const binSize = 0.5; // 0.5% bins
    const maxRisk = Math.max(...riskValues, 5);
    const minRisk = Math.min(...riskValues, 0);

    for (let bin = minRisk; bin <= maxRisk; bin += binSize) {
      const count = riskValues.filter(risk => risk >= bin && risk < bin + binSize).length;
      if (count > 0) {
        riskDistribution.push({
          bin: `${bin.toFixed(1)}%`,
          count,
          range: `${bin.toFixed(1)}-${(bin + binSize).toFixed(1)}%`
        });
      }
    }

    return {
      riskOverTime,
      equityCurve,
      riskDistribution
    };
  }, [trades]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`Trade ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey === 'riskPercent' ? 'Risk' : entry.dataKey === 'equity' ? 'Equity' : 'Drawdown'}: ${
                entry.dataKey === 'riskPercent' ? `${entry.value.toFixed(2)}%` :
                entry.dataKey === 'equity' ? `$${entry.value.toLocaleString()}` :
                `$${Math.abs(entry.value).toLocaleString()}`
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Risk Consistency Charts</h2>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Chart Data Available</h3>
            <p className="text-gray-400">
              Add trades to your portfolio to see risk analysis charts and visualizations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Risk Consistency Charts</h2>
      </div>

      {/* Risk per Trade Over Time */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Risk per Trade Over Time
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Track your risk exposure across all trades to identify patterns and consistency
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.riskOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="trade"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="riskPercent"
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-400">Risk % per Trade</span>
              </div>
            </div>
            <Badge className="bg-blue-600">
              {trades.length} trades analyzed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Equity Curve with Drawdown */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Equity Curve & Drawdown
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Visualize your account growth and maximum drawdown periods
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="trade"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  strokeWidth={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-400">Equity Curve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">Drawdown</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Peak:</span>
              <span className="text-green-400 font-medium">
                ${Math.max(...chartData.equityCurve.map(d => d.equity)).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution Histogram */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Risk Distribution
          </CardTitle>
          <p className="text-gray-400 text-sm">
            See how your risk per trade is distributed across different risk levels
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.riskDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="bin"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                          <p className="text-white font-medium">{`Risk Range: ${label}`}</p>
                          <p className="text-blue-400 text-sm">
                            {`Trades: ${payload[0].value}`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#8B5CF6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-gray-400">Trade Count</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Most Common:</span>
              <Badge className="bg-purple-600">
                {chartData.riskDistribution.length > 0
                  ? chartData.riskDistribution.reduce((max, curr) =>
                      curr.count > max.count ? curr : max
                    ).bin
                  : 'N/A'
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskConsistencyCharts;
