# Duplicate Implementations Analysis

> **Phase 2 — Deep File Classification & Dependency Investigation**  
> **Audited Date:** 2026-11-11

---

## 1. Component Name Overlap Audit

### 1.1 `src/pages` vs `src/components`
- **Result:** Automated scan of all file names across `src/pages` and `src/components` confirms **0 identical file collisions**.
- **Explanation:**
  - Page-level components represent routable views (e.g., `src/pages/admin/students/StudentList.tsx` or `src/pages/admin/fees/InvoicesPage.tsx`).
  - Child components represent modular UI widgets (e.g., `src/components/admin/fees/InvoiceDetailModal.tsx` or `src/components/admin/dashboard/DashboardKpiCards.tsx`).
  - However, in the students module, several sub-components (such as `StudentFilterChips.tsx`, `StudentSummaryStrip.tsx`, and the 8 `StudentWizardStep*.tsx` files) currently live inside `src/pages/admin/students/`. While not conflicting by name, they are functionally reusable sub-components rather than distinct pages.

---

## 2. Service Layer Specialization vs Duplication

### 2.1 `adminDashboardService.ts` vs `masterAdminDashboardService.ts`
- **Audit Findings:**
  - `adminDashboardService.ts`: Scoped to a single school tenant. Computes student counts, attendance rates, fee collection percentages, and quick tasks for a school administrator.
  - `masterAdminDashboardService.ts`: Scoped to the entire platform. Aggregates multi-tenant system health, total schools onboarded across India, total platform MRR, active subscription statuses, and system error rates.
  - **Verdict:** Distinct business responsibilities; not duplicate code.

### 2.2 `transportService.ts` vs `transportCoreService.ts`
- **Audit Findings:**
  - `transportService.ts`: Acts as a unified client facade for the transport subsystem. Combines fleet management, route assignment, stop pricing, and expiry notifications.
  - `transportCoreService.ts`: Low-level database operations on vehicles, routes, and stops.
  - **Verdict:** Layered design pattern (Facade pattern). Maintain separation.

---

## 3. Duplicate Documentation Files

| Duplicate Document Pair | Analysis & Resolution |
|---|---|
| `FOLDER_STRUCTURE.md` (root) vs `docs/FOLDER_STRUCTURE.md` | Root is outdated (April 2026). `docs/` is the canonical reference. Root should be removed or made a symlink/redirect. |
| `CLAUDE.md` (root) vs `adapters/CLAUDE.md` vs `.claude/CLAUDE.md` | Exact duplicate content across 3 locations. Consolidate into canonical `.claude/CLAUDE.md` and root `CLAUDE.md`. |
| `SCHEMA.md` (root) vs `docs/modules/*/database-schema.md` | Root contains all tables in one 83KB file. Relocate to `docs/database/SCHEMA_REFERENCE.md`. |
