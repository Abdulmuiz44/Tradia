import type {
  AgentPlanInput, MarketContextInput, SignalInput,
  TradeProposalInput, TradeProposalResult, JournalInput, JournalResult,
  PerformanceInput, PerformanceResult, PortfolioReportInput,
  PublicUpdateInput, PublicUpdateResult, BacktestInput, BacktestResult,
  AccountabilityCardInput, AccountabilityCardResult,
  Direction, Market, Strategy, Timeframe,
} from './types.js'
import { checkRiskInternal } from './risk.js'
import { createJournalEntryInternal, extractTradeLessonInternal } from './journal.js'
import { computePerformanceStats } from './reporting.js'

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `tradia_req_${result}`
}

function detectDirection(entry: number, takeProfit: number): Direction {
  if (takeProfit > entry) return 'long'
  if (takeProfit < entry) return 'short'
  return 'watch_only'
}

function calculateRR(entry: number, stopLoss: number, takeProfit: number): number {
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(takeProfit - entry)
  if (risk === 0) return 0
  return Math.round((reward / risk) * 100) / 100
}

function calculateConfidence(strategy: Strategy, rr: number, rules: string[] = []): number {
  let base = 0.5
  if (rr >= 3) base += 0.2
  else if (rr >= 2) base += 0.1
  if (strategy !== 'custom') base += 0.1
  if (rules.length > 0) base += 0.05
  return Math.min(Math.round(base * 100) / 100, 0.95)
}

function buildRiskWarnings(riskPercent: number, rr: number): string[] {
  const warnings: string[] = []
  if (riskPercent > 2) warnings.push('Risk exceeds 2% per trade. High risk of significant drawdown.')
  if (riskPercent > 1) warnings.push('Consider reducing position size for better risk management.')
  if (rr < 1) warnings.push('Risk-reward ratio is below 1. Trade may not be worth the risk.')
  if (rr < 1.5) warnings.push('Risk-reward ratio is below 1.5. Consider tighter stops or better targets.')
  warnings.push('Past performance does not guarantee future results.')
  warnings.push('Only risk capital you can afford to lose.')
  return warnings
}

function buildRuleChecklist(strategy: Strategy, rules: string[] = []): string[] {
  const checklist: string[] = []
  if (rules.length > 0) checklist.push(...rules)
  checklist.push('Risk per trade within acceptable limits')
  if (strategy === 'liquidity_sweep') {
    checklist.push('Liquidity identified and swept')
    checklist.push('Confirmation candle after sweep')
  } else if (strategy === 'breakout_retest') {
    checklist.push('Key level identified')
    checklist.push('Retest confirmed with volume')
  } else if (strategy === 'support_resistance') {
    checklist.push('Support/resistance level identified')
    checklist.push('Price reaction at level confirmed')
  } else if (strategy === 'trend_continuation') {
    checklist.push('Trend direction confirmed on higher timeframe')
    checklist.push('Pullback within trend boundaries')
  }
  checklist.push('No high-impact news during trade window')
  checklist.push('Human review completed before execution')
  return checklist
}

const STRATEGY_THESIS: Record<Strategy, string> = {
  liquidity_sweep: 'Price swept liquidity above/below a key level, indicating stop hunts. Rejection confirms genuine direction. Counter-trend entry with tight invalidation.',
  trend_continuation: 'Price is in a defined trend and pulling back to a key level or moving average. Entry aligned with larger trend direction.',
  breakout_retest: 'Price broke a key structural level and is retesting it as support/resistance. Retest entry with invalidation inside the breakout range.',
  support_resistance: 'Price is approaching a known support or resistance zone. Reversal or bounce expected at the level.',
  mean_reversion: 'Price has deviated significantly from its mean or moving average. Expect reversion toward the mean.',
  momentum: 'Price is moving with above-average momentum in a clear direction. Entry on continuation with momentum confirmation.',
  news_avoidance: 'Avoiding trade due to upcoming high-impact news event. Market may be unpredictable during news.',
  custom: 'User-defined strategy. Ensure all rules and conditions are clearly documented before entry.',
}

