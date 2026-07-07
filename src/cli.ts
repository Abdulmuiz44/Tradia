#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TradiaClient } from './client.js'
import { checkRiskInternal } from './risk.js'
import { proposeTrade, simulateBacktest, journalTrade, generatePublicUpdate, generateAccountabilityCard } from './engine.js'
import type { TradePosition } from './types.js'

const VERSION = '0.1.0'

function printHelp(): void {
  console.log(`
Tradia Agentic Trading OS v${VERSION}

Usage: tradia <command> [options]

Commands:
  agent-plan          Generate an agent trading plan
  market-analyze      Analyze market context
  signal              Evaluate a trading signal
  risk                Check risk parameters
  propose             Generate a trade proposal
  journal             Create a trade journal entry
  performance         Analyze trading performance
  report              Generate a portfolio report
  public-update       Generate a public accountability update
  backtest            Simulate backtest on historical trades
  accountability      Generate an accountability card
  export-markdown     Export data as markdown
  export-json         Export data as JSON
  whoami              Show current configuration
  config              Show current configuration
  --help, -h          Show this help message
  --version, -v       Show version

Global options:
  --cloud             Use hosted Talocode Cloud API (requires TALOCODE_API_KEY)
  --output <file>     Write output to file
  --format <format>   Output format: json (default) or markdown

Examples:
  tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350
  tradia risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350
  tradia journal --file trade.json
  tradia backtest --file trades.json --balance 500 --risk 0.5

⚠️  Not financial advice. Human review required before acting on any trade.
`.trim())
}

function printVersion(): void {
  console.log(`tradia v${VERSION}`)
}

function parseArgs(): Record<string, string | boolean> {
  const args = process.argv.slice(2)
  const parsed: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1]
        i++
      } else {
        parsed[key] = true
      }
    } else if (args[i].startsWith('-') && !args[i].startsWith('--')) {
      const shortOpts: Record<string, string> = { h: 'help', v: 'version' }
      const key = shortOpts[args[i].slice(1)]
      if (key) parsed[key] = true
    }
  }
  return parsed
}

