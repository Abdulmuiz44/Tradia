# Execution Workflows (Operational Draft)

## 1) Pre-trade preparation workflow
1. Select trading account and pair.
2. Load latest pair context (session + recent volatility profile).
3. Choose or create trade setup (`trade_setups`).
4. Attach checklist template (`execution_checklists`).
5. Confirm required checklist items (risk cap, max daily loss, rule compliance).
6. Draft entry plan and risk plan.
7. Save `pre_trade_brief` as `ready` or `blocked`.

**Trader outcome:** clear plan quality gate before execution.

## 2) Market bias generation workflow
1. Trader selects pair + timeframe set.
2. System gathers recent pair context and key levels.
3. AI/manual analysis produces directional bias, assumptions, and invalidation.
4. Confidence score is generated with rationale.
5. Report saved to `market_bias_reports` and attached to open brief.
6. If confidence low or invalidation unclear, brief remains blocked.

**Trader outcome:** explicit bias context, not hidden intuition.

## 3) Event-aware trade planning workflow
1. Fetch upcoming events for pair currencies and session window.
2. Highlight high-impact events near planned entry time.
3. Generate event-risk summary: proceed / reduce size / wait.
4. Trader updates risk_plan and approval_state accordingly.
5. Persist selected event links in brief metadata.
6. Re-check checklist item: “Event risk acknowledged.”

**Trader outcome:** fewer avoidable trades taken into known volatility spikes.

## 4) Post-trade review workflow
1. Load completed trade and linked pre-trade brief.
2. Compare actual execution details vs plan (entry, stop, exits, timing).
3. Identify rule violations and process mistakes.
4. AI generates structured summary with confidence-limited language.
5. Trader confirms/edits findings and adds one concrete process improvement.
6. Save `post_trade_review` and surface improvement in next pre-trade checklist.

**Trader outcome:** tight feedback loop that improves future execution quality.
