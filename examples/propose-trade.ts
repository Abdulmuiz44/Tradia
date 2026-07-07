import { TradiaClient } from '../src/index.js'

async function main() {
  const tradia = new TradiaClient()

  const proposal = await tradia.trade.propose({
    market: 'forex',
    symbol: 'XAUUSD',
    timeframe: '15m',
    strategy: 'liquidity_sweep',
    accountBalance: 500,
    riskPercent: 0.5,
    entry: 2365.5,
    stopLoss: 2372.0,
    takeProfit: 2350.0,
    marketContext: 'Price swept previous high and rejected near resistance.',
  })

  console.log(JSON.stringify(proposal, null, 2))

  // ⚠️ Not financial advice. Human review required before acting on any trade.
}

main().catch(console.error)
