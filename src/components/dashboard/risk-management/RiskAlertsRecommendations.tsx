"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lightbulb, TrendingUp, Shield, RefreshCw } from 'lucide-react';
import { Trade } from '@/types/trade';

interface RiskAlertsRecommendationsProps {
  trades: Trade[];
}

interface RiskInsight {
  id: string;
  type: 'alert' | 'recommendation' | 'insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  impact: 'positive' | 'negative' | 'neutral';
}

const RiskAlertsRecommendations: React.FC<RiskAlertsRecommendationsProps> = ({ trades }) => {
  const [insights, setInsights] = useState<RiskInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  // Generate basic insights locally first
  const basicInsights = useMemo(() => {
    if (trades.length === 0) return [];

    const insights: RiskInsight[] = [];
    const winningTrades = trades.filter(t => t.outcome === 'Win');
    const losingTrades = trades.filter(t => t.outcome === 'Loss');
    const winRate = winningTrades.length / trades.length;

    // Risk alerts
    if (winRate < 0.4) {
      insights.push({
        id: 'low-win-rate',
        type: 'alert',
        priority: 'high',
        title: 'Low Win Rate Detected',
        description: `Your win rate is ${(winRate * 100).toFixed(1)}%, which is below the recommended 50% threshold. Consider reviewing your entry criteria and trade setup.`,
        actionable: true,
        impact: 'negative'
      });
    }

    // Risk per trade analysis
    const avgRisk = trades.reduce((sum, trade) => {
      const risk = trade.pnl && trade.pnl < 0 ? Math.abs(trade.pnl) : 0;
      return sum + risk;
    }, 0) / trades.length;

    const avgReward = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / winningTrades.length
      : 0;

    const riskRewardRatio = avgRisk > 0 ? avgReward / avgRisk : 0;

    if (riskRewardRatio < 1.5) {
      insights.push({
        id: 'poor-risk-reward',
        type: 'alert',
        priority: 'medium',
        title: 'Suboptimal Risk-Reward Ratio',
        description: `Your average risk-reward ratio is ${riskRewardRatio.toFixed(2)}, below the recommended 1:1.5 minimum. Focus on higher-reward setups.`,
        actionable: true,
        impact: 'negative'
      });
    }

    // Drawdown analysis
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

    if (maxDrawdown > 1000) { // $1000 drawdown threshold
      insights.push({
        id: 'high-drawdown',
        type: 'alert',
        priority: 'high',
        title: 'Significant Drawdown Warning',
        description: `Your maximum drawdown of $${maxDrawdown.toFixed(2)} exceeds safe limits. Consider reducing position sizes or taking a break.`,
        actionable: true,
        impact: 'negative'
      });
    }

    // Recommendations
    insights.push({
      id: 'position-sizing',
      type: 'recommendation',
      priority: 'medium',
      title: 'Optimize Position Sizing',
      description: 'Use the 1% risk rule: never risk more than 1% of your account equity on any single trade.',
      actionable: true,
      impact: 'positive'
    });

    insights.push({
      id: 'risk-management',
      type: 'insight',
      priority: 'low',
      title: 'Diversify Your Trading',
      description: 'Consider trading multiple currency pairs or asset classes to reduce concentration risk.',
      actionable: true,
      impact: 'neutral'
    });

    return insights;
  }, [trades]);

  // Fetch AI-powered insights
  const fetchAIInsights = async () => {
    if (trades.length === 0) return;

    setLoading(true);
    try {
      const tradeSummary = {
        totalTrades: trades.length,
        winRate: (trades.filter(t => t.outcome === 'Win').length / trades.length) * 100,
        avgProfit: trades.reduce((sum, t) => sum + (t.pnl || 0), 0) / trades.length,
        maxDrawdown: calculateMaxDrawdown(trades),
        recentTrades: trades.slice(-5).map(t => ({
          symbol: t.symbol,
          outcome: t.outcome,
          pnl: t.pnl,
          date: new Date(new Date(t.closeTime || t.openTime || Date.now()) || Date.now()).toISOString()
        }))
      };

      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze my trading risk management and provide personalized recommendations. Here is my trading summary:

Total Trades: ${tradeSummary.totalTrades}
Win Rate: ${tradeSummary.winRate.toFixed(1)}%
Average P/L per Trade: $${tradeSummary.avgProfit.toFixed(2)}
Maximum Drawdown: $${tradeSummary.maxDrawdown.toFixed(2)}

Recent 5 trades: ${JSON.stringify(tradeSummary.recentTrades, null, 2)}

Please provide 3-5 specific, actionable risk management recommendations based on this data. Focus on:
1. Risk per trade optimization
2. Position sizing improvements
3. Drawdown management
4. Risk diversification
5. Trading frequency adjustments

Format your response as a JSON array of recommendation objects with: title, description, priority (high/medium/low), and impact (positive/negative/neutral).`
          }],
          options: {
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 800
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI insights');
      }

      const data = await response.json();
      const aiResponse = data.response;

      // Parse AI response (assuming it returns structured data)
      try {
        const aiInsights = JSON.parse(aiResponse);
        if (Array.isArray(aiInsights)) {
          const formattedInsights: RiskInsight[] = aiInsights.map((insight: any, index: number) => ({
            id: `ai-${index}`,
            type: 'recommendation' as const,
            priority: insight.priority || 'medium',
            title: insight.title || 'AI Recommendation',
            description: insight.description || insight,
            actionable: true,
            impact: insight.impact || 'neutral'
          }));

          setInsights([...basicInsights, ...formattedInsights]);
        } else {
          // If not structured, add as single insight
          setInsights([...basicInsights, {
            id: 'ai-general',
            type: 'insight',
            priority: 'medium',
            title: 'AI Risk Analysis',
            description: aiResponse,
            actionable: false,
            impact: 'neutral'
          }]);
        }
      } catch (parseError) {
        // If JSON parsing fails, add as single insight
        setInsights([...basicInsights, {
          id: 'ai-general',
          type: 'insight',
          priority: 'medium',
          title: 'AI Risk Analysis',
          description: aiResponse,
          actionable: false,
          impact: 'neutral'
        }]);
      }

      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
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
      case 'alert': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-yellow-400" />;
      case 'insight': return <TrendingUp className="h-5 w-5 text-blue-400" />;
      default: return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Risk Alerts & Recommendations</h2>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Risk Data Available</h3>
            <p className="text-gray-400 mb-6">
              Add trades to your portfolio to receive AI-powered risk analysis and personalized recommendations.
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
          <Shield className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Risk Alerts & Recommendations</h2>
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
                <Lightbulb className="h-4 w-4 mr-2" />
                Get AI Insights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight) => (
          <Card
            key={insight.id}
            className={`bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 ${getPriorityColor(insight.priority)}`}
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
                      <Badge
                        className={`text-xs ${
                          insight.impact === 'positive' ? 'bg-green-600' :
                          insight.impact === 'negative' ? 'bg-red-600' :
                          'bg-gray-600'
                        }`}
                      >
                        {insight.impact}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-4">{insight.description}</p>

                  {insight.actionable && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Take Action
                      </Button>
                      <span className="text-sm text-gray-400">Actionable recommendation</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {insights.filter(i => i.type === 'alert').length}
              </div>
              <div className="text-sm text-gray-400">Active Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {insights.filter(i => i.type === 'recommendation').length}
              </div>
              <div className="text-sm text-gray-400">Recommendations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {insights.filter(i => i.type === 'insight').length}
              </div>
              <div className="text-sm text-gray-400">Insights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {insights.filter(i => i.actionable).length}
              </div>
              <div className="text-sm text-gray-400">Actionable Items</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function
function calculateMaxDrawdown(trades: Trade[]): number {
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

  return maxDrawdown;
}

export default RiskAlertsRecommendations;
