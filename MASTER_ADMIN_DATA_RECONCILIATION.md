# Master Admin Dashboard — Authoritative Data Reconciliation & SQL Matrix

**Environment**: Production PostgreSQL Instance (`nzphjfsgtkbvfrevduek.supabase.co`)  
**Database Engine**: PostgreSQL 17.6.1  
**Scope**: Master Admin Platform Control Plane & Global Aggregates  

---

## 1. Authoritative SQL Queries & Ground Truth

### Metric 1: Total Schools, Status Breakdown & Lifecycle
```sql
SELECT 
  count(*) as total_registered_schools,
  count(*) FILTER (WHERE onboarding_completed = true) as approved_schools,
  count(*) FILTER (WHERE onboarding_completed = false) as pending_onboarding,
  count(*) FILTER (WHERE status = 'active' AND onboarding_completed = true) as active_schools,
  count(*) FILTER (WHERE status = 'suspended') as suspended_schools
FROM public.schools;
```
**Database Ground Truth Result:**
| total_registered_schools | approved_schools | pending_onboarding | active_schools | suspended_schools |
|---|---|---|---|---|
| **6** | **5** | **1** | **5** | **0** |

**Verified School Entities:**
1. `0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa` — Khaqan Public School (`kps-delhi`, approved: true)
2. `33a509da-9f79-44c0-ad71-372916d04925` — Bright Future Academy / Peace Convent ICSE (`peaceconvent-icse`, approved: true)
3. `599a11a0-cdfe-4f36-896d-3e212a20f0f3` — Green Valley School / Aqsa Ibrahim (`aqsa-ibrahim`, approved: true)
4. `98d1b20b-80c9-4d6a-bbfd-197fccf47bda` — Sunrise Public School (`abdulhamed-up`, approved: false, pending step 2)
5. `b70261ef-37f1-46c8-a148-2c496a9d33a8` — Peace Convent School CBSE (`peace-convent`, approved: true)
6. `fad2d00f-4723-4deb-b1d7-1c08ef408b80` — City International / Greenwood (`greenwood-intl`, approved: true)

---

### Metric 2: Total Students across Platform
```sql
SELECT 
  count(*) as total_students,
  count(DISTINCT school_id) as schools_with_students
FROM public.students;
```
**Database Ground Truth Result:**
| total_students | schools_with_students |
|---|---|
| **101** | **1** (`b70261ef-37f1-46c8-a148-2c496a9d33a8`, Peace Convent School) |

*RLS Note: Platform admin access verified via policy `platform_admins_select_students` on `public.students`.*

---

### Metric 3: Total Collected Platform Revenue
```sql
SELECT 
  coalesce(sum(amount_paise), 0) as total_collected_paise,
  count(*) as successful_transaction_count
FROM public.school_subscription_payments
WHERE status = 'captured';
```
**Database Ground Truth Result:**
| total_collected_paise | successful_transaction_count |
|---|---|
| **0** (₹0) | **0** |

*Rule: Uncollected revenue, pending invoices, and subscription plan prices are strictly excluded from collected revenue.*

---

### Metric 4: Pending Subscription Invoices / Receivables
```sql
SELECT 
  coalesce(sum(total_paise), 0) as pending_receivables_paise,
  count(*) as unpaid_invoice_count,
  count(DISTINCT school_id) as schools_with_pending_invoices
FROM public.subscription_invoices
WHERE status = 'unpaid';
```
**Database Ground Truth Result:**
| pending_receivables_paise | unpaid_invoice_count | schools_with_pending_invoices |
|---|---|---|
| **0** (₹0) | **0** | **0** |

---

### Metric 5: Active Subscriptions & Plan Distribution (Tenant-Deduplicated)
```sql
WITH latest_subscriptions AS (
  SELECT DISTINCT ON (s.school_id)
    s.id,
    s.school_id,
    s.status,
    s.amount,
    s.billing_cycle,
    p.slug as plan_slug,
    s.created_at
  FROM public.school_subscriptions s
  LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
  ORDER BY s.school_id, s.created_at DESC
)
SELECT 
  count(*) FILTER (WHERE status = 'active') as active_paid_count,
  count(*) FILTER (WHERE status = 'trialing') as trialing_count,
  count(*) FILTER (WHERE status = 'active' AND plan_slug = 'pro') as pro_paid_count,
  count(*) FILTER (WHERE status = 'active' AND plan_slug = 'basic') as basic_paid_count,
  count(*) FILTER (WHERE status = 'active' AND plan_slug = 'custom') as custom_paid_count,
  count(*) FILTER (WHERE status = 'trialing') as trial_count,
  count(*) FILTER (WHERE status IN ('past_due', 'expired', 'cancelled')) as inactive_count
FROM latest_subscriptions;
```
**Database Ground Truth Result:**
| active_paid_count | trialing_count | pro_paid_count | basic_paid_count | custom_paid_count | trial_count | inactive_count |
|---|---|---|---|---|---|---|
| **4** | **1** | **2** | **1** | **1** | **1** | **1** |

