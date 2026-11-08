# MyZkool Master Admin — Codebase Audit Report (Phase 0)

> **Document Status**: Finalized  
> **Date**: November 2026  
> **Auditors**: SaaS Platform Architect, Supabase Database Architect, Senior Security Engineer  
> **Scope**: Complete repository audit of frontend framework, backend routing, database schema, RLS policies, multi-tenant isolation, and architectural gap analysis for Master Admin Panel implementation.

---

## 1. Executive Summary

MyZkool is an operational, production-grade multi-tenant School Management SaaS built for K-12 educational institutions across India. The existing codebase delivers specialized modules for School Onboarding, Student Information Systems (SIS), Fee Collections & Invoicing, Ledger Management, Academic Scheduling, and School Bus Transport.

The objective of this initiative is to introduce a **centralized SaaS Control Plane (Master Admin Panel)** without altering, regressing, or duplicating the existing tenant-level School ERP.

### Key Audit Findings:
1. **Frontend Architecture**: Single Page Application (SPA) built with **React 19.0.1**, **Vite 6.2.3**, **Tailwind CSS v4.1.14**, and **React Router DOM v7.18.3**. Clean code-splitting with `React.lazy()` ensures minimal bundle footprints.
2. **Backend Architecture**: Embedded **Express 4.21.2** server (`server.ts`) providing API routes (`/api/transport`, `/api/deletion`, `/api/razorpay/*`, `/api/chat`, `/api/analyze-image`), serving Vite dev middleware locally and bundling to Node CJS (`dist/server.cjs`) for production.
3. **Database Architecture**: **Supabase PostgreSQL 15** with Row Level Security (RLS) enabled across 50+ tables. Previous hardening (migrations `022` and `023`) established strict composite foreign keys `(school_id, parent_id)` and tenant isolation policies.
4. **Subscription Core**: A functional catalog exists (`subscription_plans` and `school_subscriptions`), linked with Razorpay checkout (`school_subscription_payments`), but lacks platform-level invoice entities, manual reconciliation, and granular administrative entitlement controls.
5. **Security Gaps Identified**: The current system relies on `profiles.role = 'super_admin'` within the tenant profile table, conflating platform super-admins with tenant school administrators. No dedicated `platform_admins`, `platform_roles`, or platform audit logging exist yet.

---

## 2. Technology Stack & Framework Inventory

