# MYZKOOL — SCHOOLS & INSTITUTIONS
## Existing Codebase Audit & Architectural Analysis

**Document:** `docs/SCHOOLS_INSTITUTIONS_AUDIT.md`  
**Date:** November 2026  
**Auditor:** Super Admin Platform Engineering  
**Scope:** Super Admin / Master Admin Control Plane → Schools & Institutions Management Module

---

## 1. Existing Architecture

### 1.1 Multi-Tenant Platform Structure
MyZkool is built on a hybrid Node.js/Express + React 19 + TypeScript + Vite stack backed by Supabase PostgreSQL (Postgres 17.6) with Supabase Auth and Row Level Security (RLS).
- **Frontend Admin Shells:**
  - `AdminShell.tsx`: School Admin portal (`/admin/*`) operating in single-tenant scope determined by user profile membership (`school_id`).
  - `MasterAdminShell.tsx`: Platform Super Admin portal (`/master-admin/*`) operating in cross-tenant global control plane scope.
- **Routing:**
  - Client router (`src/routes/AppRoutes.tsx`) mounts Master Admin under `/master-admin` protected by `MasterAdminRoute` and `MasterAdminAuthProvider`.
  - Express backend (`server.ts`) mounts Master Admin API routers under `/api/master-admin/*` (`/schools`, `/subscriptions`, `/billing`, `/dashboard`, `/monitoring`, `/settings`, `/users`, `/support`, `/announcements`).
- **Data Access:**
  - Authenticated queries via Supabase client (`src/lib/supabase.ts` and `src/middleware/masterAdminAuth.ts`), leveraging `platform_admins`, `platform_roles`, and `platform_permissions`.

---

## 2. Existing Database Relationships & Schemas

### 2.1 Core Relational Entities
1. **`public.schools`**:
   - `id` (UUID, PK)
   - `name`, `subdomain` (Unique), `school_type`, `affiliation_board`
   - `official_email`, `contact_phone`, `address`, `city`, `district`, `state`, `pin_code`
   - `institution_code` (Unique, e.g. `MYZ-00124`)
   - `status` (`'active' | 'suspended' | 'pending'`)
   - `suspended_at`, `suspension_reason`, `suspended_by` (FK -> `platform_admins.id`)
   - `storage_limit_bytes`, `storage_used_bytes`
   - `principal_name`, `principal_email`
   - `onboarding_completed` (BOOLEAN), `onboarding_step` (INT)
   - `created_at`, `updated_at`

2. **`public.subscription_plans`**:
   - `id` (UUID, PK)
   - `slug` (`'basic' | 'pro' | 'custom'`)
   - `name`, `description`, `price_monthly`, `price_six_months`, `price_yearly`
   - `max_students`, `trial_days`, `features` (JSONB array), `is_active`

3. **`public.school_subscriptions`**:
   - `id` (UUID, PK), `school_id` (FK -> `schools.id`), `plan_id` (FK -> `subscription_plans.id`)
   - `billing_cycle` (`'monthly' | 'six_months' | 'yearly'`)
   - `status` (`'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'`)
   - `trial_starts_at`, `trial_ends_at`, `current_period_starts_at`, `current_period_ends_at`
   - `amount`, `payment_status` (`'trial' | 'paid' | 'pending' | 'failed'`)

4. **`public.school_subscription_history`**:
   - `id` (UUID, PK), `school_id` (FK -> `schools.id`), `subscription_id` (FK -> `school_subscriptions.id`)
   - `operation_type` (`'created' | 'plan_change' | 'trial_extended' | 'validity_extended' | 'status_change' | 'complimentary_grant'`)
   - `previous_plan_slug`, `new_plan_slug`, `previous_expiry`, `new_expiry`
   - `classification` (`'paid' | 'complimentary' | 'trial' | 'system'`)
   - `reason` (TEXT), `payment_reference` (TEXT)
   - `performed_by` (FK -> `platform_admins.id`), `admin_email` (TEXT)
   - `metadata` (JSONB), `created_at` (TIMESTAMPTZ)

5. **`public.platform_audit_logs`**:
   - `id` (UUID, PK), `admin_id` (FK -> `platform_admins.id`), `admin_email`, `action`
   - `resource_type`, `resource_id`, `school_id`, `details` (JSONB), `created_at`

6. **`public.profiles` / `public.students` / `public.staff`**:
   - Tenant-isolated records linked via `school_id`.

