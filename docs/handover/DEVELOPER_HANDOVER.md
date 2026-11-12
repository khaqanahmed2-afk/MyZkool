# Master Developer Handover & Architecture Manual

> **MyZkool SaaS Platform — Complete Engineering Handover**  
> **Platform Version:** 1.6.0  
> **Target Audience:** Incoming Staff/Senior Software Engineers, DevOps, and Product Architects  
> **Audited Date:** 2026-11-11

---

## 1. Executive Introduction

Welcome to the **MyZkool** engineering repository. MyZkool is an end-to-end multi-tenant School ERP, Management, and Website Builder SaaS designed specifically for Indian K-12 educational institutions.

### Core Stack at a Glance
- **Frontend:** React 19 SPA, Tailwind CSS v4, Lucide React, Leaflet Maps, React Router DOM v7
- **Backend:** Express.js 4 server (`server.ts`) bundling and serving API routes and the client SPA
- **Database:** Supabase PostgreSQL with strict Row-Level Security (RLS) on all tenant tables
- **Payments:** Razorpay Standard Checkout & Webhooks (INR paise integer arithmetic)
- **AI Integration:** Google GenAI SDK (`@google/genai`) for the AI School Advisor

---

## 2. Repository Directory Organization

```
MyZkool/
├── server.ts                   # Express server: APIs, SSR metadata injection, SPA serving
├── vite.config.ts              # Vite configuration with chunk splitting & proxy
├── tsconfig.json               # Strict TypeScript config
├── package.json                # Project dependencies and operational scripts
├── index.html                  # SPA HTML entry point
│
├── src/                        # Complete Application Source Code
│   ├── main.tsx                # Client bootstrapping entrypoint
│   ├── App.tsx                 # Root component with tenant subdomain router
│   ├── routes/                 # React Router and Express API routers
│   ├── middleware/             # Tenant auth, tier gating, permissions, audit
│   ├── services/               # 49 Domain services (Students, Fees, Transport, Admin)
│   ├── components/             # Reusable modular UI components
│   ├── pages/                  # Page-level route views
│   ├── lib/                    # Supabase singleton, receipt & invoice engines
│   ├── context/                # School Admin & Master Admin authentication state
│   ├── hooks/                  # Custom React hooks (useAuth, useDisclosure, etc.)
│   ├── types/                  # Strict TypeScript domain interfaces
│   └── workers/                # Async job & notification queue workers
│
├── supabase/                   # Database Layer
│   ├── migrations/             # 60 Forward-only PostgreSQL migrations
│   └── scripts/                # Historical repair and reconciliation scripts
│
├── tests/                      # 86 Automated test specifications
│
├── scripts/                    # Development & operational tooling
│   ├── run_all_tests.mjs       # Automated Node.js test runner
│   ├── run_all_tests.py        # Automated Python test runner for CI
│   ├── optimize-images.cjs     # Asset compression utility
│   ├── create_backup.cjs       # Operational table dump utility
│   └── diagnostics/            # Development diagnostic and schema inspection scripts
│
├── docs/                       # Complete Engineering Documentation
│   ├── architecture/           # System, frontend, and backend architecture specs
│   ├── database/               # Schema reference, RLS audit, and tenancy specs
│   ├── security/               # Authentication and data protection policies
│   ├── guides/                 # Getting started, testing, and deployment manuals
│   ├── audit/                  # Complete Phase 1-11 audit reports and progress logs
│   ├── handover/               # Developer onboarding and handover guides
│   └── assets/screenshots/     # UI visual verification evidence screenshots
│
└── archive/                    # Legal & Financial Historical Records
    └── historical_backups/     # Preserved point-in-time recovery data (Category D)
```

---

## 3. How to Trace a Feature End-to-End

When implementing or debugging a feature (e.g., Collecting a Student Fee):

1. **Frontend View:** `src/pages/admin/fees/FeeCollectPage.tsx` mounts and loads the student ledger view.
2. **Component UI:** User selects fee items inside `src/components/admin/fees/CollectFeeDrawer.tsx`.
3. **Domain Service:** Form submission invokes `recordFeePayment()` in `src/services/collectionService.ts`.
4. **Data Validation:** Amounts are converted into integer paise (`Math.round(rupees * 100)`) and passed to `supabase.from('fee_payments').insert(...)`.
5. **Database Transaction & RLS:** PostgreSQL RLS policy `fee_payments_tenant_isolation` verifies the actor's session `school_id`. An automated database trigger creates corresponding entries in `fee_receipts` and updates `fee_ledger`.
6. **Receipt Generation:** Client generates the printable receipt using `src/lib/receiptTemplate.ts` and `src/lib/amountInWords.ts`.

---

## 4. Key Engineering Guidelines

- **Never Disable RLS:** Multi-tenant safety depends entirely on PostgreSQL RLS. Always include `school_id` in database inserts.
- **Strict Money Math:** Always calculate currency in paise (integers). Never use floating point for ledger arithmetic.
- **Aadhaar Masking:** Never store 12-digit Aadhaar numbers in cleartext. Always use `sensitiveCrypto.ts` for AES-256-GCM encryption.
- **Run Verification Before Committing:**
  ```bash
  npm run lint   # Strict typecheck
  npm test       # Run 86 tests
  npm run build  # Verify production build
  ```
