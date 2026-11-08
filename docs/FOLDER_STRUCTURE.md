# MyZkool Canonical Folder Structure Reference

```
myzkool/
├── server.ts                       # Express backend server (REST APIs, Vite dev SSR, AI endpoints)
├── vite.config.ts                  # Vite build configuration (React & Tailwind v4 compiler plugins)
├── tsconfig.json                   # Strict TypeScript project configuration
├── package.json                    # Project dependencies, devDependencies, and automation scripts
├── .env.example                    # Environment variable template with sanitized sample values
│
├── public/                         # Public static web assets
│   ├── logo.svg                    # Vector brand mark
│   ├── favicon.svg                 # Application favicon
│   ├── hero-laptop.webp            # Optimized hero mockup (118 KB)
│   ├── myzkoolp.webp               # Optimized parent portal mobile mockup (121 KB)
│   ├── Khaqan Ahmad.webp           # Optimized founder portrait
│   ├── Ahiri Naskar.webp           # Optimized co-founder portrait
│   ├── Aqsa Ibrahim.webp           # Optimized co-founder portrait
│   ├── robots.txt                  # Search crawler directives
│   └── sitemap.xml                 # Search index sitemap
│
├── src/                            # Single-Page Application source code
│   ├── main.tsx                    # React application entry point (DOM root mount)
│   ├── App.tsx                     # Core application wrapper with Theme and Auth context providers
│   ├── index.css                   # Tailwind CSS v4 style definitions and design system variables
│   │
│   ├── assets/                     # Asset registry
│   │   └── index.ts                # Canonical asset paths and image constants
│   │
│   ├── components/                 # Component hierarchy
│   │   ├── admin/                  # Administrative shell & layout components
│   │   │   ├── AdminShell.tsx      # Sidebar, contextual header, and role-gated admin navigation
│   │   │   ├── fees/               # Fee modals, collection drawers, and ledger tabs
│   │   │   ├── students/           # Student filter bars, bulk actions, and promotion modals
│   │   │   └── transport/          # Vehicle and driver detail modals
│   │   ├── auth/                   # Authentication forms and submission controls
│   │   ├── common/                 # Common visual primitives (Branding, ErrorBoundary)
│   │   ├── layout/                 # Landing page Navbar, Footer, and responsive menus
│   │   ├── onboarding/             # Onboarding setup wizard steps and live previews
│   │   ├── payment/                # Razorpay checkout modals and trigger buttons
│   │   ├── sections/               # Public landing page marketing sections
│   │   └── ui/                     # Generic dialogs (DemoModal, LoginModal, LegalModal)
│   │
│   ├── context/                    # React Context providers (AuthContext, ThemeContext)
│   ├── data/                       # Static site copy, founder profiles, FAQ entries
│   ├── hooks/                      # Custom hooks (useAuth, useLandingModals, usePageMetadata)
│   ├── lib/                        # Infrastructure helpers (Supabase client, sensitiveCrypto, receipt templates)
│   │
│   ├── pages/                      # Lazy-loaded page route components
│   │   ├── admin/                  # Administrative ERP portals
│   │   │   ├── Dashboard.tsx       # Institutional KPI dashboard
│   │   │   ├── fees/               # Fee management pages (Collections, Invoices, Structures, Reminders)
│   │   │   ├── students/           # Student admissions, profile, import, TC register, promotion
│   │   │   ├── transport/          # Transport dashboard, vehicle management, route builder
│   │   │   └── settings/           # School profile, academic setup, data deletion settings
│   │   ├── auth/                   # Authentication screens (Login, Register, ResetPassword, Verify)
│   │   ├── onboarding/             # Resumable multi-step school onboarding flow
│   │   └── public/                 # Public school website & parent fee payment portal
│   │
│   ├── routes/                     # Application routing definitions (`AppRoutes.tsx`)
│   ├── services/                   # Supabase and API query abstraction layer
│   └── types/                      # Domain TypeScript interfaces and Zod validation schemas
│
├── packages/
│   └── shared/                     # Cross-platform shared TypeScript interfaces and Zod validation schemas
│
├── supabase/
│   ├── migrations/                 # 55 SQL migration files (schema, composite foreign keys, RLS policies, RPCs)
│   └── scripts/                    # Historical ledger reconciliation and database repair SQL routines
│
├── tests/                          # 76 automated test suites executing via tsx runner
├── scripts/                        # Automation scripts (image optimization, test runner, backup utilities)
└── docs/                           # Architecture specifications, database reports, security audits, and changelogs
```

