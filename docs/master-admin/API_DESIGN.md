# MyZkool Master Admin — API Design Specification

> **Document Version**: 1.0.0  
> **Classification**: API Architecture & Endpoint Specification  
> **Mount Point**: `/api/master-admin/*` (Express Backend)  
> **Authentication**: Bearer JWT validated against `public.platform_admins`  

---

## 1. Global API Conventions

### 1.1 Headers
* `Authorization: Bearer <supabase_session_jwt>` (Mandatory on all endpoints except login).
* `Content-Type: application/json`
* `Idempotency-Key: <uuid>` (Mandatory for mutating financial and school lifecycle endpoints).

### 1.2 Response Envelope
All Master Admin endpoints return structured JSON payloads:
```typescript
// Standard Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

// Standard Error Response
interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

---

## 2. Master Admin Endpoint Catalog

### 2.1 Authentication & Session Verification

#### `GET /api/master-admin/auth/me`
* **Permission**: Any active platform admin.
* **Description**: Returns authenticated administrator profile, role, and assigned permissions.
* **Response**:
```json
{
  "success": true,
  "data": {
    "id": "e6f42b8e-...",
    "email": "khaqan@myzkool.com",
    "fullName": "Khaqan Ahmad",
    "role": {
      "slug": "super_admin",
      "name": "Super Admin"
    },
    "permissions": ["schools.*", "subscriptions.*", "billing.*", "support.*", "system.*", "audit.*"],
    "lastLoginAt": "2026-11-06T07:45:00Z"
  }
}
```

---

### 2.2 Dashboard & Platform Metrics

#### `GET /api/master-admin/dashboard/metrics`
* **Query Parameters**:
  * `period`: `30d` (default), `7d`, `90d`, `6m`, `1y`
* **Description**: Returns platform KPIs, trend series, system health, and actionable alerts matching the reference dashboard UI.
* **Response**:
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalSchools": { "count": 247, "trendPercent": 12.3, "status": "positive" },
      "totalStudents": { "count": 68420, "trendPercent": 15.8, "status": "positive" },
      "totalRevenuePaise": 187640000,
      "totalRevenueFormatted": "₹18,76,400",
      "revenueTrendPercent": 21.4,
      "activeSubscriptions": { "count": 231, "trendPercent": 10.0, "status": "positive" }
    },
    "schoolRegistrations": {
      "timeline": [
        { "date": "2026-10-06", "count": 180 },
        { "date": "2026-10-14", "count": 195 },
        { "date": "2026-10-22", "count": 210 },
        { "date": "2026-11-05", "count": 247 }
      ]
    },
    "subscriptionRevenue": {
      "monthly": [
        { "month": "Jun", "revenuePaise": 72000000, "formatted": "₹7.2L" },
        { "month": "Jul", "revenuePaise": 95000000, "formatted": "₹9.5L" },
        { "month": "Aug", "revenuePaise": 120000000, "formatted": "₹12.0L" },
        { "month": "Sep", "revenuePaise": 145000000, "formatted": "₹14.5L" },
        { "month": "Oct", "revenuePaise": 168000000, "formatted": "₹16.8L" },
        { "month": "Nov", "revenuePaise": 187640000, "formatted": "₹18.7L" }
      ]
    },
    "planDistribution": {
      "pro": { "count": 142, "percentage": 57.5 },
      "basic": { "count": 68, "percentage": 27.5 },
      "custom": { "count": 21, "percentage": 8.5 },
      "trial": { "count": 16, "percentage": 6.5 }
    },
    "systemHealth": {
      "overall": "operational",
      "uptimePercent": 99.98,
      "avgResponseMs": 248,
      "services": {
        "webApp": "operational",
        "database": "operational",
        "storage": "operational",
        "backgroundJobs": "operational",
        "apiIntegrations": "operational"
      }
    },
    "pendingAttention": {
      "expiringSubscriptionsCount": 23,
      "failedPaymentsCount": 6,
      "openSupportTicketsCount": 12,
      "pendingSchoolApprovalsCount": 4
    },
    "recentActivities": [
      {
        "id": "act-1",
        "type": "school_registered",
        "title": "New school registered",
        "detail": "Sunrise Public School, Prayagraj",
        "timeAgo": "10 min ago"
      },
      {
        "id": "act-2",
        "type": "subscription_upgraded",
        "title": "Subscription upgraded",
        "detail": "St. Mary's School upgraded to Pro Plan",
        "timeAgo": "24 min ago"
      }
    ]
  }
}
```

---

### 2.3 School & Institution Management

#### `GET /api/master-admin/schools`
* **Permission**: `schools.view`
* **Query Parameters**:
  * `page` (default: 1), `limit` (default: 20)
  * `search` (matches school name, subdomain, city, official email)
  * `status`: `all`, `active`, `suspended`, `trial`, `pending_approval`
  * `board`: `cbse`, `icse`, `state_board`, `other`
  * `state`: state name
* **Response**: Paginated array of schools with student count, current plan, and owner details.

#### `GET /api/master-admin/schools/:id`
* **Permission**: `schools.view`
* **Description**: Detailed institutional profile, active subscription details, student & staff headcount, billing summary, and admin audit history.

