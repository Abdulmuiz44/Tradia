import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

let passed = 0
let failed = 0

function check(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.log(`  ✗ ${name}`)
    failed++
  }
}

console.log('\n=== Package Structure ===')
const requiredFiles = [
  'package.json', 'README.md', 'LICENSE',
  '.github/FUNDING.yml', '.github/workflows/ci.yml',
  'src/tradia/index.ts', 'src/tradia/engine.ts', 'src/tradia/risk.ts',
  'src/tradia/journal.ts', 'src/tradia/reporting.ts', 'src/tradia/auth.ts',
  'src/tradia/billing.ts', 'src/tradia/server.ts', 'src/tradia/client.ts',
  'src/tradia/cli.ts', 'src/tradia/types.ts',
  'examples/propose-trade.ts', 'examples/risk-check.ts',
  'examples/journal-trade.ts', 'examples/sample-trade.json',
  'release-assets/SKILL.md', 'release-assets/claude-skill.md',
  'release-assets/default.cursorrules',
  'release-assets/tradia-skill-pack.json',
  'release-assets/install.sh', 'release-assets/demo.sh',
  'release-assets/demo-video-script.md',
]
for (const f of requiredFiles) {
  check(existsSync(f), `File exists: ${f}`)
}

console.log('\n=== Build Output ===')
check(existsSync('dist/index.js'), 'dist/index.js exists')
check(existsSync('dist/cli.js'), 'dist/cli.js exists')
check(existsSync('dist/types.d.ts'), 'dist/types.d.ts exists')

const cliContent = readFileSync('dist/cli.js', 'utf-8')
check(cliContent.startsWith('#!/usr/bin/env node'), 'dist/cli.js has shebang')

console.log('\n=== Config Files ===')
const funding = readFileSync('.github/FUNDING.yml', 'utf-8')
check(funding.includes('Abdulmuiz44'), 'FUNDING.yml contains Abdulmuiz44')

const readme = readFileSync('README.md', 'utf-8')
check(readme.includes('github.com/sponsors/Abdulmuiz44'), 'README contains sponsor link')

check(readme.includes('Tradia Agentic Trading OS'), 'README mentions Tradia')

console.log('\n=== CLI Tests ===')
try {
  const helpOutput = execSync('node dist/cli.js --help', { encoding: 'utf-8', timeout: 5000 })
  check(helpOutput.includes('Tradia'), 'tradia --help shows Tradia')
  check(helpOutput.includes('propose'), 'tradia --help shows propose')
  check(helpOutput.includes('risk'), 'tradia --help shows risk')
} catch (e) {
  check(false, `tradia --help: ${(e as Error).message}`)
}

try {
  const v = execSync('node dist/cli.js --version', { encoding: 'utf-8', timeout: 5000 })
  check(v.includes('0.1.0'), 'tradia --version shows 0.1.0')
} catch (e) {
  check(false, `tradia --version: ${(e as Error).message}`)
}

try {
  const r = execSync('node dist/cli.js risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350', { encoding: 'utf-8', timeout: 5000 })
  check(r.includes('approved'), 'tradia risk includes approved')
  check(r.includes('humanReviewRequired'), 'tradia risk includes humanReviewRequired')
  check(r.includes('notFinancialAdvice'), 'tradia risk includes notFinancialAdvice')
} catch (e) {
  check(false, `tradia risk: ${(e as Error).message}`)
}

try {
  const p = execSync('node dist/cli.js propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350', { encoding: 'utf-8', timeout: 5000 })
  check(p.includes('trade_proposal'), 'tradia propose includes trade_proposal')
  check(p.includes('humanReviewRequired'), 'tradia propose includes humanReviewRequired')
  check(p.includes('notFinancialAdvice'), 'tradia propose includes notFinancialAdvice')
  check(p.includes('short'), 'tradia propose direction is short')
} catch (e) {
  check(false, `tradia propose: ${(e as Error).message}`)
}

// Import compiled modules and test
console.log('\n=== Unit Tests (via dist) ===')

