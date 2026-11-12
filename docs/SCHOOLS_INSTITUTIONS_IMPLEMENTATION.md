# MYZKOOL — SCHOOLS & INSTITUTIONS
## Complete Production Implementation Guide

**Document:** `docs/SCHOOLS_INSTITUTIONS_IMPLEMENTATION.md`  
**Module:** Super Admin → Schools & Institutions  
**Stack:** React 19, TypeScript 5.8, Tailwind CSS, Express, Supabase PostgreSQL, Supabase Auth  
**Status:** Production Ready & Verified

---

## 1. Executive Summary

The Schools & Institutions module has been transformed into a fully database-driven institutional control center for MyZkool Super Admins, adhering strictly to the provided visual mockup and functional architecture.

The implementation connects the frontend interface directly to the actual Supabase database via authenticated REST and RPC services, ensuring real-time multi-tenant visibility, subscription lifecycle management, and strict tenant isolation.

---

## 2. Core Functional Modules

### 2.1 Navigation Architecture (7 Dedicated Tabs)
The page layout provides 7 distinct views:
1. **Overview:**
   - 4 Top-level KPI cards (Total Schools, Active Schools, Pending Onboarding, Expired Subscriptions) with trend metrics.
   - 6 Compact secondary metric badges (Total Students, Total Staff, MRR, New Schools this Month, Trial Schools, Suspended Institutions).
   - Schools Directory Table with real-time search, filters, pagination, and bulk selection.
   - Interactive right-side slide-over / inspection drawer for the selected institution.
2. **All Schools:**
   - Full-width directory view with search across school name, institution code, contact email, and principal name.
   - Multi-field filters: Subscription Plan (`all`, `basic`, `pro`, `custom`), Status (`all`, `active`, `suspended`, `pending`), State, and Registration Date.
   - Pagination with configurable rows per page (10, 20, 50).
   - One-click CSV export.
3. **Onboarding:**
   - 8-stage pipeline tracker tracking registration submission, institution details, admin account creation, plan selection, payment verification, academic setup, initial data import, and final activation.
4. **Subscriptions:**
   - Institutional subscription health breakdown (Pro, Basic, Custom, Trial counts).
   - Direct triggers for plan upgrade/downgrade, trial extension, and validity extension.
5. **Tenants:**
   - Multi-tenant data isolation health, Row Level Security (RLS) enforcement verification, and tenant storage/student quotas.
6. **Activity & Monitoring:**
   - Real-time platform administrative audit feed from `platform_audit_logs`.
   - Proactive operational alerts for suspended institutions, trials expiring within 7 days, and incomplete onboarding.
7. **Reports:**
   - Lifecycle and status distribution visualizations.
   - Subscription tier distribution.
   - Verified CSV data export.

---

## 3. Institutional Inspection & Detail Drawer

Clicking any row in the directory opens the right-side detail drawer matching the mockup:
- **Header:** School logo, name, institution code (`MYZ-00124`), status pill (`Active`, `Suspended`), location (`Lucknow, Uttar Pradesh`), and close button.
- **Metric Chips:** Students enrolled, staff headcount, storage used.
- **Tabs:**
  - `Overview`: Institutional summary and core contacts.
  - `Subscription`: Current plan, validity date, trial days remaining, student limits, storage limit, and Quick Actions.
  - `Usage`: Student capacity progress gauge (`1,250 / 2,000`), storage usage, and enabled module chips.
  - `Activity`: Real-time audit logs for actions performed on this specific institution.
- **6 Quick Action Buttons:**
  1. Change Plan (Upgrade or downgrade)
  2. Extend Trial (Give additional days)
  3. Extend Subscription (Add extra validity)
  4. Suspend Institution (Temporarily restrict access)
  5. Reactivate Institution (Restore suspended access)
  6. Manage Modules (Enable/disable platform features)
- **View Subscription History:** Dedicated button opening the immutable history ledger.

---

## 4. Administrative Action Modals

Every sensitive operation requires administrative confirmation and is recorded to the audit log:
- **Change / Upgrade Plan Modal:**
  - Displays plan comparison (Basic, Pro, Custom), limits, enabled modules, and billing implications.
  - Mandatory administrative justification input.
- **Extend Free Trial Modal:**
  - Quick chips (`+3`, `+7`, `+15`, `+30` days) or custom input.
  - Live preview of newly calculated expiration date.
  - Updates `school_subscriptions` and logs to `school_subscription_history`.
- **Extend Subscription Modal:**
  - Supports both Paid (with payment reference/receipt) and Complimentary Administrative Concession extensions.
  - Live preview of new validity date.
  - Writes directly to database and history ledger.
- **Suspend / Reactivate Modal:**
  - Comprehensive explanation of access restriction behavior.
  - Reason category dropdown and detailed notes input.
  - Explicit notification confirming zero data deletion.
- **Manage Modules Modal:**
  - Interactive toggles for 11 platform features (`students`, `fees`, `attendance`, `admissions`, `website`, `communication`, `transport`, `exams`, `timetable`, `reports`, `approvals`).
  - Audited and saved to institutional configuration.
- **Subscription History Modal:**
  - Displays historical timeline loaded directly from `public.school_subscription_history` in Supabase.

---

## 5. Backend Architecture & Services

- **`src/services/masterAdminSchoolService.ts`:**
  - `getMasterAdminSchools`: Performs live query against `schools`, `school_subscriptions`, `students`, and `profiles`, computes all 10 overview KPIs, applies filtering, sorting, and pagination.
  - `changeSchoolSubscriptionPlan`: Updates plan in Supabase and records event to `school_subscription_history` and `platform_audit_logs`.
  - `extendSchoolTrial`: Computes new expiry, updates `school_subscriptions` in Supabase, records history and audit.
  - `extendSchoolSubscriptionValidity`: Handles paid and complimentary validity additions, updates Supabase, records history and audit.
  - `updateMasterAdminSchoolStatus`: Updates lifecycle status (`active` / `suspended`), records suspension reason and timestamp.
  - `getSchoolSubscriptionHistory`: Queries `public.school_subscription_history` directly from Supabase.
  - `updateSchoolModules`: Updates tenant feature toggles and logs administrative action.
  - `exportSchoolsToCsv`: Generates standard CSV with all institutional fields.
- **`src/routes/api/masterAdminSchoolRoutes.ts`:**
  - Express REST endpoints protected by `verifyMasterAdminToken` and granular permissions (`schools.view`, `schools.create`, `schools.suspend`, `subscriptions.manage`, `subscriptions.override`, `audit.view`).
