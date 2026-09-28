# MyZkool: School Website Builder & Management ERP

> **One platform instead of five disconnected tools.** A complete school website, admissions pipeline, student lifecycle management, fee collection & counter accounting, school transport fleet management, and automated parent communication system built specifically for Indian K-12 schools, with zero IT team required and all parent-facing communication delivered directly over **WhatsApp**.

---

## 🌟 Executive Overview

MyZkool is designed specifically for small and mid-size K-12 schools across India, with an emphasis on institutions in Tier-2 and Tier-3 cities.

- **WhatsApp-First Parent Communication:** Parents never need to download or navigate a separate mobile application. Daily attendance alerts, fee receipts with instant UPI payment links, and urgent transport notices arrive directly in their active WhatsApp inbox (98.4%+ open rate).
- **Single Integrated Workspace:** Consolidates fragmented systems (separate website builders, offline Excel registers, tally ledgers, manual bus charts, and paper admission forms) into a unified, role-based dashboard for Principals, Trustees, Teachers, Accountants, and Transport Coordinators.
- **Affordable & Accessible:** Transparent tiered pricing tailored to Indian school fee structures with 18% GST invoicing for Input Tax Credit (ITC) and a **30-Day Money-Back Guarantee**.
- **DPDP Act, 2023 Compliant:** Engineered from the ground up for Indian data sovereignty, ephemeral document processing, Aadhaar encryption & masking, and statutory Grievance Redressal.
- **Enterprise-Grade Database Architecture:** Backed by Supabase PostgreSQL with strict Row-Level Security (RLS) across 70+ tables, guaranteeing strict multi-tenant isolation.

---

## 🚀 Core Platform Modules

### 1. Student Lifecycle Management (SIS)
- **8-Step Admission Wizard (`/admin/students/new`)**:
  - *Personal Info*: Student name, DOB with age boundary checks (2–25 yrs), gender, blood group, mother tongue, caste category, and RTE status.
  - *Guardian Details*: Father, mother, and local guardian profiles. Sibling auto-linking by phone number prevents duplicate parent records.
  - *Address*: Permanent and correspondence postal address validation.
  - *Previous Schooling*: Prior school record, last class passed, TC number, and board tracking.
  - *Medical Profile*: Allergies, chronic conditions, regular medications, emergency doctor contact, and blood group.
  - *Document Vault*: Upload and verify Birth Certificate, Aadhaar Card, Transfer Certificate, and Report Cards with immutable superseding rules.
  - *Transport Pre-assignment*: Real-time route and stop assignment with seat availability verification.
  - *Fee Structure Assignment*: Automatic class fee schedule binding with concession rule applications.
- **Student Directory & Roster (`/admin/students`)**:
  - Multi-filter search (class, section, enrollment status, category, RTE, gender).
  - Quick-view drawer for rapid student profile inspections without leaving the list.
  - Quick action toolbar: Change status, issue TC, assign transport, view dues.
- **Comprehensive Student 360° Profile (`/admin/students/:id`)**:
  - Tabbed interface: Academic Overview, Fee Ledger & Due Dates, Transport Schedule, Attendance History, Document Vault, and Timeline Audit.
- **Promotion Pipeline (`/admin/students/promotion`)**:
  - Batch academic year promotions with preview counts matching commit results.
  - Per-student override actions: Promote, Detain, or Record as Left/Passed Out.
  - Statutory 24-hour undo window allowing instant rollback of promotion batches.
- **Transfer Certificate (TC) Engine (`/admin/students/tc-register`)**:
  - Auto-incrementing TC numbering (`TC-YYYY-XXXX`).
  - Outstanding dues verification blocking issuance unless overridden by School Owner with mandatory logged audit reasons.
  - QR-code verification payload generation and duplicate certificate copy handling.
- **Bulk CSV Import & Rollback Engine (`/admin/students/import`)**:
  - Intelligent column auto-mapping (handles multi-format headers like "First Name", "Student Name", "Fname").
  - Pre-commit validation against existing student duplicates and class/section rosters.
  - High performance: Imports 500+ student rows in under 15 seconds.
  - Atomic batch rollback: One-click reversal of imported batches before dependent records (fees/transport) are created.
