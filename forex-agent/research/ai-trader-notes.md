# AI-Trader Study Notes (Practical)

## Why this note exists
Capture useful workflow ideas inspired by AI-Trader-style systems without copying implementation or product identity.

## Useful ideas to learn from
1. **Lifecycle decomposition**
   - Split analysis into pre-trade, in-trade context, and post-trade review stages.
   - Benefit: improves prompt focus and output consistency.

2. **Structured artifacts over free chat**
   - Force outputs into stable schemas (brief, bias report, review object).
   - Benefit: easier validation, persistence, and UI rendering.

3. **State transitions and gating**
   - Use explicit statuses (`draft`, `ready`, `blocked`, `reviewed`).
   - Benefit: process discipline and clearer audit trail.

4. **Checklist-linked reasoning**
   - Tie model output to trader checklist and account constraints.
   - Benefit: higher practical utility for prop/funded contexts.

5. **Plan-vs-execution diffing**
   - Compare intent and action explicitly, then produce improvements.
   - Benefit: creates a repeatable learning loop.

## What should NOT be copied
- Any branding, UI identity, or product naming patterns.
- Any repo architecture that conflicts with Tradia’s Next.js + Supabase conventions.
- “Black-box signal” framing or certainty language.
- Any design that bypasses user control and accountability.
- Generic multi-asset abstraction that weakens Forex-first usability.

## Adaptation principles for Tradia
- Keep Forex and prop-firm constraints first-class.
- Reuse existing Tradia auth, data ownership, and dashboard mental model.
- Keep AI advisory and transparent; show assumptions/invalidation always.
- Implement in small slices that can ship independently.
