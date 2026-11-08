# MyZkool Master Admin — 15-Phase Production Implementation Plan

> **Document Version**: 2.0.0  
> **Status**: Active Execution Plan  
> **Target**: 100% Real Supabase Data Integration & Production Readiness  
> **File Location**: `docs/MASTER_ADMIN_IMPLEMENTATION_PLAN.md`

---

## 1. Execution Principles

1. **Zero Mock Fallbacks**: Remove all hardcoded dummy arrays, simulated numbers, and mock stores from production code paths.
2. **Propagate Authenticated JWTs**: Every Express service call must carry the platform administrator's Bearer token so PostgreSQL RLS policies evaluate `is_platform_admin() = true`.
3. **Preserve School ERP Functionality**: Changes to the Master Admin control plane must never alter, regress, or disrupt the existing School ERP (`/admin/*`) or school-level data.
4. **DPDP Student Privacy Protection**: Platform operators must only access aggregated, statistical school telemetry. Direct access to unmasked student personal data is strictly prohibited.
5. **Sequential Verification**: Complete and verify each phase with automated integration tests, lint checks, and browser validations before advancing to the next.

---

## 2. Phase-by-Phase Implementation Specifications

### Phase 0: Complete Codebase & Database Audit
- [x] Inspect all Master Admin routes and components.
- [x] Identify every dummy data array, mock response, and hardcoded number.
- [x] Audit Supabase schema, existing migrations, and RLS policies.
- [x] Produce `docs/MASTER_ADMIN_PRODUCTION_AUDIT.md`.

### Phase 1: Master Admin Authentication & Token Propagation
- **Objective**: Establish reliable, token-scoped Supabase client propagation across all backend services.
- **Tasks**:
  1. Update `MasterAdminRequest` in `src/middleware/masterAdminAuth.ts` to attach `supabaseClient: SupabaseClient` configured with the caller's JWT Bearer token.
  2. Create helper `getScopedSupabaseClient(req)` to provide authenticated access to all controllers and services.
  3. Verify that `public.is_platform_admin()` evaluates to `true` for all authenticated platform admin requests.
  4. Ensure session expiry, token refresh, and logout gracefully invalidate cached state.
- **Verification**: `tests/test-phase1-master-admin-auth.ts`.

### Phase 2: Real Database-Driven Master Dashboard
- **Objective**: Replace all hardcoded KPI numbers, simulated charts, fake activities, and dummy attention badges with live Supabase database queries.
- **Tasks**:
  1. Rebuild `getPlatformDashboardMetrics(authToken, period)`:
     - **Total Schools**: Real count from `public.schools` + 30-day registration trend calculation.
     - **Total Students**: Real aggregate count from `public.students` across active schools.
     - **Total Revenue**: Real sum from `public.school_subscription_payments` (`status = 'captured'`) converted to INR.
     - **Active Subscriptions**: Real count from `public.school_subscriptions` (`status IN ('active', 'trialing')`).
     - **School Registrations Chart**: Dynamic date bucketing grouped by school `created_at`.
     - **Subscription Revenue Chart**: Real monthly revenue sums from `school_subscription_payments`.
     - **Subscription Donut Chart**: Dynamic count of `basic`, `pro`, `custom`, and `trial` subscriptions.
     - **System Health**: Real database ping latency, Node.js memory, and storage availability.
     - **Recent Activities**: Real event stream queried from `platform_audit_logs` and `schools`.
     - **Key Insights & Attention**: Real pending payments from invoices and upcoming subscription expiries.
  2. Implement proper empty states for when the platform is newly deployed or data is sparse.
- **Verification**: `tests/test-phase2-dashboard-metrics.ts` + headless Chrome browser verification.

### Phase 3: Schools & Institutions Management
- **Objective**: Real-data CRUD and lifecycle management across all educational institutions.
- **Tasks**:
  1. Connect `getMasterAdminSchools` to `public.schools` with pagination, search, board filter, and state filter.
  2. Join each school with live `students` count and active `school_subscriptions`.
  3. Support school status updates (`active` vs `suspended`) with mandatory reason logging in `platform_audit_logs`.
  4. Connect school registration flow (`/master-admin/schools/new`) to Supabase `schools` table.
- **Verification**: `tests/test-phase3-school-management.ts`.

### Phase 4: Platform Users & RBAC
- **Objective**: Complete platform operator directory and permission enforcement.
- **Tasks**:
  1. Connect `masterAdminUserRoutes.ts` to `public.platform_admins` joined with `public.platform_roles`.
  2. Implement operator creation, profile updates, and active/inactive status toggling.
  3. Enforce strict role and permission checks on every administrative action.