async function runUnitTests() {
  const mod = await import('./dist/index.js')

  // Engine
  console.log('\n--- Engine ---')
  let plan = mod.generateAgentPlan({ mode: 'proposal', symbol: 'XAUUSD', strategy: 'liquidity_sweep', timeframe: '15m', accountBalance: 500, riskPercent: 0.5 })
  check(plan.id?.startsWith('tradia_req_'), 'generateAgentPlan id')
  check(plan.object === 'tradia.agent_plan', 'generateAgentPlan object')

  let ctx = mod.analyzeMarketContext({ symbol: 'XAUUSD', timeframe: '15m', context: 'Bullish momentum' })
  check(ctx.object === 'tradia.market_analysis', 'analyzeMarketContext object')

  let sig = mod.evaluateSignal({ symbol: 'XAUUSD', strategy: 'liquidity_sweep', context: 'Price test', timeframe: '15m' })
  check(sig.object === 'tradia.signal_evaluation', 'evaluateSignal object')

  let prop = mod.proposeTrade({ symbol: 'XAUUSD', market: 'forex', strategy: 'liquidity_sweep', accountBalance: 500, riskPercent: 0.5, entry: 2365.5, stopLoss: 2372, takeProfit: 2350 })
  check(prop.object === 'tradia.trade_proposal', 'proposeTrade object')
  check(prop.result.humanReviewRequired === true, 'proposeTrade humanReviewRequired')
  check(prop.result.notFinancialAdvice === true, 'proposeTrade notFinancialAdvice')
  check(prop.result.direction === 'short', 'proposeTrade direction')
  check(prop.result.riskRewardRatio > 0, 'proposeTrade R:R > 0')
  check(prop.result.confidence >= 0, 'proposeTrade confidence')
  check(prop.result.riskWarnings.length > 0, 'proposeTrade riskWarnings')
  check(prop.result.ruleChecklist.length > 0, 'proposeTrade ruleChecklist')
  check(prop.result.reasonsFor.length > 0, 'proposeTrade reasonsFor')
  check(prop.usage.credits === 40, 'proposeTrade credits = 40')

  let jrn = mod.journalTrade({ symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350, riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38, reason: 'Sweep', rulesFollowed: true })
  check(jrn.object === 'tradia.trade_journal', 'journalTrade object')
  check(jrn.result.humanReviewRequired === true, 'journalTrade humanReviewRequired')
  check(jrn.result.notFinancialAdvice === true, 'journalTrade notFinancialAdvice')
  check(jrn.result.disciplineScore >= 0, 'journalTrade disciplineScore')
  check(jrn.result.journalEntry.includes('XAUUSD'), 'journalTrade entry has symbol')
  check(jrn.result.lesson.length > 0, 'journalTrade has lesson')

  let trades = [
    { symbol: 'XAUUSD', direction: 'long', entry: 2350, stopLoss: 2340, takeProfit: 2370, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
    { symbol: 'XAUUSD', direction: 'short', entry: 2370, stopLoss: 2380, takeProfit: 2350, riskAmount: 10, profitLoss: -10, rMultiple: -1, status: 'closed' },
    { symbol: 'EURUSD', direction: 'long', entry: 1.10, stopLoss: 1.09, takeProfit: 1.12, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
    { symbol: 'BTCUSD', direction: 'long', entry: 60000, stopLoss: 59000, takeProfit: 62000, riskAmount: 100, profitLoss: 200, rMultiple: 2, status: 'closed' },
  ]

  let perf = mod.analyzePerformance({ trades, startingBalance: 1000 })
  check(perf.result.winRate === 75, 'analyzePerformance winRate = 75')
  check(perf.result.averageR > 0, 'analyzePerformance averageR > 0')
  check(perf.result.profitFactor > 0, 'analyzePerformance profitFactor > 0')
  check(perf.result.maxDrawdown >= 0, 'analyzePerformance maxDrawdown >= 0')

  let report = mod.generatePortfolioReport({ trades, accountBalance: 1000 })
  check(report.object === 'tradia.portfolio_report', 'portfolioReport object')
  check(report.humanReviewRequired === true, 'portfolioReport humanReviewRequired')

  let update = mod.generatePublicUpdate({ label: 'TEST', trade: { symbol: 'XAUUSD' }, performance: { sevenDay: 4.2, twentyEightDay: 11.6, sinceInception: 18.4 } })
  check(update.object === 'tradia.public_update', 'publicUpdate object')
  check(update.result.post.includes('XAUUSD'), 'publicUpdate has symbol')

  let bt = mod.simulateBacktest({ strategy: 'liquidity_sweep', trades, startingBalance: 500, riskPercent: 0.5 })
  check(bt.object === 'tradia.backtest_result', 'backtest object')
  check(bt.result.endingBalance > 0, 'backtest endingBalance > 0')
  check(bt.result.equityCurve.length > 0, 'backtest equityCurve')
  check(bt.result.humanReviewRequired === true, 'backtest humanReviewRequired')

  let card = mod.generateAccountabilityCard({ tradeProposal: { symbol: 'XAUUSD' }, journalEntry: { lesson: 'Learn' }, performance: { winRate: 75 } })
  check(card.object === 'tradia.accountability_card', 'accountabilityCard object')
  check(card.result.markdown.includes('XAUUSD'), 'accountabilityCard markdown')

  let md = mod.exportMarkdown({ test: 'data' })
  check(md.result.filename === 'tradia-export.md', 'exportMarkdown filename')
  let js = mod.exportJson({ test: 'data' })
  check(js.result.filename === 'tradia-export.json', 'exportJson filename')

  // Risk
  console.log('\n--- Risk ---')
  let r1 = mod.checkRisk({ accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
  check(r1.approved === true, 'risk approves safe trade')
  check(r1.riskRewardRatio === 3, 'risk R:R = 3')
  check(r1.humanReviewRequired === true, 'risk humanReviewRequired')
  check(r1.notFinancialAdvice === true, 'risk notFinancialAdvice')

  let r2 = mod.checkRisk({ accountBalance: 500, riskPercent: 10, entry: 100, stopLoss: 98, takeProfit: 106 })
  check(r2.approved === false, 'risk rejects excessive')

  let ps = mod.calculatePositionSize(500, 0.5, 100, 98)
  check(ps.riskAmount === 2.5, 'positionSize riskAmount')
  let rr = mod.calculateRiskReward(100, 98, 106)
  check(rr.ratio === 3, 'riskReward ratio')
  let dd = mod.calculateDrawdown(450, 500)
  check(dd.drawdownPercent === 10, 'drawdown percent = 10')

  let rt = mod.detectRevengeTrading([
    { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
    { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
    { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
  ])
  check(rt.detected === true, 'revengeTrading detected')
  let ol = mod.detectOverleveraging([], 500)
  check(ol.detected === false, 'overleveraging not detected for empty')

  // Safety
  console.log('\n--- Safety ---')
  let p2 = mod.proposeTrade({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 })
  const p2str = JSON.stringify(p2).toLowerCase()
  check(!p2str.includes('guaranteed profit'), 'no guaranteed profit')
  check(!p2str.includes('risk-free'), 'no risk-free')
  check(!p2str.includes('guaranteed win'), 'no guaranteed win')

  // Journal
  console.log('\n--- Journal ---')
  let lesson = mod.extractTradeLesson({ symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350, riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38, reason: 'Plan', rulesFollowed: true })
  check(lesson.length > 0, 'extractTradeLesson')
  let m = mod.classifyTradeMistake('Entered too early')
  check(m === 'entry_timing', 'classifyTradeMistake')
  let sc = mod.scoreDiscipline({ symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350, riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38, reason: 'Clear rationale', rulesFollowed: true })
  check(sc >= 50, 'scoreDiscipline')

  // Reporting
  console.log('\n--- Reporting ---')
  check(mod.computeWinRate([]) === 0, 'winRate empty')
  check(mod.computeAverageR(trades) > 0, 'averageR')
  check(mod.computeProfitFactor(trades) > 1, 'profitFactor')
  check(mod.computeExpectancy(trades) > 0, 'expectancy')
  check(mod.computeMaxDrawdown(trades) >= 0, 'maxDrawdown')
  check(mod.computeSinceInception(trades, 1000) > 0, 'sinceInception')

  // Error classes
  console.log('\n--- Error Classes ---')
  check(new mod.TradiaError('t').name === 'TradiaError', 'TradiaError')
  check(new mod.TradiaAuthError().code === 'auth_error', 'TradiaAuthError')
  check(new mod.TradiaInsufficientCreditsError().code === 'insufficient_credits', 'TradiaInsufficientCreditsError')
  check(new mod.TradiaValidationError('v').code === 'validation_error', 'TradiaValidationError')
  check(new mod.TradiaRateLimitError().code === 'rate_limit', 'TradiaRateLimitError')
  check(new mod.TradiaRiskError('r').code === 'risk_error', 'TradiaRiskError')
  check(new mod.TradiaSafetyError('s').code === 'safety_error', 'TradiaSafetyError')
  check(new mod.TradiaUnsupportedError('u').code === 'unsupported', 'TradiaUnsupportedError')

  // Client
  console.log('\n--- Client ---')
  let client = new mod.TradiaClient()
  check(typeof client.health === 'function', 'client.health')
  check(typeof client.agent.plan === 'function', 'client.agent.plan')
  check(typeof client.risk.check === 'function', 'client.risk.check')
  check(typeof client.trade.propose === 'function', 'client.trade.propose')
  check(typeof client.trade.journal === 'function', 'client.trade.journal')
  check(typeof client.performance.analyze === 'function', 'client.performance.analyze')
  check(typeof client.publicUpdate.generate === 'function', 'client.publicUpdate.generate')
  check(typeof client.backtest.simulate === 'function', 'client.backtest.simulate')
  check(typeof client.export.markdown === 'function', 'client.export.markdown')
  check(typeof client.export.json === 'function', 'client.export.json')

  let h = await client.health()
  check(h.status === 'ok', 'client health ok')

  // Package exports
  console.log('\n--- Package ---')
  check(typeof mod.TradiaClient === 'function', 'TradiaClient exported')
  check(typeof mod.createTradiaClient === 'function', 'createTradiaClient')
  check(typeof mod.proposeTrade === 'function', 'proposeTrade exported')
  check(typeof mod.journalTrade === 'function', 'journalTrade exported')
  check(typeof mod.checkRisk === 'function', 'checkRisk exported')

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(50)}`)
  process.exit(failed > 0 ? 1 : 0)
}

runUnitTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
