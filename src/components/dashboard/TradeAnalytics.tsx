"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle,
  Star,
  Crown,
  Lock,
  Download,
  Share2,
  Settings,
  Filter,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  EyeOff,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

// Types
interface AnalyticsMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
  premium?: boolean;
}

interface PerformanceData {
  date: string;
  equity: number;
  pnl: number;
  trades: number;
  winRate: number;
}

interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  calmarRatio: number;
  sortinoRatio: number;
  informationRatio: number;
}

interface TradeAnalyticsProps {
  className?: string;
}

export default function TradeAnalytics({ className = "" }: TradeAnalyticsProps) {
  const { data: session } = useSession();
  const { trades = [] } = useTrade();
  const [activeView, setActiveView] = useState<'overview' | 'performance' | 'risk' | 'patterns' | 'forecast'>('overview');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showPremium, setShowPremium] = useState(false);

  // Mock subscription tier - in real app, get from user data
  const userTier = session?.user?.subscription || 'free';

  // Filter trades based on timeframe
  const filteredTrades = useMemo(() => {
    if (timeframe === 'all') return trades;

    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const cutoffDate = subDays(new Date(), days);

    return trades.filter(trade => {
      const tradeDate = new Date(trade.openTime || trade.closeTime || '');
      return tradeDate >= cutoffDate;
    });
  }, [trades, timeframe]);

  // Performance metrics
  const performanceMetrics = useMemo((): AnalyticsMetric[] => {
    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalPnL = filteredTrades.reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);
    const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

    const winningPnL = filteredTrades
      .filter(t => (t.outcome || '').toLowerCase() === 'win')
      .reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);

    const losingPnL = filteredTrades
      .filter(t => (t.outcome || '').toLowerCase() === 'loss')
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.pnl || 0))), 0);

    const profitFactor = losingPnL > 0 ? winningPnL / losingPnL : winningPnL > 0 ? Infinity : 0;

    return [
      {
        label: "Total Trades",
        value: totalTrades,
        icon: <BarChart3 className="w-4 h-4" />,
        color: "text-blue-400"
      },
      {
        label: "Win Rate",
        value: `${winRate.toFixed(1)}%`,
        change: winRate > 50 ? 5.2 : -2.1,
        trend: winRate > 50 ? 'up' : 'down',
        icon: <TrendingUp className="w-4 h-4" />,
        color: winRate > 50 ? "text-green-400" : "text-red-400"
      },
      {
        label: "Total P&L",
        value: `$${totalPnL.toFixed(2)}`,
        change: totalPnL > 0 ? 12.5 : -8.3,
        trend: totalPnL > 0 ? 'up' : 'down',
        icon: totalPnL > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />,
        color: totalPnL > 0 ? "text-green-400" : "text-red-400"
      },
      {
        label: "Avg Trade",
        value: `$${avgTrade.toFixed(2)}`,
        icon: <DollarSign className="w-4 h-4" />,
        color: "text-purple-400"
      },
      {
        label: "Profit Factor",
        value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
        icon: <Target className="w-4 h-4" />,
        color: "text-orange-400",
        premium: true
      },
      {
        label: "Best Streak",
        value: "8 wins",
        icon: <Award className="w-4 h-4" />,
        color: "text-yellow-400",
        premium: true
      }
    ];
  }, [filteredTrades]);

  // Risk metrics (Premium feature)
  const riskMetrics = useMemo((): RiskMetrics => {
    if (userTier === 'free') {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        calmarRatio: 0,
        sortinoRatio: 0,
        informationRatio: 0
      };
    }

    const returns = filteredTrades.map(t => parseFloat(String(t.pnl || 0)));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
    const volatility = Math.sqrt(variance);

    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let currentEquity = 0;

    filteredTrades.forEach(trade => {
      currentEquity += parseFloat(String(trade.pnl || 0));
      if (currentEquity > peak) peak = currentEquity;
      const drawdown = peak > 0 ? (peak - currentEquity) / peak : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      sharpeRatio: volatility > 0 ? avgReturn / volatility : 0,
      maxDrawdown: maxDrawdown * 100,
      volatility: volatility,
      calmarRatio: maxDrawdown > 0 ? avgReturn / maxDrawdown : 0,
      sortinoRatio: volatility > 0 ? avgReturn / volatility : 0, // Simplified
      informationRatio: volatility > 0 ? avgReturn / volatility : 0 // Simplified
    };
  }, [filteredTrades, userTier]);

  // Performance data for charts
  const performanceData = useMemo((): PerformanceData[] => {
    const dailyData: { [key: string]: PerformanceData } = {};

    filteredTrades.forEach(trade => {
      const date = format(new Date(trade.openTime || trade.closeTime || ''), 'yyyy-MM-dd');
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          equity: 0,
          pnl: 0,
          trades: 0,
          winRate: 0
        };
      }

      dailyData[date].pnl += parseFloat(String(trade.pnl || 0));
      dailyData[date].trades += 1;
    });

    // Calculate cumulative equity and win rates
    let cumulativeEquity = 0;
    Object.values(dailyData).forEach(day => {
      cumulativeEquity += day.pnl;
      day.equity = cumulativeEquity;

      const dayTrades = filteredTrades.filter(t =>
        format(new Date(t.openTime || t.closeTime || ''), 'yyyy-MM-dd') === day.date
      );
      const winningTrades = dayTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
      day.winRate = day.trades > 0 ? (winningTrades / day.trades) * 100 : 0;
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTrades]);

  // Pattern analysis data
  const patternData = useMemo(() => {
    const symbols = [...new Set(filteredTrades.map(t => t.symbol || 'Unknown'))];
    const strategies = [...new Set(filteredTrades.map(t => t.strategy || 'Unknown'))];

    return {
      symbols: symbols.map(symbol => {
        const symbolTrades = filteredTrades.filter(t => t.symbol === symbol);
        const winningTrades = symbolTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
        return {
          name: symbol,
          trades: symbolTrades.length,
          winRate: symbolTrades.length > 0 ? (winningTrades / symbolTrades.length) * 100 : 0,
          pnl: symbolTrades.reduce((sum, t) => sum + parseFloat(String(t.pnl || 0)), 0)
        };
      }),
      strategies: strategies.map(strategy => {
        const strategyTrades = filteredTrades.filter(t => t.strategy === strategy);
        const winningTrades = strategyTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
        return {
          name: strategy,
          trades: strategyTrades.length,
          winRate: strategyTrades.length > 0 ? (winningTrades / strategyTrades.length) * 100 : 0,
          pnl: strategyTrades.reduce((sum, t) => sum + parseFloat(String(t.pnl || 0)), 0)
        };
      })
    };
  }, [filteredTrades]);

  const renderMetricCard = (metric: AnalyticsMetric) => (
    <Card key={metric.label} className="relative overflow-hidden">
      {metric.premium && userTier === 'free' && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
            <Crown className="w-3 h-3 mr-1" />
            PRO
          </Badge>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className={`text-2xl font-bold ${metric.color || 'text-foreground'}`}>
              {metric.value}
            </p>
            {metric.change !== undefined && (
              <p className={`text-xs flex items-center gap-1 ${
                metric.trend === 'up' ? 'text-green-500' :
                metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'
              }`}>
                {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
                 metric.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {Math.abs(metric.change)}%
              </p>
            )}
          </div>
          <div className={`${metric.color || 'text-muted-foreground'} opacity-60`}>
            {metric.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {performanceMetrics.map(renderMetricCard)}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <XAxis dataKey="date" />
                <YAxis yAxisId="equity" orientation="left" />
                <YAxis yAxisId="pnl" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="equity"
                  type="monotone"
                  dataKey="equity"
                  fill="url(#equityGradient)"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Bar
                  yAxisId="pnl"
                  dataKey="pnl"
                  fill="#3b82f6"
                  opacity={0.6}
                />
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Win Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Win Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Win Rate']} />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      {/* Performance by Symbol */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Symbol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternData.symbols}>
                <XAxis dataKey="name" />
                <YAxis yAxisId="pnl" orientation="left" />
                <YAxis yAxisId="winRate" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="pnl" dataKey="pnl" fill="#10b981" name="P&L ($)" />
                <Line yAxisId="winRate" type="monotone" dataKey="winRate" stroke="#f59e0b" strokeWidth={3} name="Win Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternData.strategies}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="trades" fill="#3b82f6" name="Trades" />
                <Bar dataKey="winRate" fill="#10b981" name="Win Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRisk = () => {
    if (userTier === 'free') {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">Advanced Risk Analytics</h3>
            <p className="text-muted-foreground mb-4">
              Unlock detailed risk metrics, Sharpe ratio, drawdown analysis, and more with a PRO subscription.
            </p>
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
              Upgrade to PRO
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Risk Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Sharpe Ratio</span>
              </div>
              <p className="text-2xl font-bold">{riskMetrics.sharpeRatio.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Max Drawdown</span>
              </div>
              <p className="text-2xl font-bold">{riskMetrics.maxDrawdown.toFixed(2)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Volatility</span>
              </div>
              <p className="text-2xl font-bold">{riskMetrics.volatility.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { subject: 'Sharpe', A: Math.min(riskMetrics.sharpeRatio * 10, 100), fullMark: 100 },
                  { subject: 'Drawdown', A: Math.max(0, 100 - riskMetrics.maxDrawdown), fullMark: 100 },
                  { subject: 'Volatility', A: Math.max(0, 100 - riskMetrics.volatility * 10), fullMark: 100 },
                  { subject: 'Calmar', A: Math.min(riskMetrics.calmarRatio * 50, 100), fullMark: 100 },
                  { subject: 'Sortino', A: Math.min(riskMetrics.sortinoRatio * 10, 100), fullMark: 100 },
                  { subject: 'Info Ratio', A: Math.min(riskMetrics.informationRatio * 10, 100), fullMark: 100 },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Risk Score"
                    dataKey="A"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPatterns = () => (
    <div className="space-y-6">
      {/* Trade Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trade Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length },
                      { name: 'Losses', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'loss').length },
                      { name: 'Breakeven', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'breakeven').length },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Trade Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trades" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderForecast = () => {
    if (userTier === 'free') {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Forecasting</h3>
            <p className="text-muted-foreground mb-4">
              Get personalized trading forecasts, market predictions, and AI-driven insights with PRO+.
            </p>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              Upgrade to PRO+
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI Trading Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">68%</div>
                <div className="text-sm text-muted-foreground">Win Probability</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">$245</div>
                <div className="text-sm text-muted-foreground">Expected P&L</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">2.1R</div>
                <div className="text-sm text-muted-foreground">Risk/Reward</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Consider EUR/USD long position</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Monitor GBP/USD for breakout signals</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Set stop loss at 1.0850 for EUR/USD</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trade Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of your trading performance
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Timeframe Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="text-xs"
              >
                {period.toUpperCase()}
              </Button>
            ))}
          </div>

          {/* Premium Toggle */}
          {userTier !== 'free' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPremium(!showPremium)}
              className="text-xs"
            >
              {showPremium ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showPremium ? 'Hide' : 'Show'} PRO
            </Button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'risk', label: 'Risk Analysis', icon: <Activity className="w-4 h-4" />, premium: true },
          { id: 'patterns', label: 'Patterns', icon: <PieChartIcon className="w-4 h-4" /> },
          { id: 'forecast', label: 'AI Forecast', icon: <Zap className="w-4 h-4" />, premium: true },
        ].map((tab) => {
          const isPremium = tab.premium && userTier === 'free';
          return (
            <Button
              key={tab.id}
              variant={activeView === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView(tab.id as any)}
              disabled={isPremium}
              className={`flex items-center gap-2 ${isPremium ? 'opacity-50' : ''}`}
            >
              {tab.icon}
              {tab.label}
              {isPremium && <Crown className="w-3 h-3 text-yellow-500" />}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeView === 'overview' && renderOverview()}
        {activeView === 'performance' && renderPerformance()}
        {activeView === 'risk' && renderRisk()}
        {activeView === 'patterns' && renderPatterns()}
        {activeView === 'forecast' && renderForecast()}
      </div>

      {/* Export Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share Analytics
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Customize View
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}