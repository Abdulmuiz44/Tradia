"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Search, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { Trade } from '@/types/trade';

interface PatternRecognitionProps {
  trades: Trade[];
}

interface TradingPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  successRate: number;
  avgProfit: number;
  characteristics: string[];
  recommendations: string[];
}

const PatternRecognition: React.FC<PatternRecognitionProps> = ({ trades }) => {
  const patterns = useMemo(() => {
    if (trades.length === 0) {
      return [];
    }

    return analyzePatterns(trades);
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Pattern Data</h3>
            <p className="text-gray-400 mb-6">
              Add more trades to discover your successful trading patterns and strategies.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Pattern Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Patterns Found</p>
                <p className="text-2xl font-bold text-blue-400">
                  {patterns.length}
                </p>
              </div>
              <Search className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Success Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {patterns.length > 0 ? Math.round(patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Most Profitable</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {patterns.length > 0 ? patterns.reduce((max, p) => p.avgProfit > max.avgProfit ? p : max).name : 'N/A'}
                </p>
              </div>
              <Target className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pattern Confidence</p>
                <p className="text-2xl font-bold text-purple-400">
                  {patterns.length > 0 ? Math.round(patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length) : 0}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Analysis */}
      <div className="space-y-6">
        {patterns.map((pattern) => (
          <Card key={pattern.id} className="bg-gray-900 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {pattern.name}
                  </CardTitle>
                  <p className="text-gray-400 mt-1">{pattern.description}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-600 mb-2">
                    {pattern.confidence}% confidence
                  </Badge>
                  <div className="text-sm text-gray-400">
                    {pattern.frequency} occurrences
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Success Rate</span>
                    <span className="text-sm text-white">{pattern.successRate}%</span>
                  </div>
                  <Progress value={pattern.successRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Avg Profit</span>
                    <span className="text-sm text-green-400">+${pattern.avgProfit.toFixed(2)}</span>
                  </div>
                  <Progress value={Math.min(100, pattern.avgProfit * 10)} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Frequency</span>
                    <span className="text-sm text-white">{pattern.frequency}x</span>
                  </div>
                  <Progress value={Math.min(100, (pattern.frequency / trades.length) * 100)} className="h-2" />
                </div>
              </div>

              {/* Pattern Characteristics */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Pattern Characteristics:</h4>
                <div className="flex flex-wrap gap-2">
                  {pattern.characteristics.map((char, index) => (
                    <Badge key={index} variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Recommendations:</h4>
                <div className="space-y-2">
                  {pattern.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      </div>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Apply Pattern
                </Button>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  View Examples
                </Button>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pattern Insights */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pattern Analysis Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Strengths</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Consistent performance in trending markets</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Strong risk-reward ratios on winning trades</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Effective use of technical indicators</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Areas for Improvement</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Reduce trading frequency during uncertain market conditions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Improve entry timing precision</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Consider adding more confirmation signals</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function analyzePatterns(trades: Trade[]): TradingPattern[] {
  // This is a simplified pattern analysis - in a real app, this would use ML algorithms
  const patterns: TradingPattern[] = [];

  // Momentum pattern
  const momentumTrades = trades.filter(t => t.strategy?.toLowerCase().includes('momentum'));
  if (momentumTrades.length > 2) {
    const winRate = (momentumTrades.filter(t => t.outcome === 'Win').length / momentumTrades.length) * 100;
    const avgProfit = momentumTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / momentumTrades.length;

    patterns.push({
      id: 'momentum-trading',
      name: 'Momentum Trading',
      description: 'Capturing strong directional moves in the market',
      confidence: Math.min(95, winRate + 20),
      frequency: momentumTrades.length,
      successRate: Math.round(winRate),
      avgProfit: avgProfit > 0 ? avgProfit : 0,
      characteristics: [
        'Strong trending markets',
        'High volume breakouts',
        'Clear directional bias',
        'Momentum indicators (RSI, MACD)'
      ],
      recommendations: [
        'Continue using momentum strategies in trending markets',
        'Add volume confirmation to reduce false breakouts',
        'Consider trailing stops to maximize profit capture',
        'Avoid momentum trades in ranging markets'
      ]
    });
  }

  // Support/Resistance pattern
  const srTrades = trades.filter(t =>
    t.strategy?.toLowerCase().includes('support') ||
    t.strategy?.toLowerCase().includes('resistance') ||
    t.strategy?.toLowerCase().includes('level')
  );
  if (srTrades.length > 1) {
    const winRate = (srTrades.filter(t => t.outcome === 'Win').length / srTrades.length) * 100;
    const avgProfit = srTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / srTrades.length;

    patterns.push({
      id: 'support-resistance',
      name: 'Support/Resistance Trading',
      description: 'Trading bounces and breakouts at key price levels',
      confidence: Math.min(90, winRate + 15),
      frequency: srTrades.length,
      successRate: Math.round(winRate),
      avgProfit: avgProfit > 0 ? avgProfit : 0,
      characteristics: [
        'Clear support/resistance levels',
        'Multiple touches of price levels',
        'Volume confirmation',
        'Time-based validation'
      ],
      recommendations: [
        'Wait for multiple touches before entering',
        'Use volume spikes as confirmation',
        'Consider the timeframe - higher timeframes = stronger levels',
        'Combine with momentum for higher probability setups'
      ]
    });
  }

  // News/Event pattern
  const newsTrades = trades.filter(t =>
    t.strategy?.toLowerCase().includes('news') ||
    t.strategy?.toLowerCase().includes('event') ||
    t.journalNotes?.toLowerCase().includes('news')
  );
  if (newsTrades.length > 0) {
    const winRate = (newsTrades.filter(t => t.outcome === 'Win').length / newsTrades.length) * 100;
    const avgProfit = newsTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / newsTrades.length;

    patterns.push({
      id: 'news-trading',
      name: 'News/Event Trading',
      description: 'Capitalizing on market-moving news and economic events',
      confidence: Math.min(85, winRate + 10),
      frequency: newsTrades.length,
      successRate: Math.round(winRate),
      avgProfit: avgProfit > 0 ? avgProfit : 0,
      characteristics: [
        'High volatility periods',
        'Economic data releases',
        'Central bank announcements',
        'Geopolitical events'
      ],
      recommendations: [
        'Focus on high-impact news events',
        'Use proper position sizing for volatile conditions',
        'Consider widening stops during news events',
        'Have clear profit targets and exit plans'
      ]
    });
  }

  // Scalping pattern
  const scalpTrades = trades.filter(t =>
    t.strategy?.toLowerCase().includes('scalp') ||
    (t.duration && parseInt(t.duration) < 30) // Less than 30 minutes
  );
  if (scalpTrades.length > 2) {
    const winRate = (scalpTrades.filter(t => t.outcome === 'Win').length / scalpTrades.length) * 100;
    const avgProfit = scalpTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / scalpTrades.length;

    patterns.push({
      id: 'scalping',
      name: 'Scalping Strategy',
      description: 'Quick entries and exits for small, frequent profits',
      confidence: Math.min(88, winRate + 12),
      frequency: scalpTrades.length,
      successRate: Math.round(winRate),
      avgProfit: avgProfit > 0 ? avgProfit : 0,
      characteristics: [
        'Short timeframes (1-15 minutes)',
        'Small profit targets',
        'High frequency trading',
        'Tight risk management'
      ],
      recommendations: [
        'Maintain strict discipline with small targets',
        'Use very tight stops to protect capital',
        'Focus on liquid pairs with low spreads',
        'Avoid scalping during news events'
      ]
    });
  }

  return patterns;
}

export default PatternRecognition;
