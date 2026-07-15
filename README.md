# Tradia Agentic Trading OS

**Your trading journal, risk engine, and proposal system — in one CLI and SDK.**

Stop spreadsheeting your trades. Tradia gives you structured proposals, position sizing, risk checks, journals, backtests, and accountability reports from your terminal.

```bash
npm install @talocode/tradia
```

**⚠️ Not financial advice. Human review required before acting on any trade.**

---

## Why Tradia?

Every trader hits the same wall: **you take a trade, forget why, and repeat the same mistake.** Tradia codifies your process so every decision is planned, reviewed, and learned from.

| Without Tradia | With Tradia |
|----------------|-------------|
| Gut-feel entries | Structured proposals with invalidation criteria |
| Forgot why you entered | Journals with lessons and discipline scores |
| No idea if your strategy works | Backtest equity curves, win rates, drawdowns |
| No accountability | Public updates explaining your trades |

---

## One workflow, four commands

```bash
# 1. Propose a trade — get a structured plan with risk baked in
tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350

# 2. Journal the result — capture the lesson
tradia journal --file trade-result.json

# 3. Analyze your performance
tradia performance --file trades.json

# 4. Share accountability
tradia public-update --file performance-report.json
```

---

## What's inside

| Capability | What it does |
|------------|-------------|
| **Proposal Engine** | Generates structured trade proposals with entry, stop, target, invalidation, and risk-reward |
| **Risk Engine** | Position sizing, max drawdown, exposure limits, revenge trading detection |
| **Journals** | Trade entries with lessons, discipline scores, emotional state tracking |
| **Performance Analysis** | Win rate, profit factor, expectancy, max drawdown, R-multiples |
| **Backtest Simulation** | Equity curves, Monte Carlo, strategy comparison |
| **Accountability Cards** | Public-facing trade explanations for transparency |
| **Portfolio Reports** | Account-level performance summaries across all positions |
| **Exports** | Markdown and JSON for sharing or further analysis |

---

## SDK (in your code)

```typescript
import { TradiaClient } from '@talocode/tradia'

const tradia = new TradiaClient()

// Propose a trade with full risk analysis
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
// → { entry, stopLoss, takeProfit, riskReward, positionSize, maxDrawdown, invalidation }

// Journal the outcome
const journal = await tradia.trade.journal({
  trade: proposal,
  outcome: { pnl: 45.20, closed: true },
  lessons: ['Waited for confirmation — good discipline'],
})
// → { disciplineScore, lessons, emotionalState }

// Analyze performance over time
const analysis = await tradia.performance.analyze({
  trades: [journal, journal2, journal3],
  accountBalance: 500,
})
// → { winRate, profitFactor, expectancy, maxDrawdown }
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `tradia propose` | Generate a structured trade proposal |
| `tradia risk` | Check risk parameters and position sizing |
| `tradia journal` | Create a trade journal entry |
| `tradia performance` | Analyze trading performance |
| `tradia backtest` | Run a backtest simulation |
| `tradia portfolio` | Generate a portfolio report |
| `tradia public-update` | Generate a public accountability update |
| `tradia export` | Export data as markdown or JSON |

---

## API Server

```bash
# Start local server
PORT=3070 npx tradia-server

# Use any endpoint
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

---

## Talocode Cloud

```typescript
import { TradiaClient } from '@talocode/tradia'

const tradia = new TradiaClient({
  apiKey: process.env.TALOCODE_API_KEY,
  useCloud: true,
})
```

All 14 endpoints available via Talocode Cloud API at `api.talocode.site`.

---

## Safety

Tradia v0.1 is **agentic trading intelligence**, not live autonomous execution.

- No real trade execution — does not connect to any broker
- No financial advice — all outputs are educational analysis
- No guaranteed profits — past performance does not guarantee future results
- Human review required before action

---

## Talocode ecosystem

Part of **[Talocode](https://github.com/talocode)** — open-source workflow layers for builders. Explore sibling projects:

| Project | What it is |
|---------|------------|
| **[ScreenLane](https://github.com/talocode/screenlane)** | Screen-aware voice command layer |
| **[Tera](https://github.com/talocode/tera)** | AI chat & assistant |
| **[Codra](https://github.com/talocode/codra)** | Local coding agent |
| **[GateLane](https://github.com/talocode/gatelane)** | MCP gateway & agent tool control plane |
| **[ContextLane](https://github.com/talocode/contextlane)** | Context ingestion for persistent agents |
| **[MemoryLane](https://github.com/talocode/memorylane)** | Persistent agent memory |
| **[SignalLane](https://github.com/talocode/signallane)** | X growth intelligence |
| **[ReplyLane](https://github.com/talocode/replylane)** | X reply opportunity intelligence |
| **[CrawlerLane](https://github.com/talocode/crawlerlane)** | Crawler / SEO intelligence |
| **[WebDataLane](https://github.com/talocode/webdatalane)** | Web extraction to structured data |
| **[SearchLane](https://github.com/talocode/searchlane)** | Search layer for agents |
| **[InvoiceLane](https://github.com/talocode/invoicelane)** | Invoicing tools |
| **[GeoLane](https://github.com/talocode/geolane)** | Geo intelligence |
| **[UgcLane](https://github.com/talocode/ugclane)** | UGC workflows |
| **[OpenSourceLane](https://github.com/talocode/opensourcelane)** | Open-source distribution tools |
| **[StackLane](https://github.com/talocode/stacklane)** | Builder stack platform |
| **[Tradia](https://github.com/talocode/tradia)** | Trading intelligence **(this repo)** |
| **[Agent Browser](https://github.com/talocode/agent-browser)** | Browser automation for agents |
| **[Talocode](https://github.com/talocode/talocode)** | Org home & control plane |
| **[Skills](https://github.com/talocode/skills)** | Shared agent skills |
| **[X Agent](https://github.com/talocode/x-agent)** | X automation agent |
| **[LaunchPix](https://github.com/talocode/launchpix)** | Launch tooling |
| **[ForgeCAD](https://github.com/talocode/forgecad)** | CAD workflows |
| **[WorkLane](https://github.com/talocode/worklane)** | Work automation |
| **[ClipLoop](https://github.com/talocode/cliploop)** | Clip / video loops |

MCP-compatible agents integrate via each product's MCP server where available ([Model Context Protocol](https://modelcontextprotocol.io/)).

More: [github.com/talocode](https://github.com/talocode) · [talocode.site](https://talocode.site) · [docs.talocode.site](https://docs.talocode.site)

## License

MIT