- **Audited Student Export**:
  - Masked Aadhaar export (`XXXXXXXX1234`), omitting private staff notes and internal encryption keys.
  - Every export action logs an immutable audit event for DPDP Act compliance.

---

### 2. Comprehensive Fee Counter & Financial Accounting
- **Fee Heads & Reusable Fee Structures (`/admin/fees/structures`, `/admin/fees/heads`)**:
  - Configurable fee heads: Tuition, Admission, Annual, Examination, Laboratory, Library, Sports, Transport, and Miscellaneous.
  - Multi-cycle structures: Monthly, Quarterly, Half-Yearly, and Annual terms.
  - Class-wide and wing-wide assignment with automatic dues generation.
- **Point-of-Sale Fee Collection Counter (`/admin/fees/collect`)**:
  - High-speed collection interface for school accountants and cashiers.
  - Split payment support across multiple modes: Cash, Cheque, UPI, and Bank Transfer.
  - Paise financial precision across all computations (zero floating-point rounding errors).
  - Real-time digital fee receipt generation with printable thermal/A4 formats and WhatsApp delivery.
- **Cheque Register & Clearance Workflow (`/admin/fees/cheques`)**:
  - Lifecycle tracking: `Received` → `Deposited` → `Cleared` or `Bounced`.
  - Automated bounce fee penalties and receipt balance reversals upon cheque dishonor.
- **Defaulters Tracking & Age Brackets (`/admin/fees/defaulters`)**:
  - Aging buckets: 0–30 days, 31–60 days, 61–90 days, and 90+ days overdue.
  - Automated 1-click WhatsApp payment reminders with embedded UPI links (Google Pay, PhonePe, Paytm, BHIM, RuPay).
- **Concessions & Scholarship Management (`/admin/fees/concessions`)**:
  - Rule-based concessions: Sibling discounts, Staff ward benefits, RTE full concessions, and Merit/Need-based waivers.
- **Late Fee Rules (`/admin/fees/late-fee-rules`)**:
  - Grace period configuration, flat daily late fees, or percentage penalties.
- **Day-Close Counter Reconciliation (`/admin/fees/day-close`)**:
  - End-of-day cash drawer balancing: System ledger vs physical cash count.
  - Cashier denomination breakdown (₹2000, ₹500, ₹200, ₹100, ₹50, etc.).
  - Supervisor lock and handover sign-off prevents backdated modifications.
- **Refunds & Fee Adjustments (`/admin/fees/refunds`)**:
  - Audited refund workflows with double-entry reversal safeguards.

---

### 3. School Transport Management & Fleet Logistics
- **Fleet & Vehicle Roster (`/admin/transport/vehicles`)**:
  - School-owned buses, vans, and third-party contractor fleets.
  - Seating capacity tracking, fuel type, GPS device binding, and vehicle status (`active`, `maintenance`, `retired`).
- **Driver & Attendant Directory (`/admin/transport/staff`)**:
  - Driver licensing details with expiration tracking.
  - Masked emergency phone and address records.
  - Instant WhatsApp driver portal onboarding links.
- **Interactive Route Builder & Mapping (`/admin/transport/routes`)**:
  - Route planning with drag-and-drop stop sequencing.
  - Pick-up and drop-off timing synchronization.
  - Integrated Leaflet map visualization for route geometry.
  - Printable Route Sheets (`PrintableRouteSheet.tsx`) for drivers and bus attendants.
- **Distance & Slab-Based Fee Zones (`/admin/transport/fee-zones`)**:
  - Flexible pricing models: Flat fee, Distance-based (per km), or Multi-stop slab zones.
  - Automated billing month synchronizations.
- **Compliance & Document Expiry Engine**:
  - Document expiration alerts: Fitness certificates, Vehicle Insurance, PUC, Road Tax, and Permits.
  - Automated thresholds (60d, 30d, 15d, 7d, expired) with deduplicated notification alerts.
  - Compliance blocks preventing route assignment of non-compliant vehicles.
