"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ShareButtons from "@/components/ShareButtons";
import ExportButtons from "@/components/dashboard/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Crown,
  Lock,
  Download,
  Share2,
  Settings,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Play,
  StopCircle,
  SlidersHorizontal,
  CheckSquare,
  Square as SquareIcon,
  Brain,
  Gauge,
  Compass,
  Star,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WeeklyCoachRecap from "@/components/analytics/WeeklyCoachRecap";
import ProInsights from "@/components/analytics/ProInsights";
import StrategyBuilder from "@/components/analytics/StrategyBuilder";
import DailyLossDrawdownGuard from "@/components/analytics/DailyLossDrawdownGuard";
import TiltModeDetector from "@/components/analytics/TiltModeDetector";
import PropFirmDashboard from "@/components/analytics/PropFirmDashboard";
import OptimalStrategyMatcher from "@/components/analytics/OptimalStrategyMatcher";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Trade } from "@/types/trade";
import AccountBadge from "@/components/AccountBadge";

// Types
interface AnalyticsMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
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
  drawdown?: number;
}

interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  calmarRatio: number;
  sortinoRatio: number;
  informationRatio: number;
}



export default function TradeAnalytics({ trades, session, isAdmin, className = "" }: { trades: any[], session: any, isAdmin: boolean, className?: string }) {
const router = useRouter();
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [activeView, setActiveView] = useState<'overview' | 'performance' | 'risk' | 'patterns' | 'forecast' | 'guard' | 'tilt' | 'prop' | 'matcher' | 'controls'>('overview');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showPremium, setShowPremium] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Plan/role from session
  const rawPlan = String((session?.user as any)?.plan || 'free').toLowerCase();
  const plan = rawPlan === 'starter' ? 'free' : rawPlan;
  const effectivePlan = (isAdmin ? 'elite' : plan) as 'free' | 'pro' | 'plus' | 'elite';
  const planRank: Record<'free' | 'pro' | 'plus' | 'elite', number> = { free: 0, pro: 1, plus: 2, elite: 3 };
  const hasPlan = (min: 'free' | 'pro' | 'plus' | 'elite' = 'free') => planRank[effectivePlan] >= planRank[min];


  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch MT5 account balance (sum of connected accounts)
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/mt5/accounts');
        if (!res.ok) return;
        const data = await res.json();
        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
        const total = accounts.reduce((sum: number, acc: any) => {
          const info = acc?.account_info || {};
          const bal = Number(info.balance ?? info.equity ?? 0);
          return Number.isFinite(bal) ? sum + bal : sum;
        }, 0);
        setAccountBalance(Number.isFinite(total) ? total : 0);
      } catch (e) {
        // ignore
      }
    };
    fetchAccounts();
  }, [session?.user?.id]);

  // Touch gesture handling for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const views: ('overview' | 'performance' | 'risk' | 'patterns' | 'forecast' | 'guard' | 'tilt' | 'prop' | 'matcher' | 'controls')[] = ['overview', 'performance', 'risk', 'patterns', 'forecast', 'guard', 'tilt', 'prop', 'matcher', 'controls'];
    const currentIndex = views.indexOf(activeView);

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setActiveView(views[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setActiveView(views[currentIndex - 1]);
    }
  };

  // Quick actions for mobile
  const quickActions = [
    { label: 'Export PDF', icon: Download, action: () => console.log('Export PDF'), requiresPaid: true },
    { label: 'Share Report', icon: Share2, action: () => console.log('Share Report'), requiresPaid: true },
    { label: 'Set Alerts', icon: Settings, action: () => console.log('Set Alerts'), requiresPaid: true },
  ].filter(a => (effectivePlan !== 'free') || !a.requiresPaid);

  // Filter trades based on timeframe with plan clamp
  const filteredTrades = useMemo(() => {
    let days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : Infinity;
    const allowedDays = effectivePlan === 'free' ? 30 : effectivePlan === 'pro' ? 182 : (effectivePlan === 'plus' || effectivePlan === 'elite') ? Infinity : 30;
    if (Number.isFinite(allowedDays)) {
      days = Math.min(days, allowedDays as number);
    }
    if (!Number.isFinite(days)) return trades;
    const cutoffDate = subDays(new Date(), days as number);

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

    const metrics: AnalyticsMetric[] = [
      {
        label: "Account Balance",
        value: `$${accountBalance.toFixed(2)}`,
        icon: <DollarSign className="w-4 h-4" />,
        color: "text-emerald-400"
      },
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
    return metrics;
  }, [filteredTrades, accountBalance]);

  // Monthly P&L data
  const monthlyPnLData = useMemo(() => {
    const monthlyData: { [key: string]: number } = {};
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    });

    months.forEach(month => {
      const monthKey = format(month, 'MMM yyyy');
      monthlyData[monthKey] = 0;
    });

    filteredTrades.forEach(trade => {
      const tradeDate = new Date(trade.openTime || trade.closeTime || '');
      if (tradeDate) {
        const monthKey = format(tradeDate, 'MMM yyyy');
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (trade.pnl || 0);
      }
    });

    return Object.entries(monthlyData).map(([month, pnl]) => ({
      month,
      pnl: Math.round(pnl * 100) / 100
    }));
  }, [filteredTrades]);

  // Weekly activity data
  const weeklyActivityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = days.map(day => ({ day, trades: 0 }));

    filteredTrades.forEach(trade => {
      const tradeDate = new Date(trade.openTime || trade.closeTime || '');
      if (tradeDate) {
        const dayIndex = tradeDate.getDay();
        dayCounts[dayIndex].trades += 1;
      }
    });

    return dayCounts;
  }, [filteredTrades]);

  // Symbol performance data
  const symbolPerformanceData = useMemo(() => {
    const symbolData: { [key: string]: number } = {};

    filteredTrades.forEach(trade => {
      const symbol = trade.symbol || 'Unknown';
      symbolData[symbol] = (symbolData[symbol] || 0) + (trade.pnl || 0);
    });

    return Object.entries(symbolData)
      .map(([symbol, pnl]) => ({ symbol, pnl: Math.round(pnl * 100) / 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10); // Top 10 symbols
  }, [filteredTrades]);

  // Risk metrics (Premium feature)
  const riskMetrics = useMemo((): RiskMetrics => {
    if (plan === 'free') {
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
  }, [filteredTrades, plan]);

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
          winRate: 0,
          drawdown: 0
        };
      }

      dailyData[date].pnl += parseFloat(String(trade.pnl || 0));
      dailyData[date].trades += 1;
    });

    // Calculate cumulative equity and win rates
    let cumulativeEquity = 0;
    let peakEquity = 0;
    Object.values(dailyData).forEach(day => {
      cumulativeEquity += day.pnl;
      day.equity = cumulativeEquity;

      // Calculate drawdown
      if (cumulativeEquity > peakEquity) {
        peakEquity = cumulativeEquity;
      }
      day.drawdown = peakEquity > 0 ? ((peakEquity - cumulativeEquity) / peakEquity) * 100 : 0;

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
      {metric.premium && plan === 'free' && (
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

  {/* Equity Curve - PRIMARY CHART */}
  <Card>
  <CardHeader>
  <CardTitle className="flex items-center gap-2">
  <TrendingUp className="w-5 h-5" />
  Equity Curve
  </CardTitle>
  </CardHeader>
  <CardContent>
  <div className="h-80">
  <ResponsiveContainer width="100%" height="100%">
  <AreaChart data={performanceData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip formatter={(value) => [`$${value}`, 'Equity']} />
  <Area
    type="monotone"
    dataKey="equity"
  stroke="#10b981"
  fill="url(#equityGradient)"
  strokeWidth={2}
  />
  <defs>
  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
  </linearGradient>
  </defs>
  </AreaChart>
  </ResponsiveContainer>
  </div>
  </CardContent>
  </Card>

  {/* Charts Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Drawdown Chart */}
  <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
        <TrendingDown className="w-5 h-5" />
          Drawdown Analysis
            </CardTitle>
      </CardHeader>
      <CardContent>
      <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performanceData}>
            <XAxis dataKey="date" />
          <YAxis />
        <Tooltip formatter={(value) => [`${value}%`, 'Drawdown']} />
      <Area
      type="monotone"
      dataKey="drawdown"
      stroke="#ef4444"
      fill="url(#drawdownGradient)"
    strokeWidth={2}
  />
  <defs>
    <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
        </linearGradient>
        </defs>
        </AreaChart>
        </ResponsiveContainer>
        </div>
        </CardContent>
        </Card>

        {/* Win/Loss Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Win/Loss Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length, fill: '#10b981' },
                      { name: 'Losses', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'loss').length, fill: '#ef4444' },
                      { name: 'Breakeven', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'breakeven').length, fill: '#6b7280' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#6b7280" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnLData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'P&L']} />
              <Bar dataKey="pnl" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trades Per Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Trading Activity by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivityData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trades" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Instrument Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance by Symbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolPerformanceData} layout="horizontal">
                  <XAxis type="number" />
                  <YAxis dataKey="symbol" type="category" width={60} />
                  <Tooltip formatter={(value) => [`$${value}`, 'P&L']} />
                  <Bar dataKey="pnl" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
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
    if (plan === 'free') {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">Advanced Risk Analytics</h3>
            <p className="text-muted-foreground mb-4">
              Unlock detailed risk metrics, Sharpe ratio, drawdown analysis, and more with a PRO subscription.
            </p>
            <Button
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              onClick={() => {
                try { (window as any).location.href = '/checkout?plan=pro&billing=monthly'; } catch {}
              }}
            >
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
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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

  const renderForecast = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <Brain className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h3 className="text-xl font-semibold mb-2">AI Forecast Panel</h3>
        <p className="text-muted-foreground mb-4">
          Smart Money Concepts forecast panel coming soon. This feature will provide AI-powered market predictions.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div
      className={`space-y-6 pb-6 max-w-full overflow-x-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header with Swipe Indicator */}
      {isMobile && (
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Swipe left/right to navigate</span>
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full ${activeView === 'overview' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${activeView === 'performance' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${activeView === 'risk' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${activeView === 'patterns' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${activeView === 'forecast' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
       <div>
         <h2 className="text-2xl font-bold">Trade Analytics</h2>
         <p className="text-muted-foreground">
           Comprehensive analysis of your trading performance
         </p>
          <div className="mt-2"><AccountBadge compact /></div>
         {isMobile && (
           <div className="mt-2 text-sm text-blue-400 font-medium">
             Current View: {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
           </div>
         )}
       </div>

        <div className="flex flex-wrap gap-2">
          {/* Timeframe Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => {
              const allowed = new Set(['7d','30d']);
              if (effectivePlan === 'pro') ['90d'].forEach(v=>allowed.add(v));
              if (effectivePlan === 'plus' || effectivePlan === 'elite') ['90d','1y','all'].forEach(v=>allowed.add(v));
              const isAllowed = allowed.has(period);
              return (
              <Button
                key={period}
                variant={timeframe === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (isAllowed) setTimeframe(period);
                  else {
                    // redirect to upgrade within dashboard
                    try { (window as any).location.hash = '#upgrade'; } catch {}
                  }
                }}
                className={`text-xs ${isAllowed ? '' : 'opacity-70'}`}
              >
                {period.toUpperCase()} {!isAllowed && (<span className="ml-1 text-yellow-400"><Lock className="w-3 h-3 inline" /></span>)}
              </Button>
            )})}
          </div>

          {/* Mobile Quick Actions */}
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="text-xs"
            >
              <Settings className="w-4 h-4 mr-1" />
              Actions
            </Button>
          )}

          {/* Premium Toggle */}
          {(effectivePlan !== 'free') && (
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

      {/* Mobile Quick Actions Panel */}
      {isMobile && showQuickActions && (
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <action.icon className="w-4 h-4" />
                  <span className="text-xs text-center">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {(effectivePlan !== 'free') && (
          <div className="grid md:grid-cols-2 gap-6">
            <WeeklyCoachRecap trades={filteredTrades as any} plan={effectivePlan} />
            <ProInsights trades={filteredTrades as any} plan={effectivePlan} />
          </div>
        )}
        {(effectivePlan === 'free') && (
            <CompactUpgradePrompt currentPlan={'free' as any} feature="Weekly Coach Recap and Pro Insights" onUpgrade={() => {}} className="mb-4" />
        )}
      </div>

      {/* View Tabs */}
      <div className="overflow-x-auto border-b">
        <div className="flex gap-2 min-w-max pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'risk', label: 'Risk Analysis', icon: <Activity className="w-4 h-4" />, minPlan: 'pro' },
          { id: 'patterns', label: 'Patterns', icon: <PieChartIcon className="w-4 h-4" /> },
          { id: 'forecast', label: 'AI Forecast', icon: <Zap className="w-4 h-4" />, minPlan: 'pro' },
          { id: 'guard', label: 'Loss Guard', icon: <ShieldCheck className="w-4 h-4" />, minPlan: 'pro' },
          { id: 'tilt', label: 'Tilt Detector', icon: <Brain className="w-4 h-4" />, minPlan: 'plus' },
          { id: 'prop', label: 'Prop Dashboard', icon: <Gauge className="w-4 h-4" />, minPlan: 'plus' },
          { id: 'matcher', label: 'Strategy Matcher', icon: <Compass className="w-4 h-4" />, minPlan: 'pro' },
          { id: 'coach', label: 'AI Mental Coach', icon: <Star className="w-4 h-4" /> },
          { id: 'controls', label: 'Manual Risk Controls', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => {
          const allowed = typeof (tab as any).minPlan === 'string' ? hasPlan((tab as any).minPlan) : true;
          return (
            <Button
              key={tab.id}
              variant={activeView === (tab as any).id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                if ((tab as any).id === 'coach') {
                  router.push('/chat'); // Tradia AI
                } else {
                  setActiveView((tab as any).id as any);
                }
              }}
              className={['flex items-center gap-2', !allowed ? 'opacity-70' : ''].filter(Boolean).join(' ')}
            >
              {tab.icon}
              {tab.label}
              {!allowed && <Crown className="w-3 h-3 text-yellow-500" />}
            </Button>
          );
        })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[480px]">
        {activeView === 'overview' && renderOverview()}
        {activeView === 'performance' && renderPerformance()}
        {activeView === 'risk' && renderRisk()}
        {activeView === 'patterns' && renderPatterns()}
        {activeView === 'forecast' && renderForecast()}
        {activeView === 'guard' && (
          hasPlan('pro') ? (
            <DailyLossDrawdownGuard trades={filteredTrades as Trade[]} plan={effectivePlan} accountBalance={accountBalance} />
          ) : (
            <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Daily Loss & Drawdown Guard" onUpgrade={() => {}} className="max-w-xl mx-auto" />
          )
        )}
        {activeView === 'tilt' && (
          hasPlan('plus') ? (
            <TiltModeDetector trades={filteredTrades as Trade[]} plan={effectivePlan} />
          ) : (
            <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Tilt Mode Detector" onUpgrade={() => {}} className="max-w-xl mx-auto" />
          )
        )}
        {activeView === 'prop' && (
          hasPlan('plus') ? (
            <PropFirmDashboard trades={filteredTrades as Trade[]} plan={effectivePlan} accountBalance={accountBalance} />
          ) : (
            <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Prop Firm Dashboard" onUpgrade={() => {}} className="max-w-xl mx-auto" />
          )
        )}
        {activeView === 'matcher' && (
          hasPlan('pro') ? (
            <OptimalStrategyMatcher trades={filteredTrades as Trade[]} plan={effectivePlan} />
          ) : (
            <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Optimal Strategy Matcher" onUpgrade={() => {}} className="max-w-xl mx-auto" />
          )
        )}
        {activeView === 'controls' && (
          <RiskControlsAndPropSim plan={effectivePlan} accountBalance={accountBalance} filteredTrades={filteredTrades} />
        )}
      </div>

      {/* Export Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {(effectivePlan === 'pro' || effectivePlan === 'plus' || effectivePlan === 'elite') && (
              <ExportButtons data={filteredTrades as any[]} />
            )}
            {(effectivePlan === 'pro' || effectivePlan === 'plus' || effectivePlan === 'elite') && (
              <ShareButtons title="My Trading Analytics" text="Check out my trading performance on Tradia" />
            )}
            {(effectivePlan === 'pro' || effectivePlan === 'plus' || effectivePlan === 'elite') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPremium((s) => !s)}
                title="Toggle premium metrics visibility"
              >
                <Settings className="w-4 h-4 mr-2" /> Customize View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type PlanTier = 'free' | 'pro' | 'plus' | 'elite';

function RiskControlsAndPropSim({
  plan,
  accountBalance,
  filteredTrades,
}: {
  plan: PlanTier;
  accountBalance: number;
  filteredTrades: any[];
}) {
  const [autoGuard, setAutoGuard] = useState(false);
  const [riskPct, setRiskPct] = useState<number>(2);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(10);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(accountBalance ? Math.max(25, accountBalance * 0.02) : 100);
  const [maxWeeklyLoss, setMaxWeeklyLoss] = useState<number>(accountBalance ? Math.max(50, accountBalance * 0.05) : 250);
  const [cooldownMins, setCooldownMins] = useState<number>(10);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    setupValid: false,
    stopLossSet: false,
    rrOk: false,
    noRevenge: false,
    journalReady: false,
  });

  // Persist settings locally
  useEffect(() => {
    try {
      const raw = localStorage.getItem('risk_controls');
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.autoGuard === 'boolean') setAutoGuard(s.autoGuard);
        if (typeof s.riskPct === 'number') setRiskPct(s.riskPct);
        if (typeof s.maxTradesPerDay === 'number') setMaxTradesPerDay(s.maxTradesPerDay);
        if (typeof s.maxDailyLoss === 'number') setMaxDailyLoss(s.maxDailyLoss);
        if (typeof s.maxWeeklyLoss === 'number') setMaxWeeklyLoss(s.maxWeeklyLoss);
        if (typeof s.cooldownMins === 'number') setCooldownMins(s.cooldownMins);
      }
      const rawCl = localStorage.getItem('pretrade_checklist');
      if (rawCl) setChecklist({ ...checklist, ...JSON.parse(rawCl) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('risk_controls', JSON.stringify({ autoGuard, riskPct, maxTradesPerDay, maxDailyLoss, maxWeeklyLoss, cooldownMins }));
    } catch {}
  }, [autoGuard, riskPct, maxTradesPerDay, maxDailyLoss, maxWeeklyLoss, cooldownMins]);
  useEffect(() => {
    try { localStorage.setItem('pretrade_checklist', JSON.stringify(checklist)); } catch {}
  }, [checklist]);

  // Derive daily PnL and counts
  const daily = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    filteredTrades.forEach((t) => {
      const d = new Date(t.openTime || t.closeTime || Date.now());
      const key = d.toISOString().slice(0, 10);
      const prev = map.get(key) || { pnl: 0, count: 0 };
      const pnl = parseFloat(String(t.pnl || 0)) || 0;
      map.set(key, { pnl: prev.pnl + pnl, count: prev.count + 1 });
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTrades]);

  // Breach checks
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = daily.find(([k]) => k === todayKey)?.[1] || { pnl: 0, count: 0 };
  const overTrading = today.count > maxTradesPerDay;
  const dailyLossBreach = today.pnl < -Math.abs(maxDailyLoss);
  const weeklyLossBreach = (() => {
    // last 5 trading days aggregate
    const last = daily.slice(-5).reduce((sum, [, v]) => sum + v.pnl, 0);
    return last < -Math.abs(maxWeeklyLoss);
  })();

  // Prop firm simulator inputs (plan-aware)
  const [propBalance, setPropBalance] = useState<number>(accountBalance || 1000);
  const [propTargetPct, setPropTargetPct] = useState<number>(10); // e.g., 10%
  const [propMaxDailyLossPct, setPropMaxDailyLossPct] = useState<number>(5);
  const [propMaxTotalLossPct, setPropMaxTotalLossPct] = useState<number>(10);
  const [propDays, setPropDays] = useState<number>(20);
  const [propPhases, setPropPhases] = useState<number>(plan === 'elite' ? 2 : 1);

  useEffect(() => {
    if (accountBalance && accountBalance > 0) {
      setMaxDailyLoss(Math.max(25, accountBalance * 0.02));
      setMaxWeeklyLoss(Math.max(50, accountBalance * 0.05));
      setPropBalance(accountBalance);
    }
  }, [accountBalance]);

  const canEditBasic = plan !== 'free';
  const canEditPhases = plan === 'plus' || plan === 'elite';
  const canUseTemplates = plan === 'plus' || plan === 'elite';

  const applyPreset = (preset: '50k' | '100k' | '200k') => {
    if (!canUseTemplates) return;
    if (preset === '50k') {
      setPropBalance(50000);
      setPropTargetPct(8);
      setPropMaxDailyLossPct(5);
      setPropMaxTotalLossPct(10);
      setPropDays(30);
      setPropPhases(2);
    } else if (preset === '100k') {
      setPropBalance(100000);
      setPropTargetPct(10);
      setPropMaxDailyLossPct(5);
      setPropMaxTotalLossPct(10);
      setPropDays(35);
      setPropPhases(2);
    } else if (preset === '200k') {
      setPropBalance(200000);
      setPropTargetPct(12);
      setPropMaxDailyLossPct(5);
      setPropMaxTotalLossPct(10);
      setPropDays(40);
      setPropPhases(2);
    }
  };

  const propSim = useMemo(() => {
    const bal = propBalance || 1000;
    const series = daily.slice(-propDays).map(([date, v]) => ({ date, pnl: v.pnl, count: v.count }));

    const dailyCap = (propMaxDailyLossPct / 100) * bal;
    const totalCap = (propMaxTotalLossPct / 100) * bal;

    // Phase targets: phase 1 uses propTargetPct; phase 2 uses 60% of that by default
    const phaseTargetsPct: number[] = propPhases === 2 ? [propTargetPct, Math.max(3, Math.round(propTargetPct * 0.6))] : [propTargetPct];
    const phaseResults: { phase: number; target: number; cum: number; days: number; pass: boolean; breach?: string }[] = [];

    let idx = 0;
    let overallBreach: string | undefined;
    for (let p = 0; p < phaseTargetsPct.length; p++) {
      const targetValue = (phaseTargetsPct[p] / 100) * bal;
      let cum = 0;
      let pass = false;
      let days = 0;
      let breach: string | undefined;
      for (; idx < series.length; idx++) {
        const d = series[idx];
        days += 1;
        cum += d.pnl;
        if (d.pnl < -dailyCap) { breach = 'Max daily loss breached'; overallBreach = breach; break; }
        if (cum < -totalCap) { breach = 'Max total loss breached'; overallBreach = breach; break; }
        if (cum >= targetValue) { pass = true; idx += 1; break; }
      }
      phaseResults.push({ phase: p + 1, target: targetValue, cum, days, pass, breach });
      if (breach) break;
      // reset accumulation for next phase
    }

    const overallPass = phaseResults.length === phaseTargetsPct.length && phaseResults.every(r => r.pass) && !overallBreach;
    const progressPct = (() => {
      const current = phaseResults[phaseResults.length - 1];
      if (!current) return 0;
      return Math.min(100, Math.max(0, (current.cum / (current.target || 1)) * 100));
    })();

    const current = phaseResults[phaseResults.length - 1];
    return {
      balance: bal,
      dailyCap,
      totalCap,
      phaseTargetsPct,
      phaseResults,
      overallPass,
      breach: overallBreach,
      series,
      progressPct,
      // compatibility fields for UI (to be refactored):
      target: current?.target ?? 0,
      maxDailyLoss: dailyCap,
      maxTotalLoss: totalCap,
      pass: overallPass,
      cum: current?.cum ?? 0,
    };
  }, [daily, propBalance, propTargetPct, propMaxDailyLossPct, propMaxTotalLossPct, propDays, propPhases]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 dark:bg-white/5 p-4">
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" /> {title}</h3>
      {children}
    </div>
  );

  const ControlsInput = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div className="p-3 rounded bg-black/5 dark:bg-white/5">
        <div className="text-xs text-muted-foreground mb-1">Risk per trade</div>
        <div className="flex items-center gap-2">
          <input type="range" min={0.25} max={3} step={0.25} value={riskPct} onChange={(e)=>setRiskPct(parseFloat(e.target.value))} className="w-full" />
          <span className="text-sm font-medium">{riskPct.toFixed(2)}%</span>
        </div>
      </div>
      <div className="p-3 rounded bg-black/5 dark:bg-white/5">
        <div className="text-xs text-muted-foreground mb-1">Max trades/day</div>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={50} value={maxTradesPerDay} onChange={(e)=>setMaxTradesPerDay(parseInt(e.target.value||'0'))} className="w-24 bg-transparent border rounded px-2 py-1" />
        </div>
      </div>
      <div className="p-3 rounded bg-black/5 dark:bg-white/5">
        <div className="text-xs text-muted-foreground mb-1">Max daily loss</div>
        <div className="flex items-center gap-2">
          <span className="text-sm">$</span>
          <input type="number" min={10} step={10} value={Math.round(maxDailyLoss)} onChange={(e)=>setMaxDailyLoss(parseFloat(e.target.value||'0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
        </div>
      </div>
      {(plan === 'plus' || plan === 'elite' || plan === 'pro') && (
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Max weekly loss</div>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input type="number" min={50} step={10} value={Math.round(maxWeeklyLoss)} onChange={(e)=>setMaxWeeklyLoss(parseFloat(e.target.value||'0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
          </div>
        </div>
      )}
      {(plan === 'plus' || plan === 'elite') && (
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Cooldown after loss</div>
          <div className="flex items-center gap-2">
            <input type="number" min={5} step={5} value={cooldownMins} onChange={(e)=>setCooldownMins(parseInt(e.target.value||'0'))} className="w-20 bg-transparent border rounded px-2 py-1" />
            <span className="text-sm">mins</span>
          </div>
        </div>
      )}
    </div>
  );

  const Checklist = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {[
        { key: 'setupValid', label: 'Setup is valid and A+ quality' },
        { key: 'stopLossSet', label: 'Stop loss defined and placed' },
        { key: 'rrOk', label: 'Risk/Reward ≥ 1.5R' },
        { key: 'noRevenge', label: 'Not trading to win back losses' },
        { key: 'journalReady', label: 'Will journal immediately after trade' },
      ].map((item) => (
        <button
          key={item.key}
          onClick={() => setChecklist((c) => ({ ...c, [item.key]: !c[item.key as keyof typeof c] }))}
          className={`flex items-center gap-2 p-2 rounded border ${checklist[item.key as keyof typeof checklist] ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:bg-white/5'}`}
        >
          {checklist[item.key as keyof typeof checklist] ? <CheckSquare className="w-4 h-4 text-green-500" /> : <SquareIcon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );

  const GuardStatus = (
    <div className="grid sm:grid-cols-3 gap-3">
      <div className={`p-3 rounded ${overTrading ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
        <div className="text-xs text-muted-foreground">Today trades</div>
        <div className="text-lg font-bold">{today.count} / {maxTradesPerDay}</div>
        {overTrading && <div className="text-xs text-red-400 mt-1">Overtrading detected. Consider stopping.</div>}
      </div>
      <div className={`p-3 rounded ${dailyLossBreach ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
        <div className="text-xs text-muted-foreground">Today P/L</div>
        <div className="text-lg font-bold">${today.pnl.toFixed(2)}</div>
        {dailyLossBreach && <div className="text-xs text-red-400 mt-1">Max daily loss breached.</div>}
      </div>
      <div className={`p-3 rounded ${weeklyLossBreach ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
        <div className="text-xs text-muted-foreground">Last 5 days P/L</div>
        <div className="text-lg font-bold">${daily.slice(-5).reduce((s,[,v])=>s+v.pnl,0).toFixed(2)}</div>
        {weeklyLossBreach && <div className="text-xs text-red-400 mt-1">Max weekly loss breached.</div>}
      </div>
    </div>
  );

  const PropSimUI = (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Balance</div>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input type="number" min={100} step={50} value={Math.round(propBalance)} onChange={(e)=>setPropBalance(parseFloat(e.target.value||'0'))} className="w-28 bg-transparent border rounded px-2 py-1" />
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Profit target</div>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={20} step={1} value={propTargetPct} onChange={(e)=> canEditBasic && setPropTargetPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
            <span className="text-sm font-medium">{propTargetPct}%</span>
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Max daily loss</div>
          <div className="flex items-center gap-2">
            <input type="range" min={2} max={10} step={1} value={propMaxDailyLossPct} onChange={(e)=> canEditBasic && setPropMaxDailyLossPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
            <span className="text-sm font-medium">{propMaxDailyLossPct}%</span>
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Max total loss</div>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={20} step={1} value={propMaxTotalLossPct} onChange={(e)=> canEditBasic && setPropMaxTotalLossPct(parseFloat(e.target.value))} className="w-full" disabled={!canEditBasic} />
            <span className="text-sm font-medium">{propMaxTotalLossPct}%</span>
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Challenge days</div>
          <div className="flex items-center gap-2">
            <input type="number" min={5} max={60} value={propDays} onChange={(e)=>setPropDays(parseInt(e.target.value||'0'))} className="w-20 bg-transparent border rounded px-2 py-1" />
            <span className="text-sm">days</span>
          </div>
        </div>
      </div>
      {/* Advanced controls by plan */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Phases</div>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={2} value={propPhases} onChange={(e)=> canEditPhases && setPropPhases(Math.min(2, Math.max(1, parseInt(e.target.value||'1'))))} className="w-20 bg-transparent border rounded px-2 py-1" disabled={!canEditPhases} />
            <span className="text-sm">{propPhases === 2 ? 'Two-phase' : 'One-phase'}</span>
          </div>
        </div>
        {canUseTemplates && (
          <div className="p-3 rounded bg-black/5 dark:bg-white/5">
            <div className="text-xs text-muted-foreground mb-1">Templates</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => applyPreset('50k')}>50k</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('100k')}>100k</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('200k')}>200k</Button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-lg p-4 bg-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm">Target: <span className="font-semibold">${propSim.target.toFixed(0)}</span></div>
          <div className="text-sm">Max Daily Loss: <span className="font-semibold">${propSim.maxDailyLoss.toFixed(0)}</span></div>
          <div className="text-sm">Max Total Loss: <span className="font-semibold">${propSim.maxTotalLoss.toFixed(0)}</span></div>
          <div className="ml-auto text-sm font-semibold">
            {propSim.breach ? <span className="text-red-400">{propSim.breach}</span> : propSim.pass ? <span className="text-green-400">Target reached ✓</span> : <span className="text-yellow-400">In progress</span>}
          </div>
        </div>
        <div className="mt-3 w-full bg-black/20 rounded h-2 overflow-hidden">
          <div className={`h-full ${propSim.pass ? 'bg-green-500' : propSim.breach ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, (propSim.cum / (propSim.target||1)) * 100))}%` }} />
        </div>
      </div>
    </div>
  );

  const upgradeCta = (label = 'Upgrade to unlock') => (
    <Button variant="outline" size="sm" onClick={() => { try { (window as any).location.hash = '#upgrade'; } catch {} }}>
      <Crown className="w-4 h-4 mr-1 text-yellow-500" /> {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Automated Risk Controls & Prop Firm Simulator</h3>
          <p className="text-muted-foreground">Set your guardrails, run prop-challenge demos, and keep yourself from blowing up.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoGuard ? 'default' : 'outline'}
            onClick={() => setAutoGuard(!autoGuard)}
            className="flex items-center gap-2"
          >
            {autoGuard ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoGuard ? 'Auto-Guard ON' : 'Auto-Guard OFF'}
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => alert('Saved!')}><SlidersHorizontal className="w-4 h-4" /> Save</Button>
        </div>
      </div>

      {/* Pre-trade Checklist */}
      <Section title="Pre-Trade Checklist">
        {Checklist}
        {plan === 'free' && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> More checklist templates in Pro and Plus. {upgradeCta('Upgrade')}</div>
        )}
      </Section>

      {/* Risk Rules */}
      <Section title="Risk Rules & Auto-Stop">
        {ControlsInput}
        <div className="mt-3">
          {GuardStatus}
        </div>
        {plan === 'free' && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> Auto-stop & cooldown in Pro+. {upgradeCta()}</div>
        )}
      </Section>

      {/* Prop Firm Simulator */}
      <Section title="Prop Firm Simulator">
        {PropSimUI}
        {plan === 'free' && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> Custom prop templates in Elite. {upgradeCta('Unlock Elite')}</div>
        )}
      </Section>
    </div>
  );
}
