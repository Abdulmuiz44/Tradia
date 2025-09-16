export type PlanTier = 'free' | 'pro' | 'plus' | 'elite'

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
    minPlan: 'free',
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
    minPlan: 'free',
  },
  {
    id: 'ui-refresh-2025-09',
    title: 'UI Refresh & Light/Dark Polish',
    body: 'Sharper branding, better contrast, and consistent components across dashboard sections.',
    date: '2025-09-15T00:00:00.000Z',
    minPlan: 'free',
  },
]

