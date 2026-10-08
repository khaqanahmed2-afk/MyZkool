# MyZkool

Modern School Website Builder, ERP, and WhatsApp Communication Platform designed for K12 schools across India.

---

## Overview

Most school software platforms are designed for large, highly staffed institutions with dedicated IT teams. Small to mid size schools across India face a very different reality: a single administrative office, principals managing multiple responsibilities simultaneously, and parents who prefer communicating over WhatsApp rather than installing another native mobile application.

**MyZkool** solves this by unifying fragmented tools into a single, cohesive platform:
1. **School Website Builder**: A zero code, ready to publish institutional website with built-in admissions forms.
2. **Student Information System (SIS)**: Complete student lifecycle management from admission to transfer certificate issuance.
3. **Fee Counter and Accounting**: High speed fee collections, multiple payment modes, real time receipts, and automatic WhatsApp reminders.
4. **Attendance and Roll Call**: Quick daily attendance tracking for students and staff with instant alerts for parents.
5. **Transport Fleet Logistics**: Vehicle roster, route builder with Leaflet maps, distance based fee zones, and guardian handover verification.
6. **Parent Engagement**: Direct updates, receipts, notices, and payment links sent straight to parents on WhatsApp.

---

## Features

### 1. Landing Page and Public Surface
* **Responsive Marketing Portal**: Showcases the core platform, philosophy, live feature breakdowns, transparent pricing, onboarding steps, and interactive FAQ.
* **Dedicated About Us Page (`/about`)**: Complete team and vision story featuring the real founders (Khaqan Ahmad, Ahiri Naskar, Aqsa Ibrahim).
* **AI School Solutions Advisor**: Natural language advisory powered by Google Gemini, answering queries on data migration, fee structures, and school setup.
* **Interactive Demo Booking Modal**: Connected to Web3Forms with DPDP Act 2023 compliance consent.
* **Public Parent Payment Link (`/pay/:token`)**: Direct checkout link for parents to clear school dues online without requiring app installation.

### 2. Multi-Tenant Onboarding Pipeline (8 Stages)
* **School Profile (`/onboarding/school-profile`)**: Institutional identity, board affiliation, contact details, and automated tenant subdomain allocation.
* **Academic Setup (`/onboarding/academics`)**: Academic calendar configuration, single active current session enforcement, and holiday calendars.
* **Classes and Sections (`/onboarding/classes`)**: Grade structure definition with section subdivisions and primary or secondary wing templates.
* **Curriculum Mapping (`/onboarding/subjects`)**: Subject library categorization (core, elective, activity) with multi-class batch assignments.
* **Subscription Selection (`/onboarding/subscription`)**: Tier catalog selection (Basic, Pro, Custom), duration discounts, and 18% statutory GST tax invoicing.
* **Website Setup (`/onboarding/website`)**: School website initialization with primary brand palette, admissions lead toggle, and default institutional pages.
* **Staff Roster (`/onboarding/staff`)**: Role-based access control (`teacher`, `accountant`, `admin`) with unique employee codes.
* **Launch Checklist (`/onboarding/complete`)**: Verification audit with copyable domain URLs and activation of the School Admin ERP workspace.

### 3. Student Lifecycle Management
* **8-Step Admission Wizard (`/admin/students/new`)**: Validates student biodata, guardians, address, prior school history, medical records, document vault, optional transport, and fee structures.
* **Student Directory (`/admin/students`)**: Multi-filter search (class, section, status, caste category, RTE), column chooser, and quick-view drawer.
* **Student 360° Profile (`/admin/students/:id`)**: Comprehensive view of academic history, fee ledgers, transport schedules, attendance rosters, and document storage.
* **Promotion Pipeline (`/admin/students/promotion`)**: Batch academic year promotions with student overrides and a 24-hour rollback window.
* **Transfer Certificate (TC) Engine (`/admin/students/tc-register`)**: Auto-incrementing TC sequence, dues clearance verification, and QR code verification payloads.
* **Bulk Import and Export (`/admin/students/import`)**: Intelligent header auto-mapping, duplicate detection, and masked Aadhaar exports compliant with DPDP Act guidelines.

### 4. Fee Counter and Financial Operations
* **Fee Heads and Structures (`/admin/fees/structures`, `/admin/fees/heads`)**: Configurable tuition, admission, examination, transport, and custom fee categories.
* **Point-of-Sale Fee Collection (`/admin/fees/collect`)**: High-speed collection counter supporting cash, cheque, UPI, and bank transfers with integer paise financial precision.
* **Cheque Register (`/admin/fees/cheques`)**: Clearance lifecycle tracking (`Received`, `Deposited`, `Cleared`, `Bounced`) with automated bounce fee penalties.
* **Defaulters Tracking (`/admin/fees/defaulters`)**: Overdue aging brackets with one-click WhatsApp reminder triggers.
* **Concession and Late Fee Rules (`/admin/fees/concessions`, `/admin/fees/late-fee-rules`)**: Automated sibling, staff ward, and RTE discount rules alongside customizable grace periods.
* **Day Close Reconciliation (`/admin/fees/day-close`)**: End-of-day cash drawer balancing, cashier denomination breakdowns, and supervisor lockouts.
* **Financial Reports (`/admin/fees/reports`)**: Itemized collection ledgers, head-wise realizations, and audit trails.

