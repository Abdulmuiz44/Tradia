# Forex Agent Workspace Plan

## 1) Purpose of the `forex-agent` workspace

`forex-agent/` is a focused internal workspace for designing and validating a **Forex-only execution intelligence layer** inside Tradia. It is a planning-first area to define product scope, workflows, data contracts, and integration strategy before shipping features into the main app.

This workspace is intentionally isolated so we can iterate quickly on:
- execution-focused product concepts,
- schema and API design,
- AI-assisted workflow logic,
- integration plans for Tradia’s existing stack.

---

## 2) How it fits Tradia’s vision

Tradia is already an AI Trading Journal for Forex and prop firm traders. The `forex-agent` initiative extends that vision from:
- **recording and analyzing what happened** (journal + analytics)

to:
- **improving what happens next** (execution intelligence before, during, and after a trade).

In short: journaling remains core; `forex-agent` adds a decision-support layer around execution quality.

---

## 3) Why this belongs inside Tradia (not a separate repo)

Build inside Tradia because the value depends on existing user context and data:
- Existing Forex pair analytics and session analytics are direct inputs.
- Risk tools and AI insights already provide relevant foundations.
- Current users (Forex + prop firm traders) are the same target users.
- Next.js + Supabase architecture and auth can be reused.
- Shared design system and dashboard UX reduce implementation cost.

Separate repo costs (sync complexity, duplicated auth/schema/UI, slower iteration) would hurt a solo builder.

---

## 4) Product concept

### Forex execution intelligence workspace
A structured workflow that guides traders from idea to review with consistent, context-aware support.

### Pre-trade analysis
- Pair context snapshot (trend, volatility, session, recent behavior).
- Setup quality scoring using user-defined playbooks.
- Risk conditions check before order placement.

### Market bias support
- Multi-timeframe directional bias notes.
- Scenario mapping (base case / invalidation / alternate case).
- Bias confidence with explicit assumptions.

### News/event awareness
- Highlight high-impact macro events and session-relevant releases.
- Surface “avoid/size down/wait” guidance windows.
- Link event risk to setup confidence.

### Trade planning
- Entry thesis, invalidation, targets, risk %, and execution checklist.
- Firm-rule-safe plan constraints for prop/funded accounts.
- One-page pre-trade brief for decision clarity.

### Post-trade review support
- Compare execution vs plan.
- Detect rule breaks, emotional deviations, and process drift.
- Generate structured improvement actions for the next session.

---

## 5) Clear target users

1. **Forex pair traders** (major/minor/cross pairs, session-aware execution).
2. **Prop firm traders** (drawdown/consistency/rule-constrained behavior).
3. **Funded traders** (capital protection + repeatable execution process).

---

## 6) Core problems solved beyond a journal alone

A journal is excellent for hindsight analysis, but execution problems often happen before logging:
- No standardized pre-trade decision process.
- Bias changes are undocumented and inconsistent.
- Event risk is known but not operationalized.
- Plan quality varies trade-to-trade.
- Rule compliance checks are ad hoc.
- Post-trade lessons are not turned into executable next-step constraints.

`forex-agent` closes this gap by operationalizing process quality, not just recording outcomes.

---

## 7) What ideas to study from AI-Trader

Use AI-Trader only as idea reference for:
- Agent-style workflow decomposition (pre-trade, execution, review).
- Trade lifecycle orchestration patterns.
- Structured prompts/checklists instead of free-form chat only.
- Clear state transitions (idea -> plan -> execute -> review).
- Human-in-the-loop recommendations with explicit rationale.

---

## 8) What NOT to import from AI-Trader

Do not copy or replicate:
- Branding, product positioning, or UX identity.
- Codebase architecture assumptions that conflict with Next.js/Supabase.
- Data models that ignore Tradia’s current entities and analytics.
- Generic multi-asset behavior that dilutes Forex-first focus.
- Opaque “auto-trading” behavior that removes user control.

Principle: borrow workflow ideas, not implementation or product identity.

---

## 9) Alignment with Tradia architecture

### Next.js App Router
- Keep integration targets aligned with existing `app/` routing patterns.
- Introduce features gradually as dashboard modules, not a parallel app.

### Existing dashboard structure
- Reuse dashboard shells, navigation, auth guards, and layout conventions.
- Expose forex-agent outputs in familiar analytics/review surfaces.

### `app/api`
- Add dedicated API handlers for brief generation, bias reporting, and reviews.
- Keep contracts typed and compatible with existing auth/session checks.

### `src/components`
- Build reusable Forex-agent UI blocks (brief cards, checklist panels, review diffs).
- Reuse existing component primitives/design tokens.

### `src/lib`
- Add domain services for scoring logic, event normalization, and AI orchestration.
- Keep side effects and provider clients centralized.

### Supabase-backed data model
- Add normalized tables with clear foreign keys to users/accounts/trades.
- Use RLS-compatible ownership and access patterns from existing schema.

---

## 10) Recommended internal folder structure for `forex-agent/`

