# Prompt Design — Post-Trade Review

## Purpose
Generate a process-focused review by comparing planned setup/brief against actual execution behavior.

## Required inputs
- trade execution record
- linked pre-trade brief (if available)
- checklist completion state
- user notes/emotional tags (optional)

## Expected output shape
```json
{
  "plan_vs_execution_diff": ["string"],
  "rule_violations": ["string"],
  "process_mistakes": ["string"],
  "what_worked": ["string"],
  "top_3_improvements": ["string"],
  "next_trade_focus": "string",
  "confidence": "number_0_to_100",
  "confidence_rationale": "string"
}
```

## Guardrails
- No blame language; focus on process and behavior.
- No outcome-only reasoning (“won = good process”).
- Require at least one actionable improvement.
- If no brief exists, annotate reduced confidence and explain limitations.

## Example output (short)
- `plan_vs_execution_diff`: ["Entry taken before planned confirmation candle close."]
- `top_3_improvements`: ["Wait for candle close confirmation", "Pre-place stop before entry", "Avoid entries inside 10 minutes pre-news"]
- `confidence`: `71`
