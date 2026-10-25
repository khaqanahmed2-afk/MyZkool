# Students Module: Security, Permissions, and Multi-Tenant Isolation

## 1. Multi-Tenant Architecture & Boundary Defense

MyZkool is a multi-tenant SaaS application hosting data for multiple independent schools on a shared database. Data isolation between schools is treated as a critical security perimeter.

### 1.1 Tenant Resolution Principles
- **No Client Impersonation**: A client cannot access another school's data by merely modifying `school_id` in request payloads. The active `school_id` is validated against the authenticated user's session profile on the server.
- **Database Row-Level Security (RLS)**: Even if client code makes a broad `SELECT * FROM students`, PostgreSQL RLS policies restrict the returned set exclusively to `school_id = auth_school_id()`.
- **Foreign Key Integrity**: Every child table (`sections`, `student_enrollments`, `student_parents`, `student_dues`, `audit_logs`) has a composite foreign key referencing `school_id`. Cross-tenant relational links are rejected by database foreign key constraints.

---

## 2. Role-Based Access Control (RBAC) Matrix

Permissions for the Students module are defined in [`src/types/students.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/types/students.ts) under `STUDENT_ROLE_PERMISSIONS`:

| Permission Key | Super Admin / Owner | School Admin | Principal | Teacher | Accountant | Transport Mgr | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `students.read` | ✅ | ✅ | ✅ | Section only | ✅ | Riders only | Child only |
| `students.write` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `students.contacts.read` | ✅ | ✅ | ✅ | Section only | ✅ | Riders only | Self only |
| `students.documents.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `students.status.manage` | ✅ | ✅ | Prepare only | ❌ | ❌ | ❌ | ❌ |
| `students.promote` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `students.import` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `students.export` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `students.archive` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `students.reveal_sensitive` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Data Protection & Sensitive Fields

1. **Aadhaar Protection**:
   - Raw 12-digit Aadhaar numbers are never stored in plain text.
   - Values are encrypted using AES-256-GCM via `encryptSensitive()` and stored in `aadhaar_enc`.
   - Only the masked last 4 digits (`aadhaar_last4`, e.g. `XXXX-XXXX-1234`) are displayed in normal UI views.
   - An HMAC-SHA256 hash (`aadhaar_hash`) is maintained for duplicate admission detection without decrypting stored records.
2. **Audit Logging**:
   - Every student modification (demographics, status change, enrollment update, soft delete) writes an immutable record to `audit_logs`.
   - Records capture `school_id`, `actor_id`, `actor_role`, `action`, `before_state`, and `after_state`.
3. **No Client-Side Service Keys**:
   - Client applications only utilize the public Supabase publishable anonymous key.
   - Administrative mutations requiring elevated system privileges (such as school creation or schema migrations) execute strictly in edge functions or secure backend environments.
