# Master Admin: Schools & Institutions API Verification

## 1. Overview

This document details the verification and validation of all REST API endpoints powering the **Schools & Institutions** module in the MyZkool platform.

Base Path: `/api/master-admin/schools`  
Authentication: Bearer JWT (`verifyMasterAdminToken`)  
Authorization: Permission Guards (`requirePlatformPermission`)

---

## 2. API Endpoints Specification & Verification Matrix

### 1. GET `/api/master-admin/schools`
- **Permission**: `schools.view`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `search` (string: name, subdomain, code, email, phone, city)
  - `plan` (string: all, basic, pro, custom, trial)
  - `status` (string: all, active, suspended, pending)
  - `sub_status` (string: all, active, trialing, expired)
  - `board` (string: all, cbse, icse, state_board)
  - `state` (string: all, state name)
  - `joined` (string: all, 7d, 30d, this_month, this_year)
  - `sort_by` (string: name, date, status, students, id)
  - `sort_order` (string: asc, desc)
- **Response Format**:
  ```json
  {
    "success": true,
    "data": [ ... ],
    "kpis": {
      "total_schools": 6,
      "active_schools": 5,
      "active_schools_percent": 83,
      "pending_onboarding": 1,
      "pending_onboarding_percent": 17,
      "expired_subscriptions": 1,
      "total_students": 101,
      "total_staff": 0,
      "mrr_formatted": "₹ 11,295",
      "new_schools_this_month": 0,
      "trial_schools": 1,
      "suspended_institutions": 1
    },
    "meta": { "page": 1, "limit": 10, "total": 6, "totalPages": 1 }
  }
  ```
- **Verification**: Verified via test suite. Correctly computes and responds with 6 schools, 101 students, and verified KPIs.

---

