# MyZkool Master Admin — Security & Access Control Report

> **Document Version**: 1.0.0  
> **Status**: Official Security Assessment  
> **Compliance Standard**: DPDP (Digital Personal Data Protection Act, 2023)  
> **File Location**: `docs/MASTER_ADMIN_SECURITY_REPORT.md`

---

## 1. Security Architecture Overview

The MyZkool SaaS platform enforces a strict separation between **Tenant Plane** (individual school ERP operations) and **Control Plane** (platform-wide administration).

### 1.1 Dual-Plane Defense in Depth

```
                        CLIENT REQUEST
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   School ERP Route                  Master Admin Route
     (/admin/*)                     (/master-admin/*)
            │                                 │
     AuthContext                       MasterAdminAuthContext
            │                                 │
   Supabase Auth Session             Supabase Auth + Bearer Token
            │                                 │
   Check: role = school_admin        Check: platform_admins entry
            │                         Check: is_active = true
            │                         Check: permissions contains X
            ▼                                 ▼
Tenant DB Queries (RLS)           Control Plane DB Queries (RLS)
(school_id = profile.school_id)   (public.is_platform_admin() = true)
```

---

## 2. Row Level Security (RLS) Policy Verification

All platform control tables have RLS enabled with explicit security rules:

1. **`platform_admins`**:
   - `SELECT`: `public.is_platform_admin() OR auth_id = auth.uid()`
   - Prevents unauthenticated users and regular school staff from enumerating platform administrators.
2. **`platform_roles` & `platform_permissions`**:
   - `SELECT`: `public.is_platform_admin()`
   - Role and permission definitions are only inspectable by active platform administrators.
3. **`subscription_invoices`**:
   - `ALL`: `public.is_platform_admin()` (Platform administrators can manage all B2B subscription invoices).
   - `SELECT`: School administrators can view ONLY invoices matching their own `school_id`.
4. **`support_tickets` & `support_ticket_messages`**:
   - Platform admins have full management access.
   - School users can only access tickets for their own `school_id`.
   - **Internal Notes Safeguard**: Messages with `is_internal_note = true` are strictly filtered out from school views by RLS.
5. **`platform_audit_logs`**:
   - Append-only. No `UPDATE` or `DELETE` policies exist. Records are immutable once written.

---

## 3. DPDP Student Data Privacy Safeguards

In compliance with India's Digital Personal Data Protection (DPDP) Act:
1. **No Student Private Data in Master Admin Views**:
   - Master Admin dashboard and school detail screens only display **aggregated headcounts** and **capacity percentages**.
   - Student Aadhaar numbers, parents' personal contact numbers, and confidential medical records are never exposed to platform administrators.
2. **School Profile Boundary**:
   - Platform admins manage school subscription tiers, payment receipts, institutional onboarding status, and platform support tickets.
   - Academic marks, student attendance records, and teacher payroll remain isolated within the individual school's tenant container.

---

## 4. Audit Trail & Administrative Accountability

Every sensitive administrative mutation automatically logs an immutable record to `public.platform_audit_logs`:
- School suspension / reactivation with required justification.
- Subscription plan price adjustments and student capacity changes.
- Manual payment adjustments and refund authorizations.
- Support ticket status transitions and operator assignments.
- Global setting and feature flag modifications.

Each audit record captures:
`{ admin_id, admin_email, action, resource_type, resource_id, school_id, details, ip_address, user_agent, created_at }`.

