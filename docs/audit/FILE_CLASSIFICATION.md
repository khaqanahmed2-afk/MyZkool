# File Classification Reference

> **Phase 2 — Deep File Classification & Dependency Investigation**  
> **Audited Date:** 2026-11-11  
> **Classification Framework:** Categories A through J

---

## Category Definitions

- **Category A (Essential and Actively Used):** Core application source code, components, services, entrypoints, and middleware running in production.
- **Category B (Required Configuration):** Package manifests, lockfiles, build/tooling configs, environment templates, CI workflows.
- **Category C (Active Development Utilities):** Automated test suites, test runners, local development verification scripts.
- **Category D (Historical Audit & Financial Recovery):** Live database repair SQL, point-in-time financial state JSON snapshots, historical verification scripts. Must be preserved.
- **Category E (Duplicate Implementations):** Duplicate or overlapping code, assets, or documentation files.
- **Category F (Confirmed Obsolete / Dead Code):** Files no longer referenced, superseded, or completely orphaned.
- **Category G (Generated Artifacts):** Build outputs, compiled bundles, temporary caches.
- **Category H (Temporary Files):** Scratch scripts, temporary local investigation files.
- **Category I (Documentation & Reports):** System architecture specifications, module manuals, phase reports.
- **Category J (Requires Manual Review):** Files with uncertain runtime impact or potential external coupling.

---

## Master Classification Matrix

### Category A: Essential & Actively Used
| File / Directory | Layer | Purpose |
|---|---|---|
| `src/main.tsx` | Frontend | React 19 SPA bootstrapping entrypoint |
| `src/App.tsx` | Frontend | Root component with subdomain tenant routing and code-split AppRoutes |
| `src/index.css` | Styling | Global stylesheet importing Tailwind CSS v4 |
| `server.ts` | Backend | Production Express server, Vite middleware, Master Admin & Transport API routes |
| `src/routes/AppRoutes.tsx` | Routing | Complete client-side authenticated, onboarding, and admin route definitions |
| `src/routes/transportRoutes.ts` | API | Transport backend router protected by `requireFeature('transport')` |
| `src/routes/razorpayRoutes.ts` | API | Razorpay order creation and payment verification endpoints |
| `src/routes/deletionRoutes.ts` | API | GDPR compliant data deletion requests |
| `src/routes/api/masterAdmin*.ts` (10 files) | API | Control plane endpoints for master platform administration |
| `src/middleware/auth.ts` | Security | Express middleware resolving tenant `school_id` strictly from JWT |
| `src/middleware/features.ts` | Security | Feature tier gating (`requireFeature`, `checkSchoolFeature`) |
| `src/middleware/permissions.ts` | Security | Role-based permission enforcement |
| `src/middleware/errorHandler.ts` | Reliability | Express API centralized error handling |
| `src/middleware/audit.ts` | Security | Action audit trail logging |
| `src/services/*.ts` (49 files) | Domain Logic | Core ERP operations (Students, Fees, Transport, Academics, Master Admin) |
| `src/components/admin/**/*` (99 files) | UI | School Admin and Master Admin operational components |
| `src/pages/**/*` (97 files) | UI | Complete page-level route components |
| `src/lib/supabase.ts` | Database | Supabase client singleton with UTC clock skew compensation |
| `src/lib/*.ts` | Domain Helpers | Receipt templates, number-to-words, fee allocations |
| `src/context/AuthContext.tsx` | State | Authenticated school user session context |
| `src/context/MasterAdminAuthContext.tsx` | State | Master Admin control plane authentication session |
| `src/hooks/*.ts` (4 files) | State | `useAuth`, `useDisclosure`, `useLandingModals`, `usePageMetadata` |
| `src/types/*.ts` (19 files) | Typings | Type definitions for domain entities |
| `src/workers/jobWorker.ts` | Background | Worker processing async jobs |
| `src/workers/notificationWorker.ts` | Background | Notification queue dispatcher |
| `public/*` (15 files) | Static Assets | Logos, favicons, branding, robots.txt, sitemap.xml |
| `supabase/migrations/*.sql` (60 files) | Database | Complete PostgreSQL schema, functions, triggers, and RLS policies |

---

### Category B: Required Configurations
| File | Context | Purpose |
|---|---|---|
| `package.json` | Root | Project dependencies, engines, and run scripts |
| `package-lock.json` | Root | Dependency lockfile |
| `tsconfig.json` | Root | TypeScript compiler configuration (bundler resolution, path aliases) |
| `vite.config.ts` | Root | Vite bundling configuration, vendor chunking, and proxy settings |
| `.gitignore` | Root | Git ignore specifications |
| `.env.example` | Root | Safe public template for required environment variables |
| `.github/workflows/ci.yml` | CI/CD | GitHub Actions workflow (Lint -> Test -> Build) |
| `.github/workflows/react-doctor.yml` | CI/CD | React architecture and component health audit workflow |
| `metadata.json` | AI/Dev | Platform capabilities metadata |
| `model_capabilities.yaml` | AI/Dev | Model context configurations |
| `skills-lock.json` | AI/Dev | Lockfile for registered developer skills |
| `VERSION` | Release | Current semver platform version ("1.6.0") |

---

