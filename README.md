# Tradia Agentic Trading OS

Agentic trading intelligence for trade proposals, risk checks, journals, performance reports and public accountability updates.

**⚠️ Not financial advice. Human review required before acting on any trade.**

## Features

- **Proposal Mode** — Generate structured trade proposals with invalidation and risk
- **Risk Engine** — Position sizing, risk-reward, drawdown, exposure, revenge trading detection
- **Journal Mode** — Create trade journal entries with lessons and discipline scores
- **Performance Analysis** — Win rate, profit factor, expectancy, max drawdown, R-multiples
- **Backtest Simulation** — Equity curves, win rates, drawdown analysis
- **Public Accountability** — Generate public updates explaining trades and performance
- **Portfolio Reports** — Account-level performance summaries
- **CLI** — Full command-line interface for local usage
- **API Server** — REST API for hosted and local usage
- **SDK** — TypeScript client for Node.js applications
- **MCP Tools** — Model Context Protocol tools for AI agent integration

## Supported Markets

`forex` · `crypto` · `stocks` · `indices` · `commodities` · `prop_firm_account` · `paper_account`

## Supported Strategies

`liquidity_sweep` · `trend_continuation` · `breakout_retest` · `support_resistance` · `mean_reversion` · `momentum` · `news_avoidance` · `custom`

## Installation

```bash
npm install @talocode/tradia
```

## CLI Usage

```bash
# Generate a trade proposal
tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350

# Check risk parameters
tradia risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350

# Journal a trade
tradia journal --file trade.json

# Run a backtest
tradia backtest --file trades.json --balance 500 --risk 0.5

# Generate a public accountability update
tradia public-update --file trade-result.json
```

## SDK Usage

```typescript
import { TradiaClient } from '@talocode/tradia'

const tradia = new TradiaClient()

// Local mode (no API key required)
const proposal = await tradia.trade.propose({
  market: 'forex',
  symbol: 'XAUUSD',
  accountBalance: 500,
  riskPercent: 0.5,
  strategy: 'liquidity_sweep',
  entry: 2365.5,
  stopLoss: 2372,
  takeProfit: 2350,
})

console.log(proposal)
```

## API Server

```bash
# Start the server
PORT=3070 npx tradia-server

# Health check
curl http://localhost:3070/health

# Trade proposal
curl -X POST http://localhost:3070/v1/tradia/trade/propose \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "XAUUSD",
    "market": "forex",
    "accountBalance": 500,
    "riskPercent": 0.5,
    "entry": 2365.5,
    "stopLoss": 2372,
    "takeProfit": 2350
  }'
```

## API Routes

| Method | Path | Description | Credits |
|--------|------|-------------|---------|
| GET | `/health` | Health check | — |
| GET | `/v1/tradia/health` | Health check | — |
| POST | `/v1/tradia/agent/plan` | Generate agent plan | 40 |
| POST | `/v1/tradia/market/analyze` | Analyze market context | 30 |
| POST | `/v1/tradia/signal/evaluate` | Evaluate a signal | 30 |
| POST | `/v1/tradia/risk/check` | Check risk parameters | 20 |
| POST | `/v1/tradia/trade/propose` | Generate trade proposal | 40 |
| POST | `/v1/tradia/trade/journal` | Create journal entry | 25 |
| POST | `/v1/tradia/portfolio/report` | Portfolio report | 50 |
| POST | `/v1/tradia/performance/analyze` | Performance analysis | 35 |
| POST | `/v1/tradia/public-update/generate` | Public accountability update | 30 |
| POST | `/v1/tradia/backtest/simulate` | Backtest simulation | 60 |
| POST | `/v1/tradia/accountability/card` | Accountability card | 25 |
| POST | `/v1/tradia/export/markdown` | Export as markdown | 5 |
| POST | `/v1/tradia/export/json` | Export as JSON | 5 |

## Talocode Cloud Usage

```typescript
import { TradiaClient } from '@talocode/tradia'

const tradia = new TradiaClient({
  apiKey: process.env.TALOCODE_API_KEY,
  useCloud: true,
})

const proposal = await tradia.trade.propose({
  market: 'forex',
  symbol: 'XAUUSD',
  accountBalance: 500,
  riskPercent: 0.5,
  strategy: 'liquidity_sweep',
  entry: 2365.5,
  stopLoss: 2372,
  takeProfit: 2350,
})
```

## Safety Boundaries

Tradia v0.1 is **agentic trading intelligence**, not live autonomous execution.

- **No real trade execution** — v0.1 does not connect to any broker
- **No financial advice** — All outputs are educational analysis
- **No guaranteed profits** — Past performance does not guarantee future results
- **Human review required** — Every output requires human review before action
- **Proposal/simulation mode only** — No live order placement
- **Risk warnings included** — Every output includes risk disclaimers

## Support

Open-source Talocode products are built and maintained by Abdulmuiz Adeyemo.

Sponsor the work: https://github.com/sponsors/Abdulmuiz44

## License

MIT
