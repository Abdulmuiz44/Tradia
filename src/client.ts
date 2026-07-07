import type {
  AgentPlanInput, MarketContextInput, SignalInput, RiskCheckInput,
  TradeProposalInput, JournalInput, PerformanceInput, PortfolioReportInput,
  PublicUpdateInput, BacktestInput, AccountabilityCardInput, HealthResponse,
  TradeProposalResult, JournalResult, PerformanceResult, BacktestResult,
  PublicUpdateResult, AccountabilityCardResult, RiskResult, BillingAction,
} from './types.js'
import {
  generateAgentPlan, analyzeMarketContext, evaluateSignal,
  proposeTrade, journalTrade, analyzePerformance,
  generatePortfolioReport, generatePublicUpdate, simulateBacktest,
  generateAccountabilityCard, exportMarkdown, exportJson,
} from './engine.js'
import { checkRiskInternal } from './risk.js'
import { chargeCredits, TradiaBillingError } from './billing.js'
import { redactApiKey } from './auth.js'

export class TradiaError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'TradiaError'
  }
}

export class TradiaAuthError extends TradiaError {
  constructor(message = 'Authentication failed') {
    super(message, 'auth_error')
    this.name = 'TradiaAuthError'
  }
}

export class TradiaInsufficientCreditsError extends TradiaError {
  constructor(message = 'Insufficient credits') {
    super(message, 'insufficient_credits')
    this.name = 'TradiaInsufficientCreditsError'
  }
}

export class TradiaValidationError extends TradiaError {
  constructor(message: string) {
    super(message, 'validation_error')
    this.name = 'TradiaValidationError'
  }
}

export class TradiaRateLimitError extends TradiaError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'rate_limit')
    this.name = 'TradiaRateLimitError'
  }
}

export class TradiaRiskError extends TradiaError {
  constructor(message: string) {
    super(message, 'risk_error')
    this.name = 'TradiaRiskError'
  }
}

export class TradiaSafetyError extends TradiaError {
  constructor(message: string) {
    super(message, 'safety_error')
    this.name = 'TradiaSafetyError'
  }
}

export class TradiaUnsupportedError extends TradiaError {
  constructor(message: string) {
    super(message, 'unsupported')
    this.name = 'TradiaUnsupportedError'
  }
}

async function hostedRequest<T>(apiKey: string, baseUrl: string, path: string, body: unknown, action: string): Promise<T> {
  await chargeCredits(action as BillingAction)

  const url = `${baseUrl}${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>
    throw new TradiaError(
      (errorBody.error as Record<string, unknown>)?.message as string || `HTTP ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}

export interface TradiaClientOptions {
  apiKey?: string
  baseUrl?: string
  useCloud?: boolean
}

export class TradiaClient {
  private apiKey?: string
  private baseUrl: string
  private useCloud: boolean

  constructor(options: TradiaClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.TALOCODE_API_KEY
    this.baseUrl = options.baseUrl ?? process.env.TALOCODE_BASE_URL ?? 'https://api.talocode.site'
    this.useCloud = options.useCloud ?? !!this.apiKey
  }

  async health(): Promise<HealthResponse> {
    return { status: 'ok', version: '0.1.0', product: 'tradia' }
  }

  agent = {
    plan: async (input: AgentPlanInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/agent/plan', input, 'tradia.agent.plan')
      }
      return generateAgentPlan(input)
    },
  }

  market = {
    analyze: async (input: MarketContextInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/market/analyze', input, 'tradia.market.analyze')
      }
      return analyzeMarketContext(input)
    },
  }

  signal = {
    evaluate: async (input: SignalInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/signal/evaluate', input, 'tradia.signal.evaluate')
      }
      return evaluateSignal(input)
    },
  }

  risk = {
    check: async (input: RiskCheckInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest<{ result: RiskResult }>(this.apiKey, this.baseUrl, '/v1/tradia/risk/check', input, 'tradia.risk.check')
      }
      return { result: checkRiskInternal(input) }
    },
  }

  trade = {
    propose: async (input: TradeProposalInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/trade/propose', input, 'tradia.trade.propose')
      }
      return proposeTrade(input)
    },
    journal: async (input: JournalInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/trade/journal', input, 'tradia.trade.journal')
      }
      return journalTrade(input)
    },
  }

  portfolio = {
    report: async (input: PortfolioReportInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/portfolio/report', input, 'tradia.portfolio.report')
      }
      return generatePortfolioReport(input)
    },
  }

  performance = {
    analyze: async (input: PerformanceInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/performance/analyze', input, 'tradia.performance.analyze')
      }
      return analyzePerformance(input)
    },
  }

  publicUpdate = {
    generate: async (input: PublicUpdateInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/public-update/generate', input, 'tradia.public_update.generate')
      }
      return generatePublicUpdate(input)
    },
  }

  backtest = {
    simulate: async (input: BacktestInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/backtest/simulate', input, 'tradia.backtest.simulate')
      }
      return simulateBacktest(input)
    },
  }

  accountability = {
    card: async (input: AccountabilityCardInput) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/accountability/card', input, 'tradia.accountability.card')
      }
      return generateAccountabilityCard(input)
    },
  }

  export = {
    markdown: async (input: Record<string, unknown>) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/export/markdown', input, 'tradia.export.markdown')
      }
      return exportMarkdown(input)
    },
    json: async (input: Record<string, unknown>) => {
      if (this.useCloud && this.apiKey) {
        return hostedRequest(this.apiKey, this.baseUrl, '/v1/tradia/export/json', input, 'tradia.export.json')
      }
      return exportJson(input)
    },
  }
}

export function createTradiaClient(options?: TradiaClientOptions): TradiaClient {
  return new TradiaClient(options)
}
