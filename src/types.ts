export type Market = 'forex' | 'crypto' | 'stocks' | 'indices' | 'commodities' | 'prop_firm_account' | 'paper_account'
export type Direction = 'long' | 'short' | 'watch_only'
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'
export type Strategy = 'liquidity_sweep' | 'trend_continuation' | 'breakout_retest' | 'support_resistance' | 'mean_reversion' | 'momentum' | 'news_avoidance' | 'custom'
export type Symbol = 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'BTCUSD' | 'ETHUSD' | 'SPY' | 'QQQ' | (string & {})
export type Mode = 'observe' | 'proposal' | 'journal' | 'paper' | 'accountability'

export interface AgentPlanInput {
  mode: Mode
  market?: Market
  symbol?: Symbol
  timeframe?: Timeframe
  strategy?: Strategy
  accountBalance?: number
  riskPercent?: number
  marketContext?: string
  setupNotes?: string
  entry?: number
  stopLoss?: number
  takeProfit?: number
  rules?: string[]
  openTrades?: TradePosition[]
}

export interface TradePosition {
  symbol: Symbol
  direction: Direction
  entry: number
  stopLoss: number
  takeProfit: number
  riskAmount: number
  profitLoss?: number
  rMultiple?: number
  status?: 'open' | 'closed'
}

export interface MarketContextInput {
  symbol: Symbol
  timeframe: Timeframe
  context: string
  price?: number
}

export interface SignalInput {
  symbol: Symbol
  strategy: Strategy
  context: string
  timeframe?: Timeframe
}

export interface RiskCheckInput {
  accountBalance: number
  riskPercent: number
  entry: number
  stopLoss: number
  takeProfit: number
  openTrades?: TradePosition[]
  dailyLossLimitPercent?: number
  maxRiskPerTradePercent?: number
}

export interface TradeProposalInput {
  mode?: Mode
  market: Market
  symbol: Symbol
  timeframe?: Timeframe
  strategy?: Strategy
  accountBalance: number
  riskPercent: number
  marketContext?: string
  setupNotes?: string
  entry: number
  stopLoss: number
  takeProfit: number
  rules?: string[]
}

export interface TradeProposalResult {
  symbol: Symbol
  direction: Direction
  thesis: string
  setup: string
  entryPlan: string
  stopLoss: number
  takeProfit: number
  invalidation: string
  riskPercent: number
  positionSizeEstimate: Record<string, unknown>
  riskRewardRatio: number
  confidence: number
  ruleChecklist: string[]
  reasonsFor: string[]
  reasonsAgainst: string[]
  riskWarnings: string[]
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface JournalInput {
  symbol: Symbol
  direction: Direction
  entry: number
  exit: number
  riskAmount: number
  profitLoss: number
  rMultiple: number
  reason: string
  mistakes?: string[]
  screenshots?: string[]
  rulesFollowed: boolean
}

export interface JournalResult {
  journalEntry: string
  lesson: string
  disciplineScore: number
  mistakeTags: string[]
  whatWorked: string[]
  whatToImprove: string[]
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface PerformanceInput {
  trades: TradePosition[]
  startingBalance: number
}

export interface PerformanceResult {
  winRate: number
  averageR: number
  profitFactor: number
  expectancy: number
  maxDrawdown: number
  sevenDay: number | null
  twentyEightDay: number | null
  threeSixtyFiveDay: number | null
  sinceInception: number | null
  totalTrades: number
  wins: number
  losses: number
}

export interface PortfolioReportInput {
  trades: TradePosition[]
  accountBalance: number
}

export interface PublicUpdateInput {
  label: string
  trade: Partial<TradeProposalResult> | Record<string, unknown>
  performance?: {
    sevenDay: number | null
    twentyEightDay: number | null
    threeSixtyFiveDay: number | null
    sinceInception: number | null
  }
  platform?: string
  tone?: string
}

export interface PublicUpdateResult {
  post: string
  summary: Record<string, unknown>
  disclaimer: string
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface BacktestInput {
  strategy: Strategy
  trades: TradePosition[]
  startingBalance: number
  riskPercent: number
}

export interface BacktestResult {
  endingBalance: number
  totalReturnPercent: number
  winRate: number
  averageR: number
  maxDrawdown: number
  equityCurve: number[]
  warnings: string[]
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface AccountabilityCardInput {
  tradeProposal?: Partial<TradeProposalResult>
  journalEntry?: Partial<JournalResult>
  performance?: Partial<PerformanceResult>
}

export interface AccountabilityCardResult {
  card: Record<string, unknown>
  markdown: string
  publicSummary: string
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface RiskResult {
  approved: boolean
  riskAmount: number
  riskRewardRatio: number
  positionSizeEstimate: Record<string, unknown>
  violations: string[]
  warnings: string[]
  humanReviewRequired: true
  notFinancialAdvice: true
}

export interface RiskRewardResult {
  riskAmount: number
  rewardAmount: number
  ratio: number
  riskPercentOfAccount: number
}

export interface PositionSizeResult {
  units: number
  riskAmount: number
  riskPercent: number
}

export interface DrawdownResult {
  currentDrawdown: number
  maxDrawdown: number
  drawdownPercent: number
}

export interface ExposureResult {
  totalExposure: number
  totalRiskAmount: number
  totalRiskPercent: number
  tradeCount: number
}

export interface HealthResponse {
  status: string
  version: string
  product: string
}

export interface ApiError {
  error: {
    type: string
    message: string
    code?: string
  }
}

export interface BillingConfig {
  baseUrl: string
  apiKey: string
}

export interface BillingChargeInput {
  action: string
  metadata?: Record<string, unknown>
}

export type BillingAction =
  | 'tradia.agent.plan'
  | 'tradia.market.analyze'
  | 'tradia.signal.evaluate'
  | 'tradia.risk.check'
  | 'tradia.trade.propose'
  | 'tradia.trade.journal'
  | 'tradia.portfolio.report'
  | 'tradia.performance.analyze'
  | 'tradia.public_update.generate'
  | 'tradia.backtest.simulate'
  | 'tradia.accountability.card'
  | 'tradia.export.markdown'
  | 'tradia.export.json'

export const PRICING: Record<BillingAction, number> = {
  'tradia.agent.plan': 40,
  'tradia.market.analyze': 30,
  'tradia.signal.evaluate': 30,
  'tradia.risk.check': 20,
  'tradia.trade.propose': 40,
  'tradia.trade.journal': 25,
  'tradia.portfolio.report': 50,
  'tradia.performance.analyze': 35,
  'tradia.public_update.generate': 30,
  'tradia.backtest.simulate': 60,
  'tradia.accountability.card': 25,
  'tradia.export.markdown': 5,
  'tradia.export.json': 5,
}
