import type { JournalInput } from './types.js'

export function createJournalEntryInternal(input: JournalInput): string {
  const pnl = input.profitLoss >= 0 ? `+$${input.profitLoss.toFixed(2)}` : `-$${Math.abs(input.profitLoss).toFixed(2)}`
  const outcome = input.profitLoss >= 0 ? 'winning' : 'losing'

  const lines: string[] = [
    `# Trade Journal: ${input.symbol} ${input.direction.toUpperCase()}`,
    '',
    `**Date**: ${new Date().toISOString().split('T')[0]}`,
    `**Symbol**: ${input.symbol}`,
    `**Direction**: ${input.direction}`,
    `**Entry**: ${input.entry}`,
    `**Exit**: ${input.exit}`,
    `**P&L**: ${pnl} (${input.rMultiple.toFixed(2)}R)`,
    `**Risk Amount**: $${input.riskAmount.toFixed(2)}`,
    '',
    `**Reason for Trade**: ${input.reason}`,
    '',
    `**Outcome**: ${outcome} trade`,
  ]

  if (input.mistakes && input.mistakes.length > 0) {
    lines.push('', '**Mistakes**:')
    for (const m of input.mistakes) {
      lines.push(`- ${m}`)
    }
  }

  lines.push('', `**Rules Followed**: ${input.rulesFollowed ? 'Yes' : 'No'}`)
  lines.push('', '---', '*Not financial advice. Educational journal entry for personal review.*')

  return lines.join('\n')
}

export function extractTradeLessonInternal(input: JournalInput): string {
  if (input.mistakes && input.mistakes.length > 0) {
    return `Key lesson: ${input.mistakes[0]}. Remember to ${input.mistakes[0].toLowerCase().includes('not') ? 'stay disciplined' : 'follow your trading plan'} in future trades.`
  }

  if (input.rulesFollowed && input.rMultiple > 0) {
    return `Following the trading plan works. The trade aligned with the analysis and produced a ${input.rMultiple.toFixed(2)}R result. Keep executing with discipline.`
  }

  if (!input.rulesFollowed) {
    return 'Rules were broken. Review your process and identify why the plan was not followed.'
  }

  return 'Document your lessons and review this trade as part of your ongoing improvement.'
}

export function classifyTradeMistake(mistake: string): string {
  const lower = mistake.toLowerCase()
  if (lower.includes('entry') || lower.includes('entered') || lower.includes('early') || lower.includes('late')) return 'entry_timing'
  if (lower.includes('stop') || lower.includes('sl') || lower.includes('exit') || lower.includes('cut')) return 'risk_management'
  if (lower.includes('size') || lower.includes('lot') || lower.includes('over')) return 'position_sizing'
  if (lower.includes('revenge') || lower.includes('fomo') || lower.includes('emotion') || lower.includes('greed') || lower.includes('fear')) return 'emotional'
  if (lower.includes('rule') || lower.includes('plan') || lower.includes('discipline') || lower.includes('skip')) return 'discipline'
  if (lower.includes('news') || lower.includes('event') || lower.includes('data')) return 'news_avoidance'
  if (lower.includes('confirmation') || lower.includes('signal') || lower.includes('verify')) return 'confirmation'
  return 'other'
}

export function scoreDiscipline(input: JournalInput): number {
  let score = 50
  if (input.rulesFollowed) score += 25
  if (input.reason && input.reason.length > 10) score += 10
  if (input.mistakes && input.mistakes.length === 0) score += 10
  if (input.rMultiple > 0 && input.rulesFollowed) score += 5
  if (input.riskAmount > 0) score += 5
  return Math.min(score, 100)
}

export function summarizeTradeOutcome(input: JournalInput): string {
  const pnl = input.profitLoss >= 0 ? `profitable (+${input.rMultiple.toFixed(2)}R)` : `loss (${input.rMultiple.toFixed(2)}R)`
  const lesson = extractTradeLessonInternal(input)

  return [
    `Trade: ${input.symbol} ${input.direction.toUpperCase()}`,
    `Outcome: ${pnl}`,
    `P&L: $${input.profitLoss.toFixed(2)}`,
    `Lesson: ${lesson}`,
    '⚠️ Not financial advice.',
  ].join(' | ')
}
