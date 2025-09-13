"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Filter,
  Download,
  Share2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";

interface StrategyMetrics {
  name: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDuration: number;
  consistency: number;
}

interface StrategyComparisonProps {
  className?: string;
}

export default function StrategyComparison({ className = "" }: StrategyComparisonProps) {
  const { data: session } = useSession();
  const { trades = [] } = useTrade();
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [comparisonView, setComparisonView] = useState<'overview' | 'detailed' | 'radar'>('overview');

  // Mock subscription tier
  const userTier = (session?.user as any)?.subscription || 'free';

  // Extract unique strategies from trades
  const availableStrategies = useMemo(() => {
    const strategies = [...new Set(trades.map(t => t.strategy || 'Unknown'))];
    return strategies.filter(s => s !== 'Unknown');
  }, [trades]);

  // Calculate metrics for each strategy
  const strategyMetrics: StrategyMetrics[] = useMemo(() => {
    return availableStrategies.map(strategy => {
      const strategyTrades = trades.filter(t => t.strategy === strategy);
      const totalTrades = strategyTrades.length;
      const winningTrades = strategyTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const totalPnL = strategyTrades.reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);
      const winningPnL = strategyTrades
        .filter(t => (t.outcome || '').toLowerCase() === 'win')
        .reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);
      const losingPnL = strategyTrades
        .filter(t => (t.outcome || '').toLowerCase() === 'loss')
        .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.pnl || 0))), 0);

      const profitFactor = losingPnL > 0 ? winningPnL / losingPnL : winningPnL > 0 ? Infinity : 0;
      const avgReturn = totalTrades > 0 ? totalPnL / totalTrades : 0;

      // Calculate drawdown
      let peak = 0;
      let maxDrawdown = 0;
      let currentEquity = 0;

      strategyTrades.forEach(trade => {
        currentEquity += parseFloat(String(trade.pnl || 0));
        if (currentEquity > peak) peak = currentEquity;
        const drawdown = peak > 0 ? (peak - currentEquity) / peak : 0;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      });

      // Sharpe ratio (simplified)
      const returns = strategyTrades.map(t => parseFloat(String(t.pnl || 0)));
      const avgReturnVal = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturnVal, 2), 0) / returns.length || 0;
      const volatility = Math.sqrt(variance);
      const sharpeRatio = volatility > 0 ? avgReturnVal / volatility : 0;

      const bestTrade = Math.max(...strategyTrades.map(t => parseFloat(String(t.pnl || 0))));
      const worstTrade = Math.min(...strategyTrades.map(t => parseFloat(String(t.pnl || 0))));

      // Consistency score (based on win rate stability)
      const consistency = Math.min(winRate * 1.2, 100);

      return {
        name: strategy,
        totalTrades,
        winRate,
        profitFactor,
        avgReturn,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio,
        totalPnL,
        bestTrade,
        worstTrade,
        avgTradeDuration: 45, // Mock data
        consistency,
      };
    });
  }, [trades, availableStrategies]);

  const toggleStrategy = (strategy: string) => {
    setSelectedStrategies(prev =>
      prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  const selectedMetrics = strategyMetrics.filter(m => selectedStrategies.includes(m.name));

  // Comparison data for charts
  const comparisonData = useMemo(() => {
    return selectedMetrics.map(metric => ({
      name: metric.name,
      'Win Rate': metric.winRate,
      'Profit Factor': Math.min(metric.profitFactor, 5), // Cap for chart
      'Total P&L': metric.totalPnL,
      'Sharpe Ratio': metric.sharpeRatio,
      'Max Drawdown': metric.maxDrawdown,
      'Consistency': metric.consistency,
    }));
  }, [selectedMetrics]);

  if (userTier === 'free') {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-8 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-purple-500" />
          <h3 className="text-xl font-semibold mb-2">Strategy Performance Comparison</h3>
          <p className="text-muted-foreground mb-4">
            Compare your trading strategies side-by-side with detailed metrics and AI-powered insights.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Side-by-side strategy comparison</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Performance metrics analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Risk-adjusted return comparison</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>AI-powered strategy recommendations</span>
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => { try { (window as any).location.hash = '#upgrade'; } catch {} }}
          >
            Upgrade to PRO
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            Strategy Comparison
          </h2>
          <p className="text-muted-foreground">
            Compare your trading strategies performance and metrics
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['overview', 'detailed', 'radar'] as const).map((view) => (
              <Button
                key={view}
                variant={comparisonView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setComparisonView(view)}
                className="text-xs"
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Strategies to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableStrategies.map((strategy) => (
              <Button
                key={strategy}
                variant={selectedStrategies.includes(strategy) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleStrategy(strategy)}
                className="flex items-center gap-2"
              >
                {selectedStrategies.includes(strategy) ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {strategy}
              </Button>
            ))}
          </div>

          {selectedStrategies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Select strategies above to start comparing their performance
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStrategies.length > 0 && (
        <>
          {/* Overview Comparison */}
          {comparisonView === 'overview' && (
            <div className="grid gap-6">
              {/* Key Metrics Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Strategy</th>
                          <th className="text-center py-2">Win Rate</th>
                          <th className="text-center py-2">Profit Factor</th>
                          <th className="text-center py-2">Total P&L</th>
                          <th className="text-center py-2">Sharpe Ratio</th>
                          <th className="text-center py-2">Max DD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMetrics.map((metric) => (
                          <tr key={metric.name} className="border-b">
                            <td className="py-3 font-medium">{metric.name}</td>
                            <td className="text-center py-3">
                              <div className="flex items-center justify-center gap-2">
                                <span>{metric.winRate.toFixed(1)}%</span>
                                <div className="w-16">
                                  <Progress value={metric.winRate} className="h-2" />
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              {metric.profitFactor === Infinity ? '∞' : metric.profitFactor.toFixed(2)}
                            </td>
                            <td className={`text-center py-3 font-medium ${
                              metric.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${metric.totalPnL.toFixed(2)}
                            </td>
                            <td className="text-center py-3">
                              {metric.sharpeRatio.toFixed(2)}
                            </td>
                            <td className="text-center py-3">
                              {metric.maxDrawdown.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Win Rate" fill="#10b981" name="Win Rate (%)" />
                        <Bar dataKey="Profit Factor" fill="#3b82f6" name="Profit Factor" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detailed Comparison */}
          {comparisonView === 'detailed' && (
            <div className="grid gap-6">
              {selectedMetrics.map((metric) => (
                <Card key={metric.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{metric.name}</span>
                      <Badge variant={metric.totalPnL >= 0 ? 'default' : 'destructive'}>
                        {metric.totalPnL >= 0 ? 'Profitable' : 'Loss-Making'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold mb-1">{metric.totalTrades}</div>
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold mb-1">{metric.winRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold mb-1">${metric.avgReturn.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Avg Return</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold mb-1">{metric.consistency.toFixed(0)}%</div>
                        <div className="text-sm text-muted-foreground">Consistency</div>
                      </div>
                    </div>

                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Best & Worst Trades</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Best Trade:</span>
                            <span className="text-sm font-medium text-green-600">
                              ${metric.bestTrade.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Worst Trade:</span>
                            <span className="text-sm font-medium text-red-600">
                              ${metric.worstTrade.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Risk Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                            <span className="text-sm font-medium">
                              {metric.maxDrawdown.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Sharpe Ratio:</span>
                            <span className="text-sm font-medium">
                              {metric.sharpeRatio.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Radar Comparison */}
          {comparisonView === 'radar' && (
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={comparisonData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Win Rate"
                        dataKey="Win Rate"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                      />
                      <Radar
                        name="Consistency"
                        dataKey="Consistency"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                AI Strategy Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedMetrics.map((metric) => (
                  <div key={metric.name} className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">{metric.name} Analysis</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Strengths:</strong>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          {metric.winRate > 60 && <li>• High win rate indicates reliable edge</li>}
                          {metric.profitFactor > 1.5 && <li>• Strong profit factor shows good risk management</li>}
                          {metric.sharpeRatio > 1 && <li>• Good risk-adjusted returns</li>}
                          {metric.consistency > 70 && <li>• Consistent performance across trades</li>}
                        </ul>
                      </div>
                      <div>
                        <strong>Areas for Improvement:</strong>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          {metric.winRate < 50 && <li>• Consider refining entry criteria</li>}
                          {metric.maxDrawdown > 20 && <li>• High drawdown - review risk management</li>}
                          {metric.sharpeRatio < 0.5 && <li>• Returns may not justify risk taken</li>}
                          {metric.totalTrades < 30 && <li>• Limited sample size for analysis</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
