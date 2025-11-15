"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Trade } from '@/types/trade';

interface AIPerformanceInsightsProps {
  trades: Trade[];
}

interface AIInsight {
  type: 'positive' | 'warning' | 'suggestion' | 'analysis';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

const AIPerformanceInsights: React.FC<AIPerformanceInsightsProps> = ({ trades }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  // Generate basic insights locally first
  const basicInsights = useMemo(() => {
    if (trades.length === 0) return [];

    const insights: AIInsight[] = [];
    const winningTrades = trades.filter(t => t.outcome === 'Win');
    const losingTrades = trades.filter(t => t.outcome === 'Loss');
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

    // Win rate analysis
    if (winRate >= 60) {
      insights.push({
        type: 'positive',
        title: 'Excellent Win Rate',
        description: `Your ${winRate.toFixed(1)}% win rate is exceptional. You're demonstrating strong market timing and strategy execution.`,
        impact: 'high',
        actionable: false
      });
    } else if (winRate < 40) {
      insights.push({
        type: 'warning',
        title: 'Win Rate Needs Improvement',
        description: `Your ${winRate.toFixed(1)}% win rate suggests room for improvement. Consider reviewing entry criteria and market conditions.`,
        impact: 'high',
        actionable: true
      });
    }

    // Risk-reward analysis
    let avgRR = 0;
    let rrCount = 0;
    trades.forEach(trade => {
      if (trade.pnl && trade.pnl !== 0) {
        const risk = Math.abs(trade.pnl);
        const reward = trade.outcome === 'Win' ? trade.pnl : -trade.pnl;
        if (risk > 0) {
          avgRR += reward / risk;
          rrCount++;
        }
      }
    });
    avgRR = rrCount > 0 ? avgRR / rrCount : 0;

    if (avgRR >= 1.5) {
      insights.push({
        type: 'positive',
        title: 'Strong Risk-Reward Ratio',
        description: `Your average risk-reward ratio of ${avgRR.toFixed(2)} demonstrates disciplined trade management.`,
        impact: 'medium',
        actionable: false
      });
    } else if (avgRR < 1) {
      insights.push({
        type: 'warning',
        title: 'Risk-Reward Ratio Concerns',
        description: `Your average risk-reward ratio of ${avgRR.toFixed(2)} is below 1:1. Consider adjusting stop losses and profit targets.`,
        impact: 'high',
        actionable: true
      });
    }

    // Consistency analysis
    const dailyPnL: Record<string, number> = {};
    trades.forEach(trade => {
      const date = new Date(trade.closeTime || trade.openTime || Date.now()).toDateString();
      dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
    });

    const dailyValues = Object.values(dailyPnL);
    if (dailyValues.length > 1) {
      const mean = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
      const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean !== 0 ? (stdDev / Math.abs(mean)) : 0;
      const consistencyScore = Math.max(0, Math.min(100, 100 - (cv * 50)));

      if (consistencyScore >= 80) {
        insights.push({
          type: 'positive',
          title: 'Highly Consistent Performance',
          description: `Your daily performance consistency score of ${consistencyScore.toFixed(1)}% shows excellent trading discipline.`,
          impact: 'medium',
          actionable: false
        });
      } else if (consistencyScore < 60) {
        insights.push({
          type: 'suggestion',
          title: 'Improve Performance Consistency',
          description: `Your consistency score of ${consistencyScore.toFixed(1)}% could be improved. Focus on maintaining steady daily routines.`,
          impact: 'medium',
          actionable: true
        });
      }
    }

    return insights;
  }, [trades]);

  // Fetch AI-powered insights
  const fetchAIInsights = async () => {
    if (trades.length === 0) return;

    setLoading(true);
    try {
      // Calculate comprehensive trading metrics
      const metrics = calculateTradingMetrics(trades);

      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `As an expert trading coach, analyze this trader's performance and provide 4-6 specific, actionable insights. Focus on:

Performance: ${metrics.totalTrades} trades, ${metrics.winRate.toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(2)} P/L
Risk Management: Avg RR ${metrics.avgRR.toFixed(2)}, Max Drawdown $${metrics.maxDrawdown.toFixed(2)}
Consistency: Score ${metrics.consistencyScore.toFixed(1)}%, Best day $${metrics.bestDay.toFixed(2)}
Recent Performance: Last 5 trades show ${metrics.recentPerformance}

Provide insights in this format:
1. [Positive/Warning/Suggestion]: [Title] - [Specific description with actionable advice]
2. [Continue with 4-6 insights total]

Make each insight specific, actionable, and based on the actual performance data. Include specific numbers and recommendations.`
          }],
          options: {
            model: 'gpt-4o-mini',
            temperature: 0.4,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI insights');
      }

      const data = await response.json();
      const aiResponse = data.response;

      // Parse AI response and create structured insights
      const aiInsights = parseAIResponse(aiResponse);

      setInsights([...basicInsights, ...aiInsights]);
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      // Fall back to basic insights
      setInsights(basicInsights);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trades.length > 0 && insights.length === 0) {
      setInsights(basicInsights);
    }
  }, [trades, basicInsights, insights.length]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'suggestion': return <Lightbulb className="h-5 w-5 text-blue-400" />;
      case 'analysis': return <TrendingUp className="h-5 w-5 text-purple-400" />;
      default: return <Sparkles className="h-5 w-5 text-gray-400" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-500 bg-red-900/10';
      case 'medium': return 'border-yellow-500 bg-yellow-900/10';
      case 'low': return 'border-green-500 bg-green-900/10';
      default: return 'border-gray-500 bg-gray-900/10';
    }
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">AI Performance Insights</h2>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No AI Insights Available</h3>
            <p className="text-gray-400">
              Add trades to your portfolio to receive personalized AI-powered performance analysis and recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">AI Performance Insights</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastAnalyzed && (
            <span className="text-sm text-gray-400">
              Last analyzed: {lastAnalyzed.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={fetchAIInsights}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Insights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <Card
            key={index}
            className={`bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 ${getImpactColor(insight.impact)}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getInsightIcon(insight.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        insight.impact === 'high' ? 'bg-red-600' :
                        insight.impact === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        {insight.impact} impact
                      </Badge>
                      {insight.actionable && (
                        <Badge className="text-xs bg-blue-600">
                          Actionable
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-300 mb-4">{insight.description}</p>

                  {insight.actionable && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Take Action
                      </Button>
                      <span className="text-sm text-gray-400">Click to implement this recommendation</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {insights.filter(i => i.type === 'positive').length}
              </div>
              <div className="text-sm text-gray-400">Strengths Identified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {insights.filter(i => i.actionable).length}
              </div>
              <div className="text-sm text-gray-400">Actionable Insights</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Note */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <div>
              <h4 className="text-white font-medium">AI-Powered Analysis</h4>
              <p className="text-sm text-gray-400">
                These insights are generated using advanced AI analysis of your complete trading history,
                providing personalized recommendations to improve your performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function calculateTradingMetrics(trades: Trade[]) {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.outcome === 'Win');
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  // Calculate average RR
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

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumulativePnL = 0;

  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.closeTime || a.openTime).getTime() - new Date(b.closeTime || b.openTime).getTime()
  );

  for (const trade of sortedTrades) {
    cumulativePnL += trade.pnl || 0;
    if (cumulativePnL > peak) peak = cumulativePnL;
    const drawdown = peak - cumulativePnL;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Calculate consistency
  const dailyPnL: Record<string, number> = {};
  trades.forEach(trade => {
    const date = new Date(trade.closeTime || trade.openTime).toDateString();
    dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
  });

  const dailyValues = Object.values(dailyPnL);
  const bestDay = Math.max(...dailyValues, 0);
  const consistencyScore = dailyValues.length > 1 ?
    Math.max(0, Math.min(100, 100 - (calculateCV(dailyValues) * 50))) : 100;

  // Recent performance
  const recentTrades = trades.slice(-5);
  const recentWinRate = recentTrades.length > 0 ?
    (recentTrades.filter(t => t.outcome === 'Win').length / recentTrades.length) * 100 : 0;

  return {
    totalTrades,
    winRate,
    totalPnL,
    avgRR,
    maxDrawdown,
    consistencyScore,
    bestDay,
    recentPerformance: `${recentWinRate.toFixed(1)}% win rate in last 5 trades`
  };
}

function calculateCV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return mean !== 0 ? stdDev / Math.abs(mean) : 0;
}

function parseAIResponse(aiResponse: string): AIInsight[] {
  const insights: AIInsight[] = [];

  // Simple parsing - look for numbered insights
  const lines = aiResponse.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+\./.test(trimmed)) {
      // This is a numbered insight
      const content = trimmed.replace(/^\d+\.\s*/, '');

      // Determine type based on keywords
      let type: 'positive' | 'warning' | 'suggestion' | 'analysis' = 'analysis';
      let impact: 'high' | 'medium' | 'low' = 'medium';
      let actionable = false;

      if (content.toLowerCase().includes('excellent') || content.toLowerCase().includes('strong') || content.toLowerCase().includes('good')) {
        type = 'positive';
        impact = 'low';
      } else if (content.toLowerCase().includes('warning') || content.toLowerCase().includes('concern') || content.toLowerCase().includes('needs')) {
        type = 'warning';
        impact = 'high';
        actionable = true;
      } else if (content.toLowerCase().includes('consider') || content.toLowerCase().includes('suggest') || content.toLowerCase().includes('recommend')) {
        type = 'suggestion';
        impact = 'medium';
        actionable = true;
      }

      // Extract title (first part before dash or colon)
      const titleMatch = content.match(/^([^:-]+)[:\-]/);
      const title = titleMatch ? titleMatch[1].trim() : content.split(' ').slice(0, 4).join(' ');
      const description = content.replace(title, '').replace(/^[:\-]\s*/, '').trim() || content;

      insights.push({
        type,
        title,
        description,
        impact,
        actionable
      });
    }
  }

  // If no structured insights found, create a general one
  if (insights.length === 0) {
    insights.push({
      type: 'analysis',
      title: 'AI Performance Analysis',
      description: aiResponse,
      impact: 'medium',
      actionable: false
    });
  }

  return insights.slice(0, 6); // Limit to 6 insights
}

export default AIPerformanceInsights;
