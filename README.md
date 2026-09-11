# MyZkool: School Website Builder & Management ERP

> **One platform instead of five disconnected tools.** A complete school website, admissions pipeline, fee collection, attendance register, and exam reporting system built for Indian K-12 schools, with zero IT team required and all parent-facing communication delivered directly over **WhatsApp**.

---

## 🌟 Executive Overview

MyZkool is designed specifically for small and mid-size K-12 schools across India, with a strong focus on institutions in Tier-2 and Tier-3 cities.

- **WhatsApp-First Parent Communication:** Parents never need to download or navigate an extra mobile app. Daily attendance alerts, fee receipts with instant UPI payment links, and urgent weather or bus delay notices arrive directly in their active WhatsApp inbox (98.4%+ open rate).
- **Single Integrated Workspace:** Consolidates fragmented tools (separate website builders, offline Excel registers, SMS gateways, and tally spreadsheets) into a unified, role-based dashboard for Principals, Trustees, Teachers, and Accountants.
- **Affordable & Accessible:** Tiered transparent pricing tailored to Indian school fee structures with 18% GST invoicing for Input Tax Credit (ITC) and a **30-Day Money-Back Guarantee**.
- **DPDP Act, 2023 Compliant:** Engineered from the ground up for Indian data sovereignty, ephemeral document processing, and statutory Grievance Redressal.

---

## 🚀 Key Features

### 1. WhatsApp-First School Management (ERP)

- **Attendance Alerts:** Teachers mark attendance on any smartphone or tablet in under 60 seconds; absent alerts are dispatched automatically to parents' registered WhatsApp numbers.
- **Fee Collection with 1-Click UPI:** Automated fee reminders with embedded UPI payment links (Google Pay, PhonePe, Paytm, BHIM, RuPay). Digital receipts are generated and sent via WhatsApp immediately upon settlement.
- **Report Cards & Exam Analysis:** CBSE, ICSE, and State Board compliant report cards distributed securely to parent chats with PDF download links.
- **Timetable & Staff Management:** Automated substitutions, period scheduling, teacher attendance tracking, and salary disbursement registers.

### 2. Modern School Website Builder

- **Zero-Code School Website:** Ready-to-publish website templates customized for Indian school admissions, achievements, fee structures, and principal messages.
- **Custom Domain & SSL:** Deployable on `yourschool.edu.in` or custom institution domains with automated HTTPS and mobile-optimized layouts.
- **Admissions Enquiry Pipeline:** Real-time lead capture that routes parent admissions queries directly to the school administrative desk.

### 3. Interactive Tools on the Landing Page

- **Interactive School ERP Dashboard:** Sample preview demonstrating the administrative portal (`stmarys-academy.myzkool.in/admin`) with real-time fee tracking, attendance metrics, and quick action bars.
- **Interactive ROI & Savings Calculator:** Allows school trustees to calculate annual hours saved on paperwork, fee realization improvements, and direct monetary savings by replacing fragmented software licenses.
- **AI School Advisor (Beta):** Powered by **Google Gemini 2.5 Flash** (`@google/genai`), school administrators can ask questions in natural language, listen via text-to-speech, or upload photos of existing paper registers to preview automated data mapping.
- **Web3Forms Demo Booking Modal:** Connected directly to the Web3Forms API with spam honeypot filtering, mandatory DPDP Act consent verification, and instant WhatsApp follow-up links.
- **Statutory Legal & Compliance Center:** Integrated modal detailing the DPDP Act Privacy Policy, SaaS Master Terms of Service, Fair Refund Guarantees, and Grievance Redressal disclosures.

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

### Verification & Automated Testing Suite

- **374 Automated Tests Passing** (0 failures) covering subdomain normalization, tenant isolation, RLS policies, billing math, and end-to-end pipeline progression.
- Test suites: `test-school-onboarding.ts`, `test-academic-setup.ts`, `test-classes-subjects.ts`, `test-subscription.ts`, `test-website-setup.ts`, `test-staff.ts`, `test-onboarding-complete.ts`.

---

## 💻 School Admin Dashboard

The unified ERP administration portal (`/admin`) provides the foundation for role-based institutional management.

### Dashboard Architecture

- **Admin Shell Integration:** A shared, responsive `AdminShell` layout providing unified navigation (`Sidebar`), contextual orientation (`AdminHeader`), and authenticated layout contexts for nested modules.
- **Tenant Isolation:** Tenant context is resolved securely via PostgreSQL Row-Level Security (RLS) bound to the authenticated user's `school_id`, never relying on URL parameters or client-side trust.
- **Foundational Routes Setup:**
  - `/admin`: Dashboard Home featuring daily overview metrics, active session identification, quick actions, and activity feeds.
  - Initial scaffolding for upcoming core modules (`/admin/students`, `/admin/attendance`, `/admin/fees`, `/admin/staff`, `/admin/timetable`, `/admin/exams`, `/admin/communication`, `/admin/reports`, `/admin/settings`) using a clean placeholder architecture.

