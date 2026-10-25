# Fee Management — Security, Permissions & Multi-Tenant Isolation

## 1. Multi-Tenant Threat Model

In a multi-tenant school SaaS serving 500+ schools, cross-tenant data leakage is a critical vulnerability.
The fee module strictly protects against:
1. **Cross-School Ledger Exposure**: A school accountant viewing or modifying another school's financial records.
2. **Client-Side School ID Tampering**: Manipulating `school_id` in request payloads or URL parameters to forge transactions.
3. **Double Submission / Race Conditions**: Rapidly submitting counter payments causing double allocations or duplicate receipt numbers.
4. **Service Role Key Exposure**: Exposing privileged Supabase keys in browser bundles.

---

## 2. Server-Side Authorization & RLS Controls

Every client request authenticates via Supabase Auth JWT. The JWT claims include:
- `user_id`: Authenticated staff user UUID.
- `school_id`: Verified organization UUID.
- `role`: Role identifier (`super_admin`, `school_admin`, `accountant`, `teacher`, `parent`, `student`).

### Database Level Enforcement (RLS)
The client browser's supplied `school_id` is never trusted in isolation. PostgreSQL RLS policies enforce that the row's `school_id` strictly matches the verified JWT claim:

```sql
-- Security Definer helper for reliable tenant resolution
CREATE OR REPLACE FUNCTION auth.get_jwt_school_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'school_id', '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enforced on student_dues
CREATE POLICY "Strict school isolation for student_dues"
ON student_dues
FOR ALL
USING (school_id = auth.get_jwt_school_id())
WITH CHECK (school_id = auth.get_jwt_school_id());
```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Workflow / Capability | Super Admin | School Admin | Fee Accountant | Class Teacher | Parent / Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Fee Dashboard** | Full | Full | Full | View Class Only | No Access |
| **Configure Fee Structures** | Full | Full | Modify | View Only | No Access |
| **Generate Invoices** | Full | Full | Full | No Access | No Access |
| **Record Counter Payment** | Full | Full | Full | No Access | No Access |
| **Cancel Receipt / Reverse** | Full | Approval Req. | Approval Req. | No Access | No Access |
| **View Student Fee Ledger** | Full | Full | Full | Assigned Class | Own Ward Only |
| **Export Financial Reports**| Full | Full | Full | No Access | No Access |
| **Apply Ad-hoc Concessions**| Full | Full | Approval Req. | No Access | No Access |

---

## 4. Payment Idempotency & Transaction Safety

To guarantee financial integrity during cashier counter collections:
1. **Frontend Mutex Lock**: The "Confirm & Issue Receipt" button engages a synchronous submission lock that disables all submit buttons and displays a spinner.
2. **Receipt Number Generation**: Receipt numbers are generated using PostgreSQL sequences or transactional locking (`SELECT next_receipt_no(school_id) FOR UPDATE`). A unique constraint `UNIQUE(school_id, receipt_no)` prevents collisions.
3. **Atomic Allocations**: All payments and corresponding due balance decrements are executed inside an atomic PostgreSQL transaction. If any update fails, the entire transaction is rolled back.
4. **Audit Trail**: Every receipt records `collected_by` (cashier user ID) and timestamp. Any cancellation creates a permanent cancellation log with mandatory justification.
