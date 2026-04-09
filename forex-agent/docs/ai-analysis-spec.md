# AI Analysis Spec (Decision-Support Only)

## Role of AI in Forex-agent
AI acts as a **structured analysis assistant** that helps users create consistent plans and reviews. It is not an auto-trading engine and not a certainty signal provider.

## What AI should do
- Summarize complex context into concise trader-facing outputs.
- Highlight assumptions, invalidation, and risk dependencies.
- Flag conflicts between setup quality and checklist requirements.
- Produce post-trade process feedback with actionable corrections.
- Emit machine-readable output for UI/API consumption.

## What AI must never do
- Guarantee outcomes or claim high-probability certainty.
- Use “take this trade now” directive language.
- Hide uncertainty or skip invalidation conditions.
- Encourage risk escalation after losses.
- Replace trader judgment or prop-firm rule constraints.

## Output contracts

### A) Pre-trade brief output
Must include:
- `market_context`
- `setup_summary`
- `entry_plan`
- `risk_plan`
- `event_risk_summary`
- `checklist_findings`
- `approval_recommendation` (`ready|blocked|manual_override`)
- `confidence` + `confidence_rationale`

### B) Market bias report output
Must include:
- `bias_direction`
- `timeframe_alignment`
- `key_levels`
- `assumptions`
- `invalidation_conditions`
- `alternate_scenario`
- `confidence`

### C) Post-trade review output
Must include:
- `plan_vs_execution_diff`
- `rule_violations`
- `process_mistakes`
- `what_worked`
- `top_3_improvements`
- `next_trade_focus`
- `confidence`

## Safety and trust rules
1. **No guaranteed predictions.**
2. **No certainty framing** (“must win”, “safe trade”, “guaranteed setup”).
3. **Decision-support only** with explicit uncertainty.
4. Always show invalidation and risk constraints.
5. If inputs are incomplete, return “insufficient context” with missing fields list.
6. Preserve traceability: include rationale snippets tied to provided inputs.

## Quality controls (phase 4)
- Schema validation for all AI responses.
- Hallucination checks against input payload fields.
- Confidence calibration based on input completeness.
- Prompt regression set for pre-trade/bias/review artifacts.
