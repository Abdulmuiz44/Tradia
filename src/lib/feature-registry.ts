export type PlanTier = 'starter' | 'pro' | 'plus' | 'elite'

export type FeatureAnnouncement = {
  id: string
  title: string
  body: string
  date: string // ISO string
  minPlan?: PlanTier
}

// Central registry of user‑visible feature announcements.
// Add a new entry here whenever you ship a feature users should know about.
export const FEATURES: FeatureAnnouncement[] = [
  {
    id: 'multi-accounts',
    title: 'Multiple Account Support',
    body: 'Manage up to 10 trading accounts. Track separate balances, platforms, and performance metrics for each account.',
    date: '2026-01-18T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'tradia-score',
    title: 'Tradia Score',
    body: 'New composite health metric combining win rate, profit factor, consistency, and risk management into a single score.',
    date: '2026-01-18T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'light-mode-v1',
    title: 'Light Mode Support',
    body: 'Full light mode support across the dashboard for better visibility in bright environments. Toggle comfortably between themes.',
    date: '2026-01-18T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'billing-dashboard',
    title: 'New Billing Dashboard',
    body: 'Transparent plan usage tracking, clear limits, and easy upgrades. See exactly what you are paying for.',
    date: '2026-01-18T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'ta-guard-tilt-prop-matcher',
    title: 'New Analytics: Guard, Tilt, Prop, Matcher',
    body:
      'Daily Loss & Drawdown Guard, Tilt Mode Detector, Prop Dashboard, and Optimal Strategy Matcher are now available inside Trade Analytics.',
    date: '2025-09-16T00:00:00.000Z',
    minPlan: 'pro',
  },
  {
    id: 'ta-ai-forecast',
    title: 'AI Forecast in Analytics',
    body: 'AI Forecast widget delivers win probability, expected P&L, and R/R suggestions.',
    date: '2025-09-16T00:00:00.000Z',
    minPlan: 'pro',
  },
  {
    id: 'journal-review-risk',
    title: 'Journal: Review & Risk Tabs',
    body: 'Weekly Review KPIs and a Risk Budget calculator to size 1R and daily loss caps.',
    date: '2025-09-16T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'journal-mistakes',
    title: 'Journal: Mistake Analyzer',
    body: 'Find recurring losses by strategy, symbol, and trading hour with suggested guardrails.',
    date: '2025-09-16T00:00:00.000Z',
    minPlan: 'pro',
  },
  {
    id: 'journal-playbook',
    title: 'Journal: Strategy Playbook',
    body: 'Create setup playbooks with entry/exit rules and notes, saved locally per user.',
    date: '2025-09-16T00:00:00.000Z',
    minPlan: 'plus',
  },
  {
    id: 'payments-flutterwave-modes',
    title: 'Payments: More Flutterwave Methods',
    body: 'Card, bank transfer, USSD, QR, and mobile money now supported. Plans activate after successful payment.',
    date: '2025-08-29T00:00:00.000Z',
    minPlan: 'starter',
  },
  {
    id: 'ui-refresh-2025-09',
    title: 'UI Refresh & Light/Dark Polish',
    body: 'Sharper branding, better contrast, and consistent components across dashboard sections.',
    date: '2025-09-15T00:00:00.000Z',
    minPlan: 'starter',
  },
]

