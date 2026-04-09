# Product Spec — Forex Execution Intelligence (Internal)

## Product definition
Forex execution intelligence is a decision-support layer that sits around Tradia’s journaling core. It helps traders make better process decisions **before**, **during planning**, and **after** a trade by standardizing setup quality checks, risk framing, and review loops.

## User problem
Traders often know strategy concepts but execute inconsistently:
- entering without a complete plan,
- ignoring event risk,
- changing bias mid-trade without explicit rationale,
- repeating known mistakes due to weak feedback loops.

A journal captures outcomes after the fact, but many avoidable losses happen because pre-trade and execution discipline are not operationalized.

## Job-to-be-done
“When I am preparing a Forex trade, help me quickly produce a high-quality, rule-safe plan with clear invalidation and event context, so I can execute consistently and improve over time.”

## Target users
1. Forex pair traders (session/timing-sensitive decision making)
2. Prop firm traders (strict risk and rule compliance)
3. Funded traders (capital preservation + consistency)

## MVP scope
### In scope
- Structured pre-trade brief generation (manual + AI-assisted).
- Market bias report (timeframe bias, levels, invalidation, confidence).
- Event-aware planning support tied to upcoming economic events.
- Execution checklist templates and completion tracking.
- Post-trade review artifact comparing plan vs execution.
- Internal data models and API contracts for eventual dashboard integration.

### Out of scope (explicit)
- Automated trade execution or broker-side order placement.
- “Signal service” positioning or certainty claims.
- Full dashboard redesign.
- New public marketing surface.
- Non-Forex multi-asset expansion (crypto/equities) in first phase.

## Success criteria (MVP)
- Traders can complete a pre-trade brief in <5 minutes with consistent structure.
- Event risk is visible before confirmation of a trade plan.
- Post-trade review can link deviations to actionable process changes.
- AI outputs remain advisory, transparent, and overrideable.
