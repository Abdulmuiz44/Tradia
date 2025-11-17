/**
 * src/lib/performanceSummary.ts
 * Performance Summary Calculator
 * Computes trading metrics from last N trades
 */

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  lot_size?: number; // For Forex
  pnl?: number;
  timestamp: string;
  exit_timestamp?: string;
  status: 'open' | 'closed' | 'cancelled';
  metadata?: {
    entry_time?: string;
    exit_time?: string;
    duration_minutes?: number;
  };
}

export interface PerformanceSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWinSize: number;
  avgLossSize: number;
  avgRR: number; // Risk:Reward ratio
  profitFactor: number;
  totalPnL: number;
  avgDuration: number; // in minutes
  biggestDrawdown: number; // as percentage
  tradesByPair: Record<string, number>;
  bestPair: string | null;
  worstPair: string | null;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgTradesPerDay: number;
  marketBreakdown?: {
    forex?: { trades: number; winRate: number; pnl: number };
    crypto?: { trades: number; winRate: number; pnl: number };
  };
}

/**
 * Compute performance summary from trades
 */
export function computePerformanceSummary(trades: Trade[], limitToLast?: number): PerformanceSummary {
  // Sort trades by timestamp (most recent first) and limit if needed
  const sortedTrades = [...trades]
    .filter(t => t.status === 'closed' && t.pnl !== undefined)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const recentTrades = limitToLast ? sortedTrades.slice(0, limitToLast) : sortedTrades;

  if (recentTrades.length === 0) {
    return getEmptySummary();
  }

  // Calculate basic metrics
  const totalTrades = recentTrades.length;
  const winningTrades = recentTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = recentTrades.filter(t => (t.pnl || 0) < 0);

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const totalWinAmount = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLossAmount = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

  const avgWinSize = winCount > 0 ? totalWinAmount / winCount : 0;
  const avgLossSize = lossCount > 0 ? totalLossAmount / lossCount : 0;

  const avgRR = avgLossSize > 0 ? avgWinSize / avgLossSize : 0;
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;

  const totalPnL = recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Calculate average duration
  const tradesWithDuration = recentTrades.filter(t => {
    if (t.metadata?.duration_minutes) return true;
    if (t.exit_timestamp && t.timestamp) {
      return true;
    }
    return false;
  });

  let avgDuration = 0;
  if (tradesWithDuration.length > 0) {
    const durations = tradesWithDuration.map(t => {
      if (t.metadata?.duration_minutes) {
        return t.metadata.duration_minutes;
      }
      if (t.exit_timestamp && t.timestamp) {
        const duration = new Date(t.exit_timestamp).getTime() - new Date(t.timestamp).getTime();
        return duration / 1000 / 60; // Convert to minutes
      }
      return 0;
    });
    avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  // Calculate biggest drawdown
  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trade of recentTrades.reverse()) {
    runningPnL += trade.pnl || 0;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = ((peak - runningPnL) / Math.max(peak, 1)) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Count trades by pair
  const tradesByPair: Record<string, { count: number; pnl: number; wins: number }> = {};
  for (const trade of recentTrades) {
    if (!tradesByPair[trade.symbol]) {
      tradesByPair[trade.symbol] = { count: 0, pnl: 0, wins: 0 };
    }
    tradesByPair[trade.symbol].count++;
    tradesByPair[trade.symbol].pnl += trade.pnl || 0;
    if ((trade.pnl || 0) > 0) {
      tradesByPair[trade.symbol].wins++;
    }
  }

  const pairCounts = Object.entries(tradesByPair)
    .reduce((acc, [pair, data]) => ({ ...acc, [pair]: data.count }), {} as Record<string, number>);

  // Find best and worst pairs
  const sortedPairs = Object.entries(tradesByPair)
    .filter(([_, data]) => data.count >= 3) // Need at least 3 trades for meaningful comparison
    .sort((a, b) => b[1].pnl - a[1].pnl);

  const bestPair = sortedPairs.length > 0 ? sortedPairs[0][0] : null;
  const worstPair = sortedPairs.length > 0 ? sortedPairs[sortedPairs.length - 1][0] : null;

  // Calculate consecutive wins/losses
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentStreak = 0;
  let currentIsWin = false;

  for (const trade of recentTrades) {
    const isWin = (trade.pnl || 0) > 0;
    
    if (currentStreak === 0) {
      currentStreak = 1;
      currentIsWin = isWin;
    } else if (isWin === currentIsWin) {
      currentStreak++;
    } else {
      if (currentIsWin) {
        consecutiveWins = Math.max(consecutiveWins, currentStreak);
      } else {
        consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
      }
      currentStreak = 1;
      currentIsWin = isWin;
    }
  }

  // Final check for streak
  if (currentIsWin) {
    consecutiveWins = Math.max(consecutiveWins, currentStreak);
  } else {
    consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
  }

  // Calculate average trades per day
  const timestamps = recentTrades.map(t => new Date(t.timestamp).getTime());
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);
  const daysCovered = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24);
  const avgTradesPerDay = daysCovered > 0 ? totalTrades / daysCovered : totalTrades;

  // Market breakdown (Forex vs Crypto)
  const forexPairs = recentTrades.filter(t => isForexPair(t.symbol));
  const cryptoPairs = recentTrades.filter(t => isCryptoPair(t.symbol));

  const marketBreakdown: PerformanceSummary['marketBreakdown'] = {};

  if (forexPairs.length > 0) {
    const forexWins = forexPairs.filter(t => (t.pnl || 0) > 0).length;
    const forexPnL = forexPairs.reduce((sum, t) => sum + (t.pnl || 0), 0);
    marketBreakdown.forex = {
      trades: forexPairs.length,
      winRate: (forexWins / forexPairs.length) * 100,
      pnl: forexPnL,
    };
  }

  if (cryptoPairs.length > 0) {
    const cryptoWins = cryptoPairs.filter(t => (t.pnl || 0) > 0).length;
    const cryptoPnL = cryptoPairs.reduce((sum, t) => sum + (t.pnl || 0), 0);
    marketBreakdown.crypto = {
      trades: cryptoPairs.length,
      winRate: (cryptoWins / cryptoPairs.length) * 100,
      pnl: cryptoPnL,
    };
  }

  return {
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    winRate,
    avgWinSize,
    avgLossSize,
    avgRR,
    profitFactor,
    totalPnL,
    avgDuration,
    biggestDrawdown: maxDrawdown,
    tradesByPair: pairCounts,
    bestPair,
    worstPair,
    consecutiveWins,
    consecutiveLosses,
    avgTradesPerDay,
    marketBreakdown: Object.keys(marketBreakdown).length > 0 ? marketBreakdown : undefined,
  };
}

