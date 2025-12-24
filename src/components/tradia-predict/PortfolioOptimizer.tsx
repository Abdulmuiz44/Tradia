"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Trade } from '@/types/trade';

interface PortfolioOptimizerProps {
  trades: Trade[];
}

interface OptimizationResult {
  recommendedAllocation: Array<{ asset: string; percentage: number; expectedReturn: number; risk: number }>;
  optimalPositionSize: number;
  riskAdjustedReturn: number;
  diversificationScore: number;
  suggestions: string[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const PortfolioOptimizer: React.FC<PortfolioOptimizerProps> = ({ trades }) => {
  const optimization = useMemo(() => {
    if (trades.length === 0) {
      return {
        recommendedAllocation: [],
        optimalPositionSize: 0,
        riskAdjustedReturn: 0,
        diversificationScore: 0,
        suggestions: []
      };
    }

    return calculateOptimalPortfolio(trades);
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-8 text-center">
            <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Portfolio Data</h3>
            <p className="text-gray-400 mb-6">
              Add trades to receive AI-powered portfolio optimization recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Optimal Position Size</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${optimization.optimalPositionSize.toFixed(0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Risk-Adjusted Return</p>
                <p className="text-2xl font-bold text-green-400">
                  {optimization.riskAdjustedReturn.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Diversification Score</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {optimization.diversificationScore}/100
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Assets Tracked</p>
                <p className="text-2xl font-bold text-white">
                  {optimization.recommendedAllocation.length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f1319] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recommended Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Target className="h-12 w-12 mx-auto mb-2" />
                <p>Asset Allocation Chart</p>
                <p className="text-sm">(Chart visualization would appear here)</p>
              </div>
            </div>
            <div className="space-y-2">
              {optimization.recommendedAllocation.map((asset, index) => (
                <div key={asset.asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-white font-medium">{asset.asset}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white">{asset.percentage}%</span>
                    <div className="text-xs text-gray-400">
                      Exp: {asset.expectedReturn > 0 ? '+' : ''}{asset.expectedReturn.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1319] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Performance vs Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                <p>Risk vs Return Analysis</p>
                <p className="text-sm">(Performance chart would appear here)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Suggestions */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Portfolio Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimization.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                </div>
                <div>
                  <p className="text-white text-sm">{suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Rebalance Portfolio
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Export Report
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Set Alerts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function calculateOptimalPortfolio(trades: Trade[]): OptimizationResult {
  // Get unique assets and their performance
  const assetStats = trades.reduce((acc, trade) => {
    if (!acc[trade.symbol]) {
      acc[trade.symbol] = {
        trades: [],
        totalPnL: 0,
        winRate: 0,
        volatility: 0
      };
    }
    acc[trade.symbol].trades.push(trade);
    acc[trade.symbol].totalPnL += trade.pnl || 0;
    return acc;
  }, {} as Record<string, { trades: Trade[]; totalPnL: number; winRate: number; volatility: number }>);

  // Calculate stats for each asset
  Object.keys(assetStats).forEach(asset => {
    const assetTrades = assetStats[asset].trades;
    const winningTrades = assetTrades.filter(t => t.outcome === 'Win');
    assetStats[asset].winRate = assetTrades.length > 0 ? (winningTrades.length / assetTrades.length) * 100 : 0;

    // Simple volatility calculation
    const returns = assetTrades.map(t => t.pnl || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    assetStats[asset].volatility = Math.sqrt(
      returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
  });

  // Create recommended allocation
  const assets = Object.keys(assetStats);
  const allocation = assets.map((asset, index) => {
    const stats = assetStats[asset];
    const baseAllocation = 100 / assets.length;
    const performanceBonus = (stats.winRate - 50) * 0.5; // Bonus for win rates above 50%
    const riskPenalty = stats.volatility * 2; // Penalty for volatility

    let percentage = Math.max(5, Math.min(30, baseAllocation + performanceBonus - riskPenalty));

    return {
      asset,
      percentage: Math.round(percentage),
      expectedReturn: stats.totalPnL > 0 ? (stats.totalPnL / stats.trades.length) * 10 : 0,
      risk: stats.volatility
    };
  });

  // Normalize percentages to sum to 100%
  const totalPercentage = allocation.reduce((sum, item) => sum + item.percentage, 0);
  allocation.forEach(item => {
    item.percentage = Math.round((item.percentage / totalPercentage) * 100);
  });

  // Calculate optimal position size (based on risk management)
  const avgTradeSize = trades.reduce((sum, trade) => sum + (trade.lotSize || 0), 0) / trades.length;
  const optimalPositionSize = avgTradeSize * 1.2; // Slightly increase from average

  // Risk-adjusted return (simplified Sharpe-like ratio)
  const totalReturn = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalRisk = Math.sqrt(trades.reduce((sum, trade) => sum + Math.pow(trade.pnl || 0, 2), 0) / trades.length);
  const riskAdjustedReturn = totalRisk > 0 ? (totalReturn / totalRisk) * 100 : 0;

  // Diversification score
  const diversificationScore = Math.min(100, (assets.length / 5) * 100); // Max score for 5+ assets

  // Generate suggestions
  const suggestions = [
    "Consider increasing allocation to high-performing assets with low volatility",
    "Reduce exposure to underperforming assets to minimize risk",
    "Maintain position sizes at or below the recommended optimal amount",
    "Monitor portfolio rebalancing quarterly to maintain target allocations"
  ];

  return {
    recommendedAllocation: allocation,
    optimalPositionSize,
    riskAdjustedReturn,
    diversificationScore,
    suggestions
  };
}

export default PortfolioOptimizer;
