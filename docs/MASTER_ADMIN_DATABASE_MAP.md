# MyZkool Master Admin — Database Architecture & Entity Map

> **Document Version**: 1.0.0  
> **Status**: Official Reference  
> **Database**: Supabase PostgreSQL 15  
> **File Location**: `docs/MASTER_ADMIN_DATABASE_MAP.md`

---

## 1. Multi-Tenant Dual-Plane Data Architecture

MyZkool operates a dual-plane data architecture:
1. **Tenant Plane (School ERP)**: Multi-tenant tables partitioned by `school_id UUID NOT NULL` with strict Row Level Security (RLS) isolating each school's students, staff, classes, fees, and attendance.
2. **Control Plane (Master Admin)**: Platform-level management tables (`platform_admins`, `platform_roles`, `platform_permissions`, `platform_audit_logs`, `subscription_invoices`, `support_tickets`, `platform_announcements`, `platform_settings`) with administrative RLS policies evaluating `public.is_platform_admin()`.

```
                  ┌──────────────────────────────────────────────┐
                  │            Supabase Auth (auth.users)         │
                  └──────────────┬────────────────┬──────────────┘
                                 │                │
            School User          │                │ Platform Administrator
            (school_id profile)  │                │ (platform_admins record)
                                 ▼                ▼
┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
│            TENANT PLANE                │  │             CONTROL PLANE              │
├────────────────────────────────────────┤  ├────────────────────────────────────────┤
│ • public.schools                       │  │ • public.platform_admins               │
│ • public.profiles                      │  │ • public.platform_roles                │
│ • public.students                      │  │ • public.platform_permissions          │
│ • public.classes                       │  │ • public.platform_role_permissions     │
│ • public.sections                      │  │ • public.platform_audit_logs           │
│ • public.fee_structures                │  │ • public.subscription_invoices         │
│ • public.fee_invoices                  │  │ • public.support_tickets               │
│ • public.fee_receipts                  │  │ • public.support_ticket_messages       │
│ • public.school_subscriptions          │  │ • public.platform_announcements        │
│ • public.school_subscription_payments  │  │ • public.platform_settings             │
│ • public.transport_routes              │  │ • public.platform_feature_flags        │
└────────────────────────────────────────┘  └────────────────────────────────────────┘
```

---

## 2. Master Admin Entity Specifications

### 2.1 Identity & RBAC Tables

#### `public.platform_admins`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`
- `email TEXT NOT NULL UNIQUE`
- `full_name TEXT NOT NULL`
- `phone TEXT`
- `avatar_url TEXT`
- `role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE RESTRICT`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `last_login_at TIMESTAMPTZ`
- `last_login_ip TEXT`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`

#### `public.platform_roles`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `slug TEXT NOT NULL UNIQUE` (`super_admin`, `support_agent`, `billing_manager`, `auditor`)
- `name TEXT NOT NULL`
- `description TEXT NOT NULL`
- `is_system BOOLEAN NOT NULL DEFAULT false`

#### `public.platform_permissions`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `code TEXT NOT NULL UNIQUE` (`dashboard.view`, `schools.view`, `schools.create`, `schools.suspend`, `subscriptions.manage`, etc.)
- `module TEXT NOT NULL`
- `description TEXT NOT NULL`

#### `public.platform_role_permissions`
- `role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE`
- `permission_id UUID NOT NULL REFERENCES public.platform_permissions(id) ON DELETE CASCADE`
- `PRIMARY KEY (role_id, permission_id)`

---

### 2.2 Financial & Invoicing Tables

#### `public.subscription_invoices`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `invoice_number TEXT NOT NULL UNIQUE` (`MZK-INV-YYYY-XXXX`)
- `school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE`
- `subscription_id UUID REFERENCES public.school_subscriptions(id) ON DELETE SET NULL`
- `plan_slug TEXT NOT NULL` (`basic`, `pro`, `custom`)
- `billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'six_months', 'yearly'))`
- `subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0)`
- `discount_paise BIGINT NOT NULL DEFAULT 0`
- `taxable_paise BIGINT NOT NULL`
- `gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00`
- `cgst_paise BIGINT NOT NULL DEFAULT 0`
- `sgst_paise BIGINT NOT NULL DEFAULT 0`
- `igst_paise BIGINT NOT NULL DEFAULT 0`
- `total_paise BIGINT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('draft', 'unpaid', 'paid', 'void', 'refunded'))`
- `due_date DATE NOT NULL`
- `paid_at TIMESTAMPTZ`
- `payment_method TEXT`
- `payment_id UUID REFERENCES public.school_subscription_payments(id)`

---

### 2.3 Helpdesk & Operations Tables

#### `public.support_tickets`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `ticket_number TEXT NOT NULL UNIQUE` (`#T-XXXX`)
- `school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE`
- `creator_user_id UUID REFERENCES auth.users(id)`
- `creator_name TEXT NOT NULL`
- `creator_email TEXT NOT NULL`
- `subject TEXT NOT NULL`
- `category TEXT NOT NULL CHECK (category IN ('fees', 'students', 'transport', 'website', 'login', 'billing', 'other'))`
- `priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`
- `status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_school', 'resolved', 'closed'))`
- `assigned_to UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL`
- `resolution_summary TEXT`

#### `public.support_ticket_messages`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE`
- `sender_type TEXT NOT NULL CHECK (sender_type IN ('school_user', 'platform_admin', 'system'))`
- `sender_id UUID NOT NULL`
- `sender_name TEXT NOT NULL`
- `message TEXT NOT NULL`
- `is_internal_note BOOLEAN NOT NULL DEFAULT false`

---

### 2.4 Governance, Announcements & Configuration Tables

#### `public.platform_audit_logs`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `admin_id UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL`
- `admin_email TEXT NOT NULL`
- `action TEXT NOT NULL` (`school.suspend`, `plan.update`, `payment.refund`, etc.)
- `resource_type TEXT NOT NULL`
- `resource_id TEXT`
- `school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL`
- `details JSONB NOT NULL DEFAULT '{}'::jsonb`
- `ip_address TEXT`
- `user_agent TEXT`
- `created_at TIMESTAMPTZ DEFAULT now()`

#### `public.platform_announcements`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `title TEXT NOT NULL`
- `content TEXT NOT NULL`
- `type TEXT NOT NULL DEFAULT 'announcement'`
- `target_audience TEXT NOT NULL DEFAULT 'all'`
- `target_school_ids UUID[] DEFAULT '{}'`
- `is_published BOOLEAN NOT NULL DEFAULT true`
- `scheduled_at TIMESTAMPTZ`
- `expires_at TIMESTAMPTZ`

#### `public.platform_settings`
- `key TEXT PRIMARY KEY`
- `category TEXT NOT NULL` (`branding`, `maintenance`, `email`, `whatsapp`, `payment_gateway`, `security`)
- `value JSONB NOT NULL`

#### `public.platform_feature_flags`
- `flag_key TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `is_enabled BOOLEAN NOT NULL DEFAULT false`
- `rollout_percentage INT NOT NULL DEFAULT 100`
- `target_plans TEXT[] DEFAULT '{}'`