export function generateAgentPlan(input: AgentPlanInput): { id: string; object: string; result: Record<string, unknown>; usage: { credits: number; action: string }; humanReviewRequired: true; notFinancialAdvice: true } {
  const id = generateId()
  const direction = input.entry && input.takeProfit ? detectDirection(input.entry, input.takeProfit) : 'watch_only'
  const rr = input.entry && input.stopLoss && input.takeProfit ? calculateRR(input.entry, input.stopLoss, input.takeProfit) : 0
  const confidence = calculateConfidence(input.strategy || 'custom', rr, input.rules)
  const warnings = buildRiskWarnings(input.riskPercent || 0.5, rr)

  return {
    id,
    object: 'tradia.agent_plan',
    result: {
      mode: input.mode || 'proposal',
      symbol: input.symbol || null,
      direction,
      thesis: input.strategy ? STRATEGY_THESIS[input.strategy] || 'Analyze market conditions before entry.' : 'Analyze market conditions before entry.',
      marketContext: input.marketContext || null,
      strategy: input.strategy || null,
      timeframe: input.timeframe || null,
      riskPercent: input.riskPercent || 0.5,
      riskRewardRatio: rr,
      confidence,
      ruleChecklist: input.strategy ? buildRuleChecklist(input.strategy, input.rules) : [],
      warnings,
      nextSteps: [
        '1. Review market context and higher timeframe',
        '2. Check for upcoming news events',
        '3. Validate all rules before entry',
        '4. Calculate precise position size',
        '5. Set alerts at invalidation levels',
      ],
    },
    usage: { credits: 40, action: 'tradia.agent.plan' },
    humanReviewRequired: true,
    notFinancialAdvice: true,
  }
}

export function analyzeMarketContext(input: MarketContextInput): { id: string; object: string; result: Record<string, unknown>; usage: { credits: number; action: string }; humanReviewRequired: true; notFinancialAdvice: true } {
  const direction = input.context.toLowerCase().includes('bull') || input.context.toLowerCase().includes('buy') ? 'bullish' :
    input.context.toLowerCase().includes('bear') || input.context.toLowerCase().includes('sell') ? 'bearish' : 'neutral'

  return {
    id: generateId(),
    object: 'tradia.market_analysis',
    result: {
      symbol: input.symbol,
      timeframe: input.timeframe,
      bias: direction,
      keyLevels: {
        support: [],
        resistance: [],
      },
      marketContext: input.context,
      considerations: [
        'Review higher timeframe for alignment',
        'Check for upcoming economic data',
        'Monitor volume and momentum',
      ],
      riskWarnings: [
        'Market context is user-provided and may not reflect real-time conditions.',
        'Always verify with live price data before trading.',
      ],
    },
    usage: { credits: 30, action: 'tradia.market.analyze' },
    humanReviewRequired: true,
    notFinancialAdvice: true,
  }
}

export function evaluateSignal(input: SignalInput): { id: string; object: string; result: Record<string, unknown>; usage: { credits: number; action: string }; humanReviewRequired: true; notFinancialAdvice: true } {
  const signalStrength = input.context.length > 100 ? 'moderate' : 'weak'
  const timeframe = input.timeframe || '1h'

  return {
    id: generateId(),
    object: 'tradia.signal_evaluation',
    result: {
      symbol: input.symbol,
      strategy: input.strategy,
      timeframe,
      signalStrength,
      evaluation: [
        `Signal based on ${input.strategy} strategy on ${input.symbol}.`,
        `Context: ${input.context}`,
        `Timeframe: ${timeframe}`,
      ],
      recommendations: [
        'Wait for confirmation before entry',
        'Set clear invalidation levels',
        'Calculate risk before committing',
      ],
      riskWarnings: [
        'Signal evaluation is deterministic and based on user-provided context.',
        'Do not trade based on signal alone. Always do your own analysis.',
      ],
    },
    usage: { credits: 30, action: 'tradia.signal.evaluate' },
    humanReviewRequired: true,
    notFinancialAdvice: true,
  }
}