- **Verification**: `tests/test-phase6-users-and-support.ts`.

### Phase 5: Subscription Plans & Entitlements
- **Objective**: Real-time management of subscription tiers, pricing, and student quotas.
- **Tasks**:
  1. Connect `masterAdminSubscriptionRoutes.ts` to `public.subscription_plans`.
  2. Calculate live subscriber counts from `school_subscriptions`.
  3. Support live editing of monthly/six-month/yearly pricing, max students, and feature flags.
  4. Log all plan modifications to `platform_audit_logs`.
- **Verification**: `tests/test-phase4-subscription-management.ts`.

### Phase 6: Billing, Invoicing & Payments
- **Objective**: B2B SaaS revenue ledger, automated GST invoices, and Razorpay reconciliation.
- **Tasks**:
  1. Connect `masterAdminBillingRoutes.ts` to `public.subscription_invoices` and `public.school_subscription_payments`.
  2. Calculate real platform revenue aggregates (Total Collected, MRR, Outstanding).
  3. Support refund authorization workflow with audit trail generation.
- **Verification**: `tests/test-phase5-billing-and-finance.ts`.

### Phase 7: Support Center & Helpdesk
- **Objective**: Real-time institutional support tickets and threaded conversations.
- **Tasks**:
  1. Connect `masterAdminSupportRoutes.ts` to `public.support_tickets` and `public.support_ticket_messages`.
  2. Support ticket assignment, priority changes, status transitions (`open`, `in_progress`, `resolved`).
  3. Enforce privacy: private internal notes (`is_internal_note = true`) are visible only to platform operators.
- **Verification**: `tests/test-phase6-users-and-support.ts`.

### Phase 8: Targeted Platform Announcements
- **Objective**: Broadcast platform maintenance, feature alerts, and billing notifications.
- **Tasks**:
  1. Connect `masterAdminAnnouncementRoutes.ts` to `public.platform_announcements`.
  2. Support audience targeting (`all`, `pro_plan`, `basic_plan`, `specific_schools`).
  3. Implement publication scheduling and expiry date controls.
- **Verification**: `tests/test-phase7-8-settings-monitoring-audit.ts`.

### Phase 9: Reports & Data Analytics
- **Objective**: Comprehensive reporting and statutory CSV/PDF data exports.
- **Tasks**:
  1. Build date-range filtered reports for School Growth, Revenue Collection, and Subscription Renewals.
  2. Implement CSV export utility for institutional directories and payment logs.
- **Verification**: Unit and API tests for report generation.

### Phase 10: System Monitoring & Telemetry
- **Objective**: Real-time health probes and infrastructure diagnostics.
- **Tasks**:
  1. Connect `masterAdminMonitoringRoutes.ts` to live database health, storage quota, and Node.js process telemetry.
  2. Measure real response times and uptime statistics.
- **Verification**: Health endpoint integration tests.

### Phase 11: Database Administration & Health
- **Objective**: Schema inspection, migration tracking, and table inventories.
- **Tasks**:
  1. Implement read-only schema table inventory and migration status inspection.
  2. Guard against arbitrary SQL execution or destructive actions.
- **Verification**: Schema introspection tests.

### Phase 12: Security & Platform Audit Ledger
- **Objective**: Append-only administrative action ledger and compliance audit trail.
- **Tasks**:
  1. Ensure every administrative mutation logs an entry to `public.platform_audit_logs`.
  2. Build audit log viewer with filtering by action, operator email, and school ID.
- **Verification**: Audit ledger persistence tests.

### Phase 13: Global Settings & Feature Flags
- **Objective**: Dynamic key-value configuration and capability toggles.
- **Tasks**:
  1. Connect `masterAdminSettingsRoutes.ts` to `public.platform_settings` and `public.platform_feature_flags`.
  2. Support runtime toggling of feature flags and platform branding parameters.
- **Verification**: Settings and flag mutation tests.

### Phase 14: Frontend UX, Loading Skeletons & Empty States
- **Objective**: High visual quality matching the reference design across all devices.
- **Tasks**:
  1. Add pulse loading skeletons and empty state cards to all modules.
  2. Verify mobile and desktop responsiveness (375px to 1440px).
- **Verification**: Headless Chrome visual checks.

### Phase 15: Production Hardening & E2E Validation
- **Objective**: Full build validation, security testing, and final delivery.
- **Tasks**:
  1. Run complete test suite across all 15 phases.
  2. Run `tsc --noEmit` and production build (`npm run build`).
  3. Generate final delivery documentation.

