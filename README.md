# Tradia - AI Trading Performance Assistant

Welcome to **[Tradia](https://tradiaai.app)**, the all-in-one AI-powered trading performance assistant that helps traders understand, analyze, and improve their results. Built with Next.js, Supabase, and modern AI tooling, Tradia combines actionable analytics with an AI coach experience across desktop and mobile.

## 🚀 Core Capabilities

### Trading Performance & Analytics
- **AI Trading Coach** – Conversational and voice guidance driven by Mistral, including daily performance summaries and strategy feedback.
- **Performance Analytics** – Automated win-rate, profit factor, drawdown, and expectancy calculations with interactive Plotly visualizations.
- **Trade Import Pipeline** – Upload CSV/XLSX exports, parse instantly, and review risk metrics by pair, timeframe, or strategy tag.
- **Journaling & Tagging** – Add notes, labels, and exportable PDF/Excel reports to track psychology and behavior over time.

### Multi-Account Management
- **Multiple Trading Accounts** – Manage personal accounts, prop firm accounts, demo accounts all in one place.
- **Plan-Based Account Limits** – Starter: 2, Pro: 5, Plus: 10, Elite: Unlimited accounts.
- **Account-Specific Analytics** – Track performance, trades, and statistics per account.

### AI Features
- **Chat Modes** – Assistant, Coach, Mentor, Analyst, and Strategist modes (unlocked progressively by plan).
- **Image Processing** – Upload trade screenshots for AI analysis (Plus+ only).
- **Voice Input & Output** – Voice-based trading guidance (Pro+ only).
- **Export & Share** – Export conversations and share with team members (Pro+ only).
- **AI Strategy Builder** – Generate and optimize trading strategies (Elite only).

### Plan-Based Feature Unlocking
- **Automatic Feature Detection** – Features unlock automatically based on user's current plan.
- **Tier-Based Limits** – Chat messages, conversations, account limits, and AI features controlled by subscription tier.
- **Instant Activation** – Payment webhook automatically activates plan and unlocks features.

## 📊 Plans & Pricing

| Feature | Starter (Free) | Pro ($9/mo) | Plus ($19/mo) | Elite ($39/mo) |
|---------|---|---|---|---|
| **AI Chats / Day** | 10 | 50 | 200 | Unlimited |
| **Daily Conversations** | 5 | 25 | 100 | Unlimited |
| **Voice Input** | ❌ | ✅ | ✅ | ✅ |
| **Image Processing** | ❌ | ❌ | ✅ | ✅ |
| **Chat Export & Share** | ❌ | ✅ | ✅ | ✅ |
| **Chat Modes** | 2 | 3 | 4 | 5 |
| **Attached Trades/Chat** | 3 | 10 | Unlimited | Unlimited |
| **Trading Accounts** | 2 | 5 | 10 | Unlimited |
| **History Retention** | 30 days | 6 months | 12 months | Unlimited |
| **Advanced Analytics** | ❌ | ✅ | ✅ | ✅ |
| **Strategy Builder** | ❌ | ❌ | ❌ | ✅ |

**Billing Options**: Monthly or Yearly (17% discount on yearly)

## 💳 Payment & Subscriptions

### LemonSqueezy Integration
- **Payment Gateway**: LemonSqueezy (replaces Flutterwave)
- **Supported Plans**: Pro, Plus, Elite with 2 billing cycles each (6 variants total)
- **Webhook Processing**: Automatic plan activation on successful payment
- **Guest Checkout**: Accepts both authenticated users and guests

### Checkout Flow
1. User clicks "Upgrade" on any plan
2. Redirected to `/checkout` page
3. Selects plan and billing cycle (monthly/yearly)
4. Enters email (if not authenticated)
5. Redirected to LemonSqueezy hosted checkout
6. Payment processed securely
7. Webhook updates user's plan in database
8. Features unlock automatically on next session

### Environment Variables Required
```env
# LemonSqueezy Credentials
LEMONSQUEEZY_API_KEY=sk_live_xxxxx
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxxxx

# Plan Variant IDs (create in LemonSqueezy dashboard)
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_PRO_YEARLY=xxxxx
LEMONSQUEEZY_VARIANT_PLUS_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_PLUS_YEARLY=xxxxx
LEMONSQUEEZY_VARIANT_ELITE_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_ELITE_YEARLY=xxxxx
```

## 🔄 Feature Lock System

### Automatic Feature Detection
- Features are locked/unlocked based on user's plan stored in database
- Session automatically enriched with plan data via Next-Auth
- Frontend components check plan and disable/hide locked features
- No manual configuration needed

### Components & Files
- **FeatureLock.tsx**: Wraps locked features, shows upgrade button
- **chatPlanLimits.ts**: Defines all chat feature limits per plan
- **planAccess.ts**: Core validation functions for feature access
- **Webhook Handler**: Updates user plan on successful payment

## 📋 Prerequisites

- Node.js 18+
- `pnpm` (preferred) or npm
- Supabase project with Postgres database
- Mistral API key for AI features
- **NEW**: LemonSqueezy account with API key and webhook secret configured

## ⚙️ Getting Started

```bash
git clone https://github.com/Abdulmuiz44/Tradia.git
cd Tradia
pnpm install
cp .env.example .env.local
```

Populate `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key

# LemonSqueezy Configuration (NEW)
LEMONSQUEEZY_API_KEY=sk_live_xxxxx
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxxxx
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_PRO_YEARLY=xxxxx
LEMONSQUEEZY_VARIANT_PLUS_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_PLUS_YEARLY=xxxxx
LEMONSQUEEZY_VARIANT_ELITE_MONTHLY=xxxxx
LEMONSQUEEZY_VARIANT_ELITE_YEARLY=xxxxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_ADMIN_EMAIL=founder@example.com

# Optional: Auth & Monitoring
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Supabase Bootstrapping

1. Create a project at [supabase.com](https://supabase.com) and copy the project URL plus service keys.
2. In the SQL editor run the statements from `supabase-minimal.sql` to create tables, buckets, and enums.
3. Apply Row Level Security using `create-policies.sql`. If execution fails in bulk, run the provided SQL chunks or configure policies manually via **Authentication › Policies**.
4. Run the LemonSqueezy migration: `database/migrations/2025-01-15_add_lemonsqueezy_support.sql` for payment tracking tables.
5. Confirm the `chat-uploads` storage bucket exists (create it manually if not).

### LemonSqueezy Setup

1. Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Navigate to **Settings > API Tokens** and create an API key
3. Navigate to **Settings > Webhooks** and create webhook:
   - URL: `https://your-production-domain.com/api/payments/webhook`
   - Subscribe to: `subscription.created`, `subscription_payment_success`, `subscription.updated`, `subscription.cancelled`
   - Copy signing secret
4. Create 3 products (Pro, Plus, Elite) with 2 variants each (Monthly & Yearly)
5. Copy variant IDs to `.env.local` (see Environment Variables above)
6. Deploy and add webhook secret to Vercel environment variables

### Development Workflow

```bash
pnpm run dev
```

Visit `http://localhost:3000` once the dev server reports ready.

## 🧰 Project Scripts

```bash
pnpm run dev              # Start the Next.js dev server
pnpm run build            # Production build
pnpm run start            # Serve built app
pnpm run lint             # ESLint checks
pnpm run type-check       # TypeScript project refs
pnpm run test             # Jest unit tests
pnpm run test:e2e         # Playwright end-to-end suite
pnpm run analyze          # Bundle analysis report (ANALYZE=true)
```

## 🗂️ Project Structure

```
src/
├── app/                  # Next.js app router entry points
│   ├── api/
│   │   └── payments/     # Payment endpoints (NEW: LemonSqueezy)
│   ├── checkout/         # Checkout page (NEW)
│   └── dashboard/
├── components/           # Shared UI, AI chat, pricing, dashboards
│   ├── FeatureLock.tsx   # Feature gating wrapper (NEW: enhanced)
│   └── pricing/          # Pricing components (NEW: updated for Elite)
├── contexts/             # React context providers
├── hooks/                # Client hooks
├── lib/
│   ├── lemonsqueezy.server.ts  # LemonSqueezy utilities (NEW)
│   ├── chatPlanLimits.ts       # Chat feature limits (NEW: complete)
│   ├── planAccess.ts           # Plan validation functions (UPDATED)
│   └── payment-logging.server.ts # Payment logging (NEW)
├── styles/               # Tailwind/global styling
└── types/                # TypeScript type definitions
```

## 🔐 Security & Compliance

- **Supabase**: Encryption at rest, HTTPS for all data transfer, JWT-based auth
- **Webhook Validation**: HMAC-SHA256 signature verification for all LemonSqueezy webhooks
- **Plan Enforcement**: Dual-layer validation (frontend + API) prevents unauthorized feature access
- **Row-Level Security**: RLS policies ensure users can only access their own data
- **Sentry & PostHog**: Optional integrations for error tracking and analytics (ensure consent banners for production)
- **API Keys**: Never commit `.env.local` to git; use environment variables on production servers

## 🧪 Quality & Monitoring

- **ESLint + TypeScript**: Run `pnpm run lint && pnpm run type-check` before commits
- **Jest/Playwright**: Harnesses exist for unit and E2E tests
- **Payment Monitoring**: All payment events logged to `payment_logs` table for audit trail
- **Webhook Logs**: Visible in LemonSqueezy dashboard for debugging payment issues
- **Vercel**: Recommended for hosting; monitor Core Web Vitals and error rates post-deployment

## 🛠 Troubleshooting

### Payment Issues
- **Webhook not firing**: Verify webhook URL is accessible from internet (not localhost). Use LemonSqueezy dashboard to test webhook manually.
- **Checkout redirect fails**: Check that all `LEMONSQUEEZY_VARIANT_*` IDs are set in environment variables.
- **Plan not activating**: Check `payment_logs` table for webhook errors, verify webhook signature secret is correct.

### Feature Not Unlocking
- Verify user's plan in `users` table matches expected value
- Check browser console for errors
- Clear browser cache and refresh session
- Ensure you're on the correct plan tier

### General Issues
- Dev server port conflicts: ensure no other Next.js instance is bound to `127.0.0.1:3000`
- Supabase policy errors: verify RLS policies align with `auth.uid()` usage in SQL scripts
- Mistral API issues: ensure `MISTRAL_API_KEY` is valid and has sufficient quota
- For Windows developers: use provided PowerShell scripts (`deploy-vercel.ps1`)

## 📚 Documentation

- **LEMONSQUEEZY_SETUP_CHECKLIST.md**: Complete setup guide for LemonSqueezy integration
- **FINAL_SUMMARY.md**: Multi-account system implementation details
- **PLAN_LIMITS_SUMMARY.md**: Quick reference for plan limits and feature matrix
- **QUICK_START_LEMONSQUEEZY.md**: Fast setup guide for payment integration

## 🤝 Contributing

1. Fork the repo and create a feature branch
2. Install dependencies via `pnpm install`
3. Run lint, type-check, and tests locally
4. Verify build succeeds: `pnpm run build`
5. Submit a PR describing changes, screenshots for UI updates, and any database migrations used

## 📝 License & Support

Tradia operates under the MIT License. For support or product inquiries, open an issue or reach out via the channels listed in `TRADIA_AI_README.md`.

---

**Latest Updates:**
- ✅ Complete LemonSqueezy payment integration with automatic plan activation
- ✅ Multi-account trading system with plan-based limits
- ✅ Comprehensive feature unlock system with progressive access
- ✅ Elite plan with unlimited features and dedicated support
- ✅ Production-ready checkout flow and webhook processing

Build responsibly, trade intentionally, and let Tradia surface the insights that move your performance forward.
