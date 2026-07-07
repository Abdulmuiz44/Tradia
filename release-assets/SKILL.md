# Tradia Agentic Trading OS Skill

## Description
Tradia helps traders and trading agents plan, justify, risk-check, journal and report every trade before and after execution.

## When to Use This Skill
- You need to generate a structured trade proposal with risk analysis
- You want to risk-check a trade idea before considering it
- You need to journal a completed trade for personal review
- You want to run a backtest simulation on historical trades
- You need to generate a public accountability update
- You want to analyze trading performance

## Product Modes

### Observe Mode
Analyze trades, market context, risk and performance without generating proposals.

### Proposal Mode
Generate structured trade proposals with:
- Thesis and setup description
- Entry, stop loss, take profit levels
- Invalidation conditions
- Risk-reward ratio
- Position size estimate
- Rule checklist
- Reasons for and against
- Risk warnings

### Journal Mode
Create journal entries from executed trades:
- Trade details and P&L
- Lessons learned
- Discipline score
- Mistake classification
- What worked / what to improve

### Paper / Simulation Mode
Simulate planned trades without live execution.

### Accountability Mode
Generate public updates explaining trades and performance:
- Why the trade was taken
- Result in R / % / $
- 7d / 28d / 365d performance
- Since inception performance
- Lessons learned

## Risk-First Workflow
1. Generate a trade proposal
2. Run risk check on the parameters
3. Review rule checklist and warnings
4. If paper trading, run backtest simulation
5. After trade, create journal entry
6. Periodically generate performance reports

## Safety Rules
- Always include `humanReviewRequired: true` in all outputs
- Always include `notFinancialAdvice: true` in all outputs
- Never claim guaranteed profits
- Never provide financial advice
- Never recommend live autonomous execution
- Always include risk warnings
- Frame outputs as educational analysis

## CLI Usage
```bash
# Propose a trade
tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350

# Risk check
tradia risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350

# Journal a trade
tradia journal --file trade.json

# Performance analysis
tradia performance --file trades.json --balance 1000
```

## SDK Usage
```typescript
import { TradiaClient } from '@talocode/tradia'

const tradia = new TradiaClient()
const proposal = await tradia.trade.propose({
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

## Support
https://github.com/sponsors/Abdulmuiz44
