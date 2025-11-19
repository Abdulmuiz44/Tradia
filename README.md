# Tradia - AI Trading Performance Assistant

Welcome to **[Tradia](https://tradiaai.app)**, the all-in-one AI-powered trading performance assistant that helps traders understand, analyze, and improve their results. Built with Next.js, Supabase, and modern AI tooling, Tradia combines actionable analytics with an AI coach experience across desktop and mobile.

## 🚀 Core Capabilities
- **AI Trading Coach** – Conversational and voice guidance driven by Mistral, including daily performance summaries and strategy feedback.
- **Performance Analytics** – Automated win-rate, profit factor, drawdown, and expectancy calculations with interactive Plotly visualizations.
- **Trade Import Pipeline** – Upload CSV/XLSX exports, parse instantly, and review risk metrics by pair, timeframe, or strategy tag.
- **Journaling & Tagging** – Add notes, labels, and exportable PDF/Excel reports to track psychology and behavior over time.
- **Usage & Plan Controls** – Tier-based limits (Free, Pro, Plus, Elite) with transparent quota tracking for chat, uploads, and history depth.
- **Offline & Reliability Features** – Client-side queueing, error boundaries, toast notifications, and retry logic keep the experience resilient.

## 📋 Prerequisites
- Node.js 18+
- `pnpm` (preferred) or npm
- Supabase project with a Postgres database
- Mistral API key for AI features
- Optional: Stripe/Flutterwave credentials for billing, Sentry/PostHog keys for monitoring

## ⚙️ Getting Started
```bash
git clone https://github.com/Abdulmuiz44/Tradia.git
cd Tradia
pnpm install
cp .env.example .env.local
```

Populate `.env.local` using the template below:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI / XAI Configuration
OPENAI_API_KEY=your_openai_api_key
XAI_API_KEY=your_xai_api_key
MISTRAL_API_KEY=your_mistral_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_ADMIN_EMAIL=founder@example.com
```

### Supabase Bootstrapping
1. Create a project at [supabase.com](https://supabase.com) and copy the project URL plus service keys.
2. In the SQL editor run the statements from `supabase-minimal.sql` to create tables, buckets, and enums.
3. Apply Row Level Security using `create-policies.sql`. If execution fails in bulk, run the provided SQL chunks or configure policies manually via **Authentication › Policies**.
4. Confirm the `chat-uploads` storage bucket exists (create it manually if not).

### Development Workflow
```bash
pnpm run dev
```
Visit `http://localhost:3000` once the dev server reports ready.

## 🧰 Project Scripts
```bash
pnpm run dev           # Start the Next.js dev server
pnpm run build         # Production build
pnpm run start         # Serve built app
pnpm run lint          # ESLint checks
pnpm run type-check    # TypeScript project refs
pnpm run test          # Jest unit tests (add coverage as the suite grows)
pnpm run test:e2e      # Playwright end-to-end suite
pnpm run analyze       # Bundle analysis report (ANALYZE=true)
```

## 🗂️ Project Structure (Front-End Focus)
```
src/
├── app/                # Next.js app router entry points
├── components/         # Shared UI, AI chat, pricing, dashboards
├── contexts/           # React context providers (auth, usage, trades)
├── hooks/              # Client hooks (Supabase, analytics, chat state)
├── lib/                # Utilities, Supabase client, analytics helpers
├── store/              # Zustand stores for session + usage tracking
├── styles/             # Tailwind/global styling
└── pages/              # Legacy pages and API routes (to be consolidated)
```

## 📊 Data & Plans
| Feature              | Free | Pro | Plus | Elite |
|---------------------|------|-----|------|-------|
| AI Chats / Day       | 5    | 50  | 200  | Unlimited |
| Voice Coach          | ❌   | ❌  | ✅   | ✅ |
| File Uploads         | ❌   | ✅  | ✅   | ✅ |
| Performance Exports  | ❌   | ✅  | ✅   | ✅ |
| History Retention    | 30d  | 6mo | 12mo | Unlimited |

Payments are processed through Flutterwave; upgrade flows are embedded directly in-app.

## 🔒 Security & Compliance
- Supabase storage with encryption at rest, HTTPS for all data transfer.
- JWT-based auth via Supabase with tier-aware RLS policies.
- Sentry and PostHog integrations for diagnostics (ensure consent banners for production).
- Regularly audit third-party dependencies and rotate API keys.

## 🧪 Quality & Monitoring
- ESLint + TypeScript ensure consistency; run `pnpm run lint && pnpm run type-check` before commits.
- Jest/Playwright harnesses exist—add coverage for core analytics, chat flows, and plan gating.
- Consider enabling GitHub Actions (see `.github/workflows`) for automated checks on each PR.
- Vercel recommended for hosting; monitor Core Web Vitals and error rates post-deployment.

## 🛠 Troubleshooting Tips
- Dev server port conflicts: ensure no other Next.js instance is bound to `127.0.0.1:3000`.
- Supabase policy errors: verify RLS policies align with `auth.uid()` usage shown in the SQL scripts.
- AI provider limits: set fallback providers in the env file if you toggle between OpenAI and XAI.
- For Windows developers, use the provided PowerShell scripts for deployment (`deploy-vercel.ps1`).

## 🤝 Contributing
1. Fork the repo and create a feature branch.
2. Install dependencies via `pnpm install`.
3. Run lint, type-check, and tests locally.
4. Submit a PR describing changes, screenshots for UI updates, and any Supabase migrations used.

## 📝 License & Support
Tradia operates under the MIT License. For support or product inquiries, open an issue or reach out via the channels listed in `TRADIA_AI_README.md`.

---

Build responsibly, trade intentionally, and let Tradia surface the insights that move your performance forward.