### 2. GET `/api/master-admin/schools/:id`
- **Permission**: `schools.view`
- **URL Parameters**: `id` (UUID or institution code)
- **Response Format**: Full `MasterAdminSchoolSummary` object including subscription details, enabled modules, and tenant metadata.
- **Verification**: Verified for Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`).

---

### 3. POST `/api/master-admin/schools`
- **Permission**: `schools.create`
- **Request Body**:
  ```json
  {
    "name": "Horizon International School",
    "subdomain": "horizon-intl",
    "schoolType": "k12",
    "affiliationBoard": "cbse",
    "officialEmail": "admin@horizonintl.edu.in",
    "contactPhone": "+919876543299",
    "address": "Sector 62, Noida",
    "city": "Noida",
    "district": "Gautam Buddha Nagar",
    "state": "Uttar Pradesh",
    "pinCode": "201301",
    "initialPlanSlug": "pro"
  }
  ```
- **Response**: HTTP 201 Created with provisioned school record, generated code `MYZ-00130`, and platform audit event.
- **Verification**: Validated subdomain regex, database insert, and audit logging.

---

### 4. PATCH `/api/master-admin/schools/:id/status`
- **Permission**: `schools.suspend`
- **Request Body**:
  ```json
  {
    "status": "suspended",
    "reason": "Administrative compliance review",
    "notes": "Pending KYC document submission"
  }
  ```
- **Response**: HTTP 200 `{ "success": true }`.
- **Database Side-Effects**:
  - `public.schools.status` updated to `'suspended'`.
  - `public.schools.suspension_reason` populated.
  - `public.schools.suspended_at` recorded.
  - Event recorded in `public.school_subscription_history` and `public.platform_audit_logs`.
- **Verification**: Verified status toggle in Group 6 of test suite.

---

### 5. PATCH `/api/master-admin/schools/:id/subscription/change-plan`
- **Permission**: `subscriptions.manage`
- **Request Body**:
  ```json
  {
    "newPlanSlug": "custom",
    "billingCycle": "yearly",
    "reason": "Upgrade to Enterprise campus suite"
  }
  ```
- **Response**: HTTP 200 `{ "success": true, "school": { ... } }`.
- **Database Side-Effects**:
  - Updates `plan_id` in `public.school_subscriptions`.
  - Logs `plan_change` record in `public.school_subscription_history`.
- **Verification**: Verified in Group 3 of test suite.

---

### 6. PATCH `/api/master-admin/schools/:id/subscription/extend-trial`
- **Permission**: `subscriptions.override`
- **Request Body**:
  ```json
  {
    "additionalDays": 14,
    "reason": "Extended evaluation period for timetable testing"
  }
  ```
- **Response**: HTTP 200 `{ "success": true, "newExpiry": "..." }`.
- **Database Side-Effects**:
  - Increments `trial_ends_at` and `current_period_ends_at` in `public.school_subscriptions`.
  - Logs `trial_extended` record in `public.school_subscription_history`.
- **Verification**: Verified in Group 4 of test suite.

---

### 7. PATCH `/api/master-admin/schools/:id/subscription/extend-validity`
- **Permission**: `subscriptions.override`
- **Request Body**:
  ```json
  {
    "additionalDays": 30,
    "classification": "paid",
    "paymentReference": "UTR-HDFC-99182374",
    "reason": "Annual renewal fee paid via bank transfer"
  }
  ```
- **Response**: HTTP 200 `{ "success": true, "newExpiry": "..." }`.
- **Database Side-Effects**:
  - Updates `current_period_ends_at` in `public.school_subscriptions`.
  - Logs `validity_extended` in `public.school_subscription_history`.
- **Verification**: Verified in Group 5 of test suite.

---

### 8. GET `/api/master-admin/schools/:id/subscription/history`
- **Permission**: `subscriptions.view`
- **Response Format**: Array of chronological ledger events (`plan_change`, `trial_extended`, `validity_extended`, `status_change`).
- **Verification**: Verified in Group 3 and Group 5 of test suite.

---

### 9. PATCH `/api/master-admin/schools/:id/modules`
- **Permission**: `subscriptions.manage`
- **Request Body**:
  ```json
  {
    "enabledModules": ["students", "fees", "attendance", "admissions", "transport", "exams"],
    "reason": "Enable transport tracking and examination modules"
  }
  ```
- **Response**: HTTP 200 `{ "success": true, "modules": [ ... ] }`.
- **Database Side-Effects**:
  - Updates `public.school_subscriptions.metadata->'enabled_modules'`.
- **Verification**: Verified in Group 7 of test suite.

---

### 10. POST `/api/master-admin/schools/bulk-action`
- **Permission**: `schools.suspend`
- **Request Body**:
  ```json
  {
    "action": "activate",
    "schoolIds": ["0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa", "33a509da-9f79-44c0-ad71-372916d04925"],
    "reason": "Bulk academic year reactivation"
  }
  ```
- **Response**: HTTP 200 `{ "success": true, "totalRequested": 2, "successful": 2, "failed": 0, "errors": [] }`.
- **Verification**: Verified via test suite and `executeBulkSchoolAction()`.

---

### 11. PATCH `/api/master-admin/schools/:id/onboarding/approve` & `/reject`
- **Permission**: `schools.suspend`
- **Approve Request Body**: `{ "notes": "Profile and documents verified" }`
  - Sets `schools.onboarding_completed: true`, `schools.onboarding_step: 8`, `schools.status: 'active'`.
- **Reject Request Body**: `{ "reason": "Missing state board affiliation certificate" }`
  - Sets `schools.onboarding_completed: false`, `schools.status: 'suspended'`, `schools.suspension_reason: '...'`.
- **Verification**: Verified in service functions and UI modal interactions.

---

### 12. GET `/api/master-admin/schools/export`
- **Permission**: `schools.view`
- **Response**: `Content-Type: text/csv` with `Content-Disposition: attachment; filename="myzkool-schools-directory.csv"`.
- **Verification**: Verified in Group 8 of test suite.
