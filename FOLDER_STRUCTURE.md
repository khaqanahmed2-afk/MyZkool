# MyZkool — Folder Structure Reference

> **Purpose**: Canonical guide for where new code belongs.
> Any future feature must follow this structure.
> Last updated: Phase 3 cleanup (2026-09-22)

---

## Top-Level Layout

```
MyZkool/
├── server.ts              # Express server entry point (API routes, Vite middleware)
├── index.html             # Vite SPA entry
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/                   # All frontend + shared source code
├── supabase/
│   └── migrations/        # Ordered SQL migrations (timestamp format: YYYYMMDDHHMMSS_name.sql)
├── tests/                 # Node.js test files (tsx runner, no framework)
├── docs/                  # Architecture docs, spec, decision records
└── scripts/               # Dev/CI helper scripts
```

---

## `src/` Directory

```
src/
├── main.tsx               # React entry point
├── App.tsx                # Root router — all routes declared here
├── index.css              # Global CSS / Tailwind base
├── vite-env.d.ts          # Vite environment type declarations
│
├── components/            # Shared & reusable UI components
│   ├── [LandingPage components]  # Hero, Navbar, Pricing, FAQ, etc. (public website)
│   ├── admin/             # Admin shell components (Sidebar, AdminShell, AdminHeader)
│   │   └── fees/          # Fee-module sub-components (FeeNavHeader)
│   ├── auth/              # Auth flow components (AuthLayout, ProtectedRoute, GoogleAuthButton)
│   └── onboarding/        # Onboarding layout components (OnboardingLayout, OnboardingProgress)
│
├── pages/                 # Route-level page components, organized by module
│   ├── LandingPage.tsx    # Public marketing website
│   ├── admin/             # All school-admin authenticated pages
│   │   ├── Dashboard.tsx
│   │   ├── ModulePlaceholder.tsx
│   │   ├── fees/          # Fee module pages (FeeCollectPage, ReceiptsPage, etc.)
│   │   ├── students/      # Student module pages + sub-components
│   │   │   └── wizard/    # Multi-step admission wizard steps
│   │   ├── transport/     # Transport module pages + sub-components
│   │   ├── settings/      # Settings pages (ClassesSettings)
│   │   └── approvals/     # Approvals page
│   ├── auth/              # Unauthenticated auth pages (Login, Register, Verify, ResetPassword)
│   ├── onboarding/        # Onboarding flow pages (SchoolProfile → Complete)
│   └── public/            # Public-facing pages not behind auth (ParentPayPage)
│
├── context/               # React Contexts
│   └── AuthContext.tsx    # Auth state, school context, user session
│
├── hooks/                 # Custom React hooks
│   ├── index.ts           # Barrel export
│   └── useAuth.ts         # Re-exports useAuth from AuthContext
│
├── lib/                   # Shared pure libraries (no React, no Express)
│   ├── supabase.ts        # Supabase client singleton
│   ├── amountInWords.ts   # Paise → words/formatted string utilities
│   ├── feeAllocation.ts   # Fee payment allocation logic
│   └── receiptTemplate.ts # Receipt HTML generation
│
├── utils/                 # Domain-specific utility functions
│   ├── aadhaarValidation.ts  # Verhoeff + UIDAI Aadhaar validation & masking
│   └── sensitiveCrypto.ts    # Client-side encryption for sensitive student data
│
├── types/                 # All TypeScript type definitions
│   ├── index.ts           # Barrel — re-exports everything from this directory
│   ├── landing.ts         # Landing page types (FeatureItem, PricingPlan, FAQItem, etc.)
│   ├── auth.ts
│   ├── school.ts
│   ├── academic.ts
│   ├── curriculum.ts
│   ├── subscription.ts
│   ├── website.ts
│   ├── staff.ts
│   ├── students.ts        # Student types + STUDENT_PERMISSIONS + StudentPermissionKey
│   ├── fees.ts
│   ├── collection.ts
│   ├── feeOperations.ts
│   ├── onlinePayment.ts
│   └── transport.ts
│
├── middleware/             # Express middleware (used server-side) AND shared feature utilities
│   ├── auth.ts            # requireSchoolContext — multi-tenant boundary enforcement
│   ├── features.ts        # checkSchoolFeature / requireFeature — tier-gating (SHARED: used in React + Express)
│   └── permissions.ts     # requirePermission — role-based permission guards (server-side)
│
├── routes/                # Express API route handlers
│   └── transportRoutes.ts # /api/transport/* routes
│
├── services/              # Business logic services (called by pages, routes, tests)
│   ├── paymentGateway/    # Payment gateway adapter pattern
│   │   ├── index.ts
│   │   ├── mockAdapter.ts
│   │   └── razorpayAdapter.ts
│   └── [*.ts]             # One file per domain area (studentService, feeService, etc.)
│
└── workers/               # Background job workers
    └── notificationWorker.ts  # WhatsApp notification queue + fake/real providers
```

---

## Key Conventions

### File Naming
| Type | Convention | Example |
|---|---|---|
| React components | `PascalCase.tsx` | `StudentList.tsx` |
| Services | `camelCaseService.ts` | `studentService.ts` |
| Background jobs | `camelCaseJob.ts` | `lateFeeJob.ts` |
| Hooks | `useCamelCase.ts` | `useAuth.ts` |
| Type files | `camelCase.ts` | `students.ts` |
| Migrations | `YYYYMMDDHHMMSS_description.sql` | `20260920120000_onboarding_v2_simplify.sql` |
| Test files | `test-kebab-case.ts` | `test-students-foundations.ts` |

### Where to Put New Code
| Scenario | Location |
|---|---|
| New ERP module (e.g. Exams) | `src/pages/admin/exams/` for pages; `src/services/examService.ts` |
| Shared UI used by 2+ modules | `src/components/` |
| Module-specific sub-component | Keep in the module folder (e.g. `src/pages/admin/students/`) |
| New type definitions | `src/types/[domain].ts`, export through `src/types/index.ts` |
| New utility function | `src/lib/` if pure; `src/utils/` if domain-specific |
| New Express API route | `src/routes/[domain]Routes.ts`, mounted in `server.ts` |
| New DB schema change | New migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql` |
| Landing page types | `src/types/landing.ts` |

### Architecture-Critical Rules (do not simplify)
1. **Aadhaar masking** — `src/utils/aadhaarValidation.ts` and `sensitiveCrypto.ts` — never bypass.
2. **Tier-gating** — `checkSchoolFeature()` in `src/middleware/features.ts` — all Pro/transport features must call this.
3. **Multi-tenant boundary** — `requireSchoolContext` in `src/middleware/auth.ts` — all Express routes must use this, never trust client-supplied school_id.
4. **Parent auth** — `src/services/parentAuth.ts` — future school-tenant feature; parents NEVER use the admin portal login.

---

## What NOT to Do
- Do not create a new `types.ts` in the `src/` root — all types go in `src/types/`
- Do not add Express middleware in `server.ts` directly — create a route file and mount it
- Do not bypass `checkSchoolFeature` for transport/Pro features — even in "temporary" code
- Do not edit old migration files in-place — always add a new migration
