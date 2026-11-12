# MyZkool System Architecture

> **Architecture Overview & Technology Stack**  
> **Platform Version:** 1.6.0  
> **Date:** 2026-11-11

---

## 1. High-Level Architecture Overview

MyZkool is an integrated multi-tenant School ERP, Management, and Website Builder SaaS designed specifically for Indian K-12 educational institutions.

```
                              [ Client Web Browser ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [ Custom Subdomain / CNAME ]      [ Apex / Main Domain ]
              e.g. oakridge.myzkool.in          myzkool.in / localhost:3000
                         │                             │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         [ Node.js Express Server ]
                               (server.ts)
                         │                             │
            ┌────────────┴────────────┐                │
            ▼                         ▼                ▼
   [ Express API Router ]     [ Static SPA Asset ] [ SSR Subdomain Proxy ]
   - /api/transport/*         - React 19 Client   - Resolves school_id
   - /api/master-admin/*      - Vite Built Bundle   from subdomain
   - /api/deletion/*                               - Injects SEO metadata
   - /api/razorpay/*
            │
            ▼
    [ Supabase / PostgreSQL Database ]
    - Row-Level Security (RLS) on all tenant tables
    - Tenant isolation enforced via authenticated JWT + school_id
    - AES-256-GCM encrypted sensitive fields (Aadhaar, parent credentials)
```

---

## 2. Core Architectural Pillars

### 2.1 Multi-Tenant Subdomain Routing
1. **Dynamic Resolution:** Incoming HTTP requests have their `Host` header inspected in `server.ts` or client-side `App.tsx` via `getSubdomainFromHost()`.
2. **School Portal Rendering:** If a registered school subdomain is detected (e.g. `oakridge`), the application automatically renders `PublicSchoolWebsite.tsx` scoped to that tenant's public configuration.
3. **Admin Shell Protection:** Requests to `/admin/*` require an active Supabase user session associated with a confirmed `school_id`.

### 2.2 Dual Control Plane Model
1. **School Admin Portal (`/admin/*`):** Operated by school principals, accountants, and transport managers. Protected by `AuthContext.tsx` and Supabase Auth.
2. **Master Admin Platform Console (`/master-admin/*`):** Operated by the SaaS platform owners. Isolated in separate routes, middleware (`src/middleware/masterAdminAuth.ts`), and context (`MasterAdminAuthContext.tsx`). Features global school provisioning, cross-tenant telemetry, subscription lifecycle management, and platform billing.

### 2.3 Financial Calculation Engine
- **Paise-Level Precision:** All financial calculations (fees, taxes, late fines, refunds) are handled as integers representing Indian paise to eliminate floating-point rounding errors.
- **Double-Entry Reconciliation:** Every payment produces corresponding entries in `fee_payments`, `fee_receipts`, and `fee_ledger`.
- **Derived Balances:** Student dues are dynamically computed from active fee structures minus applied concessions, credits, and recorded payments.
