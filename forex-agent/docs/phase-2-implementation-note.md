# Phase 2 Implementation Note — Saved Brief Detail + Light Editing

## What was implemented
This phase adds a narrow usability upgrade for the existing Forex Pre-Trade Brief flow:

1. **Saved brief detail retrieval**
   - Added per-brief API route to load full detail for one saved brief.
   - Auth required and constrained to the signed-in user’s record.

2. **Light editing support (no regeneration)**
   - Added controlled patch API for:
     - `status`
     - `trader_notes`
     - `checklist_state`
     - `last_reviewed_at`
   - Kept AI-generated analytical sections immutable through this endpoint.

3. **Detail workflow UI on `/dashboard/pre-trade-brief`**
   - Recent saved briefs are now selectable.
   - Selecting an item loads full brief detail inline.
   - Added editable trader workflow controls:
     - trader notes textarea
     - checklist progress toggles based on original AI checklist
     - status selector (`draft`, `ready`, `invalidated`, `executed`, `skipped`)
     - save action with loading/error handling

4. **Type updates**
   - Expanded `preTradeBrief` types for detail shape, checklist state map, and patch payload.

## Files added or changed
- **Added** `database/migrations/2026-04-09_add_pre_trade_brief_review_fields.sql`
- **Added** `app/api/pre-trade-brief/[id]/route.ts`
- **Updated** `app/api/pre-trade-brief/route.ts` (recent list now includes status)
- **Updated** `src/types/preTradeBrief.ts`
- **Updated** `app/dashboard/pre-trade-brief/page.tsx`

## Migration added
- `2026-04-09_add_pre_trade_brief_review_fields.sql`
  - adds `trader_notes`, `checklist_state`, `last_reviewed_at`
  - expands `status` check constraint to include editable workflow statuses
  - preserves existing data and ownership policies

## What was intentionally not included
- No history/version timeline for edits.
- No collaboration/comments.
- No regeneration pipeline changes.
- No market/event data integrations.
- No additional pages or route tree expansion beyond the focused detail API route.

## Recommended exact next implementation step
Add a compact **brief detail read-only API response caching layer** (e.g., conditional GET/etag or lightweight memoized fetch on client) and then implement **brief status filtering** in the recent list (`all`, `ready`, `invalidated`, `executed`) to improve daily workflow speed without broadening scope.
