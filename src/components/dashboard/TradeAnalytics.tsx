"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import ShareButtons from "@/components/ShareButtons";
import ExportButtons from "@/components/dashboard/ExportButtons";
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
  Shield,
  Play,
  StopCircle,
  SlidersHorizontal,
  CheckSquare,
  Square as SquareIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
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

// Lazy-load AI chat to keep bundle lean
const AIChatInterface = dynamic(() => import("@/components/ai/AIChatInterface"), { ssr: false });

interface TradeAnalyticsProps {
  className?: string;
}

export default function TradeAnalytics({ className = "" }: TradeAnalyticsProps) {
  const { data: session } = useSession();
  const { trades = [] } = useTrade();
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'performance' | 'risk' | 'patterns' | 'forecast' | 'coach' | 'controls'>('overview');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showPremium, setShowPremium] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Plan from session (free/pro/plus/elite)
  const plan = String((session?.user as any)?.plan || 'free').toLowerCase();

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
  }, []);

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

    const views: ('overview' | 'performance' | 'risk' | 'patterns' | 'forecast' | 'coach' | 'controls')[] = ['overview', 'performance', 'risk', 'patterns', 'forecast', 'coach', 'controls'];
    const currentIndex = views.indexOf(activeView);

    if (isLeftSwipe && currentIndex < views.length - 1) {
      setActiveView(views[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setActiveView(views[currentIndex - 1]);
    }
  };

  // Quick actions for mobile
  const quickActions = [
    { label: 'Export PDF', icon: Download, action: () => console.log('Export PDF') },
    { label: 'Share Report', icon: Share2, action: () => console.log('Share Report') },
    { label: 'Set Alerts', icon: Settings, action: () => console.log('Set Alerts') },
  ];

  // Filter trades based on timeframe with plan clamp
  const filteredTrades = useMemo(() => {
    let days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : Infinity;
    const allowedDays = plan === 'free' ? 30 : plan === 'pro' ? 182 : (plan === 'plus' || plan === 'elite') ? Infinity : 30;
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
        value: accountBalance == null ? '—' : `$${accountBalance.toFixed(2)}`,
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

  const renderForecast = () => {
    if (plan === 'free') {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Forecasting</h3>
            <p className="text-muted-foreground mb-4">
              Get personalized trading forecasts, market predictions, and AI-driven insights with PRO+.
            </p>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              onClick={() => {
                try { (window as any).location.href = '/checkout?plan=plus&billing=monthly'; } catch {}
              }}
            >
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
              <div className="text-center p-4 bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">68%</div>
                <div className="text-sm text-muted-foreground">Win Probability</div>
              </div>
              <div className="text-center p-4 bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">$245</div>
                <div className="text-sm text-muted-foreground">Expected P&L</div>
              </div>
              <div className="text-center p-4 bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">2.1R</div>
                <div className="text-sm text-muted-foreground">Risk/Reward</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Consider EUR/USD long position</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Monitor GBP/USD for breakout signals</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
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
    <div
      className={`space-y-6 ${className}`}
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
              if (plan === 'pro') ['90d'].forEach(v=>allowed.add(v));
              if (plan === 'plus' || plan === 'elite') ['90d','1y','all'].forEach(v=>allowed.add(v));
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
          {(plan !== 'free') && (
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

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'risk', label: 'Risk Analysis', icon: <Activity className="w-4 h-4" />, premium: true },
          { id: 'patterns', label: 'Patterns', icon: <PieChartIcon className="w-4 h-4" /> },
          { id: 'forecast', label: 'AI Forecast', icon: <Zap className="w-4 h-4" />, premium: true },
          { id: 'coach', label: 'AI Mental Coach', icon: <Star className="w-4 h-4" /> },
          { id: 'controls', label: 'Risk Controls & Prop Sim', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => {
          const isPremium = tab.premium && plan === 'free';
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
        {activeView === 'coach' && (
          <div className="min-h-[480px]">
            <AIChatInterface />
          </div>
        )}
        {activeView === 'controls' && (
          <RiskControlsAndPropSim
            plan={plan as 'free' | 'pro' | 'plus' | 'elite'}
            accountBalance={accountBalance}
            filteredTrades={filteredTrades}
          />
        )}
      </div>

      {/* Export Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <ExportButtons data={filteredTrades as any[]} />
            <ShareButtons title="My Trading Analytics" text="Check out my trading performance on Tradia" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPremium((s) => !s)}
              title="Toggle premium metrics visibility"
            >
              <Settings className="w-4 h-4 mr-2" /> Customize View
            </Button>
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
  accountBalance: number | null;
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

  // Prop firm simulator inputs
  const [propBalance, setPropBalance] = useState<number>(accountBalance || 1000);
  const [propTargetPct, setPropTargetPct] = useState<number>(10); // e.g., 10%
  const [propMaxDailyLossPct, setPropMaxDailyLossPct] = useState<number>(5);
  const [propMaxTotalLossPct, setPropMaxTotalLossPct] = useState<number>(10);
  const [propDays, setPropDays] = useState<number>(20);

  const propSim = useMemo(() => {
    // Use existing historical daily PnL as demo; scale to selected balance
    const bal = propBalance || 1000;
    const scaledDaily = daily.slice(-propDays).map(([date, v]) => ({
      date,
      pnl: v.pnl, // assuming pnl already in account currency; treat as absolute
      count: v.count,
    }));

    const target = (propTargetPct / 100) * bal;
    const maxDailyLoss = (propMaxDailyLossPct / 100) * bal;
    const maxTotalLoss = (propMaxTotalLossPct / 100) * bal;

    let cum = 0;
    let pass = false;
    let breach = '';
    for (const d of scaledDaily) {
      cum += d.pnl;
      if (d.pnl < -maxDailyLoss) { breach = 'Max daily loss breached'; break; }
      if (cum < -maxTotalLoss) { breach = 'Max total loss breached'; break; }
      if (cum >= target) { pass = true; break; }
    }
    return { target, maxDailyLoss, maxTotalLoss, cum, pass, breach, data: scaledDaily };
  }, [daily, propBalance, propTargetPct, propMaxDailyLossPct, propMaxTotalLossPct, propDays]);

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
            <input type="range" min={5} max={20} step={1} value={propTargetPct} onChange={(e)=>setPropTargetPct(parseFloat(e.target.value))} className="w-full" />
            <span className="text-sm font-medium">{propTargetPct}%</span>
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Max daily loss</div>
          <div className="flex items-center gap-2">
            <input type="range" min={2} max={10} step={1} value={propMaxDailyLossPct} onChange={(e)=>setPropMaxDailyLossPct(parseFloat(e.target.value))} className="w-full" />
            <span className="text-sm font-medium">{propMaxDailyLossPct}%</span>
          </div>
        </div>
        <div className="p-3 rounded bg-black/5 dark:bg-white/5">
          <div className="text-xs text-muted-foreground mb-1">Max total loss</div>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={20} step={1} value={propMaxTotalLossPct} onChange={(e)=>setPropMaxTotalLossPct(parseFloat(e.target.value))} className="w-full" />
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
      <Section title="Prop Firm Simulator (Demo Mode)">
        {PropSimUI}
        {plan === 'free' && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-2"><Crown className="w-3 h-3" /> Custom prop templates in Elite. {upgradeCta('Unlock Elite')}</div>
        )}
      </Section>
    </div>
  );
}
