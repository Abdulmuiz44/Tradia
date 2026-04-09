# Data Models (Draft)

All entities are planning artifacts for later Supabase migration design.

## 1) `forex_pairs`
### Purpose
Canonical Forex instrument reference and metadata used by setups, briefs, and bias reports.

### Fields
- `id: uuid` (PK)
- `symbol: text` (unique, uppercase, e.g., `EURUSD`)
- `base_currency: text` (3-letter code)
- `quote_currency: text` (3-letter code)
- `pip_precision: integer`
- `session_profile: jsonb` (active sessions, volatility notes)
- `is_active: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Referenced by `market_bias_reports`, `trade_setups`, `pre_trade_briefs`.

### Validation notes
- enforce uppercase symbol/currencies
- pip precision must be > 0

## 2) `market_bias_reports`
### Purpose
Stores directional context snapshots for a pair at a point in time.

### Fields
- `id: uuid` (PK)
- `user_id: uuid` (FK users)
- `pair_id: uuid` (FK forex_pairs)
- `timeframe_set: jsonb` (e.g., H4/H1/M15)
- `bias_direction: text` (`bullish|bearish|neutral`)
- `confidence_score: numeric` (0–100)
- `key_levels: jsonb` (support/resistance/invalidation)
- `assumptions: text`
- `invalidation_conditions: text`
- `source: text` (`manual|ai|hybrid`)
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Belongs to user + pair. May be linked by `pre_trade_briefs`.

### Validation notes
- confidence range check
- require non-empty invalidation text

## 3) `economic_events`
### Purpose
Normalized economic calendar entries consumed by planning workflows.

### Fields
- `id: uuid` (PK)
- `provider_event_id: text` (unique nullable)
- `title: text`
- `country: text`
- `currency: text`
- `impact: text` (`low|medium|high`)
- `scheduled_at: timestamptz`
- `actual: text | null`
- `forecast: text | null`
- `previous: text | null`
- `event_type: text`
- `is_all_day: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Referenced by briefs (via join table or denormalized selected event IDs).

### Validation notes
- scheduled_at must be present
- impact enumeration required

## 4) `trade_setups`
### Purpose
Captures a tradable setup definition before execution.

### Fields
- `id: uuid` (PK)
- `user_id: uuid` (FK users)
- `pair_id: uuid` (FK forex_pairs)
- `setup_name: text`
- `setup_type: text` (breakout, pullback, reversal, etc.)
- `timeframe: text`
- `session: text` (Asia/London/NY/Overlap)
- `confluence_factors: jsonb`
- `quality_score: numeric` (0–100)
- `status: text` (`draft|ready|invalidated|executed`)
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Can feed multiple briefs; belongs to user + pair.

### Validation notes
- setup_name min length
- quality score range check

## 5) `execution_checklists`
### Purpose
Reusable user-specific checklist templates for execution discipline.

### Fields
- `id: uuid` (PK)
- `user_id: uuid` (FK users)
- `name: text`
- `account_type: text` (`personal|prop|funded`)
- `items: jsonb` (array of checklist item definitions)
- `is_default: boolean`
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Referenced by `pre_trade_briefs`.

### Validation notes
- minimum one checklist item
- unique default checklist per user/account_type

## 6) `pre_trade_briefs`
### Purpose
Immutable or versioned snapshot of a pre-entry plan.

### Fields
- `id: uuid` (PK)
- `user_id: uuid` (FK users)
- `pair_id: uuid` (FK forex_pairs)
- `setup_id: uuid` (FK trade_setups)
- `bias_report_id: uuid` (FK market_bias_reports)
- `checklist_id: uuid` (FK execution_checklists)
- `entry_plan: jsonb`
- `risk_plan: jsonb`
- `event_risk_summary: text`
- `approval_state: text` (`ready|blocked|manual_override`)
- `selected_event_ids: jsonb` (array UUIDs or provider IDs)
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Bridge between setup, bias, checklist, and eventual trade execution.

### Validation notes
- require entry + invalidation + stop + target in entry_plan
- approval state blocked if mandatory checklist items incomplete

## 7) `post_trade_reviews`
### Purpose
Structured reflection comparing actual execution vs pre-trade plan.

### Fields
- `id: uuid` (PK)
- `user_id: uuid` (FK users)
- `trade_id: uuid` (FK existing trades table)
- `brief_id: uuid` (FK pre_trade_briefs)
- `execution_grade: numeric` (0–100)
- `rule_violations: jsonb`
- `process_mistakes: jsonb`
- `what_worked: text`
- `improvements_next_trade: text`
- `ai_summary: text`
- `created_at: timestamptz`
- `updated_at: timestamptz`

### Relationships
Anchored to historical trade record and optional pre-trade brief.

### Validation notes
- require at least one actionable improvement
- execution grade range check
