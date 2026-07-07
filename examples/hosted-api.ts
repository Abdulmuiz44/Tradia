// Hosted Talocode Cloud usage example
// Requires TALOCODE_API_KEY environment variable
//
// Usage:
//   TALOCODE_API_KEY=your_key npx tsx examples/hosted-api.ts

import { TradiaClient } from '../src/index.js'

const apiKey = process.env.TALOCODE_API_KEY

if (!apiKey) {
  console.error('TALOCODE_API_KEY is required for hosted API usage.')
  console.error('Set it as an environment variable or pass it to the client.')
  process.exit(1)
}

const tradia = new TradiaClient({
  apiKey,
  baseUrl: process.env.TALOCODE_BASE_URL || 'https://api.talocode.site',
  useCloud: true,
})

async function main() {
  // The proposal will be charged 40 Talocode Cloud credits
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
  // ⚠️ Not financial advice. Human review required.
}

main().catch(console.error)
