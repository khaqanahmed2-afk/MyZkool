# Potential Removals and Relocations Analysis

> **Phase 2 — Deep File Classification & Dependency Investigation**  
> **Audited Date:** 2026-11-11  
> **Rule:** Every potential removal or relocation must be justified with empirical evidence.

---

## 1. Verified Safe Removals (Zero Risk)

### 1.1 `razorpay_windows_x86_64.zip` (4,176,814 bytes / 4.1 MB)
- **Path:** `/razorpay_windows_x86_64.zip`
- **Location:** Project root
- **Evidence of Non-Usage:**
  - `git grep razorpay_windows` yields 0 results across all files, configurations, and scripts.
  - Razorpay payment functionality is implemented via the official Node.js npm package `razorpay` (`^2.9.8` in `package.json`) and client-side Razorpay Checkout standard checkout script (`https://checkout.razorpay.com/v1/checkout.js`).
  - The binary zip file is a CLI utility downloaded for local webhook tunnel testing or CLI exploration. It is completely unused by the build, runtime, or test suite.
- **Risk Assessment:** Zero risk.
- **Recommendation:** Remove from repository root.

---

## 2. Verified Safe Relocations (Organize Without Deletion)

### 2.1 UI Verification Screenshots in `scripts/` (32 PNG files)
- **Files:**
  - `cards_1024px.png`, `cards_1280px.png`, `cards_1440px.png`, `cards_375px.png`, `cards_768px.png`
  - `cards_fixed_1024px.png` through `cards_fixed_768px.png` (5 files)
  - `cards_row_1024px.png` through `cards_row_768px.png` (5 files)
  - `dashboard_redesign_1024px_tablet_landscape.png` through `375px_mobile.png` (5 files)
  - `dashboard_v2_redesigned.png`, `dashboard_v2_verified.png`
  - `master_admin_dashboard_verified.png`, `master_admin_schools_verified.png`
  - `navbar_1024px.png`, `navbar_1024px_drawer.png` through `375px_drawer.png` (8 files)
- **Evidence:**
  - These are automated visual regression outputs produced during the UI verification phase.
  - Zero application imports or package script references.
  - Mixing 32 binary PNG images into the executable scripts folder degrades readability and script discovery.
- **Recommendation:** Relocate all 32 PNGs into a dedicated visual evidence directory: `docs/assets/screenshots/`.

### 2.2 Historical Data Backups in `scripts/backups/`
- **Files:**
  - `peace_convent_students.json` (27 KB, 100 student records)
  - `phase2b_financial_backup_pre.json` (401 KB)
  - `phase2b_financial_recovery.sql` (462 KB)
  - `phase2d_pre_commit_backup_20261017.json` (401 KB)
  - `phase2d_post_repair_live_backup_20261017.json` (686 KB)
- **Evidence:**
  - Created during historical database recovery operations (October 2026).
  - Tracked in Git history.
  - Deleting them would violate the critical safety rule: *Never remove historical financial audit evidence.*
- **Recommendation:** Relocate into `archive/financial_backups/` with a clear `README.md` explaining their origin and legal retention context, keeping them separated from day-to-day operational scripts.

### 2.3 Diagnostic vs. Operational Scripts in `scripts/`
- **Operational Scripts (Keep in `scripts/ops/` or `scripts/`):**
  - `run_all_tests.mjs`, `run_all_tests.py`
  - `optimize-images.cjs`
  - `create_backup.cjs`, `create_post_repair_backup.cjs`, `recover_financial_tables.cjs`
- **Development Diagnostic & Verification Scripts (Move to `scripts/diagnostics/`):**
  - `diagnose_page_mount.ts`, `inspect_db_schema.ts`, `inspect_exact_data.ts`, `inspect_known_schools.ts`
  - `reproduce_login_issue.ts`, `verify_dashboard_redesign.ts`, `verify_landing_ctas.ts`, `verify_login_production.ts`, `verify_website_production.ts`
  - `audit_authenticated_db.ts`, `audit_db.ts`, `audit_financial_calculations.ts`, `audit_invoices_db.ts`, `audit_phase2c_historical_dry_run.ts`
  - `test_*.ts` inside `scripts/` (which duplicate or complement `tests/`)

---

## 3. Redundant Documentation Consolidations

### 3.1 `FOLDER_STRUCTURE.md` in Root vs `docs/`
- **Root `FOLDER_STRUCTURE.md`:** 8,098 bytes, last updated April 2026.
- **`docs/FOLDER_STRUCTURE.md`:** Updated November 2026 with recent Master Admin and student refactoring.
- **Action:** Retain canonical version under `docs/FOLDER_STRUCTURE.md` and replace root with reference link or remove root redundancy.

### 3.2 Root `SCHEMA.md` vs `docs/`
- **Root `SCHEMA.md`:** 83,256 bytes, comprehensive reference of PostgreSQL tables.
- **Action:** Move into `docs/database/SCHEMA_REFERENCE.md` to organize all database documentation cohesively.

---

## 4. Preservation Register (Files NOT to be Removed)

| Item | Reason for Preservation |
|---|---|
| All 60 Supabase migrations in `supabase/migrations/` | Forward-only migration history required for clean database deployments |
| Rollback SQL scripts (`20261017220000_*_rollback.sql`) | Safety assets for emergency rollbacks |
| `packages/shared/` | Shared contracts intended for multi-package monorepo evolution |
| `.agents/` and `.agent/` | Active AI agent skills and GSD workflow definitions |
| `src/workers/jobWorker.ts` | Worker implementation covered by automated tests (`tests/test-job-worker.ts`) |
| `src/assets/index.ts` | Central typed asset registry for brand, mockup, and founder imagery |
