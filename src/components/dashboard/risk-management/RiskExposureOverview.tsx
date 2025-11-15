"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react';
import { Trade } from '@/types/trade';

interface RiskExposureOverviewProps {
  trades: Trade[];
}

const RiskExposureOverview: React.FC<RiskExposureOverviewProps> = ({ trades }) => {
  const riskMetrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        currentOpenRisk: 0,
        averageRiskPerTrade: 0,
        maxDrawdown: 0,
        riskOfRuin: 0,
        riskLevel: 'low' as const,
        totalEquity: 0,
        openPositions: 0
      };
    }

    // Calculate risk metrics
    const winningTrades = trades.filter(t => t.outcome === 'Win');
    const losingTrades = trades.filter(t => t.outcome === 'Loss');
    const totalTrades = trades.length;

    // Current open risk (simplified - assuming no open positions for now)
    const currentOpenRisk = 0; // Would be calculated based on open positions

    // Average risk per trade (based on stop loss distance)
    const avgRiskPerTrade = trades.reduce((sum, trade) => {
      const risk = trade.pnl && trade.pnl < 0 ? Math.abs(trade.pnl) : 0;
      return sum + risk;
    }, 0) / totalTrades;

    // Maximum historical drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnL = 0;

    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.closeTime || a.openTime || Date.now()).getTime() - new Date(b.closeTime || b.openTime || Date.now()).getTime()
    );

    for (const trade of sortedTrades) {
      cumulativePnL += trade.pnl || 0;
      if (cumulativePnL > peak) peak = cumulativePnL;
      const drawdown = peak - cumulativePnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Risk of ruin estimate (simplified Kelly criterion)
    const winRate = winningTrades.length / totalTrades;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
      : 0;

    let riskOfRuin = 0;
    if (avgLoss > 0 && avgWin > 0) {
      const kelly = winRate - ((1 - winRate) * (avgLoss / avgWin));
      riskOfRuin = Math.max(0, Math.min(100, (1 - kelly) * 50)); // Simplified
    }

    // Total equity (simplified)
    const totalEquity = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 10000); // Starting with $10k

    // Risk level assessment
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (maxDrawdown > 30 || riskOfRuin > 20) riskLevel = 'critical';
    else if (maxDrawdown > 20 || riskOfRuin > 10) riskLevel = 'high';
    else if (maxDrawdown > 10 || riskOfRuin > 5) riskLevel = 'medium';

    return {
      currentOpenRisk,
      averageRiskPerTrade: avgRiskPerTrade,
      maxDrawdown,
      riskOfRuin,
      riskLevel,
      totalEquity,
      openPositions: 0 // Would be calculated from actual open positions
    };
  }, [trades]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-900/20 border-green-700/50';
      case 'medium': return 'bg-yellow-900/20 border-yellow-700/50';
      case 'high': return 'bg-orange-900/20 border-orange-700/50';
      case 'critical': return 'bg-red-900/20 border-red-700/50';
      default: return 'bg-gray-900/20 border-gray-700/50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Risk Exposure Overview</h2>
      </div>

      {/* Risk Level Indicator */}
      <Card className={`bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 ${getRiskBgColor(riskMetrics.riskLevel)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRiskIcon(riskMetrics.riskLevel)}
              <div>
                <h3 className="text-lg font-semibold text-white">Overall Risk Level</h3>
                <p className="text-gray-400 text-sm">Based on your trading history and current exposure</p>
              </div>
            </div>
            <Badge className={`px-4 py-2 text-lg ${getRiskColor(riskMetrics.riskLevel)} bg-current/10`}>
              {riskMetrics.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Current Open Risk</p>
                <p className="text-2xl font-bold text-white">
                  {riskMetrics.currentOpenRisk.toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-400 group-hover:animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(riskMetrics.currentOpenRisk * 10, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">of equity</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Avg Risk per Trade</p>
                <p className="text-2xl font-bold text-white">
                  ${riskMetrics.averageRiskPerTrade.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400 group-hover:animate-bounce" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(riskMetrics.averageRiskPerTrade * 20, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">optimal range</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Max Drawdown</p>
                <p className={`text-2xl font-bold ${riskMetrics.maxDrawdown > 20 ? 'text-red-400' : riskMetrics.maxDrawdown > 10 ? 'text-orange-400' : 'text-green-400'}`}>
                  -{riskMetrics.maxDrawdown.toFixed(1)}%
                </p>
              </div>
              <TrendingDown className={`h-8 w-8 ${riskMetrics.maxDrawdown > 20 ? 'text-red-400' : riskMetrics.maxDrawdown > 10 ? 'text-orange-400' : 'text-green-400'} group-hover:animate-pulse`} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    riskMetrics.maxDrawdown > 20 ? 'bg-red-500' :
                    riskMetrics.maxDrawdown > 10 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(riskMetrics.maxDrawdown * 2, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">historical</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">Risk of Ruin</p>
                <p className={`text-2xl font-bold ${riskMetrics.riskOfRuin > 15 ? 'text-red-400' : riskMetrics.riskOfRuin > 5 ? 'text-orange-400' : 'text-green-400'}`}>
                  {riskMetrics.riskOfRuin.toFixed(1)}%
                </p>
              </div>
              <Percent className={`h-8 w-8 ${riskMetrics.riskOfRuin > 15 ? 'text-red-400' : riskMetrics.riskOfRuin > 5 ? 'text-orange-400' : 'text-green-400'} group-hover:animate-bounce`} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    riskMetrics.riskOfRuin > 15 ? 'bg-red-500' :
                    riskMetrics.riskOfRuin > 5 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(riskMetrics.riskOfRuin * 3, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">probability</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Context */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                ${riskMetrics.totalEquity.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Total Equity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {trades.length}
              </div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {riskMetrics.openPositions}
              </div>
              <div className="text-sm text-gray-400">Open Positions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskExposureOverview;
