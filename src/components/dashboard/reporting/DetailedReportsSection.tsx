"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Trade } from '@/types/trade';

interface DetailedReportsSectionProps {
  trades: Trade[];
}

interface TimePeriodData {
  period: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgRR: number;
}

interface AssetPerformance {
  symbol: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgRR: number;
}

interface SessionPerformance {
  session: string;
  trades: number;
  pnl: number;
  winRate: number;
}

const DetailedReportsSection: React.FC<DetailedReportsSectionProps> = ({ trades }) => {
  const reportData = useMemo(() => {
    if (trades.length === 0) {
      return {
        weeklyData: [],
        monthlyData: [],
        assetPerformance: [],
        sessionPerformance: [],
        avgTradeDuration: 0,
        consistencyScore: 0
      };
    }

    // Weekly performance
    const weeklyData = calculatePeriodPerformance(trades, 'week');

    // Monthly performance
    const monthlyData = calculatePeriodPerformance(trades, 'month');

    // Asset performance
    const assetPerformance = calculateAssetPerformance(trades);

    // Session performance
    const sessionPerformance = calculateSessionPerformance(trades);

    // Average trade duration
    const avgTradeDuration = calculateAvgTradeDuration(trades);

    // Consistency score (0-100 based on daily P/L stability)
    const consistencyScore = calculateConsistencyScore(trades);

    return {
      weeklyData,
      monthlyData,
      assetPerformance,
      sessionPerformance,
      avgTradeDuration,
      consistencyScore
    };
  }, [trades]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Detailed Reports</h2>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Report Data</h3>
            <p className="text-gray-400">
              Add trades to generate detailed performance reports and analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Detailed Reports</h2>
      </div>

      {/* Weekly Performance */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.weeklyData.slice(0, 8).map((week, index) => (
              <div key={week.period} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400 w-24">Week {index + 1}</div>
                  <div className="text-sm text-white">
                    {week.trades} trades • {week.winRate.toFixed(1)}% win rate
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-sm font-medium ${week.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(week.pnl)}
                  </div>
                  <div className="text-sm text-gray-400">
                    RR: {week.avgRR.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Best Performing Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.assetPerformance
                .sort((a, b) => b.pnl - a.pnl)
                .slice(0, 5)
                .map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{asset.symbol}</div>
                    <div className="text-sm text-gray-400">
                      {asset.trades} trades • {asset.winRate.toFixed(1)}% win rate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${asset.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(asset.pnl)}
                    </div>
                    <div className="text-sm text-gray-400">
                      RR: {asset.avgRR.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Session Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.sessionPerformance.map((session) => (
                <div key={session.session} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="font-medium text-white capitalize">{session.session}</div>
                    <div className="text-sm text-gray-400">
                      {session.trades} trades • {session.winRate.toFixed(1)}% win rate
                    </div>
                  </div>
                  <div className={`font-medium ${session.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(session.pnl)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Avg Trade Duration</h3>
                <p className="text-sm text-gray-400">Time in position</p>
              </div>
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {formatDuration(reportData.avgTradeDuration)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Trading Consistency</h3>
                <p className="text-sm text-gray-400">Daily P/L stability</p>
              </div>
              <Activity className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {reportData.consistencyScore.toFixed(1)}%
            </p>
            <div className="mt-2">
              <Progress value={reportData.consistencyScore} className="h-2" />
            </div>
            <Badge className={`mt-2 ${
              reportData.consistencyScore >= 80 ? 'bg-green-600' :
              reportData.consistencyScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
              {reportData.consistencyScore >= 80 ? 'Excellent' :
               reportData.consistencyScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Monthly Overview</h3>
                <p className="text-sm text-gray-400">Recent performance</p>
              </div>
              <PieChart className="h-6 w-6 text-green-400" />
            </div>
            {reportData.monthlyData.length > 0 && (
              <div>
                <p className={`text-2xl font-bold ${reportData.monthlyData[0].pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(reportData.monthlyData[0].pnl)}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {reportData.monthlyData[0].trades} trades • {reportData.monthlyData[0].winRate.toFixed(1)}% win rate
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper functions
function calculatePeriodPerformance(trades: Trade[], period: 'week' | 'month'): TimePeriodData[] {
  const now = new Date();
  const periods: Record<string, Trade[]> = {};

  trades.forEach(trade => {
    const tradeDate = new Date(trade.closeTime || trade.openTime || Date.now());
    let periodKey: string;

    if (period === 'week') {
      const weekStart = new Date(tradeDate);
      weekStart.setDate(tradeDate.getDate() - tradeDate.getDay());
      periodKey = weekStart.toISOString().split('T')[0];
    } else {
      periodKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!periods[periodKey]) periods[periodKey] = [];
    periods[periodKey].push(trade);
  });

  return Object.entries(periods)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([periodKey, periodTrades]) => {
      const pnl = periodTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const winningTrades = periodTrades.filter(t => t.outcome === 'Win');
      const winRate = (winningTrades.length / periodTrades.length) * 100;

      let totalRR = 0;
      let rrCount = 0;
      periodTrades.forEach(trade => {
        if (trade.pnl && trade.pnl !== 0) {
          const risk = Math.abs(trade.pnl);
          const reward = trade.outcome === 'Win' ? trade.pnl : -trade.pnl;
          if (risk > 0) {
            totalRR += reward / risk;
            rrCount++;
          }
        }
      });
      const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

      return {
        period: periodKey,
        trades: periodTrades.length,
        pnl,
        winRate,
        avgRR
      };
    });
}

function calculateAssetPerformance(trades: Trade[]): AssetPerformance[] {
  const assetStats: Record<string, Trade[]> = {};

  trades.forEach(trade => {
    if (!assetStats[trade.symbol]) assetStats[trade.symbol] = [];
    assetStats[trade.symbol].push(trade);
  });

  return Object.entries(assetStats).map(([symbol, assetTrades]) => {
    const pnl = assetTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = assetTrades.filter(t => t.outcome === 'Win');
    const winRate = (winningTrades.length / assetTrades.length) * 100;

    let totalRR = 0;
    let rrCount = 0;
    assetTrades.forEach(trade => {
      if (trade.pnl && trade.pnl !== 0) {
        const risk = Math.abs(trade.pnl);
        const reward = trade.outcome === 'Win' ? trade.pnl : -trade.pnl;
        if (risk > 0) {
          totalRR += reward / risk;
          rrCount++;
        }
      }
    });
    const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

    return {
      symbol,
      trades: assetTrades.length,
      pnl,
      winRate,
      avgRR
    };
  });
}

function calculateSessionPerformance(trades: Trade[]): SessionPerformance[] {
  const sessionStats: Record<string, Trade[]> = {
    london: [],
    newyork: [],
    asian: []
  };

  trades.forEach(trade => {
    const hour = new Date(trade.openTime || Date.now()).getUTCHours();
    let session = 'asian';

    if (hour >= 8 && hour < 16) session = 'london'; // 8 AM - 4 PM UTC
    else if (hour >= 14 && hour < 21) session = 'newyork'; // 2 PM - 9 PM UTC
    // Asian session is everything else (10 PM - 7 AM UTC)

    sessionStats[session].push(trade);
  });

  return Object.entries(sessionStats).map(([session, sessionTrades]) => {
    const pnl = sessionTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = sessionTrades.filter(t => t.outcome === 'Win');
    const winRate = sessionTrades.length > 0 ? (winningTrades.length / sessionTrades.length) * 100 : 0;

    return {
      session,
      trades: sessionTrades.length,
      pnl,
      winRate
    };
  });
}

function calculateAvgTradeDuration(trades: Trade[]): number {
  let totalDuration = 0;
  let count = 0;

  trades.forEach(trade => {
    if (trade.openTime && trade.closeTime) {
      const duration = new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime();
      totalDuration += duration / (1000 * 60); // Convert to minutes
      count++;
    }
  });

  return count > 0 ? totalDuration / count : 0;
}

function calculateConsistencyScore(trades: Trade[]): number {
  if (trades.length === 0) return 0;

  // Group trades by day
  const dailyPnL: Record<string, number> = {};
  trades.forEach(trade => {
    const date = new Date(trade.closeTime || trade.openTime || Date.now()).toDateString();
    dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
  });

  const dailyValues = Object.values(dailyPnL);
  if (dailyValues.length < 2) return 100; // If only one day, consider perfectly consistent

  // Calculate coefficient of variation (lower is more consistent)
  const mean = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
  const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
  const stdDev = Math.sqrt(variance);

  const cv = mean !== 0 ? (stdDev / Math.abs(mean)) : 0;

  // Convert to consistency score (0-100, where 100 is most consistent)
  const consistencyScore = Math.max(0, Math.min(100, 100 - (cv * 50)));

  return consistencyScore;
}

export default DetailedReportsSection;