### Responsive Design

- **Desktop:** Persistent multi-module sidebar with quick access to support and user profile actions.
- **Mobile/Tablet:** The UI transforms into an accessible off-canvas drawer system utilizing a hamburger menu and touch-optimized navigation targets.

---

## 🔐 Google Sign-In & Auth Constraints

MyZkool utilizes **Supabase Authentication** mapping to K-12 institutional roles (`school_admin`, `teacher`, `accountant`, etc.).

> **Preview Environment Note:** When developing inside iframe-based preview environments (such as AI Studio), **Google Sign-In is blocked** due to Google's strict `X-Frame-Options: DENY` security policy.
> To test Google Sign-In, you must click the **"Open in new tab"** button in your preview header so the application runs as a top-level window. The application detects iframe rendering and will gracefully prompt you if attempted.

---

## 🛠️ Technology Stack

| Layer                  | Technologies                                                                                               |
| :--------------------- | :--------------------------------------------------------------------------------------------------------- |
| **Frontend**           | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling**            | [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)                                 |
| **Icons & Typography** | [Lucide React](https://lucide.dev/), Plus Jakarta Sans (Headings), Inter (Body)                            |
| **Server / Backend**   | [Express.js](https://expressjs.com/), [Node.js](https://nodejs.org/), Vite SPA middleware                  |
| **Bundler & Compiler** | [esbuild](https://esbuild.github.io/) (CJS server bundle), Vite (Frontend)                                 |
| **AI Integration**     | [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini 2.5 Flash)                     |
| **Lead Routing**       | [Web3Forms](https://web3forms.com/) API                                                                    |

---

## 📁 Project Directory Structure

```text
├── index.html                  # HTML entry point with metadata & SVG favicon
├── metadata.json               # Platform metadata and permission declarations
├── package.json                # Dependencies, scripts, and build configuration
├── server.ts                   # Express server with Vite middleware & Gemini API routes
├── vite.config.ts              # Vite configuration with Tailwind CSS plugin
├── public/
│   ├── favicon.svg             # Official MyZkool SVG favicon
│   └── logo.svg                # Official MyZkool high-resolution vector emblem
└── src/
    ├── App.tsx                 # Main application page layout & modal state
    ├── main.tsx                # React DOM entry point
    ├── index.css               # Tailwind CSS entry point
    ├── types.ts                # Shared TypeScript types and interfaces
    ├── components/
    │   ├── admin/              # Admin dashboard layout components (Sidebar, Header, AdminShell)
    │   ├── auth/               # Authentication components (ProtectedRoute, GoogleAuthButton)
    │   └── ...                 # Landing page & shared components
    ├── pages/
    │   ├── admin/              # Dashboard modules (DashboardHome, ModulePlaceholder)
    │   ├── auth/               # Login, Register, Reset Password
    │   ├── onboarding/         # The 8-stage school onboarding pipeline
    │   └── LandingPage.tsx     # Public marketing website
    ├── services/               # Backend API services (school, subscription, staff, etc.)
    └── hooks/                  # Custom React hooks (useAuth)
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone the repository or open the project workspace:

   ```bash
   git clone <repository-url>
   cd myzkool
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Provide your `GEMINI_API_KEY` for the AI School Advisor features:
   ```env
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```

---

## 📜 Available Scripts

- `npm run dev`: Starts the Express backend with Vite middleware in development mode (`port 3000`).
- `npm run build`: Builds the static frontend via Vite and bundles `server.ts` into a self-contained `dist/server.cjs` file using esbuild.
- `npm start`: Runs the production-compiled server (`dist/server.cjs`).
- `npm run lint`: Validates TypeScript typing without emitting files (`tsc --noEmit`).
- `npm run clean`: Cleans the `dist/` directory and temporary build artifacts.

---

## 🔒 Statutory Compliance & Privacy

- **Digital Personal Data Protection (DPDP) Act, 2023:** Student records, attendance rosters, and financial accounts belong exclusively to the subscribing school. MyZkool operates strictly as a Data Processor.
- **Ephemeral AI Processing:** Photos of registers or sample fee receipts submitted to the AI Advisor are processed in-memory for instant visual structure extraction and are never retained or used to train public foundation models.
- **Grievance Redressal:** Designated Grievance & Data Protection Officer with statutory 24-hour acknowledgment and 15-day resolution windows.

---

## 📞 Official Contacts & Headquarters

- **Headquarters:** MyZkool Technologies, Lucknow, Uttar Pradesh - 226010, India
- **WhatsApp Support:** [+91 95559 54854](https://wa.me/919555954854)
- **Email:** [khaqanbuilds@gmail.com](mailto:khaqanbuilds@gmail.com)
- **Instagram:** [@myzkool](https://www.instagram.com/myzkool)
- **Operating Hours:** Monday to Saturday, 8:00 AM to 7:00 PM IST

---

© 2024 - 2026 MyZkool Technologies. All rights reserved.
