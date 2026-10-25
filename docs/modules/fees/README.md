# MyZkool Fee Management Module

## 1. Executive Summary & Module Purpose

The **Fee Management Module** is the core financial engine of MyZkool ERP. It handles tuition assessment, fee structuring, term scheduling, invoice generation, payment collections, receipt generation, student ledger accounting, transport fee integration, concessions, refunds, and multi-dimensional financial reporting across 500+ schools in a strict multi-tenant architecture.

### Key Capabilities
- **Deterministic Financial Engine**: Double-entry style integer paise arithmetic ensuring 0-rounding discrepancies (`balance = net_due - paid`).
- **Student Fee Ledger Drawer**: Comprehensive 8-tab drawer (`overview`, `breakdown`, `ledger`, `invoices`, `payments`, `concessions`, `transport`, `credits`) accessible globally.
- **Cross-Component Reconciliation**: Complete 3-way reconciliation between Dashboard KPI cards, Fee Reports, Dues & Reminders, and the Student Ledger.
- **Multi-Tenant Isolation**: Row-Level Security (RLS) on PostgreSQL tables enforced by `school_id` and Supabase JWT claims.
- **Scalability**: Sub-millisecond aggregation queries, database indexing on high-frequency filters (`school_id, academic_year_id, status, due_date`), and optimistic offline-first caching for high-latency school environments.

---

## 2. Directory Structure & Key Entry Points

```
src/
├── pages/admin/fees/
│   ├── FeeDashboard.tsx           # Primary executive financial dashboard
│   ├── FeeStructuresPage.tsx      # Fee head, term, and structure builder
│   ├── FeeCollectPage.tsx         # Real-time counter payment collection
│   ├── InvoicesPage.tsx           # Bulk & individual invoice manager
│   ├── DuesRemindersPage.tsx      # Defaulters tracking & reminder triggers
│   ├── FeeReportsPage.tsx         # Cross-sectional accounting reports
│   ├── FeeHeadsPage.tsx           # General ledger fee heads & chart of accounts
│   ├── FeeTermsPage.tsx           # Installment calendars & academic periods
│   ├── ConcessionRulesPage.tsx    # Merit, sibling, RTE & custom waiver rules
│   └── LateFeeRulesPage.tsx       # Daily / fixed / slab late fee automation
├── components/admin/fees/
│   ├── StudentFeeLedgerDrawer.tsx # Global drawer container for student ledger
│   ├── studentLedger/             # Modular 8-tab student ledger implementation
│   │   ├── StudentFeeLedgerView.tsx       # Tab controller & orchestrator
│   │   ├── StudentLedgerOverviewTab.tsx   # Executive summary & student meta
│   │   ├── StudentLedgerBreakdownTab.tsx  # Canonical obligation schedule
│   │   ├── StudentLedgerHistoryTab.tsx    # Chronological debit/credit journal
│   │   ├── StudentLedgerInvoicesTab.tsx   # Invoice breakdown & line items
│   │   ├── StudentLedgerPaymentsTab.tsx   # Receipts, methods, & allocations
│   │   ├── StudentLedgerConcessionsTab.tsx# Concession audit trail
│   │   ├── StudentLedgerTransportTab.tsx  # Route, stop, & vehicle charges
│   │   └── StudentLedgerCreditsTab.tsx    # Advance credit balances & offsets
│   ├── CollectFeeDrawer.tsx       # Modal counter collection drawer
│   └── SendRemindersDrawer.tsx    # WhatsApp & SMS reminder drawer
├── services/
│   ├── feeCalculationEngine.ts    # Authoritative integer arithmetic & financial rules
│   ├── studentLedgerService.ts    # Ledger aggregation, balance tracking & journal
│   ├── feeDuesService.ts          # Assessment, generation, and obligation state
│   ├── collectionService.ts       # Payment collection, receipting, & allocation
│   └── feeReportsService.ts       # Cross-page reconciliation & reporting
└── types/
    └── fees.ts                    # Strongly typed domain entities & DTOs
```

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript ~5.8, Tailwind CSS v4, Lucide React icons.
- **Backend / DB**: Supabase (PostgreSQL 15), Row Level Security (RLS), PL/pgSQL triggers.
- **Server**: Node.js Express server (`server.ts`) bundling frontend assets via Vite 6.
- **Testing & Verification**: Node.js + TypeScript (`tsx`) test runners with exact integer paise assertion suites.

---

## 4. Quick Start & Developer Guide

### Running the Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`. Access the fee module at `/admin/fees`.

### Checking Types & Linting
```bash
npm run lint
```
Executes `tsc --noEmit` across all pages, components, services, and tests.

### Running Test Suites
```bash
# 1. Authoritative financial calculation rules
npx tsx tests/test-financial-calculation-engine.ts

# 2. Cross-page mathematical reconciliation
npx tsx tests/test-financial-cross-page-reconciliation.ts

# 3. Student fee ledger redesign & tab verification
npx tsx tests/test-student-fee-ledger-redesign.ts

# 4. Fee collections & counter hardening
npx tsx tests/test-fee-collections-hardening.ts

# 5. Dashboard & module resolution regression
npx tsx tests/test-fee-dashboard-and-ledger-regression.ts
```

### Production Build
```bash
npm run build
```
Generates production-optimized chunks in `dist/` and compiles `dist/server.cjs`.

---

## 5. Documentation Navigation

- [Page Architecture](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/page-architecture.md) — UI component hierarchy, tabs, layout & routing.
- [Data Flow](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/data-flow.md) — Sequence diagrams for billing, collection, and ledger workflows.
- [Database Schema](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/database-schema.md) — Schema definitions, foreign keys, constraints, and RLS policies.
- [Financial Rules](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/financial-rules.md) — Integer paise math, overdue definitions, concessions, and advances.
- [Performance & Scalability](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/performance-and-scalability.md) — Multi-tenant architecture for 500+ schools.
- [Security & Permissions](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/security-and-permissions.md) — Role-based access control and tenant isolation.
- [API & Services](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/api-and-services.md) — Service signatures, inputs, outputs, and cache policies.
- [Testing & QA](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/testing-and-qa.md) — Test suites, assertions, and verification results.
- [Troubleshooting](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/troubleshooting.md) — Vite HMR resolution, 404 repairs, and known edge cases.
- [Changelog](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/fees/changelog.md) — Full changelog of the production-ready refactor.
