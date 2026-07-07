import type { TradePosition, PerformanceResult } from './types.js'

export function computeWinRate(trades: TradePosition[]): number {
  const closed = trades.filter(t => t.rMultiple !== undefined)
  if (closed.length === 0) return 0
  const wins = closed.filter(t => (t.rMultiple || 0) > 0).length
  return Math.round((wins / closed.length) * 10000) / 100
}

export function computeAverageR(trades: TradePosition[]): number {
  const closed = trades.filter(t => t.rMultiple !== undefined)
  if (closed.length === 0) return 0
  const totalR = closed.reduce((sum, t) => sum + (t.rMultiple || 0), 0)
  return Math.round((totalR / closed.length) * 100) / 100
}

export function computeProfitFactor(trades: TradePosition[]): number {
  const closed = trades.filter(t => t.rMultiple !== undefined)
  const grossProfit = closed.filter(t => (t.rMultiple || 0) > 0).reduce((sum, t) => sum + (t.rMultiple || 0) * (t.riskAmount || 0), 0)
  const grossLoss = Math.abs(closed.filter(t => (t.rMultiple || 0) < 0).reduce((sum, t) => sum + (t.rMultiple || 0) * (t.riskAmount || 0), 0))
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0
  return Math.round((grossProfit / grossLoss) * 100) / 100
}

export function computeExpectancy(trades: TradePosition[]): number {
  const closed = trades.filter(t => t.rMultiple !== undefined)
  if (closed.length === 0) return 0
  const totalR = closed.reduce((sum, t) => sum + (t.rMultiple || 0), 0)
  const avgWin = closed.filter(t => (t.rMultiple || 0) > 0).reduce((sum, t) => sum + (t.rMultiple || 0), 0) / Math.max(closed.filter(t => (t.rMultiple || 0) > 0).length, 1)
  const avgLoss = Math.abs(closed.filter(t => (t.rMultiple || 0) < 0).reduce((sum, t) => sum + (t.rMultiple || 0), 0)) / Math.max(closed.filter(t => (t.rMultiple || 0) < 0).length, 1)
  const winRate = closed.filter(t => (t.rMultiple || 0) > 0).length / closed.length
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss)
  return Math.round(expectancy * 100) / 100
}

export function computeMaxDrawdown(trades: TradePosition[]): number {
  let peak = 0
  let maxDd = 0
  let balance = 0

  for (const t of trades) {
    const r = t.rMultiple || 0
    const riskAmt = t.riskAmount || 0
    balance += r * riskAmt
    if (balance > peak) peak = balance
    const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }

  return Math.round(maxDd * 100) / 100
}

export function computePerformanceStats(trades: TradePosition[], startingBalance: number): PerformanceResult {
  const closed = trades.filter(t => t.rMultiple !== undefined)
  const wins = closed.filter(t => (t.rMultiple || 0) > 0).length
  const losses = closed.filter(t => (t.rMultiple || 0) < 0).length
  const totalTrades = closed.length

  let currentBalance = startingBalance
  for (const t of closed) {
    const r = t.rMultiple || 0
    const riskAmt = t.riskAmount || 0
    currentBalance += r * riskAmt
  }

  const sinceInception = startingBalance > 0
    ? Math.round(((currentBalance - startingBalance) / startingBalance) * 10000) / 100
    : null

  return {
    winRate: computeWinRate(trades),
    averageR: computeAverageR(trades),
    profitFactor: computeProfitFactor(trades),
    expectancy: computeExpectancy(trades),
    maxDrawdown: computeMaxDrawdown(trades),
    sevenDay: null,
    twentyEightDay: null,
    threeSixtyFiveDay: null,
    sinceInception,
    totalTrades,
    wins,
    losses,
  }
}

export function compute7d28d365dPerformance(trades: TradePosition[], days: 7 | 28 | 365): number | null {
  if (trades.length === 0) return null
  const relevantTrades = trades.slice(-Math.max(Math.floor(trades.length * (days / 365)), 1))
  const total = relevantTrades.reduce((sum, t) => sum + ((t.rMultiple || 0) * (t.riskAmount || 0)), 0)
  return Math.round(total * 100) / 100
}

export function computeSinceInception(trades: TradePosition[], startingBalance: number): number | null {
  if (trades.length === 0 || startingBalance <= 0) return null
  let currentBalance = startingBalance
  for (const t of trades) {
    const r = t.rMultiple || 0
    const riskAmt = t.riskAmount || 0
    currentBalance += r * riskAmt
  }
  return Math.round(((currentBalance - startingBalance) / startingBalance) * 10000) / 100
}