#### `POST /api/master-admin/schools`
* **Permission**: `schools.create`
* **Body**:
```json
{
  "name": "Oakridge International Academy",
  "subdomain": "oakridge",
  "schoolType": "k12",
  "affiliationBoard": "cbse",
  "officialEmail": "admin@oakridge.edu.in",
  "contactPhone": "+919876543210",
  "address": "Sector 48, Sohna Road",
  "city": "Gurugram",
  "state": "Haryana",
  "pinCode": "122018",
  "initialPlanSlug": "pro",
  "trialDays": 14
}
```

#### `PATCH /api/master-admin/schools/:id/status`
* **Permission**: `schools.suspend`
* **Body**:
```json
{
  "status": "suspended", // "active" | "suspended"
  "reason": "Outstanding invoice payment overdue past grace period.",
  "notifySchool": true
}
```

---

### 2.4 Subscription Catalog & Entitlements

#### `GET /api/master-admin/subscriptions/plans`
* **Permission**: `subscriptions.view`
* **Description**: Returns all subscription plans (`Basic`, `Pro`, `Custom`) including pricing in INR, limits, features, and active school subscriber counts.

#### `PUT /api/master-admin/subscriptions/plans/:id`
* **Permission**: `subscriptions.manage`
* **Body**:
```json
{
  "name": "Pro Plan (Updated)",
  "priceMonthly": 1799.00,
  "priceSixMonths": 10254.00,
  "priceYearly": 19429.00,
  "maxStudents": 1800,
  "maxStaff": 150,
  "trialDays": 14,
  "features": [
    "Everything in Basic Plan",
    "CBSE, ICSE Report Cards",
    "Automated Timetable",
    "School Bus & Transport Tracking",
    "Priority WhatsApp Support"
  ],
  "isActive": true
}
```

#### `PATCH /api/master-admin/schools/:id/subscription`
* **Permission**: `subscriptions.override`
* **Description**: Apply administrative adjustments to a school's subscription (extend trial by N days, waive fees, change quota limits).

---

### 2.5 Billing & Financial Operations

#### `GET /api/master-admin/billing/invoices`
* **Permission**: `billing.view`
* **Query Parameters**: `status`, `schoolId`, `startDate`, `endDate`, `page`, `limit`
* **Description**: Returns list of platform subscription invoices.

#### `GET /api/master-admin/billing/payments`
* **Permission**: `billing.view`
* **Description**: Returns verified Razorpay transaction ledger records.

#### `POST /api/master-admin/billing/refunds`
* **Permission**: `billing.refund`
* **Body**:
```json
{
  "paymentId": "5a4b3c2d-...",
  "amountPaise": 179900,
  "reason": "Duplicate transaction charged during network switch.",
  "notes": "Verified with HDFC gateway logs."
}
```

---

### 2.6 Support Center & Helpdesk

#### `GET /api/master-admin/support/tickets`
* **Permission**: `support.view`
* **Query Parameters**: `status`, `priority`, `category`, `assignedTo`, `page`, `limit`

#### `GET /api/master-admin/support/tickets/:id`
* **Permission**: `support.view`
* **Description**: Returns ticket details and chronological message thread.

#### `POST /api/master-admin/support/tickets/:id/messages`
* **Permission**: `support.reply`
* **Body**:
```json
{
  "message": "We have investigated the receipt counter issue and refreshed your sequence index.",
  "isInternalNote": false,
  "attachments": []
}
```

#### `PATCH /api/master-admin/support/tickets/:id`
* **Permission**: `support.reply`
* **Body**:
```json
{
  "status": "resolved",
  "priority": "high",
  "assignedTo": "admin-uuid-here",
  "resolutionSummary": "Counter index re-indexed."
}
```

---

### 2.7 Platform Announcements

#### `GET /api/master-admin/announcements`
* **Permission**: `announcements.publish`

#### `POST /api/master-admin/announcements`
* **Permission**: `announcements.publish`
* **Body**:
```json
{
  "title": "Scheduled Platform Maintenance — Sunday 2:00 AM to 4:00 AM IST",
  "content": "MyZkool will undergo planned database optimization this Sunday. Student ERP services may experience brief pauses.",
  "announcementType": "maintenance",
  "targetAudience": "all",
  "displayBanner": true,
  "startsAt": "2026-11-08T00:00:00Z",
  "expiresAt": "2026-11-08T06:00:00Z"
}
```

---

### 2.8 System Monitoring & Health

#### `GET /api/master-admin/monitoring/health`
* **Permission**: `system.monitoring`
* **Description**: Executes live database ping, storage bucket accessibility check, background worker heartbeat, and returns system health metrics.

---

### 2.9 Security & Audit Logs

#### `GET /api/master-admin/audit-logs`
* **Permission**: `audit.view`
* **Query Parameters**: `adminId`, `action`, `resourceType`, `startDate`, `endDate`, `page`, `limit`
* **Description**: Returns immutable audit trail of all platform control plane events.

---

### 2.10 Global Settings & Feature Flags

#### `GET /api/master-admin/settings`
* **Permission**: `system.settings`

#### `PUT /api/master-admin/settings`
* **Permission**: `system.settings`

#### `GET /api/master-admin/feature-flags`
* **Permission**: `system.settings`

#### `PATCH /api/master-admin/feature-flags/:key`
* **Permission**: `system.settings`
* **Body**:
```json
{
  "isEnabledGlobally": true,
  "targetPlans": ["pro", "custom"]
}
```
