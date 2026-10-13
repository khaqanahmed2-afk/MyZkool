# MyZkool

A modern multi-tenant School Website Builder, ERP, and WhatsApp Communication Platform designed for K-12 schools across India.

---

## Overview

Most school management software platforms are designed for large institutions with dedicated IT departments. Small to mid-size schools across India face a different operational reality: a single administrative office, school principals managing multiple responsibilities, and parents who prefer communicating through WhatsApp rather than installing another dedicated mobile app.

**MyZkool** bridges this gap by unifying website publishing, administrative operations, fee collection, transport logistics, and parent communication into a single secure platform:

* **Institutional Website Builder**: A zero-code website builder that publishes school websites on custom subdomains or dedicated domains (`/s/:slug`), complete with themes, sections, and admissions inquiry workflows.
* **Student Information System (SIS)**: Full student lifecycle management from an 8-step admission wizard to student 360 profiles, directory filtering, batch promotions, and Transfer Certificate (TC) issuance.
* **Fee Counter & Financial Operations**: High-speed point-of-sale collection, integer-paise financial precision, cash/cheque/UPI tracking, cheque clearance lifecycle, dues generation, late fees, concessions, and end-of-day drawer reconciliation.
* **Transport Fleet Logistics**: Vehicle fleet management, driver/staff directory with encrypted Aadhaar and license expiry alerts, interactive Leaflet route builder, distance fee zones, and student stop assignments.
* **Multi-Tenant Architecture**: Strict row-level security (RLS) across all tenant tables, tenant subdomain isolation, and AES-256-GCM field-level encryption for sensitive PII.

---

## Verified Features

### 1. Public Marketing Portal & School Websites
* **Marketing Landing Page (`/`)**: Overview of the platform, philosophy, live feature matrix, transparent pricing tiers, onboarding guide, interactive FAQ, and contact modals.
* **AI School Solutions Advisor**: Natural-language advisory powered by Google Gemini, helping administrators evaluate features, migration steps, and fee configurations.
* **Public School Website Builder & Runtime (`/s/:slug`)**: Multi-tenant school websites featuring configurable themes, hero banners, about sections, facilities, notices, and an online admission inquiry form.
* **Parent Pay Portal (`/pay/:token`)**: Direct checkout link allowing parents to view pending dues and settle payments online without requiring an app login.

### 2. Multi-Tenant Onboarding Pipeline (`/onboarding/*`)
* **School Profile (`/onboarding/school-profile`)**: Institutional identity, affiliation board, contact details, and subdomain allocation.
* **Academic Calendar (`/onboarding/academics`)**: Academic year creation, active session enforcement, term setup, and working day calendar.
* **Classes & Sections (`/onboarding/classes`)**: Class hierarchy, section divisions with capacity warnings, and primary/secondary wing configurations.
* **Curriculum Mapping (`/onboarding/subjects`)**: Subject catalogue (core, elective, activity) with class assignments.
* **Subscription Selection (`/onboarding/subscription`)**: Tier options (Basic, Pro, Custom), billing duration discounts, and GST invoice calculation.
* **Website Setup (`/onboarding/website`)**: Visual branding, color themes, hero image upload to Supabase Storage, and page section toggles.
* **Launch Checklist (`/onboarding/complete`)**: Verification audit of completed setup steps with direct links to the admin dashboard.

### 3. Student Lifecycle Management (`/admin/students`)
* **8-Step Admission Wizard (`/admin/students/new`)**: Step-by-step admission capturing student biodata, parents/guardians, address, previous schooling, encrypted sensitive records, medical history, optional transport, and fee assignments.
* **Student Directory (`/admin/students`)**: Search and filter by class, section, status, caste category, and RTE status, with custom column chooser and quick-view drawer.
* **Student 360 Profile (`/admin/students/:id`)**: Comprehensive view of biodata, fee ledger, payment history, transport assignments, and documents.
* **Batch Promotion Pipeline (`/admin/students/promotion`)**: End-of-year batch promotion with student status overrides.
* **Transfer Certificate (TC) Register (`/admin/students/tc-register`)**: Auto-incrementing TC numbers, dues clearance verification, and printable certificate generator.
* **Bulk Import (`/admin/students/import`)**: CSV import with automatic column mapping and validation.

