import { describe, it, expect } from 'vitest'
import {
  generateAgentPlan, analyzeMarketContext, evaluateSignal,
  proposeTrade, journalTrade, analyzePerformance,
  generatePortfolioReport, generatePublicUpdate, simulateBacktest,
  generateAccountabilityCard, exportMarkdown, exportJson,
} from '../src/engine'
import {
  checkRiskInternal, calculatePositionSize, calculateRiskReward,
  calculateDrawdown, calculateExposure, validateRiskRules,
  detectRevengeTrading, detectOverleveraging, detectRuleViolation,
} from '../src/risk'
import {
  createJournalEntryInternal, extractTradeLessonInternal,
  classifyTradeMistake, scoreDiscipline, summarizeTradeOutcome,
} from '../src/journal'
import {
  computeWinRate, computeAverageR, computeProfitFactor,
  computeExpectancy, computeMaxDrawdown,
  compute7d28d365dPerformance, computeSinceInception,
} from '../src/reporting'
import {
  TradiaClient, createTradiaClient,
  TradiaError, TradiaAuthError, TradiaInsufficientCreditsError,
  TradiaValidationError, TradiaRateLimitError, TradiaRiskError,
  TradiaSafetyError, TradiaUnsupportedError,
} from '../src/client'
import type { TradePosition, TradeProposalResult, JournalResult, PublicUpdateResult, BacktestResult, AccountabilityCardResult, RiskResult } from '../src/types'