- **Student Transport Assignment Drawer (`/admin/transport/assign`)**:
  - Quick assignment directly from Student Profile or Bulk Assignment grid.
  - Real-time seat capacity meter with supervisor override reason logging.
  - Authorized guardian handover enforcement.
  - Automated transport fee dues generation with transaction rollback on error.
- **Academic Year Transport Renewal (`/admin/transport/year-renewal`)**:
  - Single-click rollover of transport routes, stops, and riders into the upcoming academic session.

---

### 4. Modern School Website Builder
- **Zero-Code School Website (`/onboarding/website`)**:
  - Ready-to-publish website templates customized for Indian school admissions, achievements, fee structures, and principal messages.
  - Primary, secondary, and accent brand color customizers with instant live preview.
  - Pre-configured navigation: Home, About Us, Academics, Admissions, and Contact Us.
- **Custom Domain & SSL**:
  - Free automated tenant subdomain (`{school-subdomain}.myzkool.com`).
  - Support for custom institutional domains (e.g. `yourschool.edu.in`) with automated SSL certificates.
- **Admissions Lead Capture**:
  - Online enquiry forms delivering parent admissions requests straight to the School Admin dashboard.

---

### 5. Interactive Marketing Tools & AI School Advisor
- **Interactive School ERP Demo**:
  - Live interactive dashboard demonstration directly on the marketing website (`/admin`).
- **ROI & Operational Savings Calculator**:
  - Calculates annual hours saved on paperwork, fee realization improvements, and direct monetary savings by replacing fragmented software licenses.
- **AI School Advisor (Beta)**:
  - Powered by **Google Gemini 2.5 Flash** (`@google/genai`).
  - School administrators can ask questions in natural language, listen via text-to-speech, or upload photos of existing paper registers to preview automated data mapping.
- **Web3Forms Demo Booking Modal**:
  - Connected directly to the Web3Forms API with spam honeypot filtering, mandatory DPDP Act consent verification, and instant WhatsApp follow-up links.

---

## 🏫 Multi-Tenant Onboarding Pipeline (8 Stages)

MyZkool features a production-ready, resume-capable 8-stage onboarding process for school administrators:

1. **School Profile (`/onboarding/school-profile`)**: Institutional identity, board affiliation, contact details, and automated tenant subdomain claiming (`{subdomain}.myzkool.com`).
2. **Academic Setup (`/onboarding/academics`)**: Academic calendar configuration with automatic cycle calculation, single active current-year enforcement, and statutory holiday defaults.
3. **Classes & Sections (`/onboarding/classes`)**: Grade structure definition with section subdivision, sort-order auto-incrementing, and primary/secondary wing quick-setup templates.
4. **Subjects / Curriculum (`/onboarding/subjects`)**: Subject library categorization (core, elective, activity) with multi-class batch assignments and curriculum mapping.
5. **Subscription & Plan Selection (`/onboarding/subscription`)**: Tier catalog selection (Basic, Pro, Custom), prepay duration discounts (monthly, 6-month, yearly), 18% statutory GST calculation, and 14-day zero-risk trial activation.
6. **Website Setup & Initialization (`/onboarding/website`)**: Zero-code school website bootstrap with primary brand coloring, admissions lead toggle, tenant parent portal link (`{subdomain}.myzkool.com/parent-login`), and 5 default pages.
7. **Staff Setup (`/onboarding/staff`)**: Non-blocking staff roster onboarding with role-based segregation (`teacher`, `accountant`), clean employee code auto-generation, and full multi-tenant isolation.
8. **Onboarding Complete (`/onboarding/complete`)**: Comprehensive aggregated setup audit with real-time launch checklist, copyable domain URLs, and atomic status transition to `onboarding_completed: true` launching the School Admin ERP dashboard.

---

## 🛡️ Security, Privacy & DPDP Act Compliance

- **PostgreSQL Row-Level Security (RLS)**:
  - All 72 tables across 9 domains are protected by strict RLS policies bound to the authenticated user's `school_id`. No tenant can query or leak another tenant's data.
