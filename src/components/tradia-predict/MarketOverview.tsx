"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Globe, DollarSign, Activity } from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface MarketIndicator {
  name: string;
  value: number;
  status: 'positive' | 'negative' | 'neutral';
  description: string;
}

const MarketOverview: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [indicators, setIndicators] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching market data
    const fetchMarketData = async () => {
      setLoading(true);
      // In a real app, this would fetch from an API
      const mockData: MarketData[] = [
        { symbol: 'EURUSD', price: 1.0850, change: 0.0025, changePercent: 0.23, volume: 125000, sentiment: 'bullish' },
        { symbol: 'GBPUSD', price: 1.2750, change: -0.0012, changePercent: -0.09, volume: 98000, sentiment: 'neutral' },
        { symbol: 'USDJPY', price: 150.25, change: 0.35, changePercent: 0.23, volume: 156000, sentiment: 'bullish' },
        { symbol: 'BTCUSD', price: 43250, change: 1250, changePercent: 2.98, volume: 2850000, sentiment: 'bullish' },
        { symbol: 'SPY', price: 445.80, change: -2.15, changePercent: -0.48, volume: 45600000, sentiment: 'bearish' },
      ];

      const mockIndicators: MarketIndicator[] = [
        { name: 'Market Sentiment', value: 68, status: 'positive', description: 'Bullish market conditions' },
        { name: 'VIX Index', value: 15.2, status: 'positive', description: 'Low volatility indicates confidence' },
        { name: 'Put/Call Ratio', value: 0.85, status: 'neutral', description: 'Balanced options activity' },
        { name: 'Economic Data', value: 72, status: 'positive', description: 'Strong economic indicators' },
      ];

      setTimeout(() => {
        setMarketData(mockData);
        setIndicators(mockIndicators);
        setLoading(false);
      }, 1000);
    };

    fetchMarketData();
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getIndicatorColor = (status: string) => {
    switch (status) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Market Sentiment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {indicators.map((indicator, index) => (
          <Card key={indicator.name} className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-4 relative overflow-hidden">
              {/* Animated background glow */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r ${
                indicator.status === 'positive' ? 'from-green-500 to-blue-500' :
                indicator.status === 'negative' ? 'from-red-500 to-orange-500' :
                'from-yellow-500 to-purple-500'
              }`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {indicator.name}
                  </h3>
                  <Activity className={`h-4 w-4 ${getIndicatorColor(indicator.status)} animate-pulse`} />
                </div>
                <div className={`text-2xl font-bold ${getIndicatorColor(indicator.status)} mb-1`}>
                  {indicator.value}{indicator.name.includes('Ratio') ? '' : '%'}
                </div>
                <div className={`h-1 bg-gray-700 rounded-full overflow-hidden`}>
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${
                      indicator.status === 'positive' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      indicator.status === 'negative' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    }`}
                    style={{ width: `${Math.min(indicator.value, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 group-hover:text-gray-400 transition-colors">
                  {indicator.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Data Table */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="relative">
              <Globe className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-0 h-5 w-5 bg-green-400 rounded-full animate-ping opacity-20" />
            </div>
            Live Market Data
            <Badge className="ml-auto bg-green-600 animate-pulse">
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Asset</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Price</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Change</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Volume</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {marketData.map((item, index) => (
                  <tr
                    key={item.symbol}
                    className="border-b border-gray-800 hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-transparent transition-all duration-300 animate-in slide-in-from-left group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white hover:text-blue-400 transition-colors cursor-pointer group-hover:scale-105 transform duration-200">
                          {item.symbol}
                        </span>
                        {item.sentiment === 'bullish' && (
                          <TrendingUp className="h-4 w-4 text-green-400 animate-bounce" />
                        )}
                        {item.sentiment === 'bearish' && (
                          <TrendingDown className="h-4 w-4 text-red-400 animate-bounce" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white group-hover:text-green-300 transition-colors">
                      ${item.price.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium px-2 py-1 rounded transition-all duration-300 ${
                        item.change >= 0
                          ? 'text-green-400 bg-green-900/20 hover:bg-green-900/40 group-hover:scale-105'
                          : 'text-red-400 bg-red-900/20 hover:bg-red-900/40 group-hover:scale-105'
                      }`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(4)}
                        <span className="text-xs ml-1">
                          ({item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      <span className="bg-gray-800 px-2 py-1 rounded text-sm group-hover:bg-gray-700 transition-colors">
                        {(item.volume / 1000).toFixed(0)}K
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={`${
                          item.sentiment === 'bullish'
                            ? 'bg-green-900/50 text-green-400 border-green-700 hover:bg-green-900/70'
                            : item.sentiment === 'bearish'
                            ? 'bg-red-900/50 text-red-400 border-red-700 hover:bg-red-900/70'
                            : 'bg-yellow-900/50 text-yellow-400 border-yellow-700 hover:bg-yellow-900/70'
                        } border transition-all duration-300 hover:scale-110`}
                      >
                        {item.sentiment.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Market Analysis Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400 group-hover:animate-pulse" />
              Market Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-700/50 rounded-lg hover:border-green-600/70 transition-all duration-300 group/bullish">
              <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Bullish Signals
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-start gap-2 group/bullish">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="group-hover/bullish:text-green-300 transition-colors">Strong momentum in technology sector</span>
                </li>
                <li className="flex items-start gap-2 group/bullish">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="group-hover/bullish:text-green-300 transition-colors">Positive economic data from major economies</span>
                </li>
                <li className="flex items-start gap-2 group/bullish">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="group-hover/bullish:text-green-300 transition-colors">Low volatility supporting risk appetite</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-700/50 rounded-lg hover:border-red-600/70 transition-all duration-300 group/bearish">
              <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                Risk Factors
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-start gap-2 group/bearish">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="group-hover/bearish:text-red-300 transition-colors">Geopolitical tensions in key regions</span>
                </li>
                <li className="flex items-start gap-2 group/bearish">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="group-hover/bearish:text-red-300 transition-colors">Potential interest rate adjustments</span>
                </li>
                <li className="flex items-start gap-2 group/bearish">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="group-hover/bearish:text-red-300 transition-colors">Supply chain disruptions</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 group">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400 group-hover:animate-bounce" />
              Trading Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300 group/eurusd hover:scale-105 transform">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-white font-medium group-hover/eurusd:text-green-300 transition-colors">EURUSD</span>
                  <p className="text-sm text-gray-400">Buy opportunity</p>
                </div>
              </div>
              <Badge className="bg-green-600 hover:bg-green-500 transition-colors animate-pulse">
                HIGH
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300 group/btc hover:scale-105 transform">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-white font-medium group-hover/btc:text-blue-300 transition-colors">BTCUSD</span>
                  <p className="text-sm text-gray-400">Momentum play</p>
                </div>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-500 transition-colors">
                MEDIUM
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg hover:from-gray-700 hover:to-gray-600 transition-all duration-300 group/spy hover:scale-105 transform">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-white font-medium group-hover/spy:text-yellow-300 transition-colors">SPY</span>
                  <p className="text-sm text-gray-400">Wait for confirmation</p>
                </div>
              </div>
              <Badge className="bg-yellow-600 hover:bg-yellow-500 transition-colors">
                LOW
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketOverview;