### Category C: Active Development & Test Utilities
| File / Directory | Context | Purpose |
|---|---|---|
| `tests/*.ts` (86 files) | Testing | Exhaustive test suite covering RLS, multi-tenancy, fees, students, transport |
| `scripts/run_all_tests.mjs` | Testing | Automated test runner in Node.js (executes tests in `tests/*.ts`) |
| `scripts/run_all_tests.py` | Testing | Python test runner executed by CI workflow (`.github/workflows/ci.yml`) |
| `scripts/optimize-images.cjs` | Assets | Utility script for compressing static image assets |
| `scripts/create_backup.cjs` | Operations | Operational utility to dump database tables |
| `scripts/create_post_repair_backup.cjs` | Operations | Operational utility for post-migration data integrity capture |
| `scripts/recover_financial_tables.cjs` | Operations | Utility for table recovery |
| `scripts/validate-*.ps1` & `.sh` (12 files) | Tooling | Agent, template, workflow, and skill validation scripts |
| `scripts/search_repo.ps1` & `.sh` (4 files) | Tooling | Repository exploration and setup scripts |

---

### Category D: Historical Audit & Financial Recovery Records
| File | Context | Purpose & Evidence |
|---|---|---|
| `scripts/backups/phase2b_financial_backup_pre.json` | Financial | Point-in-time snapshot of fees, receipts, payments, and ledger prior to Phase 2b |
| `scripts/backups/phase2b_financial_recovery.sql` | Recovery SQL | SQL statements to restore Phase 2b financial records |
| `scripts/backups/phase2d_pre_commit_backup_20261017.json` | Financial | Pre-repair live database capture |
| `scripts/backups/phase2d_post_repair_live_backup_20261017.json` | Financial | Verification snapshot post repair |
| `scripts/backups/peace_convent_students.json` | Student Data | 100 student records used during onboarding and import reconciliation |
| `supabase/scripts/phase2d_historical_repair.sql` | Database Repair | Migration script used to reconcile ledger discrepancies |
| `reports/*.md` (11 files) | Audit Evidence | Historical financial calculation and ledger audit verification reports |

---

### Category E: Duplicate Implementations
| File 1 | File 2 | Status & Recommended Action |
|---|---|---|
| `FOLDER_STRUCTURE.md` (root) | `docs/FOLDER_STRUCTURE.md` | Root file is dated April 2026; docs/ is updated November 2026. Consolidate into canonical `docs/FOLDER_STRUCTURE.md`. |
| `CLAUDE.md` (root) | `adapters/CLAUDE.md`, `.claude/CLAUDE.md` | Redundant adapter duplicates across 3 folders. Keep `.claude/CLAUDE.md` or root `CLAUDE.md`. |
| `SCHEMA.md` (root) | `docs/modules/*/database-schema.md` | Large 83KB root file; consolidate into `docs/database/SCHEMA_REFERENCE.md`. |
| `public/*.png` | `public/*.webp` | WebP and PNG versions of founder and hero images coexist. Keep WebP and retain PNGs only if explicitly imported. |

---

### Category F: Confirmed Obsolete / Dead Files
| File | Evidence | Action |
|---|---|---|
| `razorpay_windows_x86_64.zip` | 4.1MB binary zip in root. Zero references in repo (`git grep razorpay_windows` returns 0). Not required for web or node app. | Remove from root (safe removal). |
| `packages/shared/` | Has separate package.json with zod v3. No imports in `src/` or `server.ts`. Path alias in tsconfig and vite.config points to it but is unused. | Mark for consolidation or alignment. |
| `scripts/*.png` (32 files) | Visual verification screenshots created during UI reviews. Zero code imports. | Relocate to `docs/assets/screenshots/` to separate from executable scripts. |

---

### Category G: Generated Artifacts
| Directory / File | Evidence | Action |
|---|---|---|
| `dist/` | Build output created by `npm run build`. Not tracked in Git (`git ls-files dist` returns 0). Ignored by `.gitignore`. | Retain in `.gitignore`; do not commit. |
| `node_modules/` | Package dependencies. Ignored by `.gitignore`. | Maintain as untracked. |

---

### Category H: Temporary Files
| File | Context | Action |
|---|---|---|
| `scripts/audit_authenticated_db.ts` | Untracked temporary script created during recent diagnostic session. | Relocate to development diagnostic scripts or remove if redundant. |
| `scripts/audit_db.ts` | Untracked temporary script. | Relocate to dev diagnostics. |
| `supabase/.temp/` | Supabase CLI local workspace cache. | Already covered by `.gitignore`. |

---

### Category I: Documentation & Reports
| Directory / File | Purpose | Action |
|---|---|---|
| `docs/*.md` (27 files) | System architectural specifications, audits, security reports | Reorganize into structured subdirectories (`docs/architecture/`, `docs/database/`, `docs/audit/`). |
| `docs/master-admin/*.md` (7 files) | Control plane specifications | Retain under `docs/master-admin/`. |
| `docs/modules/fees/*.md` (10 files) | Detailed fee domain manuals | Retain under `docs/modules/fees/`. |
| `docs/modules/students/*.md` (10 files) | Detailed student domain manuals | Retain under `docs/modules/students/`. |

---

### Category J: Requires Manual Review / Safe Boundary
| File | Finding | Safety Consideration |
|---|---|---|
| `scripts/backups/*.json` | Contains actual student names and financial reconciliation snapshots. | Currently tracked in Git. Must NOT be deleted (destroys historical audit trail) but should be moved to an isolated `archive/data_backups/` directory with clear warnings. |
| `src/middleware/features.ts` | Contains `typeof localStorage !== "undefined"` fallback check. | Safe because guarded by `typeof`, but architectural anti-pattern for pure backend code. Needs cleanup. |
| `src/middleware/features.ts` | `checkStudentLimit()` returns hardcoded 800. | Safe placeholder; needs connection to database counts in future milestone. |
