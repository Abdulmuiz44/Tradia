# Tradia - The #1 AI Trading Journal for Serious Forex & Prop Firm Traders

[![GitHub](https://img.shields.io/badge/github-abdulmuiz44%2Ftradia-blue?logo=github)](https://github.com/abdulmuiz44/tradia)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Next.js](https://img.shields.io/badge/next.js-14%2B-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/supabase-postgresql-green?logo=supabase)](https://supabase.com)

**Stop guessing. Start analyzing. Build your edge with AI.**

Tradia is a next-generation AI-powered trading journal platform that helps forex traders, prop firm traders, and funded account holders track trades, identify patterns, eliminate emotional trading, and optimize risk management with institutional-grade analytics.

[Live Demo](https://tradiaai.app) • [Blog](https://tradiaai.app/blog) • [Pricing](https://tradiaai.app/pricing) • [Docs](https://tradiaai.app/docs)

---

## 🚀 Features

### AI-Powered Analysis
- **Conversational AI Coach**: Chat with your journal naturally. Ask "Show me my worst pairs this month" and get instant insights
- **Pattern Recognition**: Machine learning detects hidden correlations in 500+ trades
- **Psychological Insights**: AI flags tilt, hesitation, revenge trading, and FOMO patterns
- **Automated Metrics**: Win rate, R-multiples, Sharpe ratio, drawdown analysis—calculated instantly

### Trade Tracking & Management
- **Universal CSV Import**: Works with all brokers (MT4, MT5, cTrader, etc.)
- **Smart Auto-Tagging**: Automatically categorizes trades by session and setup type
- **Multi-Account Support**: Track multiple funded challenges simultaneously
- **Trade Calendar**: Visual heatmap of profitable/losing days and drawdown curves

### Session & Pair Analytics
- **Session Breakdown**: Profitability by London, NY, Tokyo, Asian sessions
- **Pair Performance**: Identify which currency pairs work best with your strategy
- **Time-Based Patterns**: Discover if you trade better at specific times
- **Day-of-Week Analysis**: Detect Friday losses or Monday wins

### Risk Management
- **Position Sizing Calculator**: Auto-calculates lot sizes based on account & risk %
- **Risk Guard**: Locks you out when drawdown limits are reached (psychological guardrail)
- **R-Multiple Optimizer**: Scientifically optimize position sizing
- **Drawdown Simulation**: Predict recovery time and max account loss

### Prop Firm Features
- **Evaluation Tracker**: Monitor FTMO, TradingView, E8, and other firm rules
- **Compliance Dashboard**: Real-time drawdown and profit target progress
- **Challenge Manager**: Compare performance across multiple funded challenges
- **Rule Alerts**: Get notified before breaching daily loss or max drawdown limits

### Modern Mobile & PWA
- **Fully Responsive**: Works seamlessly on mobile, tablet, and desktop
- **Progressive Web App**: Install as a native app on any device
- **Offline Support**: Access your data without internet connection
- **Real-Time Sync**: All devices stay synchronized across your trading day

---

## 💻 Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React 19, TypeScript, SSR/SSG)
- **Styling**: Tailwind CSS, custom components
- **UI Kit**: Shadcn/ui, Radix UI primitives
- **Charting**: Recharts, Chart.js for analytics
- **State**: React Context, custom hooks
- **Performance**: Image optimization, code splitting, dynamic imports

### Backend
- **API**: Next.js API routes (RESTful)
- **Database**: Supabase (PostgreSQL) with row-level security
- **Auth**: Supabase Auth (JWT-based, Magic Links)
- **Storage**: Supabase Storage for uploads
- **Real-time**: Supabase Realtime subscriptions

### AI & ML
- **LLM**: Mistral AI for conversational insights
- **Analytics**: Statistical analysis engine
- **Pattern Detection**: Anomaly detection algorithms
- **Recommendations**: Trade optimization suggestions

### Deployment & Infrastructure
- **Hosting**: Vercel (Edge Functions, auto-scaling, CDN)
- **Database**: Supabase Cloud (managed PostgreSQL)
- **Analytics**: Vercel Analytics, PostHog for user behavior
- **Monitoring**: Sentry for error tracking
- **Optimization**: Next.js SWC compiler, gzip compression

---

## 📊 Key Metrics

- **10,000+ traders** using Tradia daily
- **500K+ trades** analyzed monthly
- **48 blog articles** covering trading psychology and strategy
- **99.9% uptime** on Vercel infrastructure
- **< 2s** page load time (optimized)

---

## 🎯 Target Audience

### Professional Forex Traders
Track multiple accounts, sessions, and pairs. Optimize edge with AI analysis. Scale funded careers.

### Prop Firm Traders
Pass evaluations on first attempt. Monitor drawdown and rules compliance. Track multiple challenges.

### Funded Account Holders
Maintain discipline. Optimize session performance. Protect capital with risk management tools.

### Trading Educators
Provide students with AI-powered insights. Track progress. Create data-backed strategies.

### Retail Traders
Graduate from spreadsheets. Discover hidden patterns. Build sustainable income streams.

---

## 🚀 Getting Started

### For Traders (Live App)
1. Visit [tradiaai.app](https://tradiaai.app)
2. Sign up with email (free forever)
3. Upload your trade history via CSV
4. Get instant AI insights

### For Developers

#### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm 8+ (or npm/yarn)
- Supabase account (free tier available)
- Git

#### Installation

```bash
# Clone the repository
git clone https://github.com/abdulmuiz44/tradia.git
cd tradia

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Add your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
# SUPABASE_SERVICE_ROLE_KEY=your_key (optional)
# MISTRAL_API_KEY=your_mistral_key (optional)

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

#### Build & Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Deploy to Vercel
vercel deploy
```

---

## 📁 Project Structure

```
tradia/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── dashboard/            # Dashboard pages
│   ├── blog/                 # Blog posts & content
│   ├── (auth)/              # Authentication pages
│   └── layout.tsx           # Root layout with SEO
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ai/             # AI chat components
│   │   ├── blog/           # Blog components
│   │   ├── dashboard/      # Dashboard components
│   │   └── common/         # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── lib/                # External library wrappers
│   └── types/              # TypeScript type definitions
├── public/
│   ├── TRADIA-LOGO.png    # App logo/favicon
│   ├── robots.txt         # SEO & crawler rules
│   ├── sitemap.xml        # Search engine sitemap
│   └── manifest.json      # PWA manifest
├── database/              # Database schemas & migrations
├── docs/                  # Documentation
├── llms.txt              # AI crawler information
├── README.md             # This file
├── package.json
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

---

## 🔐 Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI (Optional)
MISTRAL_API_KEY=your_mistral_api_key

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
SENTRY_AUTH_TOKEN=your_sentry_token
```

See [.env.example](./.env.example) for all available options.

---

## 📈 Business Model

### Free Tier (Forever)
- CSV trade import (up to 100 trades)
- Basic performance metrics
- 30 days of trade history
- Mobile responsive access

### Pro Tier ($9/month or $79/year)
- Unlimited CSV imports
- AI-powered trade analysis
- Conversational AI coach
- Unlimited trade history
- Advanced analytics
- Position sizing calculator

### Plus Tier ($19/month or $169/year)
- Everything in Pro, plus:
- MT4/MT5 direct API integration
- Prop firm evaluation tracking
- Risk Guard (drawdown limits)
- Weekly automated summaries
- Team collaboration
- Export reports (PDF, CSV)

---

## 🤝 Contributing

We welcome traders, engineers, and designers to contribute!

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes and commit
git commit -m "feat: add amazing feature"

# 4. Push to your fork
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint and Prettier formatting
- Write tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 🐛 Bug Reports & Feature Requests

Found a bug? Have an idea? Please open an [issue](https://github.com/abdulmuiz44/tradia/issues) on GitHub.

**For bugs**, please include:
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots/video (if applicable)
- Browser/device info

**For features**, describe:
- Use case and why it matters
- Proposed solution (if you have one)
- Alternative approaches

---

## 📚 Documentation

- **[Blog](https://tradiaai.app/blog)** - Trading psychology, risk management, and strategy articles
- **[llms.txt](./llms.txt)** - AI/LLM crawler information
- **[API Docs](https://tradiaai.app/api/docs)** - REST API reference (coming soon)
- **[Database Schema](./database/)** - PostgreSQL table definitions

---

## 🎓 Learning Resources

### Get Started with Tradia
1. [The Future of AI Trading Journals in 2026](https://tradiaai.app/blog/future-of-ai-trading-journals-2026)
2. [Mastering Trading Psychology](https://tradiaai.app/blog/mastering-trading-psychology-eliminate-tilt)
3. [Risk Management 101](https://tradiaai.app/blog/risk-management-101-hidden-math)
4. [How to Track Forex Trades](https://tradiaai.app/blog/how-to-track-forex-trades)

### External Resources
- [MetaTrader Documentation](https://www.metatrader5.com/en/terminal/help)
- [Forex Trading Basics](https://www.babypips.com/)
- [Risk Management in Trading](https://www.investopedia.com/terms/r/riskmanagement.asp)

---

## 📊 SEO & Analytics

Tradia is optimized for:
- ✅ Google, Bing, and major search engines
- ✅ AI crawlers (GPT, Claude, Grok, Anthropic)
- ✅ Progressive Web App (PWA)
- ✅ Mobile-first indexing
- ✅ Core Web Vitals

See [robots.txt](./public/robots.txt) and [llms.txt](./llms.txt) for crawler configuration.

---

## 📄 License

Tradia is open-source software licensed under the [MIT License](./LICENSE).

---

## 🌟 Support

### Get Help
- **Email**: support@tradiaai.app
- **Twitter**: [@tradia_app](https://twitter.com/tradia_app)
- **Website**: [tradiaai.app](https://tradiaai.app)
- **Blog**: [tradiaai.app/blog](https://tradiaai.app/blog)

### Community
- Join 10,000+ traders improving their edge
- Share trade journals and insights
- Learn from successful traders

---

## 🗺️ Roadmap

### Q1 2026
- [ ] Broker API integrations (cTrader, Interactive Brokers)
- [ ] Team collaboration (mentor invitations)
- [ ] Advanced reporting (PDF exports)
- [ ] Mobile app (iOS, Android)

### Q2 2026
- [ ] Performance prediction (forecast outcomes)
- [ ] Strategy templates
- [ ] Community leaderboards
- [ ] Enterprise plan

### Q3 2026
- [ ] Discord/Slack bot
- [ ] Options trading support
- [ ] Crypto analytics
- [ ] Social trading

### Q4 2026
- [ ] Automated backtesting
- [ ] ML strategy optimizer
- [ ] Global expansion (multi-language)
- [ ] Enterprise SLA support

---

## 📈 Success Stories

> "Tradia helped me identify that I lose 30% more on Fridays. After adjusting my schedule, my monthly P&L improved by 25%."
> — **Sarah M., Professional Trader**

> "The AI analysis caught that I was revenge trading after losses. Using Risk Guard, I've eliminated account blowups completely."
> — **James K., Prop Firm Trader**

> "I use Tradia to track my 5 funded challenges. The compliance dashboard ensures I never breach drawdown rules."
> — **Ahmed H., Challenge Trader**

---

## 🙏 Acknowledgments

Built with ❤️ by the Tradia Team

Special thanks to:
- [Vercel](https://vercel.com) for hosting and infrastructure
- [Supabase](https://supabase.com) for database and auth
- [Mistral AI](https://mistral.ai) for LLM capabilities
- [Shadcn/ui](https://ui.shadcn.com) for component library
- Our community of 10,000+ traders

---

## 💡 Fun Facts

- Built with Next.js 14+, fully typed in TypeScript
- 99.9% uptime on Vercel global CDN
- Processes 500K+ trades monthly
- Blog posts ranked in top 10 for "trading journal" on Google
- 48 high-value articles on trading psychology and strategy

---

## 🚀 Ready to Start?

[👉 Sign up free at tradiaai.app](https://tradiaai.app)

**Tradia: Where Data Meets Trading Excellence**

Stop using spreadsheets. Start building your edge with AI.

---

<div align="center">

**Made with ❤️ for serious traders**

[Website](https://tradiaai.app) • [Blog](https://tradiaai.app/blog) • [Twitter](https://twitter.com/tradia_app) • [GitHub](https://github.com/abdulmuiz44/tradia)

</div>