### 4. Fee Counter & Financial Operations (`/admin/fees`)
* **POS Fee Collection Counter (`/admin/fees/collect`)**: High-speed collection supporting cash, cheque, UPI, and bank transfers with instant thermal/A4 printable receipts.
* **Fee Structures & Heads (`/admin/fees/structures`, `/admin/fees/heads`)**: Configurable recurring and one-time fee heads with term-based installment schedules.
* **Cheque Register (`/admin/fees/cheques`)**: Cheque status tracking (`Received`, `Deposited`, `Cleared`, `Bounced`) with automated bounce fee penalties.
* **Defaulters Tracking (`/admin/fees/defaulters`)**: Aging brackets with one-click WhatsApp reminder generation.
* **Concession & Late Fee Rules (`/admin/fees/concessions`, `/admin/fees/late-fee-rules`)**: Sibling discounts, staff concessions, and customizable grace periods.
* **Day-Close Reconciliation (`/admin/fees/day-close`)**: End-of-day cash drawer balancing, denomination breakdown, and supervisor closeouts.
* **Financial Reports (`/admin/fees/reports`)**: Head-wise collection reports, payment mode summaries, and cashier audit logs.

### 5. Transport Fleet Logistics (`/admin/transport`)
* **Vehicle Fleet Roster (`/admin/transport/vehicles`)**: Bus/van management with registration numbers, seating capacities, and insurance/fitness tracking.
* **Transport Staff Directory (`/admin/transport/staff`)**: Driver and conductor records with AES-256-GCM encrypted Aadhaar numbers and driving license expiry alerts.
* **Route Builder (`/admin/transport/routes`)**: Interactive Leaflet maps with route stops, pickup/drop timings, and printable route sheets.
* **Distance Fee Zones (`/admin/transport/fee-zones`)**: Flat, slab, and distance-based transport fee structures.
* **Student Transport Allocations (`/admin/transport/assign`)**: Stop and vehicle assignments with capacity utilization indicators.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Lucide React, Leaflet Maps |
| **Backend** | Node.js Express 4, tsx, esbuild 0.25 (CommonJS bundle) |
| **Database & Auth** | Supabase (PostgreSQL with Row-Level Security, Supabase Auth, Storage) |
| **AI Advisory** | Google Gemini API via `@google/genai` |
| **Validation** | Zod schemas across client and server |
| **Testing** | Node.js / TypeScript test suites executed via `python scripts/run_all_tests.py` |

---

## Repository Structure

```text
MyZkool/
├── index.html                           # Single-page application entry point
├── package.json                         # Project dependencies, metadata, and scripts
├── tsconfig.json                        # TypeScript configuration and path aliases
├── vite.config.ts                       # Vite bundler configuration and Tailwind v4 plugin
├── server.ts                            # Express application, API routes, and Vite dev middleware
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore rules for build, deps, logs, and secrets
│
├── public/                              # Static public assets (logos, favicon, robots.txt)
├── packages/                            # Shared workspace packages
│   └── shared/                          # Shared TypeScript types and Zod schemas
├── adapters/                            # Agent and tooling reference adapters
│
├── src/                                 # Application source code
│   ├── main.tsx                         # Client application bootstrap
│   ├── App.tsx                          # Root router, lazy page loading, and error boundaries
│   ├── index.css                        # Tailwind v4 theme, fonts, and base styling
│   │
│   ├── components/                      # Reusable UI components
│   │   ├── admin/                       # Admin sidebar, headers, fee modals
│   │   ├── auth/                        # Protected routes, login forms, Google auth
│   │   ├── common/                      # Branded logo, ErrorBoundary
│   │   ├── layout/                      # Navbar, Footer
│   │   ├── onboarding/                  # Onboarding shells and website builder components
│   │   ├── sections/                    # Landing page feature, hero, and advisor sections
│   │   └── ui/                          # Modal dialogs and notifications
│   │
│   ├── context/                         # React context providers (AuthContext)
│   ├── hooks/                           # Custom React hooks
│   ├── lib/                             # Shared client utilities (Supabase client, templates)
│   ├── middleware/                      # Server middleware (audit, permissions, error handler)
│   ├── pages/                           # Application route components
│   │   ├── admin/                       # Admin ERP pages (students, fees, transport, settings)
│   │   ├── auth/                        # Login, registration, password reset, OTP verify
│   │   ├── onboarding/                  # 8-step school onboarding flow
│   │   └── public/                      # Public school website and parent payment portal
│   │
│   ├── routes/                          # Route definitions (AppRoutes, transportRoutes)
│   ├── services/                        # Business logic, database operations, and external APIs
│   ├── types/                           # TypeScript interfaces and domain types
│   ├── utils/                           # Aadhaar validation and AES-256-GCM encryption
│   └── workers/                         # Background job workers
│
├── supabase/                            # Supabase database configuration
│   └── migrations/                      # Forward-only SQL migrations with RLS policies
│
├── tests/                               # Comprehensive TypeScript test suite (28 test files)
├── scripts/                             # Test runners, validators, and repository scripts
└── docs/                                # Project specification and architectural documentation
```

---

## Getting Started

