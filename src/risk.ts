import type { RiskCheckInput, RiskResult, RiskRewardResult, PositionSizeResult, DrawdownResult, ExposureResult, TradePosition } from './types.js'

export function calculatePositionSize(accountBalance: number, riskPercent: number, entry: number, stopLoss: number): PositionSizeResult {
  const riskAmount = accountBalance * (riskPercent / 100)
  const priceRisk = Math.abs(entry - stopLoss)
  const units = priceRisk > 0 ? riskAmount / priceRisk : 0
  return {
    units: Math.round(units * 10000) / 10000,
    riskAmount: Math.round(riskAmount * 100) / 100,
    riskPercent,
  }
}

export function calculateRiskReward(entry: number, stopLoss: number, takeProfit: number, accountBalance?: number, riskPercent?: number): RiskRewardResult {
  const riskAmount = Math.abs(entry - stopLoss)
  const rewardAmount = Math.abs(takeProfit - entry)
  const ratio = riskAmount > 0 ? Math.round((rewardAmount / riskAmount) * 100) / 100 : 0
  const riskPercentOfAccount = accountBalance && riskPercent ? riskPercent : riskAmount > 0 && accountBalance ? Math.round((riskAmount / accountBalance) * 10000) / 100 : 0
  return {
    riskAmount: Math.round(riskAmount * 100) / 100,
    rewardAmount: Math.round(rewardAmount * 100) / 100,
    ratio,
    riskPercentOfAccount,
  }
}

export function calculateDrawdown(currentBalance: number, peakBalance: number): DrawdownResult {
  const drawdown = peakBalance - currentBalance
  const drawdownPercent = peakBalance > 0 ? (drawdown / peakBalance) * 100 : 0
  return {
    currentDrawdown: Math.round(drawdown * 100) / 100,
    maxDrawdown: Math.round(drawdown * 100) / 100,
    drawdownPercent: Math.round(drawdownPercent * 100) / 100,
  }
}

export function calculateExposure(openTrades: TradePosition[]): ExposureResult {
  const totalExposure = openTrades.reduce((sum, t) => sum + Math.abs(t.entry - t.stopLoss), 0)
  const totalRiskAmount = openTrades.reduce((sum, t) => sum + t.riskAmount, 0)
  return {
    totalExposure: Math.round(totalExposure * 100) / 100,
    totalRiskAmount: Math.round(totalRiskAmount * 100) / 100,
    totalRiskPercent: 0,
    tradeCount: openTrades.length,
  }
}

export function validateRiskRules(input: RiskCheckInput): { approved: boolean; violations: string[]; warnings: string[] } {
  const violations: string[] = []
  const warnings: string[] = []

  const riskAmount = input.accountBalance * (input.riskPercent / 100)
  const maxRisk = input.maxRiskPerTradePercent
    ? input.accountBalance * (input.maxRiskPerTradePercent / 100)
    : input.accountBalance * 0.01

  if (riskAmount > maxRisk) {
    violations.push(`Risk amount (${riskAmount.toFixed(2)}) exceeds max risk per trade (${maxRisk.toFixed(2)})`)
  }

  if (input.riskPercent > 5) {
    violations.push(`Risk per trade (${input.riskPercent}%) exceeds 5% maximum`)
  }

  if (input.openTrades && input.openTrades.length > 0) {
    const totalOpenRisk = input.openTrades.reduce((sum, t) => sum + t.riskAmount, 0) + riskAmount
    const dailyLimit = input.dailyLossLimitPercent
      ? input.accountBalance * (input.dailyLossLimitPercent / 100)
      : input.accountBalance * 0.03
    if (totalOpenRisk > dailyLimit) {
      violations.push(`Total open risk (${totalOpenRisk.toFixed(2)}) exceeds daily loss limit (${dailyLimit.toFixed(2)})`)
    }
  }

  if (input.riskPercent > 2) {
    warnings.push('Risk per trade exceeds 2%. Consider reducing position size.')
  }

  const rr = input.stopLoss !== input.entry
    ? Math.abs(input.takeProfit - input.entry) / Math.abs(input.stopLoss - input.entry)
    : 0
  if (rr < 1) {
    warnings.push('Risk-reward ratio is below 1. This trade may not be favorable.')
  }

  return {
    approved: violations.length === 0,
    violations,
    warnings,
  }
}

export function detectRevengeTrading(trades: TradePosition[]): { detected: boolean; reason: string | null } {
  if (trades.length < 3) return { detected: false, reason: null }

  const recentTrades = trades.slice(-5)
  const losses = recentTrades.filter(t => t.rMultiple !== undefined && t.rMultiple < 0)
  const consecutiveLosses = countConsecutiveLosses(recentTrades)

  if (consecutiveLosses >= 3) {
    return {
      detected: true,
      reason: `Detected ${consecutiveLosses} consecutive losing trades. Possible revenge trading pattern.`,
    }
  }

  const lossRate = losses.length / recentTrades.length
  if (lossRate > 0.7 && recentTrades.length >= 4) {
    return {
      detected: true,
      reason: `High loss rate (${Math.round(lossRate * 100)}%) in recent trades. Review if emotional trading is occurring.`,
    }
  }

  return { detected: false, reason: null }
}

function countConsecutiveLosses(trades: TradePosition[]): number {
  let count = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i]
    if (t.rMultiple !== undefined && t.rMultiple < 0) {
      count++
    } else {
      break
    }
  }
  return count
}

export function detectOverleveraging(openTrades: TradePosition[], accountBalance: number): { detected: boolean; reason: string | null } {
  if (openTrades.length === 0) return { detected: false, reason: null }

  const totalRiskAmount = openTrades.reduce((sum, t) => sum + t.riskAmount, 0)
  const totalRiskPercent = accountBalance > 0 ? (totalRiskAmount / accountBalance) * 100 : 0

  if (totalRiskPercent > 15) {
    return {
      detected: true,
      reason: `Total risk across open trades is ${Math.round(totalRiskPercent)}% of account. Overleveraging detected.`,
    }
  }

  if (openTrades.length > 5) {
    return {
      detected: true,
      reason: `${openTrades.length} open positions. Consider reducing number of concurrent trades.`,
    }
  }

  return { detected: false, reason: null }
}

export function detectRuleViolation(input: RiskCheckInput): { detected: boolean; violations: string[] } {
  const result = validateRiskRules(input)
  return {
    detected: result.violations.length > 0,
    violations: result.violations,
  }
}

export function checkRiskInternal(input: RiskCheckInput): RiskResult {
  const validation = validateRiskRules(input)
  const rr = input.stopLoss !== input.entry
    ? Math.abs(input.takeProfit - input.entry) / Math.abs(input.stopLoss - input.entry)
    : 0
  const riskAmount = input.accountBalance * (input.riskPercent / 100)
  const priceRisk = Math.abs(input.entry - input.stopLoss)
  const positionSize = priceRisk > 0 ? riskAmount / priceRisk : 0

  return {
    approved: validation.approved,
    riskAmount: Math.round(riskAmount * 100) / 100,
    riskRewardRatio: Math.round(rr * 100) / 100,
    positionSizeEstimate: {
      units: Math.round(positionSize * 10000) / 10000,
      riskAmount: Math.round(riskAmount * 100) / 100,
      riskPercent: input.riskPercent,
    },
    violations: validation.violations,
    warnings: validation.warnings,
    humanReviewRequired: true,
    notFinancialAdvice: true,
  }
}