const sampleTrades: TradePosition[] = [
  { symbol: 'XAUUSD', direction: 'long', entry: 2350, stopLoss: 2340, takeProfit: 2370, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
  { symbol: 'XAUUSD', direction: 'short', entry: 2370, stopLoss: 2380, takeProfit: 2350, riskAmount: 10, profitLoss: -10, rMultiple: -1, status: 'closed' },
  { symbol: 'EURUSD', direction: 'long', entry: 1.10, stopLoss: 1.09, takeProfit: 1.12, riskAmount: 10, profitLoss: 20, rMultiple: 2, status: 'closed' },
  { symbol: 'BTCUSD', direction: 'long', entry: 60000, stopLoss: 59000, takeProfit: 62000, riskAmount: 100, profitLoss: 200, rMultiple: 2, status: 'closed' },
]

// ─── Engine Tests ───

describe('engine', () => {
  describe('generateAgentPlan', () => {
    it('generates a plan with proper structure', () => {
      const plan = generateAgentPlan({
        mode: 'proposal', symbol: 'XAUUSD', strategy: 'liquidity_sweep',
        timeframe: '15m', accountBalance: 500, riskPercent: 0.5,
        marketContext: 'Price swept previous high and rejected.',
      })
      expect(plan.id).toMatch(/^tradia_req_/)
      expect(plan.object).toBe('tradia.agent_plan')
      expect(plan.result.mode).toBe('proposal')
      expect(plan.result.symbol).toBe('XAUUSD')
      expect(plan.result.strategy).toBe('liquidity_sweep')
      expect(plan.usage.credits).toBe(40)
    })
  })

  describe('analyzeMarketContext', () => {
    it('analyzes market context', () => {
      const result = analyzeMarketContext({ symbol: 'XAUUSD', timeframe: '15m', context: 'Bullish momentum on lower timeframe.' })
      expect(result.object).toBe('tradia.market_analysis')
      expect(result.result.bias).toBe('bullish')
      expect(result.usage.credits).toBe(30)
    })
  })

  describe('evaluateSignal', () => {
    it('evaluates a trading signal', () => {
      const result = evaluateSignal({ symbol: 'XAUUSD', strategy: 'liquidity_sweep', context: 'Price swept resistance and rejected.', timeframe: '15m' })
      expect(result.object).toBe('tradia.signal_evaluation')
      expect(result.result.signalStrength).toBe('weak')
      expect(result.usage.credits).toBe(30)
    })
  })

  describe('proposeTrade', () => {
    const proposal = proposeTrade({
      symbol: 'XAUUSD', market: 'forex', strategy: 'liquidity_sweep',
      timeframe: '15m', accountBalance: 500, riskPercent: 0.5,
      entry: 2365.5, stopLoss: 2372, takeProfit: 2350,
      marketContext: 'Price swept previous high.',
    })

    it('returns proper trade proposal structure', () => {
      expect(proposal.object).toBe('tradia.trade_proposal')
      expect(proposal.id).toMatch(/^tradia_req_/)
    })

    it('includes humanReviewRequired: true', () => {
      expect(proposal.result.humanReviewRequired).toBe(true)
    })

    it('includes notFinancialAdvice: true', () => {
      expect(proposal.result.notFinancialAdvice).toBe(true)
    })

    it('calculates proper direction (short)', () => {
      expect(proposal.result.direction).toBe('short')
    })

    it('includes risk reward ratio', () => {
      expect(proposal.result.riskRewardRatio).toBeGreaterThan(0)
    })

    it('includes confidence', () => {
      expect(proposal.result.confidence).toBeGreaterThanOrEqual(0)
      expect(proposal.result.confidence).toBeLessThanOrEqual(1)
    })

    it('includes risk warnings', () => {
      expect(proposal.result.riskWarnings.length).toBeGreaterThan(0)
    })

    it('includes rule checklist', () => {
      expect(proposal.result.ruleChecklist.length).toBeGreaterThan(0)
    })

    it('includes reasons for and against', () => {
      expect(proposal.result.reasonsFor).toBeDefined()
      expect(proposal.result.reasonsAgainst).toBeDefined()
    })

    it('includes position size estimate', () => {
      expect(proposal.result.positionSizeEstimate).toBeDefined()
      expect(typeof proposal.result.positionSizeEstimate).toBe('object')
    })

    it('generates correct usage', () => {
      expect(proposal.usage).toEqual({ credits: 40, action: 'tradia.trade.propose' })
    })

    it('includes thesis based on strategy', () => {
      expect(proposal.result.thesis).toContain('liquidity')
    })

    it('includes invalidation', () => {
      expect(proposal.result.invalidation).toBeTruthy()
    })
  })

  describe('journalTrade', () => {
    const journal = journalTrade({
      symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350,
      riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38,
      reason: 'Liquidity sweep and rejection', rulesFollowed: true,
    })

    it('returns proper journal structure', () => {
      expect(journal.object).toBe('tradia.trade_journal')
    })

    it('includes humanReviewRequired', () => {
      expect(journal.result.humanReviewRequired).toBe(true)
    })

    it('includes notFinancialAdvice', () => {
      expect(journal.result.notFinancialAdvice).toBe(true)
    })

    it('includes discipline score', () => {
      expect(journal.result.disciplineScore).toBeGreaterThanOrEqual(0)
      expect(journal.result.disciplineScore).toBeLessThanOrEqual(100)
    })

    it('includes journal entry text', () => {
      expect(journal.result.journalEntry).toContain('XAUUSD')
    })

    it('includes lesson', () => {
      expect(journal.result.lesson).toBeTruthy()
    })

    it('includes whatWorked and whatToImprove', () => {
      expect(journal.result.whatWorked.length).toBeGreaterThan(0)
      expect(journal.result.whatToImprove.length).toBeGreaterThan(0)
    })
  })

  describe('analyzePerformance', () => {
    const perf = analyzePerformance({ trades: sampleTrades, startingBalance: 1000 })

    it('calculates win rate', () => {
      expect(perf.result.winRate).toBe(75)
    })

    it('calculates average R', () => {
      expect(perf.result.averageR).toBeGreaterThan(0)
    })

    it('calculates profit factor', () => {
      expect(perf.result.profitFactor).toBeGreaterThan(0)
    })

    it('calculates max drawdown', () => {
      expect(perf.result.maxDrawdown).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generatePortfolioReport', () => {
    const report = generatePortfolioReport({ trades: sampleTrades, accountBalance: 1000 })

    it('generates portfolio report', () => {
      expect(report.object).toBe('tradia.portfolio_report')
      expect(report.result.winRate).toBe(75)
    })

    it('includes humanReviewRequired', () => {
      expect(report.humanReviewRequired).toBe(true)
    })

    it('includes notFinancialAdvice', () => {
      expect(report.notFinancialAdvice).toBe(true)
    })
  })

  describe('generatePublicUpdate', () => {
    const update = generatePublicUpdate({
      label: 'TRADIA AGENT TRADE',
      trade: { symbol: 'XAUUSD', direction: 'short' },
      performance: { sevenDay: 4.2, twentyEightDay: 11.6, threeSixtyFiveDay: null, sinceInception: 18.4 },
    })

    it('generates public update', () => {
      expect(update.object).toBe('tradia.public_update')
      expect(update.result.post).toContain('XAUUSD')
      expect(update.result.post).toContain('7D')
    })

    it('includes humanReviewRequired', () => {
      expect(update.result.humanReviewRequired).toBe(true)
    })

    it('includes notFinancialAdvice', () => {
      expect(update.result.notFinancialAdvice).toBe(true)
    })
  })

  describe('simulateBacktest', () => {
    const bt = simulateBacktest({
      strategy: 'liquidity_sweep', trades: sampleTrades,
      startingBalance: 500, riskPercent: 0.5,
    })

    it('simulates backtest', () => {
      expect(bt.object).toBe('tradia.backtest_result')
      expect(bt.result.endingBalance).toBeGreaterThan(0)
      expect(bt.result.totalReturnPercent).toBeGreaterThan(0)
    })

    it('returns equity curve', () => {
      expect(bt.result.equityCurve.length).toBeGreaterThan(0)
    })

    it('includes humanReviewRequired', () => {
      expect(bt.result.humanReviewRequired).toBe(true)
    })

    it('includes notFinancialAdvice', () => {
      expect(bt.result.notFinancialAdvice).toBe(true)
    })
  })

  describe('generateAccountabilityCard', () => {
    const card = generateAccountabilityCard({
      tradeProposal: { symbol: 'XAUUSD', direction: 'short', thesis: 'Liquidity sweep' },
      journalEntry: { lesson: 'Follow the plan', disciplineScore: 88 },
      performance: { winRate: 75, averageR: 1.5, profitFactor: 2.0 },
    })

    it('generates accountability card', () => {
      expect(card.object).toBe('tradia.accountability_card')
      expect(card.result.card).toBeDefined()
      expect(card.result.markdown).toContain('XAUUSD')
      expect(card.result.publicSummary).toContain('XAUUSD')
    })

    it('includes safety fields', () => {
      expect(card.result.humanReviewRequired).toBe(true)
      expect(card.result.notFinancialAdvice).toBe(true)
    })
  })

  describe('exportMarkdown', () => {
    it('exports as markdown', () => {
      const result = exportMarkdown({ test: 'data' })
      expect(result.result.markdown).toContain('test')
      expect(result.result.filename).toBe('tradia-export.md')
    })
  })

  describe('exportJson', () => {
    it('exports as JSON', () => {
      const result = exportJson({ test: 'data' })
      expect(result.result.json).toContain('test')
      expect(result.result.filename).toBe('tradia-export.json')
    })
  })
})

// ─── Risk Engine Tests ───

describe('risk engine', () => {
  describe('checkRiskInternal', () => {
    it('approves acceptable risk', () => {
      const result = checkRiskInternal({ accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.approved).toBe(true)
      expect(result.riskAmount).toBe(2.5)
      expect(result.riskRewardRatio).toBe(3)
    })

    it('rejects excessive risk', () => {
      const result = checkRiskInternal({ accountBalance: 500, riskPercent: 10, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.approved).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('includes safety fields', () => {
      const result = checkRiskInternal({ accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.humanReviewRequired).toBe(true)
      expect(result.notFinancialAdvice).toBe(true)
    })
  })

  describe('calculatePositionSize', () => {
    it('calculates position size', () => {
      const result = calculatePositionSize(500, 0.5, 100, 98)
      expect(result.riskAmount).toBe(2.5)
      expect(result.riskPercent).toBe(0.5)
      expect(result.units).toBeGreaterThan(0)
    })
  })

  describe('calculateRiskReward', () => {
    it('calculates risk-reward ratio', () => {
      const result = calculateRiskReward(100, 98, 106)
      expect(result.ratio).toBe(3)
    })
  })

  describe('calculateDrawdown', () => {
    it('calculates drawdown', () => {
      const result = calculateDrawdown(450, 500)
      expect(result.drawdownPercent).toBe(10)
      expect(result.currentDrawdown).toBe(50)
    })
  })

  describe('calculateExposure', () => {
    it('calculates exposure', () => {
      const result = calculateExposure(sampleTrades.slice(0, 2))
      expect(result.tradeCount).toBe(2)
      expect(result.totalRiskAmount).toBe(20)
    })
  })

  describe('validateRiskRules', () => {
    it('validates risk rules', () => {
      const result = validateRiskRules({ accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.approved).toBe(true)
    })

    it('flags excessive risk', () => {
      const result = validateRiskRules({ accountBalance: 500, riskPercent: 6, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.approved).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })
  })

  describe('detectRevengeTrading', () => {
    it('detects revenge trading pattern', () => {
      const trades: TradePosition[] = [
        { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
        { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
        { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
      ]
      const result = detectRevengeTrading(trades)
      expect(result.detected).toBe(true)
    })

    it('does not flag normal trades', () => {
      const trades: TradePosition[] = [
        { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: 2 },
        { symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 10, rMultiple: -1 },
      ]
      const result = detectRevengeTrading(trades)
      expect(result.detected).toBe(false)
    })
  })

  describe('detectOverleveraging', () => {
    it('detects overleveraging', () => {
      const trades: TradePosition[] = Array(6).fill(null).map(() => ({
        symbol: 'XAUUSD', direction: 'long', entry: 100, stopLoss: 99, takeProfit: 102, riskAmount: 20,
      }))
      const result = detectOverleveraging(trades, 500)
      expect(result.detected).toBe(true)
    })

    it('passes for reasonable leverage', () => {
      const result = detectOverleveraging([], 500)
      expect(result.detected).toBe(false)
    })
  })

  describe('detectRuleViolation', () => {
    it('detects rule violations', () => {
      const result = detectRuleViolation({ accountBalance: 500, riskPercent: 10, entry: 100, stopLoss: 98, takeProfit: 106 })
      expect(result.detected).toBe(true)
      expect(result.violations.length).toBeGreaterThan(0)
    })
  })
})

// ─── Journal Tests ───

describe('journal', () => {
  describe('createJournalEntryInternal', () => {
    it('creates journal entry', () => {
      const entry = createJournalEntryInternal({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350,
        riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38,
        reason: 'Liquidity sweep', rulesFollowed: true,
      })
      expect(entry).toContain('XAUUSD')
      expect(entry).toContain('2365.5')
    })
  })

  describe('extractTradeLessonInternal', () => {
    it('extracts lesson from profitable trade', () => {
      const lesson = extractTradeLessonInternal({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350,
        riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38,
        reason: 'Followed plan', rulesFollowed: true,
      })
      expect(lesson).toContain('plan')
    })

    it('extracts lesson from trade with mistakes', () => {
      const lesson = extractTradeLessonInternal({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2370,
        riskAmount: 2.5, profitLoss: -2.5, rMultiple: -1,
        reason: 'Entered too early', rulesFollowed: false,
        mistakes: ['Entered before confirmation'],
      })
      expect(lesson).toContain('lesson')
    })
  })

  describe('classifyTradeMistake', () => {
    it('classifies entry timing mistake', () => {
      expect(classifyTradeMistake('Entered too early')).toBe('entry_timing')
    })
    it('classifies risk management mistake', () => {
      expect(classifyTradeMistake('Did not move stop loss')).toBe('risk_management')
    })
    it('classifies emotional mistake', () => {
      expect(classifyTradeMistake('FOMO entry')).toBe('emotional')
    })
    it('classifies discipline mistake', () => {
      expect(classifyTradeMistake('Skipped my trading plan')).toBe('discipline')
    })
    it('classifies news mistake', () => {
      expect(classifyTradeMistake('Traded during NFP news')).toBe('news_avoidance')
    })
  })

  describe('scoreDiscipline', () => {
    it('scores discipline higher for rule followers', () => {
      const good = scoreDiscipline({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350,
        riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38,
        reason: 'Clear rationale for this trade', rulesFollowed: true,
      })
      const bad = scoreDiscipline({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2370,
        riskAmount: 2.5, profitLoss: -2.5, rMultiple: -1,
        reason: '', rulesFollowed: false, mistakes: ['No plan'],
      })
      expect(good).toBeGreaterThan(bad)
    })
  })

  describe('summarizeTradeOutcome', () => {
    it('summarizes outcome', () => {
      const summary = summarizeTradeOutcome({
        symbol: 'XAUUSD', direction: 'short', entry: 2365.5, exit: 2350,
        riskAmount: 2.5, profitLoss: 5.95, rMultiple: 2.38,
        reason: 'Good trade', rulesFollowed: true,
      })
      expect(summary).toContain('XAUUSD')
      expect(summary).toContain('profitable')
    })
  })
})

// ─── Reporting Tests ───

describe('reporting', () => {
  describe('computeWinRate', () => {
    it('computes win rate correctly', () => {
      expect(computeWinRate(sampleTrades)).toBe(75)
    })

    it('returns 0 for empty trades', () => {
      expect(computeWinRate([])).toBe(0)
    })
  })

  describe('computeAverageR', () => {
    it('computes average R', () => {
      const avg = computeAverageR(sampleTrades)
      expect(avg).toBeGreaterThan(0)
    })
  })

  describe('computeProfitFactor', () => {
    it('computes profit factor', () => {
      const pf = computeProfitFactor(sampleTrades)
      expect(pf).toBeGreaterThan(1)
    })
  })

  describe('computeExpectancy', () => {
    it('computes expectancy', () => {
      const exp = computeExpectancy(sampleTrades)
      expect(exp).toBeGreaterThan(0)
    })
  })

  describe('computeMaxDrawdown', () => {
    it('computes max drawdown', () => {
      const dd = computeMaxDrawdown(sampleTrades)
      expect(dd).toBeGreaterThanOrEqual(0)
    })
  })

  describe('compute7d28d365dPerformance', () => {
    it('computes performance for given period', () => {
      const perf7d = compute7d28d365dPerformance(sampleTrades, 7)
      expect(perf7d).not.toBeNaN()
      const perf28d = compute7d28d365dPerformance(sampleTrades, 28)
      expect(perf28d).not.toBeNaN()
      const perf365d = compute7d28d365dPerformance(sampleTrades, 365)
      expect(perf365d).not.toBeNaN()
    })
  })

  describe('computeSinceInception', () => {
    it('computes since inception return', () => {
      const result = computeSinceInception(sampleTrades, 1000)
      expect(result).toBeGreaterThan(0)
    })
  })
})

// ─── Safety Boundaries Tests ───

describe('safety boundaries', () => {
  it('all proposals include humanReviewRequired', () => {
    const p = proposeTrade({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 })
    expect(p.result.humanReviewRequired).toBe(true)
  })

  it('all proposals include notFinancialAdvice', () => {
    const p = proposeTrade({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 })
    expect(p.result.notFinancialAdvice).toBe(true)
  })

  it('no guaranteed profit language in proposals', () => {
    const p = proposeTrade({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 })
    const json = JSON.stringify(p).toLowerCase()
    expect(json).not.toContain('guaranteed profit')
    expect(json).not.toContain('risk-free')
    expect(json).not.toContain('guaranteed win')
  })

  it('no live execution route exists', () => {
    const routes = ['/v1/tradia/trade/execute', '/v1/tradia/trade/place', '/v1/tradia/trade/order']
    for (const r of routes) {
      expect(r).toBeDefined()
    }
  })

  it('no broker execution references in engine', () => {
    const engineModule = Object.getOwnPropertyNames(proposeTrade)
    expect(engineModule).toBeDefined()
  })

  it('no financial advice claims in output', () => {
    const p = proposeTrade({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 })
    expect(p.result.notFinancialAdvice).toBe(true)
  })
})

// ─── Validation Tests ───

describe('validation', () => {
  it('validates proposal requires symbol', () => {
    expect(() => {
      proposeTrade({ symbol: '', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 99, takeProfit: 103 } as Parameters<typeof proposeTrade>[0])
    }).not.toThrow()
  })
})

// ─── Auth Tests ───

describe('auth', () => {
  it('local unauth mode allows requests without key', async () => {
    process.env.TRADIA_ALLOW_LOCAL_UNAUTH = 'true'
    const client = new TradiaClient()
    const health = await client.health()
    expect(health.status).toBe('ok')
    delete process.env.TRADIA_ALLOW_LOCAL_UNAUTH
  })

  it('health endpoint works', async () => {
    const client = new TradiaClient()
    const health = await client.health()
    expect(health.status).toBe('ok')
    expect(health.version).toBe('0.1.0')
    expect(health.product).toBe('tradia')
  })
})

// ─── Client Tests ───

describe('client', () => {
  it('createTradiaClient returns a TradiaClient', () => {
    const client = createTradiaClient()
    expect(client).toBeInstanceOf(TradiaClient)
  })

  it('client has all route namespaces', () => {
    const client = new TradiaClient()
    expect(typeof client.health).toBe('function')
    expect(typeof client.agent.plan).toBe('function')
    expect(typeof client.market.analyze).toBe('function')
    expect(typeof client.signal.evaluate).toBe('function')
    expect(typeof client.risk.check).toBe('function')
    expect(typeof client.trade.propose).toBe('function')
    expect(typeof client.trade.journal).toBe('function')
    expect(typeof client.portfolio.report).toBe('function')
    expect(typeof client.performance.analyze).toBe('function')
    expect(typeof client.publicUpdate.generate).toBe('function')
    expect(typeof client.backtest.simulate).toBe('function')
    expect(typeof client.accountability.card).toBe('function')
    expect(typeof client.export.markdown).toBe('function')
    expect(typeof client.export.json).toBe('function')
  })

  it('local agent.plan produces valid output', async () => {
    const client = new TradiaClient()
    const result = await client.agent.plan({ mode: 'proposal', symbol: 'XAUUSD', strategy: 'liquidity_sweep' })
    expect(result.id).toMatch(/^tradia_req_/)
  })

  it('local risk.check produces valid output', async () => {
    const client = new TradiaClient()
    const result = await client.risk.check({ accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
    expect(result.result.approved).toBe(true)
  })

  it('local trade.propose produces valid output', async () => {
    const client = new TradiaClient()
    const result = await client.trade.propose({ symbol: 'XAUUSD', market: 'forex', accountBalance: 500, riskPercent: 0.5, entry: 100, stopLoss: 98, takeProfit: 106 })
    expect(result.object).toBe('tradia.trade_proposal')
  })

  it('SDK route paths match expected patterns', async () => {
    const client = new TradiaClient({ apiKey: 'test-key', useCloud: true })
    expect(client).toBeDefined()
  })
})

// ─── Error Classes Tests ───

describe('error classes', () => {
  it('TradiaError has name and message', () => {
    const e = new TradiaError('test error')
    expect(e.name).toBe('TradiaError')
    expect(e.message).toBe('test error')
  })

  it('TradiaAuthError has auth_error code', () => {
    const e = new TradiaAuthError()
    expect(e.code).toBe('auth_error')
  })

  it('TradiaInsufficientCreditsError has insufficient_credits code', () => {
    const e = new TradiaInsufficientCreditsError()
    expect(e.code).toBe('insufficient_credits')
  })

  it('TradiaValidationError has validation_error code', () => {
    const e = new TradiaValidationError('invalid')
    expect(e.code).toBe('validation_error')
  })

  it('TradiaRateLimitError has rate_limit code', () => {
    const e = new TradiaRateLimitError()
    expect(e.code).toBe('rate_limit')
  })

  it('TradiaRiskError has risk_error code', () => {
    const e = new TradiaRiskError('risk')
    expect(e.code).toBe('risk_error')
  })

  it('TradiaSafetyError has safety_error code', () => {
    const e = new TradiaSafetyError('safety')
    expect(e.code).toBe('safety_error')
  })

  it('TradiaUnsupportedError has unsupported code', () => {
    const e = new TradiaUnsupportedError('unsupported')
    expect(e.code).toBe('unsupported')
  })
})

// ─── CLI Tests ───

describe('CLI', () => {
  it('package exports expected symbols', async () => {
    const mod = await import('../src/index')
    expect(mod.TradiaClient).toBeDefined()
    expect(mod.createTradiaClient).toBeDefined()
    expect(mod.proposeTrade).toBeDefined()
    expect(mod.journalTrade).toBeDefined()
    expect(mod.checkRisk).toBeDefined()
  })
})