---

## 3. Existing Functionality

- Initial Super Admin authentication and permission checks.
- Baseline schools listing and basic filtering in `MasterAdminSchools.tsx`.
- Basic school registration form (`MasterAdminSchoolNew.tsx`).
- Basic school profile view (`MasterAdminSchoolDetail.tsx`).
- Migration `20261112000000_schools_management_production_hardening.sql` added institution codes, status fields, and subscription history table.

---

## 4. Gaps and Missing Functionality

1. **Mockup UI Alignment:**
   - Missing the top 7 navigation sections: `Overview`, `All Schools`, `Onboarding (32)`, `Subscriptions`, `Tenants`, `Activity & Monitoring`, `Reports`.
   - Missing the primary overview statistics banner (Total Schools, Active Schools, Pending Onboarding, Expired Subscriptions) and the secondary metrics strip (Students, Staff, MRR, New Schools, Trial Schools, Suspended Institutions).
   - Missing the dedicated slide-over / right-side inspection drawer for selected institutions with the 4 tabs (`Overview`, `Subscription`, `Usage`, `Activity`).
   - Missing quick-action trigger buttons with dedicated confirmation modals.
2. **Subscription Management Completeness:**
   - Plan change modal with pricing impact and upgrade/downgrade confirmation.
   - Extend Trial modal with (+3, +7, +15, +30, custom) calculation and direct database write.
   - Extend Paid Subscription modal with paid vs complimentary classification.
   - Subscription History modal connected to `public.school_subscription_history` in Supabase (currently queried from an in-memory JS array in `masterAdminSchoolService.ts`).
3. **Audit and Persistence Reliability:**
   - Operations in `masterAdminSchoolService.ts` recorded status changes and trial extensions to an in-memory array rather than executing Supabase `INSERT INTO public.school_subscription_history`.
   - In `masterAdminDashboardService.ts`, variable scoping bug caused `subsRes is not defined` crash under certain query executions (now resolved).
4. **Directory Interactivity:**
   - Full search across school name, institution code, contact email, principal name, city.
   - Multi-field filters (Plan, Status, State, Registration date).
   - Bulk selection and multi-action controls.
   - Verified server-side and client-side CSV export.

---

## 5. Security & Isolation Analysis

- **Tenant Isolation:**
  - School admin queries are strictly gated by RLS (`WHERE school_id IN (...)`).
  - Cross-tenant queries are only permitted to verified `platform_admins` via `is_platform_admin()` security definer function or server-side service-role queries.
- **DPDP Act & Student PII Protection:**
  - Master Admin views display strictly aggregated student and staff counts; no student personal data (Aadhaar, home addresses, phone numbers) is surfaced in institutional listings.
- **Service Role Secrets:**
  - Supabase Service Role key is strictly server-side in `server.ts` and Express middlewares, never bundled into frontend assets or Vite client code.
- **Status Restrictions:**
  - Suspended institutions must be blocked from tenant school-admin login or administrative operations while preserving all underlying school data.

---

## 6. Required Database Actions

1. Seed initial verified subscription history records into `public.school_subscription_history` so institutions have historical baseline entries.
2. Verify all 6 institutions have correct `institution_code`, `status`, and active subscription records.
3. Update `masterAdminSchoolService.ts` to write and read directly from `public.school_subscription_history` in Supabase.

---

## 7. Implementation Plan

- **Step 1:** Complete Database Integration in `masterAdminSchoolService.ts` (direct Supabase operations for history, plan change, extensions, suspensions, modules).
- **Step 2:** Build comprehensive, pixel-accurate UI matching the provided mockup:
  - Header with icon, title, subtitle, "+ Add Institution" button.
  - 7 Navigation tabs with active state indicators and badge counters.
  - 4 Major KPI cards + 6 secondary metric badges driven by real DB metrics.
  - Schools Directory table with full columns, status indicators, badges, and action menus.
  - Inspection Right-Side Panel with tabs (`Overview`, `Subscription`, `Usage`, `Activity`) and 6 Quick Action buttons.
  - Full suite of action modals with validation and confirmation.
- **Step 3:** Implement Onboarding, Subscriptions, Tenants, Activity & Monitoring, and Reports subviews.
- **Step 4:** Automated testing and verification (unit tests, integration tests, security tests, CSV export tests, build verification).
- **Step 5:** Final production readiness documentation.