export function proposeTrade(input: TradeProposalInput): { id: string; object: string; result: TradeProposalResult; usage: { credits: number; action: string } } {
  const id = generateId()
  const direction = detectDirection(input.entry, input.takeProfit)
  const rr = calculateRR(input.entry, input.stopLoss, input.takeProfit)
  const confidence = calculateConfidence(input.strategy || 'custom', rr, input.rules)
  const warnings = buildRiskWarnings(input.riskPercent, rr)
  const thesis = input.strategy ? STRATEGY_THESIS[input.strategy] || 'User-defined strategy trade.' : 'Analyze market conditions before entry.'
  const riskAmount = input.accountBalance * (input.riskPercent / 100)
  const positionSize = riskAmount > 0 ? Math.round(riskAmount / Math.abs(input.entry - input.stopLoss) * 100) / 100 : 0

  const reasonsFor: string[] = []
  const reasonsAgainst: string[] = []

  if (rr >= 2) reasonsFor.push(`Risk-reward ratio of ${rr} is favorable`)
  if (rr >= 3) reasonsFor.push('Exceptional risk-reward opportunity')
  if (input.strategy && input.strategy !== 'custom') reasonsFor.push(`${input.strategy} strategy has defined entry and invalidation rules`)
  if (input.marketContext) reasonsFor.push('Market context provided supports this setup')

  if (input.riskPercent > 2) reasonsAgainst.push('Risk per trade exceeds 2%')
  if (rr < 1.5) reasonsAgainst.push('Risk-reward ratio could be improved')
  if (input.strategy === 'news_avoidance') reasonsAgainst.push('News event pending - market may be unpredictable')

  return {
    id,
    object: 'tradia.trade_proposal',
    result: {
      symbol: input.symbol,
      direction,
      thesis,
      setup: `${input.strategy || 'custom'} setup on ${input.symbol} (${input.timeframe || 'N/A'})`,
      entryPlan: input.setupNotes || `Enter at ${input.entry}. Confirmation required before entry.`,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      invalidation: `Invalidate if price reaches ${input.stopLoss}. `
        + (direction === 'long' ? 'If price closes below invalidation level, exit immediately.' : 'If price closes above invalidation level, exit immediately.'),
      riskPercent: input.riskPercent,
      positionSizeEstimate: { units: positionSize, riskAmount, riskPercent: input.riskPercent },
      riskRewardRatio: rr,
      confidence,
      ruleChecklist: buildRuleChecklist(input.strategy || 'custom', input.rules),
      reasonsFor,
      reasonsAgainst,
      riskWarnings: warnings,
      humanReviewRequired: true,
      notFinancialAdvice: true,
    },
    usage: { credits: 40, action: 'tradia.trade.propose' },
  }
}

export function journalTrade(input: JournalInput): { id: string; object: string; result: JournalResult; usage: { credits: number; action: string } } {
  const entry = createJournalEntryInternal(input)
  const lesson = extractTradeLessonInternal(input)

  const whatWorked: string[] = []
  if (input.rulesFollowed) whatWorked.push('Trading rules were followed')
  if (input.rMultiple >= 2) whatWorked.push('Achieved excellent risk-reward multiple')
  if (input.rMultiple > 0) whatWorked.push('Trade was profitable')
  if (input.reason) whatWorked.push('Trade had a clear rationale')

  const whatToImprove: string[] = []
  if (!input.rulesFollowed) whatToImprove.push('Follow trading rules consistently')
  if (input.mistakes && input.mistakes.length > 0) whatToImprove.push(...input.mistakes.map(m => `Address mistake: ${m}`))
  whatToImprove.push('Review trade for process improvements')

  return {
    id: generateId(),
    object: 'tradia.trade_journal',
    result: {
      journalEntry: entry,
      lesson,
      disciplineScore: input.rulesFollowed ? 85 + Math.floor(Math.random() * 16) : 50 + Math.floor(Math.random() * 30),
      mistakeTags: input.mistakes || [],
      whatWorked,
      whatToImprove,
      humanReviewRequired: true,
      notFinancialAdvice: true,
    },
    usage: { credits: 25, action: 'tradia.trade.journal' },
  }
}

export function analyzePerformance(input: PerformanceInput): { id: string; object: string; result: PerformanceResult; usage: { credits: number; action: string } } {
  const stats = computePerformanceStats(input.trades, input.startingBalance)

  return {
    id: generateId(),
    object: 'tradia.performance_analysis',
    result: stats,
    usage: { credits: 35, action: 'tradia.performance.analyze' },
  }
}

