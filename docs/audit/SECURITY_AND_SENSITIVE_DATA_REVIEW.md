# Security and Sensitive Data Review

> **Phase 2 — Deep File Classification & Dependency Investigation**  
> **Audited Date:** 2026-11-11  
> **Focus:** PII handling, secrets exposure, backend boundaries, and multi-tenant isolation.

---

## 1. Sensitive Backup Data Investigation

### 1.1 Files Audited
- `scripts/backups/peace_convent_students.json`
- `scripts/backups/phase2b_financial_backup_pre.json`
- `scripts/backups/phase2b_financial_recovery.sql`
- `scripts/backups/phase2d_pre_commit_backup_20261017.json`
- `scripts/backups/phase2d_post_repair_live_backup_20261017.json`

### 1.2 Structure & Exposure Findings
- **Student Data (`peace_convent_students.json`):**
  - Contains 100 student records with keys: `id`, `first_name`, `last_name`, `admission_no`, `admission_class_id`, `is_rte`, `status`.
  - **No raw Aadhaar numbers or cleartext identity tokens are contained in this JSON.**
  - Names and admission numbers reflect real school onboarding records.
- **Financial Backups (`phase2b_*.json`, `phase2d_*.json`):**
  - Contains point-in-time state of `fee_receipts`, `fee_payments`, `fee_ledger`, `student_dues`.
  - Used for ledger reconciliation during historical data recovery.
- **Git Tracking Status:**
  - **These files are currently tracked in the Git repository.**
- **Mitigation & Retention Strategy:**
  - The files must **not** be deleted, as doing so destroys historical reconciliation evidence.
  - They should be moved out of the operational `scripts/` directory into a dedicated, documented archive: `archive/historical_backups/`.
  - A comprehensive `.gitignore` entry should be maintained for any future `.json` or `.sql` dumps in backup folders to prevent accidental commit of new live data.

---

## 2. Secrets & Credential Exposure Audit

### 2.1 Environment Variable Security
- Checked `.env.example`: Contains only placeholder keys (`APP_MASTER_KEY=`, `VITE_SUPABASE_ANON_KEY=`, etc.). No live credentials committed.
- Checked `.gitignore`: Explicitly excludes `.env`, `.env.*`, `*.pem`, `*.key`.
- Client vs Server Key Isolation:
  - `VITE_SUPABASE_ANON_KEY`: Safe public anon key bundled into client SPA.
  - `SUPABASE_SERVICE_ROLE_KEY`: Guarded on server-side only; never passed to client code or Vite bundle.
  - `APP_MASTER_KEY`: 32-byte master key used for field-level AES-256-GCM encryption of sensitive data (Aadhaar, parent credentials); strictly server-side.

---

## 3. Middleware Security & Tenant Context

### 3.1 Tenant Isolation in `src/middleware/auth.ts`
- Verified: `requireSchoolContext` middleware resolves `school_id` exclusively from verified JWT and the database `profiles` / `schools` table.
- Client headers (`x-school-id`) and request bodies are validated against the authenticated user's confirmed `school_id`. Any mismatch immediately throws `403 Forbidden` (`CROSS_TENANT_FORBIDDEN`).

### 3.2 Investigation of `src/middleware/features.ts`
- **Issue Discovered in Phase 1:**
  - `features.ts` contains a fallback block checking `typeof localStorage !== "undefined"`.
  - **Analysis:**
    - `checkSchoolFeature()` is shared between frontend components (like `Sidebar.tsx`, `FeeHeadsPage.tsx`, `VehiclesPage.tsx`) and backend route protection (`requireFeature`).
    - The `typeof localStorage !== "undefined"` check is safely guarded so it does not throw errors when running in Node.js.
    - In the browser, it allows caching the active school's plan features to prevent excessive roundtrips to Supabase on every UI navigation.
    - On the server, it falls through to Supabase RPC / database query (`school_has_feature`).
  - **Recommendation:**
    - To maintain strict architectural cleanliness, separate client-side feature checking into `src/services/featureService.ts` or a hook `useFeatures()`, keeping `src/middleware/features.ts` as pure Express middleware.

### 3.3 `checkStudentLimit()` Implementation
- Currently returns `{ canCreate: true, limit: 800, currentCount: 0 }`.
- This is a safe non-breaking placeholder that permits school operation. Connecting it to a real-time count (`select count(*) from students where school_id = $1`) will be documented in the technical debt and roadmap sections.
