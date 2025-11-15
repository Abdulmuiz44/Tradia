"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  DollarSign,
  Activity,
  Award,
  Clock
} from 'lucide-react';
import { Trade } from '@/types/trade';

interface PerformanceSummaryCardsProps {
  trades: Trade[];
}

const PerformanceSummaryCards: React.FC<PerformanceSummaryCardsProps> = ({ trades }) => {
  const metrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalPnL: 0,
        winRate: 0,
        avgRR: 0,
        totalTrades: 0,
        avgDailyProfit: 0,
        bestDay: 0,
        worstDay: 0,
        profitFactor: 0
      };
    }

    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = trades.filter(t => t.outcome === 'Win');
    const losingTrades = trades.filter(t => t.outcome === 'Loss');
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    // Calculate average risk-reward ratio
    let totalRR = 0;
    let rrCount = 0;
    trades.forEach(trade => {
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

    // Calculate daily profits
    const dailyProfits = trades.reduce((acc, trade) => {
      const date = new Date(trade.closeTime || trade.openTime || Date.now()).toDateString();
      acc[date] = (acc[date] || 0) + (trade.pnl || 0);
      return acc;
    }, {} as Record<string, number>);

    const dailyProfitValues = Object.values(dailyProfits);
    const avgDailyProfit = dailyProfitValues.length > 0
      ? dailyProfitValues.reduce((sum, profit) => sum + profit, 0) / dailyProfitValues.length
      : 0;

    const bestDay = Math.max(...dailyProfitValues, 0);
    const worstDay = Math.min(...dailyProfitValues, 0);

    // Profit factor (gross profit / gross loss)
    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      totalPnL,
      winRate,
      avgRR,
      totalTrades: trades.length,
      avgDailyProfit,
      bestDay,
      worstDay,
      profitFactor
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

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Performance Summary</h2>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Trading Data</h3>
            <p className="text-gray-400">
              Add trades to your portfolio to see comprehensive performance metrics and analytics.
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
        <h2 className="text-2xl font-bold text-white">Performance Summary</h2>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total P/L */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Total P/L</p>
                <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.totalPnL)}
                </p>
              </div>
              {metrics.totalPnL >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-400 group-hover:animate-bounce" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-400 group-hover:animate-bounce" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-1 flex-1 bg-gray-700 rounded-full overflow-hidden`}>
                <div
                  className={`h-full transition-all duration-1000 ${
                    metrics.totalPnL >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(metrics.totalPnL) / 1000 * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className={`text-2xl font-bold ${metrics.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.winRate.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-400 group-hover:animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    metrics.winRate >= 60 ? 'bg-green-500' :
                    metrics.winRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.winRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average RR */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Avg RR Ratio</p>
                <p className={`text-2xl font-bold ${metrics.avgRR >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.avgRR.toFixed(2)}
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-400 group-hover:animate-bounce" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    metrics.avgRR >= 1.5 ? 'bg-green-500' :
                    metrics.avgRR >= 1 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metrics.avgRR * 50, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Trades */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.totalTrades}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-400 group-hover:animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600">
                {metrics.totalTrades > 100 ? 'Experienced' : metrics.totalTrades > 50 ? 'Active' : 'Learning'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Average Daily Profit */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Avg Daily P/L</p>
                <p className={`text-2xl font-bold ${metrics.avgDailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics.avgDailyProfit)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400 group-hover:animate-bounce" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    metrics.avgDailyProfit >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(metrics.avgDailyProfit) / 50 * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Best Day</h3>
                <p className="text-sm text-gray-400">Single day performance</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(metrics.bestDay)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Worst Day</h3>
                <p className="text-sm text-gray-400">Maximum daily loss</p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(metrics.worstDay)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Profit Factor</h3>
                <p className="text-sm text-gray-400">Gross profit / gross loss</p>
              </div>
              <BarChart3 className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
            </p>
            <Badge className={`mt-2 ${metrics.profitFactor >= 1.5 ? 'bg-green-600' : metrics.profitFactor >= 1 ? 'bg-yellow-600' : 'bg-red-600'}`}>
              {metrics.profitFactor >= 1.5 ? 'Excellent' : metrics.profitFactor >= 1 ? 'Good' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceSummaryCards;