export function generatePortfolioReport(input: PortfolioReportInput): { id: string; object: string; result: Record<string, unknown>; usage: { credits: number; action: string }; humanReviewRequired: true; notFinancialAdvice: true } {
  const stats = computePerformanceStats(input.trades, input.accountBalance)

  return {
    id: generateId(),
    object: 'tradia.portfolio_report',
    result: {
      accountBalance: input.accountBalance,
      totalTrades: stats.totalTrades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      profitFactor: stats.profitFactor,
      expectancy: stats.expectancy,
      averageR: stats.averageR,
      maxDrawdown: stats.maxDrawdown,
      sinceInception: stats.sinceInception,
      recommendations: [
        stats.winRate < 40 ? 'Consider reviewing your trade selection process.' : 'Win rate is acceptable.',
        stats.profitFactor < 1 ? 'Your strategy is not profitable. Review and adjust.' : 'Strategy is showing profitability.',
        stats.expectancy < 0 ? 'Expected value per trade is negative. Review risk management.' : 'Positive expectancy per trade.',
      ],
    },
    usage: { credits: 50, action: 'tradia.portfolio.report' },
    humanReviewRequired: true,
    notFinancialAdvice: true,
  }
}

export function generatePublicUpdate(input: PublicUpdateInput): { id: string; object: string; result: PublicUpdateResult; usage: { credits: number; action: string } } {
  const trade = input.trade as Record<string, unknown>
  const symbol = trade.symbol || 'Unknown'
  const direction = trade.direction || 'N/A'
  const rr = trade.riskRewardRatio || 'N/A'
  const perf = (input.performance || {}) as Record<string, unknown>

  const lines: string[] = []
  lines.push(`🚨 ${input.label}`)
  lines.push('')
  lines.push(`📊 Symbol: ${symbol}`)
  lines.push(`Direction: ${direction}`)
  if (rr !== 'N/A') lines.push(`R:R: ${rr}`)
  lines.push('')
  if (trade.thesis) lines.push(`Thesis: ${trade.thesis}`)
  lines.push('')
  const sd = perf.sevenDay as number | null | undefined
  const td = perf.twentyEightDay as number | null | undefined
  const hd = perf.threeSixtyFiveDay as number | null | undefined
  const si = perf.sinceInception as number | null | undefined

  if (sd !== null && sd !== undefined) {
    lines.push(`📈 7D Performance: ${sd > 0 ? '+' : ''}${sd}%`)
  }
  if (td !== null && td !== undefined) {
    lines.push(`📈 28D Performance: ${td > 0 ? '+' : ''}${td}%`)
  }
  if (hd !== null && hd !== undefined) {
    lines.push(`📈 365D Performance: ${hd > 0 ? '+' : ''}${hd}%`)
  }
  if (si !== null && si !== undefined) {
    lines.push(`📈 Since Inception: ${si > 0 ? '+' : ''}${si}%`)
  }
  lines.push('')
  lines.push('⚠️ Educational update only. Not financial advice.')
  lines.push('Human review required before acting on any trade.')

  return {
    id: generateId(),
    object: 'tradia.public_update',
    result: {
      post: lines.join('\n'),
      summary: { symbol, direction, rr, performance: perf },
      disclaimer: 'Educational update only. Not financial advice.',
      humanReviewRequired: true,
      notFinancialAdvice: true,
    },
    usage: { credits: 30, action: 'tradia.public_update.generate' },
  }
}