**Total Active Subscriptions (Paid + Trial)**: **5**  
**Total Plan Slices**: 2 Pro (40%) + 1 Basic (20%) + 1 Custom (20%) + 1 Trial (20%) = **5 (100%)**  
**Inactive / Onboarding**: 1 (Sunrise Public School, status: `past_due`, onboarding step 2).  
**Total Schools**: 5 active + 1 inactive = **6 Schools**.

---

### Metric 6: Platform Audit Log Stream
```sql
SELECT 
  id,
  action,
  actor_email,
  created_at
FROM public.platform_audit_logs
ORDER BY created_at DESC
LIMIT 10;
```
**Database Ground Truth Result:**
| id | action | actor_email | created_at |
|---|---|---|---|
| `3f2fe35e...` | `audit.test` | `system` | 2026-11-12 05:50:09 |
| `bf1d11e3...` | `admin.login` | `myzkool.official@gmail.com` | 2026-11-11 16:59:17 |
| `f8108a70...` | `student.bulk_import` | `admin@peaceconvent.edu` | 2026-10-12 19:30:00 |
| `0fc575ae...` | `subscription.activate` | `admin@peaceconvent.edu` | 2026-10-12 19:03:08 |
| `8153ce2e...` | `school.register` | `admin@peaceconvent.edu` | 2026-10-12 18:13:41 |

---

## 2. Master Dashboard End-to-End Reconciliation Table

| Metric | Database Query Source | SQL Value | Backend API JSON | Frontend State | Displayed Value | Reconciliation Status |
|---|---|---|---|---|---|---|
| **Total Schools** | `public.schools` | 6 | `data.kpis.totalSchools.count: 6` | `metrics.kpis.totalSchools.count` | **6** | **RECONCILED** |
| **Approved Schools** | `onboarding_completed = true` | 5 | `data.kpis.totalSchools.onboardingCompleted: 5` | `metrics.schoolBreakdown.onboardingCompleted` | **5 approved** | **RECONCILED** |
| **Pending Schools** | `onboarding_completed = false` | 1 | `data.kpis.totalSchools.onboardingPending: 1` | `metrics.schoolBreakdown.onboardingPending` | **1 pending** | **RECONCILED** |
| **Total Students** | `public.students` | 101 | `data.kpis.totalStudents.count: 101` | `metrics.kpis.totalStudents.count` | **101** | **RECONCILED** |
| **Total Revenue** | `school_subscription_payments` | ₹0 | `data.kpis.totalRevenuePaise: 0` | `metrics.kpis.totalRevenueFormatted` | **₹0** | **RECONCILED** |
| **Active Subscriptions** | `latest_subscriptions` | 5 | `data.kpis.activeSubscriptions.count: 5` | `metrics.kpis.activeSubscriptions.count` | **5** | **RECONCILED** |
| **Pending Payments** | `subscription_invoices` | ₹0 | `data.pendingAttention.pendingPaymentsPaise: 0` | `metrics.keyInsights.pendingPaymentsFormatted` | **₹0** | **RECONCILED** |
| **Donut Center** | Sum of plan slices | 5 | Calculated from `data.planDistribution` | `SubscriptionDonutChart` center | **5 Subscriptions** | **RECONCILED** |
| **Donut Breakdown** | Slices by plan | 2 Pro, 1 Basic, 1 Custom, 1 Trial | Pro: 2 (40%), Basic: 1 (20%), Custom: 1 (20%), Trial: 1 (20%) | `SubscriptionDonutChart` legend | **2 Pro, 1 Basic, 1 Custom, 1 Trial** | **RECONCILED** |
| **Database Latency** | Live ping `SELECT 1` | 12-28 ms | `data.systemHealth.services.database.latencyMs` | `SystemHealthCard` | **Operational (12-28ms)** | **RECONCILED** |
| **Storage Latency** | Live `listBuckets()` | 24-45 ms | `data.systemHealth.services.storage.latencyMs` | `SystemHealthCard` | **Operational (24-45ms)** | **RECONCILED** |
| **Background Jobs** | No daemon telemetry | Unmonitored | `status: "unavailable"` | `SystemHealthCard` | **Monitoring unavailable** | **RECONCILED** |
| **API Integrations** | No webhook ping | Unmonitored | `status: "unavailable"` | `SystemHealthCard` | **Monitoring unavailable** | **RECONCILED** |
| **Recent Activities** | `platform_audit_logs` | 5 events | Array of 5 verified events | `RecentActivitiesCard` | **5 Real Events** | **RECONCILED** |