function readJsonFile(filePath: string): Record<string, unknown> {
  const resolved = resolve(filePath)
  if (!existsSync(resolved)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  const content = readFileSync(resolved, 'utf-8')
  return JSON.parse(content)
}

function outputResult(result: unknown, options: Record<string, string | boolean>): void {
  const format = (options.format as string) || 'json'
  const outFile = options.output as string | undefined
  let output: string

  if (format === 'markdown') {
    const r = result as Record<string, unknown>
    output = (r?.result as Record<string, unknown>)?.markdown as string || JSON.stringify(result, null, 2)
  } else {
    output = JSON.stringify(result, null, 2)
  }

  if (outFile) {
    writeFileSync(resolve(outFile), output, 'utf-8')
    console.log(`Output written to ${outFile}`)
  } else {
    console.log(output)
  }
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2).filter(a => !a.startsWith('-'))
  const options = parseArgs()

  if (options.help) {
    printHelp()
    return
  }

  if (options.version) {
    printVersion()
    return
  }

  if (!command || command === 'help') {
    printHelp()
    return
  }

  const useCloud = !!options.cloud || false
  const apiKey = process.env.TALOCODE_API_KEY
  const baseUrl = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
  const client = new TradiaClient({ apiKey, baseUrl, useCloud: useCloud && !!apiKey })

  switch (command) {
    case 'whoami':
    case 'config': {
      console.log(JSON.stringify({
        version: VERSION,
        apiKeyConfigured: !!process.env.TALOCODE_API_KEY,
        apiKeyRedacted: process.env.TALOCODE_API_KEY ? process.env.TALOCODE_API_KEY.slice(0, 4) + '****' : null,
        baseUrl: baseUrl,
        localUnauth: process.env.TRADIA_ALLOW_LOCAL_UNAUTH === 'true',
        cloudMode: useCloud,
      }, null, 2))
      break
    }

    case 'agent-plan': {
      const result = await client.agent.plan({
        symbol: (options.symbol as string) || undefined,
        strategy: (options.strategy as string) as Parameters<typeof client.agent.plan>[0]['strategy'],
        timeframe: (options.timeframe as string) as Parameters<typeof client.agent.plan>[0]['timeframe'],
        marketContext: (options.context as string) || undefined,
        riskPercent: options.risk ? parseFloat(options.risk as string) : undefined,
        accountBalance: options.balance ? parseFloat(options.balance as string) : undefined,
        mode: (options.mode as string) as Parameters<typeof client.agent.plan>[0]['mode'] || 'proposal',
      })
      outputResult(result, options)
      break
    }

    case 'market-analyze': {
      const result = await client.market.analyze({
        symbol: (options.symbol as string) || 'XAUUSD',
        timeframe: (options.timeframe as string) as Parameters<typeof client.market.analyze>[0]['timeframe'] || '1h',
        context: (options.context as string) || '',
      })
      outputResult(result, options)
      break
    }

    case 'signal': {
      const result = await client.signal.evaluate({
        symbol: (options.symbol as string) || 'XAUUSD',
        strategy: (options.strategy as string) as Parameters<typeof client.signal.evaluate>[0]['strategy'] || 'custom',
        context: (options.context as string) || '',
        timeframe: (options.timeframe as string) as Parameters<typeof client.signal.evaluate>[0]['timeframe'] || '1h',
      })
      outputResult(result, options)
      break
    }

    case 'risk': {
      const balance = parseFloat(options.balance as string)
      const riskPercent = parseFloat(options.risk as string)
      const entry = parseFloat(options.entry as string)
      const stop = parseFloat(options.stop as string)
      const target = parseFloat(options.target as string)

      if (isNaN(balance) || isNaN(riskPercent) || isNaN(entry) || isNaN(stop) || isNaN(target)) {
        console.error('Usage: tradia risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350')
        process.exit(1)
      }

      const result = checkRiskInternal({ accountBalance: balance, riskPercent, entry, stopLoss: stop, takeProfit: target })
      outputResult({ result }, options)
      break
    }

    case 'propose': {
      const symbol = (options.symbol as string)
      const market = (options.market as string)
      const strategy = (options.strategy as string) as Parameters<typeof proposeTrade>[0]['strategy']
      const balance = parseFloat(options.balance as string)
      const riskPercent = parseFloat(options.risk as string)
      const entry = parseFloat(options.entry as string)
      const stop = parseFloat(options.stop as string)
      const target = parseFloat(options.target as string)
      const timeframe = (options.timeframe as string) as Parameters<typeof proposeTrade>[0]['timeframe']

      if (!symbol || !market || isNaN(balance) || isNaN(riskPercent) || isNaN(entry) || isNaN(stop) || isNaN(target)) {
        console.error('Usage: tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350')
        process.exit(1)
      }

      const result = proposeTrade({
        symbol, market: market as Parameters<typeof proposeTrade>[0]['market'],
        strategy, accountBalance: balance, riskPercent, entry, stopLoss: stop, takeProfit: target,
        timeframe, marketContext: (options.context as string) || undefined, setupNotes: (options.notes as string) || undefined,
      })
      outputResult(result, options)
      break
    }

    case 'journal': {
      const data = readJsonFile(options.file as string)
      const result = journalTrade(data as unknown as Parameters<typeof journalTrade>[0])
      outputResult(result, options)
      break
    }

    case 'performance': {
      const data = readJsonFile(options.file as string)
      const trades = (data.trades || data) as TradePosition[]
      const balance = parseFloat(options.balance as string) || data.startingBalance as number || 0
      const result = await client.performance.analyze({ trades, startingBalance: balance })
      outputResult(result, options)
      break
    }

    case 'report': {
      const data = readJsonFile(options.file as string)
      const trades = (data.trades || data) as TradePosition[]
      const balance = parseFloat(options.balance as string) || data.accountBalance as number || 0
      const result = await client.portfolio.report({ trades, accountBalance: balance })
      outputResult(result, options)
      break
    }

    case 'public-update': {
      const data = readJsonFile(options.file as string)
      const result = generatePublicUpdate(data as unknown as Parameters<typeof generatePublicUpdate>[0])
      outputResult(result, options)
      break
    }

    case 'backtest': {
      const data = readJsonFile(options.file as string)
      const trades = (data.trades || data) as TradePosition[]
      const balance = parseFloat(options.balance as string) || data.startingBalance as number || 1000
      const riskPercent = parseFloat(options.risk as string) || data.riskPercent as number || 0.5
      const result = simulateBacktest({ strategy: (data.strategy as string || 'custom') as Parameters<typeof simulateBacktest>[0]['strategy'], trades, startingBalance: balance, riskPercent })
      outputResult(result, options)
      break
    }

    case 'accountability': {
      const data = readJsonFile(options.file as string)
      const result = generateAccountabilityCard(data as Parameters<typeof generateAccountabilityCard>[0])
      outputResult(result, options)
      break
    }

    case 'export-markdown': {
      const data = readJsonFile(options.file as string)
      const { exportMarkdown: exportMd } = await import('./engine')
      const result = exportMd(data)
      outputResult(result, options)
      break
    }

    case 'export-json': {
      const data = readJsonFile(options.file as string)
      const { exportJson: exportJ } = await import('./engine')
      const result = exportJ(data)
      outputResult(result, options)
      break
    }

    default: {
      console.error(`Unknown command: ${command}`)
      console.error('Run "tradia --help" for usage.')
      process.exit(1)
    }
  }
}

main().catch((err: Error) => {
  console.error('Error:', err.message)
  process.exit(1)
})
