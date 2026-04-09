# Architecture (Planning Mode)

## Objective
Define how Forex execution intelligence will integrate into Tradia without introducing a parallel system.

## High-level fit
- Keep `forex-agent/` as design source-of-truth.
- Implement production features incrementally in existing Tradia app layers.
- Reuse existing auth, dashboard shell, and Supabase ownership model.

## Future integration points

### `app/` (Next.js App Router)
Likely future pages/modules (not created yet):
- dashboard modules for pre-trade briefs,
- market bias summaries,
- post-trade review cards.

Guideline: integrate as additions to existing dashboard flows, not a new app subtree.

### `app/api/`
Planned endpoint categories:
- `/api/forex-agent/pre-trade-brief`
- `/api/forex-agent/market-bias`
- `/api/forex-agent/post-trade-review`
- `/api/forex-agent/economic-events` (normalized retrieval)

Guideline: thin route handlers, domain logic delegated to `src/lib/` services.

### `src/components/`
Planned reusable UI blocks:
- `PreTradeBriefCard`
- `BiasReportPanel`
- `ExecutionChecklist`
- `PostTradeReviewSummary`

Guideline: compose from existing design primitives; avoid style system divergence.

### `src/lib/`
Planned service modules:
- `forex-agent/bias-service`
- `forex-agent/brief-service`
- `forex-agent/review-service`
- `forex-agent/event-service`
- `forex-agent/validation`

Guideline: pure functions and typed contracts; centralize provider clients and guardrails.

### Supabase
Planned tables:
- `forex_pairs`
- `market_bias_reports`
- `economic_events`
- `trade_setups`
- `execution_checklists`
- `pre_trade_briefs`
- `post_trade_reviews`

Guideline: align with existing user/trade/account relations and RLS strategy.

## Boundaries: planning workspace vs production code
- `forex-agent/` holds design docs, schema drafts, prompt contracts.
- No imports from `forex-agent/` into runtime code until implementation phase.
- No route creation, migrations, or UI code in this phase.

## Solo-builder implementation strategy
1. Freeze docs and schema contracts.
2. Implement data layer and adapters first.
3. Add internal APIs and integration tests.
4. Add minimal UI surfaces in existing dashboard.
5. Iterate AI analysis quality with guardrails and observability.