| Layer | Configured Technology | Version | Location / Config | Operational Role |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.0.1` | `package.json` | Component tree & reactivity |
| **Build Tooling** | Vite | `6.2.3` | `vite.config.ts` | HMR, chunking, build pipelines |
| **Styling** | Tailwind CSS | `4.1.14` | `@tailwindcss/vite` | Utility-first CSS, modern tokens |
| **Routing** | React Router DOM | `7.18.3` | `src/App.tsx`, `src/routes/AppRoutes.tsx` | Browser client SPA routing |
| **Icons** | Lucide React | `0.546.0` | `package.json` | High-fidelity UI iconography |
| **Backend Runtime** | Express on Node | `4.21.2` | `server.ts` | API routes, webhooks, SSR bridge |
| **Database** | Supabase PostgreSQL | `15.x` | `supabase/migrations/` | Relational storage & RLS |
| **Client Auth / SDK** | `@supabase/supabase-js` | `2.116.0` | `src/lib/supabase.ts` | Auth session & data layer |
| **Validation** | Zod | `4.6.5` | `package.json` | Shared client/server schemas |
| **Payments** | Razorpay SDK | `2.9.8` | `src/routes/razorpayRoutes.ts` | Indian UPI, NetBanking, Cards |
| **GenAI / Multimodal** | `@google/genai` | `2.4.0` | `server.ts` | Gemini 2.5 Flash / OCR / TTS |
| **Type Checking** | TypeScript | `~5.8.2` | `tsconfig.json` | Strict zero-error compile state |

---

## 3. Database Schema & Migration Inventory

The repository contains 55 SQL migration files in `supabase/migrations/`. Below is the catalog of core existing entities:

### 3.1 Existing Tenant Entities (Do NOT Duplicate)

| Entity / Table | Migration Source | Key Columns & Responsibilities | Multi-Tenant Key |
| :--- | :--- | :--- | :--- |
| `schools` | `001`, `20261012180000` | `id`, `name`, `subdomain`, `school_type`, `affiliation_board`, `official_email`, `contact_phone`, `address`, `city`, `district`, `state`, `pin_code`, `onboarding_completed`, `created_by` | Root Tenant (`id`) |
| `profiles` | `001`, `023`, `20261013010000` | `id`, `auth_id`, `email`, `full_name`, `role`, `school_id`, `phone`, `onboarding_completed` | `school_id` |
| `school_members` | `023` | `school_id`, `user_id`, `role`, `extra_permissions`, `active` | `school_id` |
| `academic_years` | `002`, `20261013000000` | `id`, `school_id`, `name`, `start_date`, `end_date`, `is_active` | `school_id` |
| `classes` & `sections` | `003` | Academic class and section divisions | `school_id` |
| `students` | `007` | Core student master record, admission number, enrollment status | `school_id` |
| `student_sensitive` | `008`, `022` | AES-256-GCM encrypted Aadhaar and guardian sensitive data | `school_id` |
| `fee_heads` & `fee_structures` | `010`, `022`, `20261027180000` | Fee categories, recurring rules, class attachments | `school_id` |
| `fee_receipts` & `student_dues` | `010`, `011`, `20261016150000` | Fee demands, invoices, payments, counter collections | `school_id` |
| `transport_vehicles` & `routes` | `014`, `015`, `20261016090000` | Buses, drivers, route stops, fee zones | `school_id` |
| `school_websites` | `005` | School CMS, domain customization, public pages | `school_id` |
| `audit_logs` | `007` | School-level operational audit log | `school_id` |

### 3.2 Existing Platform / Subscription Entities (Reconciliation Analysis)

| Table Name | Source Migration | Current Schema & Status | Master Admin Usage |
| :--- | :--- | :--- | :--- |
| `subscription_plans` | `004_subscriptions.sql` | `id`, `slug` ('basic', 'pro', 'custom'), `name`, `description`, `price_monthly`, `price_six_months`, `price_yearly`, `max_students`, `max_staff`, `trial_days`, `features` (jsonb), `is_active`, `sort_order` | **REUSE AS CANONICAL CATALOG**. Master Admin will provide management UI to edit pricing, features, and quotas. |
| `school_subscriptions` | `004_subscriptions.sql` | `id`, `school_id`, `plan_id`, `billing_cycle`, `status` ('trialing', 'active', 'past_due', 'cancelled'), `trial_starts_at`, `trial_ends_at`, `current_period_starts_at`, `current_period_ends_at`, `amount`, `gst_rate`, `gst_amount`, `total_amount`, `payment_method`, `payment_status` | **REUSE AS CANONICAL TENANT SUBSCRIPTION**. Tracks live subscription state of each school. |
| `school_subscription_payments` | `024_school_subscription_payments.sql` | `id`, `school_id`, `plan_slug`, `billing_cycle`, `amount_paise`, `gst_paise`, `gateway` ('razorpay'), `gateway_order_id`, `gateway_payment_id`, `gateway_signature`, `status` ('created', 'authorised', 'captured', 'failed'), `receipt`, `verified_at` | **REUSE AS PAYMENT TRANSACTION STORE**. Connects to new `subscription_invoices` for full ERP financial ledger. |
| `plans` & `subscriptions` | `023_phase0_foundations_reconcile.sql` | Early prototype tables introduced in reconcile script (`plans.code`, `subscriptions.state`). | **LEGACY / RETIRED**. The active codebase (`razorpayRoutes.ts`, `subscriptionService.ts`, `studentOperationsService.ts`) exclusively targets `subscription_plans` and `school_subscriptions`. |

---

## 4. Current Authentication & Authorization Analysis

### 4.1 Client Authentication Flow
1. Auth is powered by Supabase Auth (`supabase.auth.signInWithPassword`, `signUp`, `signInWithOAuth`).
2. `src/context/AuthContext.tsx` wraps authenticated routes, resolving profile state from `public.profiles` using `authUser.id` (`auth_id`).
3. If no profile exists, a client upsert occurs. A protective fallback prevents client tampering:
   ```typescript
   // src/context/AuthContext.tsx
   let assignedRole: UserRole = (authUser.user_metadata?.role as UserRole) || "school_admin";
   if (assignedRole === "super_admin") {
     assignedRole = "school_admin"; // Prevents self-promotion
   }
   ```
4. Role routing check in `src/components/auth/ProtectedRoute.tsx`:
   Checks `allowedRoles.includes(role)`. If `requireCompletedOnboarding` is set and onboarding is incomplete, redirects to `/onboarding/*`.

### 4.2 Security Gaps in Current Auth Architecture
* **Conflated Super Admin Identity**: Super admin status is currently stored in `public.profiles.role = 'super_admin'`. This means a super admin is tied to the tenant profile structure and lacks dedicated multi-factor authentication, granular platform permissions, or IP logging.
* **RLS Blockers for Global Administration**: Current RLS on `schools` (`school_tenant_select`) limits reads strictly to `created_by = auth.uid()` or users in `profiles.school_id`. A platform super admin attempting to view all 247 schools is blocked by database RLS unless accessing via service role or explicit platform policies.
* **No Platform Audit Log**: All admin audit events currently write to tenant-scoped `public.audit_logs (school_id)`. There is no append-only platform-wide audit log for actions like school suspension, plan price modification, or global feature toggles.
* **No Support Ticket Infrastructure**: Support requests, bug reports, and complaints are currently unhandled or handled out-of-band.

---

## 5. UI Architecture & Reusable Component Inventory

### 5.1 Reusable UI Primitives
* **Buttons & Badges**: Standardized button components with loading spinners, variants (`primary`, `outline`, `destructive`, `ghost`).
* **Modal & Dialog Framework**: Accessible backdrop overlays, keyboard listeners (`Esc`), focus trap patterns.
* **Tables & Lists**: Filter bars, search inputs, pagination controls, sorting headers.
* **Icons**: Complete Lucide React icon suite.
* **Color Palette & Design Tokens**:
  * Brand Primary: `#2158E0` (Electric Indigo / MyZkool Blue)
  * Secondary / Success: `#1FAE7A` (Emerald)
  * Neutral Dark: `#0F172A` / `#141A2E`
  * Neutral Background: `#F8FAFC`
  * Border Grays: `#E2E8F0` / `#E6EAF3`
  * Accent Amber: `#F59E0B`
  * Accent Rose: `#EF4444`

### 5.2 Reference UI Alignment (Uploaded Mockup)
The user provided a high-fidelity visual specification for the Master Admin Dashboard:
* Deep Navy sidebar (`#0F172A`) with active pill highlights (`#2158E0`), Super Admin golden badge (`👑 Super Admin`), and collapsibility.
* Top bar with global command search (`Ctrl + K`), notification bell, help icon, and date filter dropdown (`Last 30 Days`).
* 4 top KPI cards (Total Schools, Total Students, Total Revenue, Active Subscriptions) with trend pills.
* Visual Area Chart for School Registrations and Bar Chart for Monthly Recurring Revenue (MRR).
* System Health panel with individual operational badges (Web App, Database, Storage, Cron, API).
* Donut Chart for Plan distribution (Pro, Basic, Custom, Trial).
* Recent platform activity feed, Quick Action links, and Pending & Attention alert badges.

---

## 6. Architecture Synthesis: Clean Separation Strategy

To ensure zero disruption to the existing School ERP:

```
                                  MYZKOOL PLATFORM
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
[CONTROL PLANE: MASTER ADMIN]                                  [DATA PLANE: SCHOOL ERP]
Route: /master-admin/*                                         Route: /admin/*
Identity: public.platform_admins                               Identity: public.profiles (school_id)
Auth: Platform RBAC + Server API                               Auth: Tenant RLS + School Membership
Scope: All Schools, Billing, Global Plans                      Scope: Own School Students, Fees, Transport
API: /api/master-admin/* (Express)                             API: /api/*, Direct Supabase Client RLS
```

### Critical Preservations:
1. `/admin/*` routes, `AdminShell.tsx`, and all school ERP components remain 100% untouched.
2. Tenant tables (`students`, `fee_*`, `transport_*`) retain strict isolation; Master Admin accesses them only through aggregated, sanitized views or audited support proxies.
3. No existing table or column will be dropped or modified destructively.
