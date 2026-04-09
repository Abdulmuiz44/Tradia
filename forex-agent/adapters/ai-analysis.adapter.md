# Adapter Spec — AI Analysis

## Why this adapter exists
Centralize LLM interaction for brief, bias, and review tasks with consistent guardrails and schema enforcement.

## Data source
Internal AI provider abstraction (existing Tradia AI infrastructure / model gateway).

## Expected inputs
- analysis type (`pre_trade_brief` | `market_bias` | `post_trade_review`)
- normalized domain payload
- prompt template version
- user/account constraints (risk rules, account type)

## Expected outputs
- structured JSON result per analysis type
- confidence + rationale blocks
- safety flags (insufficient context, overconfident language)
- prompt/model metadata for auditing

## Implementation concerns
- strict output schema validation and retries
- token cost + latency management
- refusal/fallback behavior when inputs are incomplete
- prompt versioning and regression testing
- redaction of sensitive account data before model calls
