# Tradia — Claude Code Skill

## Description
Agentic trading intelligence for trade proposals, risk checks, journals, performance reports and public accountability updates. Use Tradia to analyze, plan, and review trades safely.

## When to Use
- A user asks you to analyze a trade idea
- A user wants to check risk on a potential trade
- A user wants to journal a completed trade
- A user wants a performance review of their trading
- A user asks for a public accountability post about trading

## How to Use

### 1. Generate a trade proposal
When a user says "analyze this trade idea" or "help me plan a trade", use the SDK:
```typescript
import { proposeTrade } from '@talocode/tradia'

const proposal = proposeTrade({
  symbol: 'XAUUSD',
  market: 'forex',
  accountBalance: 500,
  riskPercent: 0.5,
  strategy: 'liquidity_sweep',
  entry: 2365.5,
  stopLoss: 2372,
  takeProfit: 2350,
})
```

### 2. Check risk
```typescript
import { checkRiskInternal } from '@talocode/tradia'

const risk = checkRiskInternal({
  accountBalance: 500,
  riskPercent: 1,
  entry: 100,
  stopLoss: 98,
  takeProfit: 106,
})
```

### 3. Journal a trade
```typescript
import { journalTrade } from '@talocode/tradia'

const journal = journalTrade({
  symbol: 'XAUUSD',
  direction: 'short',
  entry: 2365.5,
  exit: 2350,
  riskAmount: 2.5,
  profitLoss: 5.95,
  rMultiple: 2.38,
  reason: 'Liquidity sweep and rejection',
  rulesFollowed: true,
})
```

## Safety Rules
- All trade outputs must include `humanReviewRequired: true`
- All trade outputs must include `notFinancialAdvice: true`
- Never execute live trades
- Never claim guaranteed profits
- Never provide financial advice
- Frame everything as educational analysis
- Include risk warnings in all trading analysis

## Not Supported in v0.1
- Live order execution
- Broker connections
- Real-time price data
- Autonomous trading