### 5. Transport Fleet and Logistics
* **Vehicle Fleet Roster (`/admin/transport/vehicles`)**: Seating capacity, fuel types, GPS device mapping, and vehicle operational status.
* **Driver and Staff Directory (`/admin/transport/staff`)**: Driver licenses with expiry alerts and contact credentials.
* **Route Builder (`/admin/transport/routes`)**: Interactive Leaflet maps, drag-and-drop stop sequencing, timing schedules, and printable driver route sheets.
* **Distance Fee Zones (`/admin/transport/fee-zones`)**: Flat, slab, and distance-based fare matrices.
* **Student Transport Allocations (`/admin/transport/assign`)**: Stop assignments with vehicle capacity meters and guardian handover verification.

---

## Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/)
* **Language**: [TypeScript 5.8](https://www.typescriptlang.org/)
* **Build Tool and Dev Server**: [Vite 6](https://vitejs.dev/)
* **Routing**: [React Router v7](https://reactrouter.com/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom `@layer base` typography and tokens
* **Icons**: [Lucide React](https://lucide.dev/)
* **Maps**: [Leaflet](https://leafletjs.com/) with `@types/leaflet`
* **Typography**: Plus Jakarta Sans (Headings) and Inter (Body) via Google Fonts
* **Backend Runtime**: [Node.js](https://nodejs.org/) with [Express 4](https://expressjs.com/) and [tsx](https://github.com/privatenumber/tsx)
* **Server Bundler**: [esbuild 0.25](https://esbuild.github.io/)
* **Database and Authentication**: [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS) policies
* **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini 2.5 Flash and Gemini 3.1 Flash TTS)
* **Form Handling**: [Web3Forms](https://web3forms.com/) API

---

## Project Structure

```text
MyZkool/
├── index.html                           # Main HTML entry point with metadata and fonts
├── package.json                         # Dependencies, metadata, and lifecycle scripts
├── tsconfig.json                        # TypeScript compiler options and aliases
├── vite.config.ts                       # Vite bundling, Tailwind v4 plugin, and chunk configuration
├── server.ts                            # Express server, Vite middleware, and Gemini API routes
├── .env.example                         # Example configuration template with documented variables
├── .gitignore                           # Git ignore rules for node_modules, dist, and local secrets
│
├── public/                              # Static public assets
│   ├── favicon.svg                      # Official MyZkool SVG favicon
│   ├── logo.svg                         # Vector logo emblem
│   ├── hero-laptop.png                  # High-resolution dashboard showcase mockup
│   ├── myzkoolp.png                     # Parent mobile app preview mockup
│   ├── Khaqan Ahmad.jpg                 # Founder profile photo
│   ├── Ahiri Naskar.png                 # Co-Founder profile photo
│   ├── Aqsa Ibrahim.jpg                 # Co-Founder profile photo
│   ├── robots.txt                       # Search engine crawler policies
│   └── sitemap.xml                      # Canonical URL sitemap
│
├── src/
│   ├── main.tsx                         # Client application entry point
│   ├── App.tsx                          # Top-level route switch and lazy page definitions
│   ├── index.css                        # Tailwind v4 import, fonts, and animation tokens
│   │
│   ├── components/                      # Reusable UI components
│   │   ├── Navbar.tsx                   # Top navigation with responsive mobile menu
│   │   ├── Hero.tsx                     # Above-the-fold hero section with core pills
│   │   ├── TrustStrip.tsx               # Qualitative trust claims and board badges
│   │   ├── Philosophy.tsx               # Why MyZkool section with visual realization cards
│   │   ├── Features.tsx                 # Detailed 6-card feature grid with mini UI mockups
│   │   ├── Roadmap.tsx                  # Upcoming modules and roadmap timeline
│   │   ├── HowItWorks.tsx               # 4-step guided onboarding explanation
│   │   ├── WhatsAppSpotlight.tsx        # Parent app showcase with animated status badges
│   │   ├── Pricing.tsx                  # 3-tier pricing cards and full comparison table
│   │   ├── FAQ.tsx                      # Collapsible accordion answering school inquiries
│   │   ├── FinalCTA.tsx                 # High-impact conversion section
│   │   ├── Footer.tsx                   # Footer navigation, legal links, and contacts
│   │   ├── DemoModal.tsx                # Interactive demo booking form with Web3Forms
│   │   ├── LoginModal.tsx               # Role-based login selection modal
│   │   ├── LegalModal.tsx               # Privacy policy, terms, refunds, and grievance modal
│   │   ├── AiSchoolAdvisor.tsx          # Floating Gemini AI school advisory chat widget
│   │   ├── MyZkoolLogo.tsx              # Scalable SVG logo component
│   │   ├── admin/                       # Admin layout, sidebar, header, and navigation
│   │   ├── auth/                        # ProtectedRoute, Auth forms, GoogleAuthButton
│   │   └── onboarding/                  # Onboarding layout and progress indicators
│   │
│   ├── pages/                           # Application pages
│   │   ├── LandingPage.tsx              # Main public landing page
│   │   ├── AboutPage.tsx                # Dedicated company story and founder page
│   │   ├── admin/                       # School ERP admin management pages
│   │   │   ├── Dashboard.tsx            # Main operational dashboard
│   │   │   ├── fees/                    # Fee collection, structures, cheques, day-close
│   │   │   ├── students/                # Student directory, 360 profile, wizard, import
│   │   │   ├── transport/               # Vehicles, staff, route builder, fee zones
│   │   │   └── settings/                # Classes and institutional configurations
│   │   ├── auth/                        # Login, registration, password recovery, verification
│   │   ├── onboarding/                  # 8-stage school onboarding pages
│   │   └── public/                      # Parent payment page (`ParentPayPage.tsx`)
│   │
│   ├── context/
│   │   └── AuthContext.tsx              # Supabase auth session and tenant context
│   ├── routes/
│   │   ├── AppRoutes.tsx                # Authenticated and admin route tree
│   │   └── transportRoutes.ts           # Server-side transport endpoints
│   ├── services/                        # Business logic, caching, and database queries
│   ├── types/                           # TypeScript interfaces and domain models
│   ├── utils/                           # Aadhaar validation and cryptographic utilities
│   └── workers/                         # Background notification and sync workers
│
├── docs/                                # Architectural documentation and audits
├── supabase/                            # Database schema migrations with RLS policies
└── tests/                               # Automated end-to-end and unit test suites
```

---

## Getting Started

### Prerequisites

* **Node.js**: Version 18.0.0 or higher (Node 20+ LTS recommended)
* **npm**: Version 9.0.0 or higher

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
   ```bash
   cp .env.example .env
   ```
   Open `.env` in your editor and configure the necessary keys (see [Environment Variables](#environment-variables)).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All supported environment variables are declared in `.env.example`:

| Variable | Description | Required | Example / Default |
| :--- | :--- | :---: | :--- |
| `GEMINI_API_KEY` | Google Gemini AI key for AI Advisor chat and TTS | Optional | `AIzaSy...` |
| `APP_URL` | Application root URL for callbacks and public links | Required | `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Supabase project URL | Required | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous API key | Required | `eyJhbGci...` |
| `PORT` | Local server port | Optional | `3000` |

> **Security Note:** Never commit `.env` or sensitive API keys to source control. Only `.env.example` should be checked into git.

---

## Available Scripts

The following scripts are defined in `package.json`:

* **`npm run dev`**: Starts the development server (`tsx server.ts`) with live reloading and Vite HMR on port 3000.
* **`npm run build`**: Creates a production build of the client application into `dist/` via Vite and bundles `server.ts` into `dist/server.cjs` via esbuild.
* **`npm start`**: Runs the production server (`node dist/server.cjs`).
* **`npm run lint`**: Executes TypeScript compiler type checking (`tsc --noEmit`).
* **`npm run preview`**: Previews the static Vite client build locally.
* **`npm run clean`**: Deletes the `dist/` directory and build artifacts.

---

## Development

* The code is organized into modular directories under `src/`.
* Public pages (`/` and `/about`) are isolated from the authenticated Supabase context to maximize load performance and minimize first paint times.
* The application uses standard React 19 hooks and functional components.
* Styling uses Tailwind CSS v4 with unified design tokens for colors, spacing, and typography.
* Always run `npm run lint` before creating commits to verify TypeScript types.

---

## Production Build

To compile both the client web application and the server runtime for production:

```bash
npm run build
```

This generates:
* `dist/index.html` and optimized client bundles (`dist/assets/`).
* `dist/server.cjs`: Standalone Node.js Express server bundle ready for deployment.

Test the production bundle locally with:
```bash
npm start
```

---

## Deployment

The application is architected to run on any standard Node.js hosting platform or container environment (e.g. AWS ECS, GCP Cloud Run, Render, Railway, DigitalOcean App Platform):

1. **Container / Node Environment**:
   * Set Node environment: `NODE_ENV=production`
   * Run `npm install --omit=dev` (or install all dependencies and run `npm run build`)
   * Start command: `node dist/server.cjs` or `npm start`
2. **Reverse Proxy & HTTPS**:
   * Terminate SSL at your load balancer or reverse proxy (e.g. Cloudflare, Nginx, Caddy).
   * Ensure port 3000 (or the value of `PORT`) is forwarded.
3. **Database Configuration**:
   * Ensure your Supabase project migrations (`supabase/migrations/`) are applied.
   * Provide production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Contributing

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit changes using clear, descriptive commit messages.
3. Ensure `npm run lint` and `npm run build` pass without warnings or errors.
4. Open a pull request against `main`.

---

## License

This project is licensed under the Apache 2.0 License. See the header notices in source files for details.
