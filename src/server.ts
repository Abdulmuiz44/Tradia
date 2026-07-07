import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { authenticateRequest, redactApiKey } from './auth.js'
import { chargeCredits, TradiaBillingError } from './billing.js'
import {
  generateAgentPlan, analyzeMarketContext, evaluateSignal,
  proposeTrade, journalTrade, analyzePerformance,
  generatePortfolioReport, generatePublicUpdate, simulateBacktest,
  generateAccountabilityCard, exportMarkdown, exportJson,
} from './engine.js'
import { checkRiskInternal } from './risk.js'

const VERSION = '0.1.0'
const PRODUCT = 'tradia'
const MAX_BODY_SIZE = 1024 * 100
const TIMEOUT_MS = 30000

interface RouteHandler {
  method: string
  path: string
  action?: string
  handler: (body: Record<string, unknown>) => unknown
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body) as Record<string, unknown>)
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function jsonResponse(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  })
  res.end(JSON.stringify(data))
}

function errorResponse(res: ServerResponse, status: number, type: string, message: string, code?: string): void {
  jsonResponse(res, status, { error: { type, message, code } })
}

function redactSecrets(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  const result = { ...obj as Record<string, unknown> }
  if (result.apiKey) result.apiKey = redactApiKey(result.apiKey as string)
  if (result.authorization) result.authorization = '(redacted)'
  return result
}

function checkAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers['authorization'] as string | undefined
  const xApiKey = req.headers['x-api-key'] as string | undefined
  const auth = authenticateRequest(authHeader, xApiKey)
  return auth.authenticated
}

function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return true
  }
  return false
}

const ROUTES: RouteHandler[] = [
  { method: 'GET', path: '/health', handler: () => ({ status: 'ok', version: VERSION, product: PRODUCT }) },
  { method: 'GET', path: '/v1/tradia/health', handler: () => ({ status: 'ok', version: VERSION, product: PRODUCT }) },
  { method: 'POST', path: '/v1/tradia/agent/plan', action: 'tradia.agent.plan', handler: (b) => generateAgentPlan(b as unknown as Parameters<typeof generateAgentPlan>[0]) },
  { method: 'POST', path: '/v1/tradia/market/analyze', action: 'tradia.market.analyze', handler: (b) => analyzeMarketContext(b as unknown as Parameters<typeof analyzeMarketContext>[0]) },
  { method: 'POST', path: '/v1/tradia/signal/evaluate', action: 'tradia.signal.evaluate', handler: (b) => evaluateSignal(b as unknown as Parameters<typeof evaluateSignal>[0]) },
  { method: 'POST', path: '/v1/tradia/risk/check', action: 'tradia.risk.check', handler: (b) => ({ result: checkRiskInternal(b as unknown as Parameters<typeof checkRiskInternal>[0]) }) },
  { method: 'POST', path: '/v1/tradia/trade/propose', action: 'tradia.trade.propose', handler: (b) => proposeTrade(b as unknown as Parameters<typeof proposeTrade>[0]) },
  { method: 'POST', path: '/v1/tradia/trade/journal', action: 'tradia.trade.journal', handler: (b) => journalTrade(b as unknown as Parameters<typeof journalTrade>[0]) },
  { method: 'POST', path: '/v1/tradia/portfolio/report', action: 'tradia.portfolio.report', handler: (b) => generatePortfolioReport(b as unknown as Parameters<typeof generatePortfolioReport>[0]) },
  { method: 'POST', path: '/v1/tradia/performance/analyze', action: 'tradia.performance.analyze', handler: (b) => analyzePerformance(b as unknown as Parameters<typeof analyzePerformance>[0]) },
  { method: 'POST', path: '/v1/tradia/public-update/generate', action: 'tradia.public_update.generate', handler: (b) => generatePublicUpdate(b as unknown as Parameters<typeof generatePublicUpdate>[0]) },
  { method: 'POST', path: '/v1/tradia/backtest/simulate', action: 'tradia.backtest.simulate', handler: (b) => simulateBacktest(b as unknown as Parameters<typeof simulateBacktest>[0]) },
  { method: 'POST', path: '/v1/tradia/accountability/card', action: 'tradia.accountability.card', handler: (b) => generateAccountabilityCard(b as unknown as Parameters<typeof generateAccountabilityCard>[0]) },
  { method: 'POST', path: '/v1/tradia/export/markdown', action: 'tradia.export.markdown', handler: (b) => exportMarkdown(b as Record<string, unknown>) },
  { method: 'POST', path: '/v1/tradia/export/json', action: 'tradia.export.json', handler: (b) => exportJson(b as Record<string, unknown>) },
]

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (handleCors(req, res)) return

  const route = ROUTES.find(r => r.method === req.method && r.path === req.url?.split('?')[0])

  if (!route) {
    errorResponse(res, 404, 'not_found', `Route not found: ${req.method} ${req.url}`)
    return
  }

  if (route.method === 'POST') {
    const isAuth = checkAuth(req)
    if (!isAuth) {
      errorResponse(res, 401, 'auth_error', 'Missing or invalid API key. Set TALOCODE_API_KEY or TRADIA_ALLOW_LOCAL_UNAUTH=true.')
      return
    }
  }

  if (route.method === 'POST' && route.action) {
    try {
      await chargeCredits(route.action as Parameters<typeof chargeCredits>[0])
    } catch (err) {
      if (err instanceof TradiaBillingError) {
        errorResponse(res, err.statusCode, err.code, err.message)
      } else {
        errorResponse(res, 502, 'billing_unavailable', 'Billing service unavailable')
      }
      return
    }
  }

  if (route.method === 'GET') {
    try {
      const result = route.handler({})
      jsonResponse(res, 200, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error'
      errorResponse(res, 500, 'internal_error', message)
    }
    return
  }

  try {
    const body = await readBody(req)
    const result = route.handler(body)
    jsonResponse(res, 200, result)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Request body too large') {
        errorResponse(res, 413, 'request_too_large', 'Request body exceeds maximum size')
      } else if (err.message === 'Invalid JSON') {
        errorResponse(res, 400, 'invalid_json', 'Request body must be valid JSON')
      } else {
        errorResponse(res, 500, 'internal_error', err.message)
      }
    } else {
      errorResponse(res, 500, 'internal_error', 'Unknown error')
    }
  }
}

export function createTradiaServer() {
  const port = parseInt(process.env.PORT || '3070', 10)

  const server = createServer((req, res) => {
    req.setTimeout(TIMEOUT_MS, () => {
      errorResponse(res, 408, 'timeout', 'Request timeout')
      req.destroy()
    })
    handleRequest(req, res).catch((err) => {
      console.error('Unhandled server error:', err instanceof Error ? err.message : err)
      if (!res.headersSent) {
        errorResponse(res, 500, 'internal_error', 'Internal server error')
      }
    })
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`Tradia API server v${VERSION} listening on 0.0.0.0:${port}`)
  })

  const gracefulShutdown = () => {
    console.log('Shutting down gracefully...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 5000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  return server
}

const isMainModule = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('dist/server.js')
if (isMainModule) {
  createTradiaServer()
}
