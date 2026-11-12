# Row-Level Security (RLS) & Multi-Tenant Security Audit

> **Phase 5 — Database, Security & Multi-Tenant Architecture Audit**  
> **Audited Date:** 2026-11-11  
> **Platform Version:** 1.6.0

---

## 1. Multi-Tenant Enforcement Matrix

Every data access boundary in MyZkool enforces strict tenant isolation using defense-in-depth across three tiers:

```
[ Frontend: React ]  ──>  [ Backend: Express Middleware ]  ──>  [ Database: PostgreSQL RLS ]
   Never trusts              Validates JWT Bearer;                 Enforces (school_id =
   client-provided           Resolves user's verified              auth.jwt() ->> 'school_id'
   school_id for             school_id from database;              OR profile lookup)
   authorization             Rejects mismatches with 403           on SELECT, INSERT, UPDATE, DELETE
```

---

## 2. Table-by-Table RLS Verification

| Domain | Table Name | RLS Enabled? | Policy Scope & Multi-Tenant Protection |
|---|---|---|---|
| **Schools** | `schools` | ✅ YES | Only members of the school or platform superadmins can view details. |
| **Users** | `profiles` | ✅ YES | Users can view own profile; school admins view profiles with matching `school_id`. |
| **Students** | `students` | ✅ YES | `school_id = (select school_id from profiles where auth_id = auth.uid())` |
| **Documents** | `student_documents` | ✅ YES | Gated by `school_id` and role permissions (`students.view_sensitive`). |
| **Fees** | `fee_heads` | ✅ YES | Scoped to active `school_id`. Cross-tenant mutations blocked. |
| **Fees** | `fee_structures` | ✅ YES | Immutable once applied to active academic sessions; strictly tenant isolated. |
| **Invoices** | `fee_receipts` | ✅ YES | Read/write strictly scoped to tenant. Receipts are immutable after issuance. |
| **Ledger** | `fee_ledger` | ✅ YES | Immutable transaction log. Zero cross-tenant data leakages. |
| **Transport** | `transport_vehicles` | ✅ YES | Tier-gated (`has_feature('transport')`) + scoped to `school_id`. |
| **Transport** | `transport_routes` | ✅ YES | Tier-gated + scoped to `school_id`. |
| **Transport** | `student_transport_assignments`| ✅ YES | Foreign key constraints ensure student and route belong to identical `school_id`. |

---

## 3. High-Security Edge Case Validations

### 3.1 Aadhaar & Identity Data Protection
- In compliance with Indian regulatory requirements, full 12-digit Aadhaar numbers are **never stored in cleartext**.
- Encryption: AES-256-GCM authenticated encryption utilizing server-side `APP_MASTER_KEY`.
- Database stores only the masked `aadhaar_last4` string (e.g., `•••• •••• 9812`) and `aadhaar_encrypted`.
- Decryption endpoint requires explicit permission (`students.view_sensitive`) and writes an immediate audit entry to `audit_logs` specifying the actor ID and access timestamp.

### 3.2 Service Role Key Boundary
- `SUPABASE_SERVICE_ROLE_KEY` is completely absent from all client bundles and `.env.example`.
- Used only inside background jobs (`jobWorker.ts`) and administrative provisioning tasks running on the secure Node.js backend.
