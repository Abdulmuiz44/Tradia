# Adapter Spec — Economic Calendar

## Why this adapter exists
Event risk must be surfaced in a trader-friendly format and tied to planned trade windows.

## Data source
Planned external calendar provider(s) with fallback strategy; optional internal normalized cache in Supabase.

## Expected inputs
- `currencies` (e.g., ["USD", "EUR"])
- `from` / `to` datetime range
- optional `impactFilter` (high/medium/low)

## Expected outputs
- normalized economic events list
- impact tier and scheduled timestamp
- provider IDs for traceability
- event risk window hints for planning logic

## Implementation concerns
- event revisions after publication
- daylight saving and locale timestamp mismatches
- deduplication when using multiple providers
- stale event cache invalidation
- deterministic sorting by scheduled time + impact
