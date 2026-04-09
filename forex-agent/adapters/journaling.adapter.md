# Adapter Spec — Journaling Bridge

## Why this adapter exists
Forex-agent must consume existing trade/journal context and write review artifacts without duplicating Tradia’s core journaling domain.

## Data source
Internal Tradia journal/trade entities in Supabase and existing backend APIs.

## Expected inputs
- `tradeId` or recent trade query filters
- user/account identifiers
- optional pre-trade brief reference

## Expected outputs
- normalized trade execution snapshot (entry, stop, exits, timing, notes)
- plan-vs-execution comparison payload
- write contracts for `post_trade_reviews`

## Implementation concerns
- field-level mapping drift if trade schema evolves
- missing legacy trade metadata for older records
- ownership and RLS constraints for cross-table joins
- idempotent write behavior for repeated review generation
