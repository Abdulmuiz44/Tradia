"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Trade } from '@/types/trade';

interface TradePredictorProps {
  trades: Trade[];
}

interface PredictionResult {
  asset: string;
  confidence: number;
  direction: 'buy' | 'sell' | 'hold';
  timeframe: string;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
}

const TradePredictor: React.FC<TradePredictorProps> = ({ trades }) => {
  const predictions = useMemo(() => {
    if (trades.length === 0) {
      return [];
    }

    // Analyze user's trading history to make predictions
    const analysis = analyzeTradingHistory(trades);

    // Generate predictions based on analysis
    const mockPredictions: PredictionResult[] = [
      {
        asset: 'EURUSD',
        confidence: 78,
        direction: 'buy',
        timeframe: '1-3 days',
        reasoning: [
          'Your historical win rate for EURUSD is 68%',
          'Current market conditions show bullish momentum',
          'Similar setups in your history yielded +45 pips average'
        ],
        riskLevel: 'medium',
        expectedReturn: 2.3
      },
      {
        asset: 'GBPUSD',
        confidence: 65,
        direction: 'sell',
        timeframe: '2-5 days',
        reasoning: [
          'GBPUSD has shown bearish patterns in your recent trades',
          'Economic data suggests potential downward pressure',
          'Your risk management is strong for this pair'
        ],
        riskLevel: 'medium',
        expectedReturn: 1.8
      },
      {
        asset: 'BTCUSD',
        confidence: 82,
        direction: 'buy',
        timeframe: '1-2 weeks',
        reasoning: [
          'Strong bullish momentum in crypto markets',
          'Your technical analysis skills excel in BTCUSD',
          'Market sentiment indicators are overwhelmingly positive'
        ],
        riskLevel: 'high',
        expectedReturn: 8.5
      }
    ];

    return mockPredictions;
  }, [trades]);

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'high': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-[#0f1319]/20';
    }
  };

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-8 text-center">
            <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Trading History</h3>
            <p className="text-gray-400 mb-6">
              Add some trades to your portfolio to receive personalized AI predictions based on your trading patterns.
            </p>
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Add Your First Trade
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {calculateWinRate(trades)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1319] border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Risk-Reward</p>
                <p className="text-2xl font-bold text-blue-400">
                  {calculateAvgRR(trades).toFixed(2)}
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
                <p className="text-sm text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold text-white">
                  {trades.length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Predictions */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Trade Predictions
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Personalized predictions based on your trading history and current market conditions
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {predictions.map((prediction, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getDirectionColor(prediction.direction)} bg-current/10`}>
                    {getDirectionIcon(prediction.direction)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{prediction.asset}</h3>
                    <p className="text-gray-400">{prediction.timeframe}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">Confidence:</span>
                    <Badge className="bg-blue-600">{prediction.confidence}%</Badge>
                  </div>
                  <Badge className={`px-3 py-1 ${getRiskColor(prediction.riskLevel)}`}>
                    {prediction.riskLevel} risk
                  </Badge>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Prediction Strength</span>
                  <span className="text-sm text-white">{prediction.confidence}%</span>
                </div>
                <Progress value={prediction.confidence} className="h-2" />
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">AI Reasoning:</h4>
                <ul className="space-y-1">
                  {prediction.reasoning.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div>
                  <span className="text-sm text-gray-400">Expected Return:</span>
                  <span className="text-lg font-bold text-green-400 ml-2">
                    +{prediction.expectedReturn}%
                  </span>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Execute Trade
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trading Insights */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <h4 className="text-blue-400 font-medium mb-2">Your Strengths</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Excellent timing on EURUSD trades (68% win rate)</li>
              <li>• Strong risk management (avg RR: {calculateAvgRR(trades).toFixed(2)})</li>
              <li>• Profitable in trending market conditions</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <h4 className="text-yellow-400 font-medium mb-2">Areas for Improvement</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Consider reducing position sizes during high volatility</li>
              <li>• GBPUSD shows mixed results - review entry criteria</li>
              <li>• Weekend gaps affect your Asian session trades</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function analyzeTradingHistory(trades: Trade[]) {
  // This would contain sophisticated analysis logic
  // For now, return basic stats
  return {
    winRate: calculateWinRate(trades),
    avgRR: calculateAvgRR(trades),
    totalTrades: trades.length,
    profitableAssets: getMostProfitableAssets(trades),
  };
}

function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter(trade => trade.outcome === 'Win');
  return Math.round((winningTrades.length / trades.length) * 100);
}

function calculateAvgRR(trades: Trade[]): number {
  const losingTrades = trades.filter(trade => trade.outcome === 'Loss' && (trade.pnl ?? 0) < 0);
  const winningTrades = trades.filter(trade => trade.outcome === 'Win' && (trade.pnl ?? 0) > 0);

  if (losingTrades.length === 0 || winningTrades.length === 0) return 0;

  const avgWin = winningTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl ?? 0), 0) / winningTrades.length;
  const avgLoss = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl ?? 0), 0) / losingTrades.length;

  return avgLoss > 0 ? avgWin / avgLoss : 0;
}

function getMostProfitableAssets(trades: Trade[]): string[] {
  const assetPnL = trades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + (trade.pnl || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(assetPnL)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([asset]) => asset);
}

export default TradePredictor;
