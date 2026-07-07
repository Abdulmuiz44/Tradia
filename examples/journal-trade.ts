import { journalTrade } from '../src/engine.js'

const journal = journalTrade({
  symbol: 'XAUUSD',
  direction: 'short',
  entry: 2365.5,
  exit: 2350.0,
  riskAmount: 2.5,
  profitLoss: 5.95,
  rMultiple: 2.38,
  reason: 'Liquidity sweep and rejection. Followed all rules.',
  rulesFollowed: true,
})

console.log(JSON.stringify(journal, null, 2))

// ⚠️ Not financial advice. Educational journal entry.
