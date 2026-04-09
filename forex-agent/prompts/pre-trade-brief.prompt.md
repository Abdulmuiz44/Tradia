# Prompt Design — Pre-Trade Brief

## Purpose
Generate a structured pre-trade brief that helps the trader validate setup quality, risk, and event context before execution.

## Required inputs
- pair and timeframe context
- setup definition + confluence factors
- risk constraints (account type, max loss rules)
- relevant upcoming economic events
- checklist status

## Expected output shape
```json
{
  "market_context": "string",
  "setup_summary": "string",
  "entry_plan": {
    "entry_type": "market|limit|stop",
    "entry_zone": "string",
    "stop_loss": "string",
    "targets": ["string"],
    "invalidation": "string"
  },
  "risk_plan": {
    "risk_percent": "number",
    "position_sizing_note": "string",
    "rule_constraints": ["string"]
  },
  "event_risk_summary": "string",
  "checklist_findings": ["string"],
  "approval_recommendation": "ready|blocked|manual_override",
  "confidence": "number_0_to_100",
  "confidence_rationale": "string"
}
```

## Guardrails
- Never claim certainty of trade outcome.
- Must include invalidation statement.
- If data is incomplete, set `approval_recommendation=blocked` and list missing inputs.
- Keep language advisory, not imperative.

## Example output (short)
- `market_context`: “EURUSD in London session shows higher-timeframe bullish structure with intraday pullback.”
- `approval_recommendation`: `manual_override`
- `confidence`: `63`
