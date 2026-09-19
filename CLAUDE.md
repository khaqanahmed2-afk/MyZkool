# MyZkool
Multi-tenant school SaaS for K-12 schools in India. Stack: React 19, TypeScript, Vite, Tailwind v4, Motion, Lucide; Express on Node; Supabase (Auth, Postgres with RLS, Storage).

## Spec
docs/spec.md is the source of truth. Never read it whole and never edit it. Read sections with `scripts/spec.sh <ID...>` (for example A4.2, B6, 1.5). Section IDs come from the phase prompt.

## Hard rules
1. Plan gating is server-side (API middleware plus RLS). Transport is Pro only.
2. No hard deletes. Money is integer paise (bigint), never floating point.
3. Every tenant table has school_id and RLS. Every new table gets a cross-tenant isolation test.
4. Aadhaar is encrypted and masked; reveal needs permission, a reason and an audit row. Medical data has its own permission and RLS.
5. Parents live in the standalone parents table plus join table.
6. Money-changing POST routes take an Idempotency-Key. Sequences (admission no, receipt no, TC no) come from counters inside the same transaction.
7. Modules talk through service functions (spec D1) and never write another module's tables.
8. UI: brand blue #2158E0, emerald #1FAE7A, Plus Jakarta Sans for display, Inter for body, Lucide icons. Sentence case, no emojis, no all-caps labels. Every screen has skeleton, empty and error states, works at 360px, and is keyboard usable. No generic stacked admin forms.
9. Reuse existing code, tokens and components. Do not rewrite what works. Existing tests must keep passing.
10. Validate input with one shared Zod schema on client and server.

## Working style
- Build in vertical slices: migration, API, UI, tests.
- Ask a question only if blocked. Otherwise use the spec's [DECISION] default and add one line to docs/decisions.md.
- Do not print large files back. Do not explain what you are about to do. Run tests and typecheck with quiet output.
- No refactors outside the phase scope.
- A phase is done when: typecheck is clean, the full test suite passes, and you have committed with the message "phase N: <name>".
- Final report is at most 12 lines: done, partial, deviations from spec, decisions used, next blocker.

6. Commit: "chore: project conventions". Report in 3 lines.