export function simulateBacktest(input: BacktestInput): { id: string; object: string; result: BacktestResult; usage: { credits: number; action: string } } {
  const closedTrades = input.trades.filter(t => t.status === 'closed' || t.rMultiple !== undefined)
  let balance = input.startingBalance
  const equityCurve: number[] = [balance]
  let peak = balance
  let maxDrawdown = 0
  let wins = 0
  let losses = 0
  let totalR = 0

  for (const trade of closedTrades) {
    const rr = trade.rMultiple || (trade.profitLoss && trade.riskAmount ? trade.profitLoss / trade.riskAmount : 0)
    totalR += rr
    if (rr > 0) wins++
    else losses++

    const riskAmt = balance * (input.riskPercent / 100)
    const pnl = riskAmt * rr
    balance += pnl
    equityCurve.push(Math.round(balance * 100) / 100)

    if (balance > peak) peak = balance
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  const totalTrades = closedTrades.length
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 10000) / 100 : 0
  const totalReturn = input.startingBalance > 0 ? Math.round(((balance - input.startingBalance) / input.startingBalance) * 10000) / 100 : 0
  const averageR = totalTrades > 0 ? Math.round((totalR / totalTrades) * 100) / 100 : 0

  const warnings: string[] = []
  if (totalTrades < 30) warnings.push('Sample size is small. Results may not be statistically significant.')
  if (winRate < 40) warnings.push('Win rate is below 40%. Consider reviewing strategy rules.')
  if (maxDrawdown > 20) warnings.push('Max drawdown exceeds 20%. Consider reducing risk per trade.')
  if (balance <= 0) warnings.push('Account balance reached zero. Risk per trade may be too high.')

  return {
    id: generateId(),
    object: 'tradia.backtest_result',
    result: {
      endingBalance: Math.round(balance * 100) / 100,
      totalReturnPercent: totalReturn,
      winRate,
      averageR,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      equityCurve,
      warnings,
      humanReviewRequired: true,
      notFinancialAdvice: true,
    },
    usage: { credits: 60, action: 'tradia.backtest.simulate' },
  }
}

export function generateAccountabilityCard(input: AccountabilityCardInput): { id: string; object: string; result: AccountabilityCardResult; usage: { credits: number; action: string } } {
  const tp = input.tradeProposal || {}
  const je = input.journalEntry || {}
  const perf = (input.performance || {}) as Record<string, unknown>

  return {
    id: generateId(),
    object: 'tradia.accountability_card',
    result: {
      card: {
        trade: { symbol: tp.symbol, direction: tp.direction, thesis: tp.thesis },
        journal: { lesson: je.lesson, disciplineScore: je.disciplineScore },
        performance: { winRate: perf.winRate, averageR: perf.averageR, profitFactor: perf.profitFactor },
      },
      markdown: [
        `## Accountability Card`,
        ``,
        `### Trade`,
        `- Symbol: ${tp.symbol || 'N/A'}`,
        `- Direction: ${tp.direction || 'N/A'}`,
        `- Thesis: ${tp.thesis || 'N/A'}`,
        ``,
        `### Journal`,
        `- Lesson: ${je.lesson || 'N/A'}`,
        `- Discipline: ${je.disciplineScore || 'N/A'}/100`,
        ``,
        `### Performance`,
        `- Win Rate: ${perf.winRate !== undefined ? perf.winRate + '%' : 'N/A'}`,
        `- Average R: ${perf.averageR || 'N/A'}`,
        ``,
        `⚠️ Not financial advice. Educational tracking only.`,
      ].join('\n'),
      publicSummary: [
        `Trade: ${tp.symbol || 'N/A'} ${tp.direction || ''}`,
        `Lesson: ${je.lesson || 'N/A'}`,
        `Discipline: ${je.disciplineScore || 'N/A'}/100`,
      ].join(' | '),
      humanReviewRequired: true,
      notFinancialAdvice: true,
    },
    usage: { credits: 25, action: 'tradia.accountability.card' },
  }
}

export function exportMarkdown(input: Record<string, unknown>): { id: string; object: string; result: { markdown: string; filename: string }; usage: { credits: number; action: string } } {
  const lines: string[] = ['# Tradia Export', '', '```json', JSON.stringify(input, null, 2), '```', '', '⚠️ Not financial advice. Human review required.']

  return {
    id: generateId(),
    object: 'tradia.export_markdown',
    result: {
      markdown: lines.join('\n'),
      filename: 'tradia-export.md',
    },
    usage: { credits: 5, action: 'tradia.export.markdown' },
  }
}

export function exportJson(input: Record<string, unknown>): { id: string; object: string; result: { json: string; filename: string }; usage: { credits: number; action: string } } {
  return {
    id: generateId(),
    object: 'tradia.export_json',
    result: {
      json: JSON.stringify(input, null, 2),
      filename: 'tradia-export.json',
    },
    usage: { credits: 5, action: 'tradia.export.json' },
  }
}
