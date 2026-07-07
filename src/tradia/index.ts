export { TradiaClient, createTradiaClient } from './client.js'
export type { TradiaClientOptions } from './client.js'
export {
  TradiaError,
  TradiaAuthError,
  TradiaInsufficientCreditsError,
  TradiaValidationError,
  TradiaRateLimitError,
  TradiaRiskError,
  TradiaSafetyError,
  TradiaUnsupportedError,
} from './client.js'

export {
  generateAgentPlan,
  analyzeMarketContext,
  evaluateSignal,
  proposeTrade,
  journalTrade,
  analyzePerformance,
  generatePortfolioReport,
  generatePublicUpdate,
  simulateBacktest,
  generateAccountabilityCard,
  exportMarkdown,
  exportJson,
} from './engine.js'

export { checkRiskInternal as checkRisk } from './risk.js'

export {
  calculatePositionSize,
  calculateRiskReward,
  calculateDrawdown,
  calculateExposure,
  validateRiskRules,
  detectRevengeTrading,
  detectOverleveraging,
  detectRuleViolation,
} from './risk.js'

export {
  createJournalEntryInternal as createJournalEntry,
  extractTradeLessonInternal as extractTradeLesson,
  classifyTradeMistake,
  scoreDiscipline,
  summarizeTradeOutcome,
} from './journal.js'

export {
  computeWinRate,
  computeAverageR,
  computeProfitFactor,
  computeExpectancy,
  computeMaxDrawdown,
  compute7d28d365dPerformance,
  computeSinceInception,
  computePerformanceStats,
} from './reporting.js'

export * from './types.js'
