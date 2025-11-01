// src/lib/sampleTrades.ts
import { Trade } from '@/types/trade';

// Generate realistic sample trades for demo purposes
export const generateSampleTrades = (): Trade[] => {
  const now = new Date();
  const trades: Trade[] = [];

  // Sample data with various instruments, outcomes, and timeframes
  const sampleData = [
    {
      symbol: 'EUR/USD',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
      closeTime: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000).toISOString(), // 24 days ago
      lotSize: 0.5,
      entryPrice: 1.0850,
      exitPrice: 1.0920,
      pnl: 175,
      outcome: 'Win',
      duration: '4h 32m',
      strategy: 'Breakout',
      emotion: 'confident',
      reasonForTrade: 'Strong bullish momentum after breaking resistance',
      journalNotes: 'Perfect entry on the breakout. Held through minor pullback and exited at target.',
      notes: 'Great trade setup with clear risk management.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.5,
      pinned: false,
      tags: ['breakout', 'momentum'],
      reviewed: true,
    },
    {
      symbol: 'BTC/USDT',
      direction: 'Sell',
      orderType: 'Limit Order',
      openTime: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000).toISOString(),
      lotSize: 0.1,
      entryPrice: 43250,
      exitPrice: 42800,
      pnl: 45,
      outcome: 'Win',
      duration: '2h 15m',
      strategy: 'Support/Resistance',
      emotion: 'calm',
      reasonForTrade: 'Rejected resistance level, expecting pullback to support',
      journalNotes: 'Good entry on rejection candle. Market moved as expected.',
      notes: 'Crypto markets can be volatile, but this was a clean setup.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0.1,
      swap: 0,
      pinned: false,
      tags: ['resistance', 'rejection'],
      reviewed: true,
    },
    {
      symbol: 'GBP/USD',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      lotSize: 1.0,
      entryPrice: 1.2650,
      exitPrice: 1.2580,
      pnl: -210,
      outcome: 'Loss',
      duration: '6h 45m',
      strategy: 'Trend Follow',
      emotion: 'frustrated',
      reasonForTrade: 'Following the uptrend, but market reversed unexpectedly',
      journalNotes: 'Entry was good but market news caused sudden reversal. Should have exited earlier.',
      notes: 'Need to be more responsive to news events. Risk management was good though.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.3,
      pinned: false,
      tags: ['trend', 'news'],
      reviewed: true,
    },
    {
      symbol: 'ETH/USDT',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lotSize: 0.2,
      entryPrice: 2850,
      exitPrice: 2920,
      pnl: 140,
      outcome: 'Win',
      duration: '3h 20m',
      strategy: 'Reversal',
      emotion: 'excited',
      reasonForTrade: 'Double bottom pattern forming, bullish divergence on RSI',
      journalNotes: 'Perfect reversal trade. Waited for confirmation and got good reward.',
      notes: 'Technical analysis paid off. Risk-reward ratio was excellent.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0.05,
      swap: 0,
      pinned: false,
      tags: ['reversal', 'pattern'],
      reviewed: true,
    },
    {
      symbol: 'EUR/USD',
      direction: 'Sell',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      lotSize: 0.3,
      entryPrice: 1.0780,
      exitPrice: 1.0810,
      pnl: -90,
      outcome: 'Loss',
      duration: '1h 30m',
      strategy: 'Scalping',
      emotion: 'impatient',
      reasonForTrade: 'Quick scalp on overbought conditions',
      journalNotes: 'Got stopped out quickly. Market noise was too high for scalping.',
      notes: 'Scalping requires very tight spreads. Better to avoid during high volatility.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.2,
      pinned: false,
      tags: ['scalping', 'noise'],
      reviewed: true,
    },
    {
      symbol: 'BTC/USDT',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lotSize: 0.05,
      entryPrice: 41800,
      exitPrice: 42200,
      pnl: 20,
      outcome: 'Win',
      duration: '8h 10m',
      strategy: 'Support Bounce',
      emotion: 'neutral',
      reasonForTrade: 'Buying at strong support level with bullish engulfing pattern',
      journalNotes: 'Conservative position size. Market bounced as expected but took longer than anticipated.',
      notes: 'Patience is key in crypto trading. Small wins add up.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0.02,
      swap: 0,
      pinned: false,
      tags: ['support', 'bounce'],
      reviewed: true,
    },
    {
      symbol: 'USD/JPY',
      direction: 'Sell',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
      lotSize: 0.8,
      entryPrice: 147.50,
      exitPrice: 147.20,
      pnl: 240,
      outcome: 'Win',
      duration: '4h 15m',
      strategy: 'Momentum',
      emotion: 'focused',
      reasonForTrade: 'Strong bearish momentum after economic data',
      journalNotes: 'Data release created excellent momentum. Exited at first target.',
      notes: 'Economic data trading can be very profitable when timed correctly.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.4,
      pinned: false,
      tags: ['momentum', 'data'],
      reviewed: true,
    },
    {
      symbol: 'EUR/USD',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 15 * 60 * 60 * 1000).toISOString(), // 15 hours ago
      closeTime: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
      lotSize: 0.2,
      entryPrice: 1.0820,
      exitPrice: 1.0790,
      pnl: -60,
      outcome: 'Loss',
      duration: '5h 0m',
      strategy: 'Range Trading',
      emotion: 'confused',
      reasonForTrade: 'Trading within established range, expecting bounce from support',
      journalNotes: 'Range broke lower unexpectedly. Should have exited when support failed.',
      notes: 'Ranges can break. Always have a plan for when the range fails.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.1,
      pinned: false,
      tags: ['range', 'support'],
      reviewed: true,
    },
    {
      symbol: 'ETH/USDT',
      direction: 'Sell',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      closeTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      lotSize: 0.15,
      entryPrice: 2980,
      exitPrice: 2950,
      pnl: 45,
      outcome: 'Win',
      duration: '3h 0m',
      strategy: 'Overbought Reversal',
      emotion: 'satisfied',
      reasonForTrade: 'RSI overbought, bearish divergence, short at resistance',
      journalNotes: 'Good timing on the reversal. Risk management was perfect.',
      notes: 'Technical indicators combined with price action give high probability setups.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0.04,
      swap: 0,
      pinned: false,
      tags: ['reversal', 'rsi'],
      reviewed: true,
    },
    {
      symbol: 'GBP/USD',
      direction: 'Buy',
      orderType: 'Market Execution',
      openTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      closeTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
      lotSize: 0.4,
      entryPrice: 1.2720,
      exitPrice: 1.2750,
      pnl: 120,
      outcome: 'Win',
      duration: '1h 30m',
      strategy: 'Breakout',
      emotion: 'excited',
      reasonForTrade: 'Clean breakout above consolidation, strong volume',
      journalNotes: 'Perfect breakout trade. Let profits run, excellent discipline.',
      notes: 'Breakouts with volume confirmation are high probability trades.',
      beforeScreenshotUrl: '',
      afterScreenshotUrl: '',
      commission: 0,
      swap: -0.2,
      pinned: false,
      tags: ['breakout', 'volume'],
      reviewed: true,
    },
  ];

  // Convert to Trade objects with IDs and other required fields
  sampleData.forEach((data, index) => {
    const trade: Trade = {
      id: `sample_trade_${index + 1}`,
      user_id: 'sample_user', // Will be replaced with actual user ID when loaded
      symbol: data.symbol,
      direction: data.direction as 'Buy' | 'Sell',
      orderType: data.orderType,
      openTime: data.openTime,
      closeTime: data.closeTime,
      session: 'London', // Default session
      lotSize: data.lotSize,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      stopLossPrice: data.entryPrice * (data.direction === 'Buy' ? 0.98 : 1.02), // 2% stop
      takeProfitPrice: data.entryPrice * (data.direction === 'Buy' ? 1.04 : 0.96), // 4% target
      pnl: data.pnl,
      profitLoss: data.outcome === 'Win' ? 'Profit' : 'Loss',
      resultRR: data.outcome === 'Win' ? 2.0 : -1.0, // Simplified RR calculation
      rr: '2:1',
      outcome: data.outcome as 'Win' | 'Loss' | 'Breakeven',
      duration: data.duration,
      reasonForTrade: data.reasonForTrade,
      emotion: data.emotion as any,
      journalNotes: data.journalNotes,
      notes: data.notes,
      strategy: data.strategy,
      beforeScreenshotUrl: data.beforeScreenshotUrl,
      afterScreenshotUrl: data.afterScreenshotUrl,
      commission: data.commission,
      swap: data.swap,
      pinned: data.pinned,
      tags: data.tags,
      reviewed: data.reviewed,
      created_at: data.openTime,
      updated_at: data.closeTime,
    };

    trades.push(trade);
  });

  return trades;
};

// Check if user has seen sample data before
export const hasSeenSampleData = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tradia_sample_data_loaded') === 'true';
};

// Mark that user has seen sample data
export const markSampleDataAsSeen = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tradia_sample_data_loaded', 'true');
};

// Check if user should load sample data
export const shouldLoadSampleData = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasSeen = hasSeenSampleData();
  const hasRealTrades = localStorage.getItem('trade-history') !== null;
  return !hasSeen && !hasRealTrades;
};