```text
forex-agent/
  PLAN.md
  README.md                       # short workspace entrypoint
  research/
    ai-trader-notes.md            # extracted ideas, no copied code
    user-workflows.md             # current vs target trader workflows
    constraints.md                # product, legal, and technical boundaries
  product/
    problem-statements.md
    user-personas.md
    execution-workflow.md
    feature-scope-mvp.md
  architecture/
    integration-map.md            # how modules map into app/api/src
    domain-model.md               # entities and relationships
    supabase-schema-draft.sql     # draft tables (planning only initially)
    api-contracts.md              # request/response drafts
  ai/
    prompt-strategy.md
    evaluation-rubric.md
    guardrails.md
  rollout/
    phase-plan.md
    migration-checklist.md
    success-metrics.md
```

---

## 11) Proposed data models

> Note: final schema should be adapted to current Tradia tables and naming conventions.

### `forex_pairs`
Purpose: canonical FX instruments and metadata.
- `id` (uuid, pk)
- `symbol` (text, unique) — e.g., EURUSD
- `base_currency` (text)
- `quote_currency` (text)
- `pip_precision` (int)
- `session_profile` (jsonb) — active sessions, typical volatility bands
- `is_active` (bool)
- `created_at`, `updated_at`

### `market_bias_reports`
Purpose: timestamped directional/context views per pair.
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `pair_id` (uuid, fk -> forex_pairs)
- `timeframe_set` (jsonb)
- `bias_direction` (text) — bullish/bearish/neutral
- `confidence_score` (numeric)
- `key_levels` (jsonb)
- `assumptions` (text)
- `invalidation_conditions` (text)
- `source` (text) — manual/ai/hybrid
- `created_at`, `updated_at`

### `economic_events`
Purpose: event calendar entries normalized for execution workflows.
- `id` (uuid, pk)
- `provider_event_id` (text, unique nullable)
- `title` (text)
- `country` (text)
- `currency` (text)
- `impact` (text) — low/medium/high
- `scheduled_at` (timestamptz)
- `actual` (text nullable)
- `forecast` (text nullable)
- `previous` (text nullable)
- `event_type` (text)
- `created_at`, `updated_at`

### `trade_setups`
Purpose: structured setup definitions tied to pair + session + playbook.
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `pair_id` (uuid, fk)
- `setup_name` (text)
- `setup_type` (text)
- `timeframe` (text)
- `session` (text)
- `confluence_factors` (jsonb)
- `quality_score` (numeric)
- `status` (text) — draft/ready/invalidated/executed
- `created_at`, `updated_at`

### `execution_checklists`
Purpose: repeatable rule checks before execution.
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `name` (text)
- `account_type` (text) — personal/prop/funded
- `items` (jsonb) — checklist item definitions
- `is_default` (bool)
- `created_at`, `updated_at`

### `pre_trade_briefs`
Purpose: frozen plan snapshot before entry.
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `pair_id` (uuid, fk)
- `setup_id` (uuid, fk -> trade_setups)
- `bias_report_id` (uuid, fk -> market_bias_reports)
- `checklist_id` (uuid, fk -> execution_checklists)
- `entry_plan` (jsonb)
- `risk_plan` (jsonb)
- `event_risk_summary` (text)
- `approval_state` (text) — ready/blocked/manual-override
- `created_at`, `updated_at`

### `post_trade_reviews`
Purpose: plan-vs-execution feedback loop.
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `trade_id` (uuid, fk to existing trades table)
- `brief_id` (uuid, fk -> pre_trade_briefs)
- `execution_grade` (numeric)
- `rule_violations` (jsonb)
- `process_mistakes` (jsonb)
- `what_worked` (text)
- `improvements_next_trade` (text)
- `ai_summary` (text)
- `created_at`, `updated_at`

---

## 12) Suggested phases

### Phase 1: research and planning
- Validate user workflows (pair trader, prop trader, funded trader).
- Define MVP scope and non-goals.
- Finalize domain model and initial API contracts.

### Phase 2: data models and adapters
- Draft Supabase migrations for core tables.
- Build server-side adapters for economic events and pair metadata.
- Add internal service layer contracts in `src/lib` (no major UI yet).

### Phase 3: UI integration into dashboard
- Introduce pre-trade brief and checklist modules in existing dashboard.
- Add market bias and event awareness panels.
- Ensure consistency with existing navigation and analytics pages.

### Phase 4: AI analysis features
- Add AI-assisted brief generation and post-trade review summaries.
- Implement guardrails, confidence display, and override UX.
- Track quality metrics (adoption, checklist completion, execution drift).

---

## 13) Risks, constraints, and boundaries

- **Scope creep risk:** too many agent features too early; enforce MVP.
- **Data quality risk:** event/calendar data reliability affects trust.
- **Over-automation risk:** recommendations must not become blind signals.
- **Latency/cost risk:** AI calls in workflow-critical surfaces need caching/fallbacks.
- **Compliance/expectation risk:** clearly position as decision support, not guaranteed outcomes.
- **Integration risk:** avoid parallel architecture; integrate with existing app conventions.
- **Solo builder constraint:** prioritize modular, incremental delivery over big-bang redesign.

Boundaries:
- No direct execution/broker automation in initial phases.
- No full repo restructure.
- No separate product identity outside Tradia.

---

## 14) Exact next implementation step after `PLAN.md`

Create `forex-agent/README.md` as the execution entrypoint with:
1. MVP scope (in/out),
2. accepted glossary (bias, setup, brief, review),
3. links to planned docs in `research/`, `product/`, and `architecture/`,
4. a short “first 7 implementation tasks” checklist ordered by dependency.

This keeps planning actionable while still avoiding premature code changes.
