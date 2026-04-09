# Prompt Design — Market Bias

## Purpose
Produce an explicit directional bias report with assumptions, key levels, and invalidation logic.

## Required inputs
- pair symbol
- multi-timeframe summaries
- key level candidates
- session context
- recent event backdrop

## Expected output shape
```json
{
  "bias_direction": "bullish|bearish|neutral",
  "timeframe_alignment": {
    "higher_tf": "string",
    "execution_tf": "string"
  },
  "key_levels": {
    "support": ["number"],
    "resistance": ["number"],
    "invalidation_level": "number"
  },
  "assumptions": ["string"],
  "invalidation_conditions": ["string"],
  "alternate_scenario": "string",
  "confidence": "number_0_to_100",
  "confidence_rationale": "string"
}
```

## Guardrails
- Do not output “take this trade” directives.
- Must include alternate scenario and invalidation conditions.
- Confidence must decrease when inputs conflict.
- State uncertainty explicitly when timeframes disagree.

## Example output (short)
- `bias_direction`: `neutral`
- `alternate_scenario`: “Bullish bias valid only on sustained hold above 1.0860.”
- `confidence`: `52`
