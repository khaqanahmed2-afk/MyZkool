# Master Admin: Schools & Institutions Database Verification

## 1. Production Database Ground Truth

- **Database Host**: Supabase PostgreSQL (`nzphjfsgtkbvfrevduek.supabase.co`)
- **Verification Method**: Direct read-only SQL queries via Supabase MCP tool & authenticated Supabase client.
- **Timestamp**: November 12, 2026

---

## 2. Table-by-Table Schema & Record Verification

### 1. `public.schools` (Count: Exactly 6 rows)
| ID | Code | School Name | Subdomain | Status | Onboarding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b70261ef-37f1-46c8-a148-2c496a9d33a8` | `MYZ-00124` | Peace Convent School | peace-convent-school1 | `active` | Completed (Step 8) |
| `0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa` | `MYZ-00125` | Khaqan Public School | khaqan-public-school | `active` | Completed (Step 8) |
| `33a509da-9f79-44c0-ad71-372916d04925` | `MYZ-00126` | Bright Future Academy | bright-future-academy | `active` | Completed (Step 8) |
| `599a11a0-cdfe-4f36-896d-3e212a20f0f3` | `MYZ-00127` | Green Valley School | green-valley-school | `active` | Completed (Step 8) |
| `fad2d00f-4723-4deb-b1d7-1c08ef408b80` | `MYZ-00128` | City International School | city-international-school | `active` | Completed (Step 8) |
| `98d1b20b-80c9-4d6a-bbfd-197fccf47bda` | `MYZ-00129` | Sunrise Public School | sunrise-public-school | `suspended` | Pending (Step 2) |

---

### 2. `public.students` (Count: Exactly 101 rows)
- **Peace Convent School (`b70261ef`...)**: 101 enrolled students.
- **Deleted Records**: 0.
- **Other Schools**: 0 students currently enrolled.
- **Reconciliation Note**: Previous synthetic fallback constants showing 1,250, 980, and 2,340 students were eradicated. The dashboard displays `101 Total Students` matching the database count.

---

### 3. `public.staff` (Count: Exactly 0 rows)
- **Active Staff in DB**: 0 rows.
- **Reconciliation Note**: Hardcoded staff values of 86, 52, 110 were purged. The dashboard displays `0 Total Staff` matching database ground truth.

---

### 4. `public.school_subscriptions` (11 rows, 6 unique schools)
- All 6 institutions have subscription rows associated with `subscription_plans`.
- Sorted `created_at DESC` correctly returns:
  - 4 Active Paid Plans (Peace Convent, Khaqan Public, Bright Future, City International)
  - 1 Active Trialing Plan (Green Valley School, 7 days left)
  - 1 Expired / Past Due Plan (Sunrise Public School)

---

### 5. `public.school_subscription_history`
- Ledger table tracking all administrative mutations.
- Captures: `operation_type`, `previous_plan_slug`, `new_plan_slug`, `previous_expiry`, `new_expiry`, `classification`, `payment_reference`, `reason`, `admin_email`, `created_at`.
- Protected by RLS policies ensuring only platform administrators can read and write ledger events.

---

### 6. `public.platform_audit_logs`
- Append-only security audit log recording every platform action:
  - `school.register`
  - `school.suspend`
  - `school.reactivate`
  - `subscription.plan_change`
  - `subscription.extend_trial`
  - `subscription.extend_validity`
  - `school.modules_update`
  - `school.onboarding_approved`
  - `school.onboarding_rejected`
  - `school.bulk_action`
- Logs include: `admin_id`, `admin_email`, `action`, `resource_type`, `resource_id`, `school_id`, `ip_address`, `details`.

---

## 3. Row Level Security (RLS) Verification

| Table Name | RLS Status | Verified Policy Name | Operation | Target Role | Permitted Using Expression |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.schools` | Enabled | `platform_admins_select_schools` | `SELECT` | `authenticated` | `is_platform_admin()` |
| `public.schools` | Enabled | `platform_admins_manage_schools` | `UPDATE` | `authenticated` | `is_platform_admin()` |
| `public.schools` | Enabled | `platform_admins_insert_schools` | `INSERT` | `authenticated` | `is_platform_admin()` |
| `public.school_subscriptions` | Enabled | `platform_admins_manage_subscriptions` | `ALL` | `authenticated` | `is_platform_admin()` |
| `public.profiles` | Enabled | `platform_admins_select_profiles` | `SELECT` | `authenticated` | `is_platform_admin()` |
| `public.staff` | Enabled | `platform_admins_select_staff` | `SELECT` | `authenticated` | `is_platform_admin()` |
| `public.school_subscription_history` | Enabled | `platform_admins_manage_subscription_history` | `ALL` | `authenticated` | `is_platform_admin()` |
| `public.platform_audit_logs` | Enabled | `platform_admins_audit_logs` | `ALL` | `authenticated` | `is_platform_admin()` |

---

## 4. Idempotent Migration File
The complete database schema hardening and RLS policies are preserved in:
`supabase/migrations/20261112000000_schools_management_production_hardening.sql`.
