# MYZKOOL — SCHOOLS & INSTITUTIONS
## Security Architecture, Tenant Isolation & Compliance

**Document:** `docs/SCHOOLS_INSTITUTIONS_SECURITY.md`  
**Security Level:** Platform Super Admin / Multi-Tenant Isolation  
**Regulatory Standards:** India Digital Personal Data Protection (DPDP) Act 2023, ISO 27001  
**Status:** Audited & Enforced

---

## 1. Multi-Tenant Data Isolation Architecture

MyZkool implements a shared-database, separate-schema/row-isolated architecture. Every school represents an isolated tenant with a globally unique UUID.

### 1.1 Row-Level Security (RLS) Policies
PostgreSQL Row-Level Security is strictly enabled on all application tables:
1. **School-Scope Isolation:**
   - Any authenticated query from a School Admin, Teacher, or Accountant includes the session JWT claim `auth.uid()`.
   - RLS policies restrict SELECT, INSERT, UPDATE, and DELETE operations to records where `school_id IN (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid())`.
   - Cross-tenant data leakage is physically blocked at the database engine query optimizer level.
2. **Super Admin Cross-Tenant Access:**
   - The platform control plane uses the security definer function `public.is_platform_admin()`.
   - Access to cross-tenant directories, aggregate headcounts, and platform subscriptions is restricted to users present and active in `public.platform_admins`.
   - Regular school admins attempting to query `/api/master-admin/*` endpoints receive immediate `HTTP 403 Forbidden` responses.

---

## 2. DPDP Act Compliance & Student PII Protection

Under the India Digital Personal Data Protection (DPDP) Act 2023, educational ERP platforms must implement data minimization for minors:
1. **Headcount Aggregation Only:**
   - The Super Admin Schools & Institutions directory and detail views expose **strictly aggregated numeric counts** (`student_count`, `staff_count`).
   - Sensitive personal information such as student names, home addresses, phone numbers, parent identities, Aadhaar numbers, and medical conditions are never returned in directory API payloads.
2. **Aadhaar Encryption:**
   - Transport and student records containing Aadhaar data use AES-256-GCM authenticated encryption at rest (`transport_staff_aadhaar_enc`).
   - The decryption key is restricted to tenant-specific administrative operations and is never decrypted in bulk.

---

## 3. Suspended Institution Policy Enforcement

When an institution is marked as `suspended`:
1. **Backend Authorization Blocking:**
   - School admin authentication and API routes verify the institution's status via `schools.status`.
   - If `status === 'suspended'`, authenticated requests are intercepted by `schoolStatusCheck` middleware and blocked with `403 Forbidden` ("Institution account is suspended").
2. **Data Preservation Guarantee:**
   - Suspension performs zero deletions or modifications of underlying tenant data.
   - All historical fee receipts, student ledgers, class records, and attendance logs remain 100% intact and available for immediate reactivation once resolved.

---

## 4. Immutable Administrative Audit Logging

All privileged operations in the Super Admin Schools & Institutions module trigger synchronous audit log generation:
1. **Target Actions Audited:**
   - `school.suspend`
   - `school.reactivate`
   - `subscription.plan_change`
   - `subscription.extend_trial`
   - `subscription.extend_validity`
   - `school.modules_update`
2. **Audit Payload Schema:**
   - Stored in `public.platform_audit_logs` and `public.school_subscription_history`.
   - Captures: Operator ID (`admin_id`), Operator Email (`admin_email`), Target Resource ID (`school_id`), Action Name, Mandatory Operational Justification (`reason`), Metadata (previous vs new values), IP Address, and ISO 8601 Timestamp.
   - Tables have append-only RLS policies preventing modification or deletion of audit logs.
