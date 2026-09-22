# MyZkool — Cleanup Report
**Branch**: `cleanup/phase2-safe-deletions`
**Dates**: 2026-09-22
**Phases completed**: Phase 1 (Audit), Phase 2 (Safe deletions), Phase 3 (Reorganization)

---

## Phase 2 — Files Deleted

| File | Reason |
|---|---|
| `src/utils/index.ts` | Empty barrel file (`export {}` only). Zero references in production or tests. |
| `src/middleware/idempotency.ts` | Full idempotency middleware implementation — never registered in any route, zero imports anywhere. The `idempotency_keys` table referenced inside it was never promoted to a DB migration. |

**Commit**: `6902530` — "cleanup(phase2): remove 2 confirmed-dead files"

---

## Phase 3 — Reorganization

### Problem fixed: Split type definitions

**Before**: Landing-page types (`FeatureItem`, `PricingPlan`, `ComparisonRow`, `FAQItem`, `ChatMessage`) lived in `src/types.ts` (project root), while all domain types lived in `src/types/`. The types barrel `src/types/index.ts` re-exported from `"../types"` (a cross-directory path).

**After**: Landing-page types relocated to `src/types/landing.ts`. The barrel now uses `export * from "./landing"` (consistent with all other entries). Root `src/types.ts` deleted.

**Files changed**:

| Action | File | Change |
|---|---|---|
| NEW | `src/types/landing.ts` | Landing-page types, relocated here |
| MODIFIED | `src/types/index.ts` | `export * from "../types"` → `export * from "./landing"` |
| MODIFIED | `src/components/Pricing.tsx` | `from "../types"` → `from "../types/landing"` |
| MODIFIED | `src/components/FAQ.tsx` | `from "../types"` → `from "../types/landing"` |
| MODIFIED | `src/components/AiSchoolAdvisor.tsx` | `from "../types"` → `from "../types/landing"` |
| DELETED | `src/types.ts` | Replaced by `src/types/landing.ts` |

**Zero logic changes** — only path relocations. Interfaces are byte-for-byte identical.

### New deliverable files
| File | Location |
|---|---|
| `FOLDER_STRUCTURE.md` | Project root |
| `CLEANUP_REPORT.md` (this file) | Project root |
| `SCHEMA.md` | Project root (Phase 4) |

---

## Verification Results

| Check | Phase 2 | Phase 3 |
|---|---|---|
| `npx tsc --noEmit` | ✅ 0 errors | ✅ 0 errors |
| Full test suite | ✅ 709 passed, 0 failed | ✅ 709 passed, 0 failed |
| Baseline (pre-cleanup) | — | 709 passed |

---

## Items Kept (with reasoning)

| File | Why Kept |
|---|---|
| `src/middleware/permissions.ts` | Imported by `tests/test-students-foundations.ts` (lines 16–19) for permission-middleware HTTP behaviour tests. Deleting would break 6 test assertions. Reclassified as 🟡 Needs Review. |
| `src/services/parentAuth.ts` | Zero production imports but architecturally correct future infrastructure (parent auth via school tenant). Marked with JSDoc for future builders. |
| `src/services/planService.ts` | Used only in `tests/test-students-foundations.ts`. Thin wrapper over `checkSchoolFeature()`. Not harmful; test coverage is positive. |
| `src/services/yearCloseService.ts` | Test-only reference. Planned year-close workflow. No scheduler wired yet. |
| `src/services/ledgerIntegrityJob.ts` | Test-only reference. Planned ledger integrity job. No scheduler wired yet. |
| `src/services/lateFeeJob.ts` | Test-only reference. Referenced in `tests/test-phase4.ts`. No production scheduler. |
| `public/logo.svg` | No in-code references found, but external usage (marketing materials, OG image, email templates) cannot be confirmed from code inspection alone. Left for manual verification. |

---

## Items NOT Addressed (deferred)

These were flagged in the Phase 1 report but explicitly deferred:

| Item | Reason deferred |
|---|---|
| `transport/dashboard` route alias in `App.tsx` | Functionally harmless; removing requires confirming no external bookmark/link uses it |
| Fees route aliases (`fees/invoices`, `fees/assign`, `fees/dues-report`) | Intentional UX aliases; removal requires coordinated update of Sidebar + FeeNavHeader active-state logic |
| `StudentLedgerTab` cross-module import (students→fees) | Phase 3 structural issue; safe to move in a dedicated pass |
| `src/middleware/` naming — `features.ts` used as browser utility | Naming oddity only; renaming requires updating ~15 imports across transport pages, services, and tests |
| Migration naming convention | Old migrations use `NNN_name.sql`; new ones should use `YYYYMMDDHHMMSS_name.sql`. Old files must NOT be renamed (Supabase tracks migration state by filename). |

---

## Architecture-Critical — Confirmed Intact

| Concern | Status |
|---|---|
| Aadhaar masking (`aadhaarValidation.ts`, `sensitiveCrypto.ts`) | ✅ Untouched |
| Tier-gating (`features.ts` / `checkSchoolFeature`) | ✅ Untouched |
| Multi-tenant auth (`middleware/auth.ts` / `requireSchoolContext`) | ✅ Untouched |
| RLS policies (all 17 migrations) | ✅ Untouched |
| No production data rows affected | ✅ Confirmed (code-only cleanup) |
