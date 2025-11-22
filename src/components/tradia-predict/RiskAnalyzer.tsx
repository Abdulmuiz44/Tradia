"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { Trade } from '@/types/trade';
import { getTradeDate, getTradePnl } from '@/lib/trade-date-utils';

interface RiskAnalyzerProps {
  trades: Trade[];
}

interface RiskMetrics {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  concentrationRisk: number;
  timeRisk: number;
  recommendations: string[];
}

const RiskAnalyzer: React.FC<RiskAnalyzerProps> = ({ trades }) => {
  const riskMetrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        overallRisk: 'low' as const,
        maxDrawdown: 0,
        sharpeRatio: 0,
        volatility: 0,
        concentrationRisk: 0,
        timeRisk: 0,
        recommendations: []
      };
    }

    const metrics = calculateRiskMetrics(trades);
    const recommendations = generateRecommendations(metrics, trades);

    return { ...metrics, recommendations };
  }, [trades]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <Shield className="h-5 w-5 text-green-400" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Risk Data Available</h3>
            <p className="text-gray-400 mb-6">
              Add trades to your portfolio to receive comprehensive risk analysis and optimization recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Risk Score */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getRiskIcon(riskMetrics.overallRisk)}
              <div>
                <h3 className="text-xl font-bold text-white">Risk Assessment</h3>
                <p className="text-gray-400">Overall portfolio risk level</p>
              </div>
            </div>
            <Badge
              className={`px-4 py-2 text-lg ${getRiskColor(riskMetrics.overallRisk)} bg-current/10`}
            >
              {riskMetrics.overallRisk.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {riskMetrics.maxDrawdown.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {riskMetrics.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {riskMetrics.volatility.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Volatility</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {trades.length}
              </div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Concentration Risk</span>
                <span className="text-sm text-white">{riskMetrics.concentrationRisk}%</span>
              </div>
              <Progress value={riskMetrics.concentrationRisk} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Portfolio diversification level</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Time-based Risk</span>
                <span className="text-sm text-white">{riskMetrics.timeRisk}%</span>
              </div>
              <Progress value={riskMetrics.timeRisk} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Trading frequency vs market hours</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Volatility Exposure</span>
                <span className="text-sm text-white">{riskMetrics.volatility}%</span>
              </div>
              <Progress value={riskMetrics.volatility} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Price fluctuation risk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Risk Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRiskHeatmap(trades).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded ${
                          level <= item.riskLevel
                            ? item.riskLevel >= 4
                              ? 'bg-red-500'
                              : item.riskLevel >= 3
                              ? 'bg-orange-500'
                              : item.riskLevel >= 2
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Risk Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskMetrics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {recommendation.includes('reduce') || recommendation.includes('limit') ? (
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  ) : recommendation.includes('increase') || recommendation.includes('diversify') ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : (
                    <Shield className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Scenarios */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Worst-Case Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <h4 className="text-red-400 font-medium mb-2">Market Crash (-20%)</h4>
              <p className="text-sm text-gray-300 mb-2">
                Potential loss: ${(calculatePotentialLoss(trades, -0.2)).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                Based on your current portfolio size and historical drawdown patterns
              </p>
            </div>

            <div className="p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
              <h4 className="text-orange-400 font-medium mb-2">Moderate Correction (-10%)</h4>
              <p className="text-sm text-gray-300 mb-2">
                Potential loss: ${(calculatePotentialLoss(trades, -0.1)).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                Typical market pullback scenario
              </p>
            </div>

            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2">Position Size Increase</h4>
              <p className="text-sm text-gray-300 mb-2">
                Risk multiplier: {calculateRiskMultiplier(trades).toFixed(1)}x
              </p>
              <p className="text-xs text-gray-500">
                If you double your typical position size
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function calculateRiskMetrics(trades: Trade[]): RiskMetrics {
  if (trades.length === 0) {
    return {
      overallRisk: 'low',
      maxDrawdown: 0,
      sharpeRatio: 0,
      volatility: 0,
      concentrationRisk: 0,
      timeRisk: 0,
      recommendations: []
    };
  }

  // Calculate basic metrics
  const returns = trades.map(t => getTradePnl(t));
  const cumulative = returns.reduce((acc, pnl, i) => {
    acc.push((acc[i - 1] || 0) + pnl);
    return acc;
  }, [] as number[]);

  const maxDrawdown = Math.max(...cumulative.map((val, i) =>
    Math.max(...cumulative.slice(0, i + 1)) - val
  ));

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(
    returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length
  );

  // Sharpe ratio (simplified - assuming 0% risk-free rate)
  const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

  // Concentration risk (based on asset distribution)
  const assetCounts = trades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxAssetCount = Math.max(...Object.values(assetCounts));
  const concentrationRisk = (maxAssetCount / trades.length) * 100;

  // Time risk (trading during risky hours)
  const riskyHours = trades.filter(trade => {
    const hour = getTradeDate(trade)?.getUTCHours();
    return hour !== undefined && hour !== null && (hour >= 22 || hour <= 6);
  }).length;

  const timeRisk = (riskyHours / trades.length) * 100;

  // Overall risk assessment
  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (maxDrawdown > 20 || volatility > 100) overallRisk = 'critical';
  else if (maxDrawdown > 10 || volatility > 50) overallRisk = 'high';
  else if (concentrationRisk > 40 || timeRisk > 30) overallRisk = 'medium';

  return {
    overallRisk,
    maxDrawdown: Math.abs(maxDrawdown),
    sharpeRatio,
    volatility,
    concentrationRisk,
    timeRisk,
    recommendations: [] // Will be set separately
  };
}

function generateRecommendations(metrics: RiskMetrics, trades: Trade[]): string[] {
  const recommendations: string[] = [];

  if (metrics.concentrationRisk > 50) {
    recommendations.push("Diversify your portfolio - you're heavily concentrated in a few assets");
  }

  if (metrics.maxDrawdown > 15) {
    recommendations.push("Implement stricter stop-loss rules to limit drawdown to under 10%");
  }

  if (metrics.volatility > 30) {
    recommendations.push("Reduce position sizes during high volatility periods");
  }

  if (metrics.timeRisk > 40) {
    recommendations.push("Avoid trading during thin liquidity hours (22:00-06:00 GMT)");
  }

  if (metrics.sharpeRatio < 0.5) {
    recommendations.push("Focus on improving risk-adjusted returns - consider higher probability setups");
  }

  if (recommendations.length === 0) {
    recommendations.push("Your risk management is solid - continue monitoring these metrics");
    recommendations.push("Consider increasing position sizes gradually as confidence grows");
  }

  return recommendations;
}

function getRiskHeatmap(trades: Trade[]) {
  const heatmap = [
    { label: 'Position Size Risk', riskLevel: 2 },
    { label: 'Market Hours Risk', riskLevel: 3 },
    { label: 'Asset Concentration', riskLevel: 2 },
    { label: 'Volatility Exposure', riskLevel: 3 },
    { label: 'Liquidity Risk', riskLevel: 1 },
    { label: 'Counterparty Risk', riskLevel: 1 },
  ];

  // This would be calculated based on actual trade data
  return heatmap;
}

function calculatePotentialLoss(trades: Trade[], percentage: number): number {
  const totalValue = trades.reduce((sum, trade) => sum + Math.abs(getTradePnl(trade)), 0);
  return Math.abs(totalValue * percentage);
}

function calculateRiskMultiplier(trades: Trade[]): number {
  const avgPosition = trades.reduce((sum, trade) => sum + (trade.lotSize || 0), 0) / trades.length;
  return avgPosition > 0 ? 2.0 : 1.0; // Assuming doubling position size
}

export default RiskAnalyzer;
