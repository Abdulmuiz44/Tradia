# Integration Map (Planned)

This map links each Forex-agent capability to likely production targets in Tradia.

## Capability: Pre-trade brief
- Dashboard widgets: existing dashboard trade planning section (new card/module)
- API endpoints: `app/api/forex-agent/pre-trade-brief/route.ts`
- Shared lib utilities: `src/lib/forex-agent/brief-service.ts`, `src/lib/forex-agent/brief-validator.ts`
- AI orchestration: `src/lib/forex-agent/ai/pre-trade-brief.ts`
- Database tables: `trade_setups`, `execution_checklists`, `pre_trade_briefs`

## Capability: Market bias report
- Dashboard widgets: bias panel within pair/session analytics views
- API endpoints: `app/api/forex-agent/market-bias/route.ts`
- Shared lib utilities: `src/lib/forex-agent/bias-service.ts`, `src/lib/forex-agent/level-extractor.ts`
- AI orchestration: `src/lib/forex-agent/ai/market-bias.ts`
- Database tables: `market_bias_reports`, `forex_pairs`

## Capability: Event-aware planning
- Dashboard widgets: upcoming events card attached to trade plan flow
- API endpoints: `app/api/forex-agent/economic-events/route.ts`
- Shared lib utilities: `src/lib/forex-agent/event-service.ts`, `src/lib/forex-agent/event-normalizer.ts`
- AI orchestration: optional event-risk summarizer module
- Database tables: `economic_events`, `pre_trade_briefs`

## Capability: Execution checklist support
- Dashboard widgets: pre-submit checklist component near order/planning action
- API endpoints: `app/api/forex-agent/execution-checklist/route.ts`
- Shared lib utilities: `src/lib/forex-agent/checklist-service.ts`
- AI orchestration: checklist rationale suggestions (optional, phase 4)
- Database tables: `execution_checklists`, `pre_trade_briefs`

## Capability: Post-trade review intelligence
- Dashboard widgets: post-trade reflection panel on trade detail screen
- API endpoints: `app/api/forex-agent/post-trade-review/route.ts`
- Shared lib utilities: `src/lib/forex-agent/review-service.ts`, `src/lib/forex-agent/deviation-detector.ts`
- AI orchestration: `src/lib/forex-agent/ai/post-trade-review.ts`
- Database tables: `post_trade_reviews`, references to existing `trades` table

## Capability: Cross-cutting guardrails and trust layer
- Dashboard widgets: confidence indicators + disclaimer banners
- API endpoints: shared middleware and response metadata
- Shared lib utilities: `src/lib/forex-agent/safety-rules.ts`, `src/lib/forex-agent/confidence-policy.ts`
- AI orchestration: response verifier and red-flag classifier
- Database tables: optional `ai_audit_logs` (future), plus references in review tables
