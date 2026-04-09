# Forex Agent Workspace

## What this is
`forex-agent/` is an internal planning workspace for building Tradia’s **Forex execution intelligence layer**. It is not a standalone product and not a separate app. It is a design-and-architecture area where product logic, data contracts, workflow specs, and AI behavior are defined before production implementation.

## Why it exists inside Tradia
Tradia already has the right audience (Forex, prop, funded traders), the right product surface (journal + analytics), and the right technical foundations (Next.js + Supabase + AI insights). Building this workspace inside Tradia keeps:
- data context unified,
- user workflow continuity intact,
- implementation cost and complexity low.

## Current phase
Current phase is **internal planning and architecture design**:
- no new routes,
- no UI implementation,
- no dashboard modification,
- no migration execution.

This folder should produce implementation-ready artifacts so the next phase can ship with minimal ambiguity.

## Subfolders
- `docs/`: product and system design references that define what to build and why.
- `schemas/`: TypeScript-first draft entity schemas and validation constraints.
- `adapters/`: integration notes for external/internal data and AI orchestration boundaries.
- `prompts/`: prompt contracts for pre-trade, bias, and post-trade AI analysis.
- `research/`: distilled notes from AI-Trader-style references and lessons applicable to Tradia.

## Suggested reading order
1. `PLAN.md`
2. `docs/product-spec.md`
3. `docs/architecture.md`
4. `docs/integration-map.md`
5. `docs/data-models.md`
6. `docs/execution-workflows.md`
7. `docs/ai-analysis-spec.md`
8. `schemas/` and `prompts/`