### Prerequisites

* **Node.js**: Version 18.0.0 or higher (Node 20+ LTS recommended)
* **npm**: Version 9.0.0 or higher
* **Python**: Version 3.10+ (required for executing the test suite runner)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khaqanahmed2-afk/MyZkool.git
   cd MyZkool
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your Supabase project credentials and encryption key.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All environment variables are declared in `.env.example` with safe placeholder values:

| Variable | Description | Required | Example / Default |
| :--- | :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous API key | Yes | `eyJhbGci...` |
| `APP_URL` | Root application URL for public links and callbacks | Yes | `http://localhost:3000` |
| `APP_MASTER_KEY` | 32-byte Base64 key for AES-256-GCM sensitive PII encryption | Yes | See generation command below |
| `PORT` | Local server port for Express | No | `3000` |
| `GEMINI_API_KEY` | Google Gemini API key for AI School Advisor chat | No | `your-gemini-key` |
| `FAST2SMS_API_KEY` | Fast2SMS provider key for live SMS OTP delivery | No | Optional (defaults to console mode) |
| `SMS_MODE` | SMS delivery mode (`console` or `live`) | No | `console` |

### Generating the `APP_MASTER_KEY`

To generate a secure 32-byte Base64 encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Paste the resulting string into `.env` as the `APP_MASTER_KEY`.

---

## Available Scripts

All scripts are configured in `package.json`:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express server with tsx and Vite HMR middleware on port 3000 |
| `npm run build` | Compiles Vite client assets to `dist/` and bundles `server.ts` to `dist/server.cjs` via esbuild |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs strict TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Runs the full automated test suite (`python scripts/run_all_tests.py`) |
| `npm run preview` | Previews the built client application locally via Vite |
| `npm run clean` | Cleans build artifacts (`dist/`) |

---

## Database & Supabase Configuration

### Applying Migrations

The database schema is defined as forward-only SQL migrations in `supabase/migrations/`.

To apply all migrations to your Supabase project using the Supabase CLI:
```bash
# Link to your Supabase project (first time)
npx supabase link --project-ref your-project-ref

# Push migrations to remote database
npx supabase db push
```

Alternatively, copy the SQL files in order from `supabase/migrations/` and run them directly in the Supabase SQL Editor.

### Storage Buckets

MyZkool uses Supabase Storage for school assets (logos, banners, fee receipts, student documents):

* **`school_assets`**: Storage bucket for institutional logos, signatures, and website images. Configured in migration `20261013020000_school_assets_storage.sql` with public read access and authenticated tenant write policies.

---

## Security & Secret Management

* **Zero Committed Secrets**: `.env`, credentials, service role keys, and private tokens must never be committed to Git. The `.gitignore` file enforces this for all local environment variants (`.env*` except `.env.example`).
* **Frontend Credential Safety**: Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are exposed to the client bundle. Privileged service role keys are never sent to the browser.
* **Row-Level Security (RLS)**: Every multi-tenant database table carries `school_id` with RLS policies enforcing tenant isolation.
* **Sensitive Data Encryption**: Aadhaar numbers and sensitive documents are encrypted at rest using AES-256-GCM authenticated encryption. Only masked numbers (last 4 digits) are exposed in regular queries. Full plaintext retrieval requires explicit administrator permissions and creates an immutable audit row.

---

## Production Deployment

### 1. Build Phase
Run the production build:
```bash
npm ci
npm run build
```
This produces:
* `dist/index.html` and optimized client bundles in `dist/assets/`.
* `dist/server.cjs`: Self-contained Node.js Express server bundle.

### 2. Runtime Execution
Set environment variables on your host:
```bash
NODE_ENV=production
PORT=3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
APP_URL=https://myzkool.in
APP_MASTER_KEY=your-32-byte-base64-key
```
Start the application:
```bash
node dist/server.cjs
```

The Express server serves the compiled static assets with SPA routing fallback and handles backend API endpoints, Gemini advisory requests, and public website routing.

---

## Troubleshooting

### Port Collision (`EADDRINUSE: 3000`)
If port 3000 is occupied by another process, either specify a different port in your environment:
```bash
PORT=3001 npm run dev
```
Or terminate the existing process occupying port 3000:
```powershell
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### TypeScript / Lint Errors
Run the type checker directly:
```bash
npm run lint
```
Inspect the output file or line number. All shared schemas are referenced via `packages/shared`.

### Test Runner Issues
The test runner requires Python 3.10+ and tsx:
```bash
python scripts/run_all_tests.py
```
To run an individual test directly:
```bash
npx tsx tests/test-academic-setup.ts
```

---

## License

This project is licensed under the Apache 2.0 License. See the individual source files for copyright and licensing details.