- **Aadhaar Data Protection**:
  - Sensitive 12-digit Aadhaar numbers are never stored in plain text.
  - Stored as encrypted binary bytes (AES-256-GCM) with salted blind indexing (SHA-256) for uniqueness checks.
  - System interfaces and CSV exports strictly mask Aadhaar values (`XXXXXXXX1234`).
- **Paise Precision Financial Ledger**:
  - All financial amounts (fees, dues, concessions, payments, refunds) are stored as integer paise (1 INR = 100 paise) in PostgreSQL `BIGINT`, eliminating floating-point rounding errors.
- **Ephemeral AI Processing**:
  - Documents or images uploaded to the Gemini AI Advisor are processed in-memory for instant visual structure extraction and are never retained or used to train public foundation models.
- **Comprehensive Audit Trail**:
  - Every sensitive action (fee waivers, promotion undos, TC issuance overrides, bulk student deletions, CSV exports) generates an immutable audit record containing actor ID, role, timestamp, reason, and previous state.

---

## 🛠️ Technology Stack

| Layer                  | Technologies                                                                                                 |
| :--------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/) |
| **Routing**            | [React Router v7](https://reactrouter.com/)                                                                  |
| **Styling**            | [Tailwind CSS v4](https://tailwindcss.com/)                                                                  |
| **Maps & Transport**   | [Leaflet](https://leafletjs.com/), `@types/leaflet`                                                          |
| **Icons & Typography** | [Lucide React](https://lucide.dev/), Plus Jakarta Sans (Headings), Inter (Body)                              |
| **Backend & Server**   | [Express.js](https://expressjs.com/), [Node.js](https://nodejs.org/), Vite SPA middleware                    |
| **Bundler & Compiler** | [esbuild](https://esbuild.github.io/) (CJS server bundle), Vite (Frontend assets)                             |
| **Database & Auth**    | [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS) & Auth                            |
| **AI Integration**     | [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini 2.5 Flash)                       |
| **Lead Routing**       | [Web3Forms](https://web3forms.com/) API                                                                      |

---

## 📁 Directory Structure

```text
├── index.html                           # HTML entry point with metadata & SVG favicon
├── metadata.json                        # Platform metadata and permission declarations
├── package.json                         # Dependencies, scripts, and build configuration
├── server.ts                            # Express server with Vite middleware & Gemini API routes
├── vite.config.ts                       # Vite configuration with Tailwind CSS plugin
├── SCHEMA.md                            # Complete database schema reference (72 tables, RLS, indexes)
├── FOLDER_STRUCTURE.md                  # Comprehensive folder structure documentation
├── CLEANUP_REPORT.md                    # Codebase audit & refactoring history
├── public/
│   ├── favicon.svg                      # Official MyZkool SVG favicon
│   └── logo.svg                         # Official MyZkool vector emblem
├── src/
│   ├── App.tsx                          # App routing & root state
│   ├── main.tsx                         # React DOM mount point
│   ├── index.css                        # Tailwind CSS entry point
│   ├── components/
│   │   ├── admin/                       # Admin dashboard shell, Sidebar, Header, Fee navigation
│   │   ├── auth/                        # ProtectedRoute, Auth forms, GoogleAuthButton
│   │   ├── onboarding/                  # Onboarding header, navigation, and layout wrappers
│   │   └── ...                          # Landing page components & calculators
│   ├── context/
│   │   └── AuthContext.tsx              # Supabase Auth session provider & role management
│   ├── lib/
│   │   ├── amountInWords.ts             # Indian currency amount-in-words converter
│   │   ├── sensitiveCrypto.ts           # AES-256-GCM Aadhaar encryption & masking utilities
│   │   └── supabase.ts                  # Supabase client instantiation
│   ├── middleware/
│   │   ├── auth.ts                      # Express multi-tenant school context middleware
│   │   └── features.ts                  # Plan feature gating & limit verifications
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── fees/                    # 13 Fee ERP pages (Collect, Structures, Cheques, Day Close, etc.)
│   │   │   ├── students/                # 9 Student management pages (Directory, Profile, Wizard, Import, etc.)
│   │   │   ├── transport/               # 8 Transport management pages (Fleet, Routes, Zones, Assign, etc.)
│   │   │   └── settings/                # School administrative settings
│   │   ├── auth/                        # Login, Registration, Password recovery
│   │   ├── onboarding/                  # 8-stage school onboarding pages
│   │   └── LandingPage.tsx              # Public marketing homepage
│   ├── routes/
│   │   └── transportRoutes.ts           # Server-side Express transport API endpoints
│   ├── services/                        # Service layer (Student, Fee, Transport, Academic, School, Auth)
│   └── types/                           # TypeScript domain definitions (students, fees, transport, etc.)
├── supabase/
│   └── migrations/                      # 20 Database migrations (001 through 020)
└── tests/                               # 20 Automated test suites (>700 test cases)
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (Node 20+ recommended)
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/khaqanahmed2-afk/MyZkool.git
   cd MyZkool
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Provide your Supabase and Gemini API credentials:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   GEMINI_API_KEY="your-google-gemini-api-key"
   PORT=3000
   ```

---

## 📜 Available Scripts

- **`npm run dev`**: Starts the Express backend with Vite development middleware on `http://localhost:3000`.
- **`npm run build`**: Builds the static frontend bundle via Vite and compiles `server.ts` into a standalone production server (`dist/server.cjs`) via esbuild.
- **`npm start`**: Runs the production-compiled server (`dist/server.cjs`).
- **`npm run lint`**: Runs TypeScript type checking across all files (`tsc --noEmit`).
- **`npm run clean`**: Cleans the `dist/` directory and temporary build artifacts.

### Running Automated Tests

To run the complete automated test suite (all 20 test suites):

```bash
# Run a specific test suite
npx tsx tests/test-academic-setup.ts
npx tsx tests/test-phase1c.ts
npx tsx tests/test-students-operations.ts

# Run all test suites (PowerShell)
Get-ChildItem -Name tests\test-*.ts | ForEach-Object { npx tsx "tests/$_" }

# Run all test suites (Bash / Linux / macOS)
for f in tests/test-*.ts; do npx tsx "$f"; done
```

---

## 🧪 Verification & Test Coverage Summary

The MyZkool platform is tested across **20 automated test suites** with **700+ assertions passing** (0 failures):

- **Multi-Tenant Onboarding**: `test-school-onboarding.ts`, `test-academic-setup.ts`, `test-classes-subjects.ts`, `test-subscription.ts`, `test-website-setup.ts`, `test-staff.ts`, `test-onboarding-complete.ts`.
- **Student Operations & Lifecycle**: `test-students-foundations.ts`, `test-students-list-profile.ts`, `test-students-wizard.ts`, `test-students-operations.ts`, `test-phase1c.ts`.
- **Fee Collection & Ledger**: `test-phase2.ts`, `test-phase3a.ts`, `test-phase3b.ts`, `test-phase4.ts`, `test-phase5.ts`, `test-amount-in-words.ts`.
- **Transport Logistics**: `test-phase6.ts`.
- **Database & Security**: `test-rls-isolation.ts` (strictly validates Row-Level Security multi-tenant partitioning).

---

## 🔒 Statutory Compliance & Privacy

- **Digital Personal Data Protection (DPDP) Act, 2023**: Student records, attendance rosters, and financial accounts belong exclusively to the subscribing school. MyZkool operates strictly as a Data Processor.
- **Ephemeral AI Processing**: Photos of registers or fee receipts submitted to the AI Advisor are processed in-memory for instant visual structure extraction and are never retained or used to train public foundation models.
- **Grievance Redressal**: Designated Grievance & Data Protection Officer with statutory 24-hour acknowledgment and 15-day resolution windows.

---

## 📞 Official Contacts & Headquarters

- **Headquarters:** MyZkool Technologies, Lucknow, Uttar Pradesh - 226010, India
- **WhatsApp Support:** [+91 95559 54854](https://wa.me/919555954854)
- **Email:** [khaqanbuilds@gmail.com](mailto:khaqanbuilds@gmail.com)
- **Instagram:** [@myzkool](https://www.instagram.com/myzkool)
- **Operating Hours:** Monday to Saturday, 8:00 AM to 7:00 PM IST

---

© 2024 - 2026 MyZkool Technologies. All rights reserved.
