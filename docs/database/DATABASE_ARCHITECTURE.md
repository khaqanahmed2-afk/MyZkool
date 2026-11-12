# MyZkool Database Architecture & Schema Map

> **Phase 5 & 6 — Database, Security & Multi-Tenant Architecture**  
> **Audited Date:** 2026-11-11  
> **Database:** PostgreSQL (Supabase Managed)

---

## 1. Multi-Tenant Tenancy Model

Every core school tenant table contains a mandatory non-null foreign key `school_id references schools(id) on delete cascade` and has Row-Level Security (`RLS`) actively enabled.

```
                            ┌────────────────┐
                            │    schools     │
                            │ (Tenants Root) │
                            └───────┬────────┘
                                    │ 1:N
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   profiles    │           │academic_years │           │  fee_heads    │
│  (Auth Users) │           │  (Schedules)  │           │ (Categories)  │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   students    │──────────▶│classes/sections           │fee_structures │
└───────┬───────┘           └───────────────┘           └───────┬───────┘
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                    ▼
                            ┌───────────────┐
                            │  fee_ledger   │
                            │ (Trans. Log)  │
                            └───────────────┘
```

---

## 2. Core Functional Schema Domains

### 2.1 Identity, Tenancy & Membership
- `schools`: Tenant organization details, subdomain slug, custom domain, branding configuration, created_by, status.
- `profiles`: User profiles mapped to `auth.users(id)`. Stores verified `school_id`, `role` (`super_admin`, `admin`, `accountant`, `teacher`, `parent`), and personal metadata.
- `school_members`: Many-to-many relationship supporting multi-school memberships for administrators.

### 2.2 Academics & Student Management
- `academic_years`: School academic terms with date ranges and active flags.
- `classes`, `sections`, `subjects`: Hierarchical academic taxonomy.
- `students`: Core student demographic, roll numbers, admission details, and soft-delete flags.
- `student_addresses`, `student_medical_records`, `student_documents`: Modular student profile tables.
- `student_previous_balances`: Opening dues ledger entries brought forward from preceding years.

### 2.3 Fee & Billing Engine (Strict Double-Entry)
- `fee_heads`: Fee categories (Tuition, Transport, Admission, Laboratory, Sports).
- `fee_terms`: Term schedules (Quarter 1, Quarter 2, Annual).
- `fee_structures`: Class/Year configured fee schedules with line-item rules.
- `fee_receipts`: Official receipt records issued upon fee collection.
- `fee_payments`: Payment transaction logs (Cash, UPI, Cheque, Online Razorpay).
- `fee_ledger`: Immutable ledger of debits, credits, waivers, and balances.
- `concession_policies` & `student_concessions`: Configurable student scholarship/discount rules.

### 2.4 Transport Fleet & Billing
- `transport_vehicles`: Bus/van registrations, capacity, insurance/fitness tracking.
- `transport_staff`: Drivers and conductors with contact and license expiry alerts.
- `transport_routes` & `transport_route_stops`: Stop sequences, GPS geofences, and stop-based fee slabs.
- `student_transport_assignments`: Active and historical student route assignments linked directly to monthly transport fee generation.

### 2.5 Master Admin Platform Management
- `platform_roles` & `platform_permissions`: Role-based access for MyZkool SaaS operations.
- `platform_announcements`: Global broadcast notices delivered across school dashboards.
- `platform_settings`: Global feature toggles, gateway API configurations, and maintenance modes.
- `support_tickets`: School-to-platform helpdesk issues.
