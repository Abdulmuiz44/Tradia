import { generatePublicUpdate } from '../src/engine.js'

const update = generatePublicUpdate({
  label: 'TRADIA AGENT UPDATE',
  trade: {
    symbol: 'XAUUSD',
    direction: 'short',
    riskRewardRatio: 2.38,
    thesis: 'Liquidity sweep and rejection at resistance.',
  },
  performance: {
    sevenDay: 4.2,
    twentyEightDay: 11.6,
    threeSixtyFiveDay: null,
    sinceInception: 18.4,
  },
  platform: 'x',
  tone: 'transparent',
})

console.log(JSON.stringify(update, null, 2))

// ⚠️ Educational update only. Not financial advice. Human review required.
