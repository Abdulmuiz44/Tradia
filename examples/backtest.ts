import { simulateBacktest } from '../src/engine.js'
import type { TradePosition } from '../src/types.js'

const trades: TradePosition[] = [
  { symbol: 'XAUUSD', direction: 'long', entry: 2350, stopLoss: 2340, takeProfit: 2370, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
  { symbol: 'EURUSD', direction: 'long', entry: 1.10, stopLoss: 1.09, takeProfit: 1.12, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
  { symbol: 'BTCUSD', direction: 'short', entry: 61000, stopLoss: 61500, takeProfit: 59000, riskAmount: 50, profitLoss: -50, rMultiple: -1, status: 'closed' },
]

const result = simulateBacktest({
  strategy: 'liquidity_sweep',
  trades,
  startingBalance: 1000,
  riskPercent: 0.5,
})

console.log(JSON.stringify(result, null, 2))

// ⚠️ Past performance does not guarantee future results.