/**
 * Check if symbol is a Forex pair
 */
function isForexPair(symbol: string): boolean {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  const forexPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF',
    'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD',
    'EURCHF', 'AUDNZD', 'NZDJPY', 'GBPAUD', 'GBPCAD', 'EURNZD',
    'AUDCAD', 'GBPCHF', 'EURCAD', 'CADJPY', 'CHFJPY', 'AUDCHF',
  ];
  return forexPairs.some(pair => normalizedSymbol.includes(pair));
}

/**
 * Check if symbol is a Crypto pair
 */
function isCryptoPair(symbol: string): boolean {
  const normalizedSymbol = symbol.toUpperCase();
  const cryptoAssets = [
    'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL',
    'DOGE', 'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'UNI', 'ATOM',
  ];
  return cryptoAssets.some(asset => normalizedSymbol.includes(asset));
}

/**
 * Get empty summary for when no trades exist
 */
function getEmptySummary(): PerformanceSummary {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWinSize: 0,
    avgLossSize: 0,
    avgRR: 0,
    profitFactor: 0,
    totalPnL: 0,
    avgDuration: 0,
    biggestDrawdown: 0,
    tradesByPair: {},
    bestPair: null,
    worstPair: null,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    avgTradesPerDay: 0,
  };
}

/**
 * Format summary as readable text
 */
export function formatSummaryText(summary: PerformanceSummary): string {
  let text = `Performance Summary (Last ${summary.totalTrades} trades):\n\n`;
  text += `Win Rate: ${summary.winRate.toFixed(1)}% (${summary.winningTrades}W / ${summary.losingTrades}L)\n`;
  text += `Profit Factor: ${summary.profitFactor.toFixed(2)}\n`;
  text += `Avg R:R: ${summary.avgRR.toFixed(2)}\n`;
  text += `Total P&L: $${summary.totalPnL.toFixed(2)}\n`;
  text += `Avg Duration: ${summary.avgDuration.toFixed(0)} minutes\n`;
  text += `Max Drawdown: ${summary.biggestDrawdown.toFixed(1)}%\n\n`;

  if (summary.bestPair) {
    text += `Best Pair: ${summary.bestPair}\n`;
  }
  if (summary.worstPair && summary.worstPair !== summary.bestPair) {
    text += `Worst Pair: ${summary.worstPair}\n`;
  }

  if (summary.marketBreakdown) {
    text += `\nMarket Breakdown:\n`;
    if (summary.marketBreakdown.forex) {
      text += `- Forex: ${summary.marketBreakdown.forex.trades} trades, ${summary.marketBreakdown.forex.winRate.toFixed(1)}% WR, $${summary.marketBreakdown.forex.pnl.toFixed(2)} P&L\n`;
    }
    if (summary.marketBreakdown.crypto) {
      text += `- Crypto: ${summary.marketBreakdown.crypto.trades} trades, ${summary.marketBreakdown.crypto.winRate.toFixed(1)}% WR, $${summary.marketBreakdown.crypto.pnl.toFixed(2)} P&L\n`;
    }
  }

  return text;
}
