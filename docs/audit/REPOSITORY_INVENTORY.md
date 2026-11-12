# MyZkool Repository Inventory
> **Phase 1 — Complete Repository Exploration**  
> **Date:** 2026-11-11  
> **Status:** Complete — No files modified during this phase

---

## 1. Project Identity

| Property | Value |
|----------|-------|
| **Platform** | MyZkool — School ERP + Website Builder SaaS |
| **Version** | 1.6.0 |
| **Description** | Multi-tenant School ERP + Website Builder with WhatsApp-first communication |
| **Target Market** | Schools across India |
| **Repository Root** | `d:\Users\KhaqanLife\Desktop\MyZkool` |
| **Total Files** | ~11,314 (including node_modules) |
| **Source Files (src/)** | ~321 |
| **Migration Files** | 60 |
| **Test Files** | 86 (tests/) + 31 scripts/*.ts |
| **Documentation Files** | 56 |
| **Service Files** | 49 |

---

## 2. Technology Stack (Verified)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend Framework** | React | ^19.0.1 | Latest React with concurrent features |
| **Build Tool** | Vite | ^6.2.3 | NOT Next.js — pure Vite SPA |
| **Backend** | Express.js | ^4.21.2 | Custom Node.js server (`server.ts`) |
| **Language** | TypeScript | ~5.8.2 | Full-stack TS |
| **CSS** | Tailwind CSS | ^4.1.14 | Tailwind v4 (Vite plugin) |
| **Router** | React Router DOM | ^7.18.3 | v7 with lazy loading |
| **Database** | Supabase / PostgreSQL | ^2.116.0 | Multi-tenant with RLS |
| **Payment** | Razorpay | ^2.9.8 | Indian payment gateway |
| **Maps** | Leaflet | ^1.9.4 | Transport route builder |
| **AI** | Google GenAI (`@google/genai`) | ^2.4.0 | AI School Advisor feature |
| **Validation** | Zod | ^4.6.5 | (Note: shared package uses ^3.24.2) |
| **Runtime** | Node.js | (verify .nvmrc) | Via `tsx` for dev |
| **Deployment** | Vercel (presumed) | — | Per project description |

> [!IMPORTANT]
> The architecture is **Vite SPA + Express.js hybrid** — NOT Next.js. The Express server (`server.ts`) serves both API routes and the Vite-built SPA in production. This is a critical architectural distinction.

---

## 3. Root Directory Inventory

| Item | Type | Purpose | Notes |
|------|------|---------|-------|
| `.agent/` | Dir | AI agent workflow configurations | GSD-style agent workflows |
| `.agents/` | Dir | Custom skills for AI agents | Supabase, postgres, planning skills |
| `.claude/` | Dir | Claude AI agent configuration | Adapter docs (CLAUDE.md, GEMINI.md, GPT_OSS.md) |
| `.gemini/` | Dir | Gemini AI configuration | — |
| `.git/` | Dir | Git repository metadata | Preserve — do not touch |
| `.github/` | Dir | GitHub Actions CI/CD workflows | 2 workflows: `ci.yml`, `react-doctor.yml` |
| `.gsd/` | Dir | GSD (Get Stuff Done) framework files | Templates, examples, quick-reference |
| `adapters/` | Dir | AI adapter documentation | CLAUDE.md, GEMINI.md, GPT_OSS.md |
| `agent/` | Dir | AI agent artifacts/state | Context, decisions, journal, plan |
| `dist/` | Dir | **Build output** | Committed to repo — needs review |
| `docs/` | Dir | Documentation | 56 files, mixed quality and organization |
| `node_modules/` | Dir | npm dependencies | Generated — should not be committed |
| `packages/` | Dir | Internal shared packages | `packages/shared/` — zod v3 mismatch |
| `public/` | Dir | Static assets | 15 files: images, favicon, robots.txt, sitemap |
| `reports/` | Dir | Financial audit reports | 11 Markdown report files |
| `scripts/` | Dir | Scripts, tests, backups, images | ⚠️ Mixed content — needs restructuring |
| `src/` | Dir | Application source code | 321 files |
| `supabase/` | Dir | Supabase migrations + scripts | 60 migrations |
| `tests/` | Dir | Automated test suite | 86 TypeScript test files |
| `.env` | File | Local environment variables | ⚠️ Gitignored — verify not committed |
| `.env.example` | File | Environment variable template | 9 variables documented |
| `.gitignore` | File | Git ignore rules | Properly configured |
| `CLAUDE.md` | File | Claude AI instructions | Agent config |
| `FOLDER_STRUCTURE.md` | File | Existing folder doc (root-level) | Outdated — superseded by docs/ |
| `GSD-STYLE.md` | File | GSD workflow style guide | Agent config |
| `index.html` | File | HTML entry point | Vite SPA entry |
| `metadata.json` | File | App metadata | Gemini AI app config |
| `model_capabilities.yaml` | File | AI model capabilities | Agent config |
| `package.json` | File | npm package manifest | Main project deps |
| `package-lock.json` | File | npm lock file | DO NOT DELETE |
| `PROJECT_RULES.md` | File | Development rules | Agent config |
| `razorpay_windows_x86_64.zip` | File | ⚠️ **Razorpay binary** | 4.1 MB — should not be in root |
| `README.md` | File | Main readme | 17KB — comprehensive |
| `SCHEMA.md` | File | Database schema reference | 83KB — large root-level file |
| `server.ts` | File | Express.js backend server | 352 lines — primary backend entrypoint |
| `skills-lock.json` | File | AI skills lock file | Agent config |
| `tsconfig.json` | File | TypeScript config | Root TS config |
| `VERSION` | File | Current version string | "1.6.0" |
| `vite.config.ts` | File | Vite build configuration | Chunk splitting, proxy, aliases |

---

## 4. Source Code (`src/`) Inventory

### 4.1 Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | Vite React entry point |
| `src/App.tsx` | Root React component — smart subdomain routing |
| `src/index.css` | Global CSS |
| `src/vite-env.d.ts` | Vite environment type declarations |

### 4.2 Pages (`src/pages/`)

#### Public Pages
| File | Route | Status |
|------|-------|--------|
| `LandingPage.tsx` | `/` (main domain) | ✅ Active |
| `AboutPage.tsx` | `/about` | ✅ Active |
| `NotFoundPage.tsx` | `*` | ✅ Active |
| `public/PublicSchoolWebsite.tsx` | `/s/:subdomain`, `/school/:subdomain` | ✅ Active |
| `public/ParentPayPage.tsx` | `/pay/:token` | ✅ Active |

#### Auth Pages
| File | Route | Status |
|------|-------|--------|
| `auth/Login.tsx` | `/login` | ✅ Active |
| `auth/Register.tsx` | `/register` | ✅ Active |
| `auth/Verify.tsx` | `/verify` | ✅ Active |
| `auth/ResetPassword.tsx` | `/reset-password` | ✅ Active |

#### Onboarding Pages
| File | Route | Status |
|------|-------|--------|
| `onboarding/SchoolProfile.tsx` | `/onboarding/school-profile` | ✅ Active |
| `onboarding/AcademicSetup.tsx` | `/onboarding/academic-setup` | ✅ Active |
| `onboarding/ClassesSections.tsx` | `/onboarding/classes-sections` | ✅ Active |
| `onboarding/Subscription.tsx` | `/onboarding/subscription` | ✅ Active |
| `onboarding/WebsiteSetup.tsx` | `/onboarding/website-setup` | ✅ Active |
| `onboarding/Complete.tsx` | `/onboarding/complete` | ✅ Active |

#### Admin Pages — Dashboard + Settings
| File | Route | Status |
|------|-------|--------|
| `admin/Dashboard.tsx` | `/admin/dashboard` | ✅ Active |
| `admin/ModulePlaceholder.tsx` | Multiple placeholder routes | ⚠️ Placeholder — modules not yet implemented |
| `admin/settings/ClassesSettings.tsx` | `/admin/settings/classes` | ✅ Active |
| `admin/settings/DataDeletionSettings.tsx` | `/admin/settings/deletion` | ✅ Active |

#### Admin Pages — Students (19 files)
| Area | Files |
|------|-------|
| List & Profile | `StudentList.tsx`, `StudentProfile.tsx`, `StudentBulkImport.tsx` |
| Admission Wizard | `StudentAdmissionWizard.tsx` + 8 step files (Steps 1–8) |
| Operations | `StudentPromotionPipeline.tsx`, `StudentTCRegister.tsx`, `StudentIdCards.tsx` |
| Modals | `DeleteStudentModal.tsx`, `TransferCertificateModal.tsx`, `ImportPreviousBalancesModal.tsx`, `PrintAdmissionForm.tsx` |
| Wizard Support | `StudentAdmissionSuccess.tsx`, `StudentWizardLiveSummary.tsx`, `StudentWizardReview.tsx`, `wizardStepConfig.ts` |
| Bulk/Actions | `AdminTableHeader.tsx`, `StudentBulkActions.tsx`, `StudentColumnChooser.tsx` |
| UI | `StudentFilterChips.tsx`, `StudentRowActions.tsx`, `StudentSummaryStrip.tsx`, `StudentPageHeader.tsx`, `StudentQuickViewDrawer.tsx` |

#### Admin Pages — Fees (19 files)
| File | Purpose |
|------|---------|
| `FeeDashboard.tsx` | Fee analytics dashboard |
| `FeeSetupChecklist.tsx` | Fee configuration wizard |
| `FeeHeadsPage.tsx` | Fee head/category management |
| `FeeTermsPage.tsx` | Term-based fee schedules |
| `FeeStructuresPage.tsx` | Fee structure builder |
| `ConcessionRulesPage.tsx` | Concession/discount management |
| `LateFeeRulesPage.tsx` | Late fee policy management |
| `FeeSettingsPage.tsx` | Receipt/invoice settings |
| `ReceiptPreviewPage.tsx` | Receipt template preview |
| `InvoicesPage.tsx` | Invoice management |
| `InvoiceDetailPage.tsx` | Individual invoice view |
| `FeeCollectionsPage.tsx` | Payment collection records |
| `FeeCollectPage.tsx` | Collect payment UI |
| `StudentLedgerPage.tsx` | Per-student financial ledger |
| `DuesRemindersPage.tsx` | Dues tracking + reminders |
| `ChequeRegisterPage.tsx` | Cheque payment management |
| `RefundsPage.tsx` | Refund processing |
| `DayClosePage.tsx` | Daily close of accounts |
| `FeeReportsPage.tsx` | Financial reports |

#### Admin Pages — Approvals
| File | Purpose |
|------|---------|
| `approvals/ApprovalsPage.tsx` | Workflow approval management |

#### Admin Pages — Transport
| File | Purpose |
|------|---------|
| `transport/TransportDashboard.tsx` | Transport overview |
| `transport/VehiclesPage.tsx` | Fleet management |
| `transport/TransportStaffPage.tsx` | Driver/conductor management |
| `transport/RouteBuilderPage.tsx` | Route + stop builder with Leaflet maps |
| `transport/FeeZonesPage.tsx` | Zone-based transport pricing |
| `transport/BulkAssignPage.tsx` | Bulk student–route assignment |
| `transport/YearRenewalPage.tsx` | Annual transport renewal |

#### Master Admin Pages (13 files)
| File | Purpose |
|------|---------|
| `master-admin/MasterAdminDashboard.tsx` | Platform metrics dashboard |
| `master-admin/MasterAdminSchools.tsx` | School management |
| `master-admin/MasterAdminSchoolDetail.tsx` | Individual school detail |
| `master-admin/MasterAdminSchoolNew.tsx` | Manual school provisioning |
| `master-admin/MasterAdminSubscriptions.tsx` | Subscription management |
| `master-admin/MasterAdminBilling.tsx` | Platform billing |
| `master-admin/MasterAdminUsers.tsx` | Platform user management |
| `master-admin/MasterAdminSupport.tsx` | Support ticket management |
| `master-admin/MasterAdminAnnouncements.tsx` | Platform announcements |
| `master-admin/MasterAdminMonitoring.tsx` | System monitoring |
| `master-admin/MasterAdminAuditLogs.tsx` | Audit log viewer |
| `master-admin/MasterAdminSettings.tsx` | Platform settings |
| `master-admin/MasterAdminLogin.tsx` | Master admin authentication |

---

### 4.3 Components (`src/components/`) — 99 files

| Directory | Count | Purpose |
|-----------|-------|---------|
| `admin/dashboard/` | 9 | KPI cards, charts, widgets for school dashboard |
| `admin/fees/` | 20 | Fee collection drawers, modals, ledger views |
| `admin/fees/concessions/` | 7 | Concession management components |
| `admin/fees/studentLedger/` | 8 | Student financial ledger view |
| `admin/` (root) | 4 | AdminShell, AdminHeader, Sidebar, SchoolSelector |
| `auth/` | 6 | AuthLayout, ProtectedRoute, GoogleAuthButton, etc. |
| `common/` | 2 | ErrorBoundary, MyZkoolLogo |
| `layout/` | 2 | Navbar, Footer (public site) |
| `master-admin/` | 13 | Complete master admin UI shell |
| `onboarding/` | 5 | Onboarding layout + website builder |
| `payment/` | 2 | Razorpay checkout components |
| `sections/` | 14 | Landing page sections (Hero, Features, Pricing, etc.) |
| `ui/` | 3 | Modal components (Demo, Legal, Login) |

> [!NOTE]
> There is a structural concern: some components that are functionally page-level (e.g., `StudentAdmissionWizard`) live in `src/pages/admin/students/` while others of similar scope live in `src/components/admin/`. The organization needs normalization.

---

### 4.4 Services (`src/services/`) — 49 files

#### Financial Services (Core Business Logic)
| Service | Purpose |
|---------|---------|
| `feeService.ts` | Core fee management |
| `feeCalculationService.ts` | Fee computation engine |
| `feeSetupService.ts` | Fee head/structure setup |
| `feeDashboardService.ts` | Dashboard aggregations |
| `feeDuesService.ts` | Dues tracking |
| `feeCollectionsQueryService.ts` | Collection queries |
| `feeReportsService.ts` | Financial reports |
| `invoiceService.ts` | Invoice lifecycle management |
| `collectionService.ts` | Payment collection |
| `concessionService.ts` | Concession/discount rules |
| `approvalService.ts` | Workflow approvals |
| `chequeService.ts` | Cheque payment tracking |
| `refundService.ts` | Refund processing |
| `dayCloseService.ts` | Day-end accounting |
| `yearCloseService.ts` | Year-end accounting |
| `studentFeeLedgerService.ts` | Per-student ledger |
| `previousFeeBalanceService.ts` | Opening balance imports |

#### Student Services
| Service | Purpose |
|---------|---------|
| `studentService.ts` | Student CRUD + operations |
| `studentOperationsService.ts` | Bulk operations, promotion |
| `classSectionService.ts` | Class/section management |
| `subjectService.ts` | Subject management |
| `academicService.ts` | Academic year management |

#### Transport Services
| Service | Purpose |
|---------|---------|
| `transportService.ts` | Main transport facade |
| `transportCoreService.ts` | Vehicle/route/stop management |
| `transportAssignmentService.ts` | Student–route assignments |

#### School & Auth Services
| Service | Purpose |
|---------|---------|
| `schoolService.ts` | School profile management |
| `staffService.ts` | Staff management |
| `subscriptionService.ts` | School plan/subscription |
| `planService.ts` | Plan definitions |
| `websiteService.ts` | Website builder |
| `auth/` | Authentication helpers |
| `parentAuth.ts` | Parent payment auth |
| `deletionService.ts` | GDPR-compliant data deletion |

#### Master Admin Services (8 files)
| Service | Purpose |
|---------|---------|
| `masterAdminDashboardService.ts` | Platform metrics |
| `masterAdminSchoolService.ts` | School management |
| `masterAdminSubscriptionService.ts` | Subscription management |
| `masterAdminBillingService.ts` | Platform billing |
| `masterAdminSupportService.ts` | Support tickets |
| `masterAdminAuditService.ts` | Audit log access |
| `masterAdminMonitoringService.ts` | System monitoring |
| `masterAdminSettingsService.ts` | Platform settings |

#### Payment Services
| Service | Purpose |
|---------|---------|
| `razorpayService.ts` | Razorpay integration |
| `onlinePaymentService.ts` | Online payment processing |
| `paymentGateway/` | Payment gateway adapters |

#### Background Jobs
| Service | Purpose |
|---------|---------|
| `lateFeeJob.ts` | Automated late fee calculation |
| `reminderJob.ts` | Fee reminder scheduling |
| `ledgerIntegrityJob.ts` | Ledger consistency checks |
| `adminDashboardService.ts` | (note: separate from master admin) |

---

### 4.5 Routes (`src/routes/`)

| File | Purpose |
|------|---------|
| `AppRoutes.tsx` | Main React Router route tree (all app routes) |
| `transportRoutes.ts` | Express transport API routes |
| `razorpayRoutes.ts` | Express Razorpay webhook/checkout routes |
| `deletionRoutes.ts` | Express GDPR deletion routes |
| `masterAdminAuthRoutes.ts` | Express master admin auth |
| `masterAdminAnnouncementRoutes.ts` | Express announcements |
| `masterAdminBillingRoutes.ts` | Express billing |
| `masterAdminDashboardRoutes.ts` | Express dashboard |
| `masterAdminMonitoringRoutes.ts` | Express monitoring |
| `masterAdminSchoolRoutes.ts` | Express school management |
| `masterAdminSettingsRoutes.ts` | Express settings |
| `masterAdminSubscriptionRoutes.ts` | Express subscriptions |
| `masterAdminSupportRoutes.ts` | Express support |
| `masterAdminUserRoutes.ts` | Express user management |
| `api/` (10 files) | Express API route handlers (master admin) |

---

### 4.6 Middleware (`src/middleware/`)

| File | Purpose |
|------|---------|
| `auth.ts` | JWT validation + multi-tenant school context resolution |
| `masterAdminAuth.ts` | Separate master admin JWT validation |
| `features.ts` | Feature gating by subscription plan |
| `permissions.ts` | Role-based permission enforcement |
| `audit.ts` | Action audit logging |
| `errorHandler.ts` | Centralized Express error handling |

---

### 4.7 Context (`src/context/`)

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | School user auth state (Supabase session) |
| `MasterAdminAuthContext.tsx` | Master admin auth state (separate JWT) |

---

### 4.8 Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useAuth.ts` | Auth state hook |
| `useDisclosure.ts` | Modal open/close helper |
| `useLandingModals.ts` | Landing page modal management |
| `usePageMetadata.ts` | SEO meta tags per page |
| `index.ts` | Hook exports barrel |

---

### 4.9 Types (`src/types/`)

| File | Purpose |
|------|---------|
| `academic.ts` | Academic year, class, section types |
| `auth.ts` | User, session, role types |
| `collection.ts` | Payment collection types |
| `curriculum.ts` | Curriculum-related types |
| `deletion.ts` | Data deletion types |
| `duesReminders.ts` | Dues reminder types |
| `feeOperations.ts` | Fee operation types |
| `fees.ts` | Fee structure, head, term types |
| `landing.ts` | Landing page content types |
| `masterAdmin.ts` | Master admin-specific types |
| `onlinePayment.ts` | Online payment types |
| `school.ts` | School profile types |
| `staff.ts` | Staff member types |
| `studentFeeLedger.ts` | Student ledger entry types |
| `students.ts` | Student profile types |
| `subscription.ts` | Subscription plan types |
| `transport.ts` | Transport vehicle, route, stop types |
| `website.ts` | Website builder types |
| `index.ts` | Type exports barrel |

---

### 4.10 Utilities (`src/utils/`)

| File | Purpose |
|------|---------|
| `aadhaarValidation.ts` | Indian Aadhaar number validation |
| `encryption.ts` | Data encryption utilities |
| `sensitiveCrypto.ts` | Sensitive data cryptographic operations |

---

### 4.11 Library (`src/lib/`)

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client singleton with clock-skew fix |
| `amountInWords.ts` | Indian number-to-words conversion (for receipts) |
| `feeAllocation.ts` | Fee allocation calculation logic |
| `invoiceTemplate.ts` | Invoice PDF/print template |
| `receiptTemplate.ts` | Receipt PDF/print template |

---

### 4.12 Workers (`src/workers/`)

| File | Purpose |
|------|---------|
| `jobWorker.ts` | Background job execution worker |
| `notificationWorker.ts` | Notification dispatch worker |

---

### 4.13 Constants (`src/constants/`)

| File | Purpose |
|------|---------|
| `auth.ts` | Auth-related constants |
| `plans.ts` | Subscription plan definitions |
| `subdomains.ts` | Reserved/unavailable subdomain list |
| `theme.ts` | UI theme constants |
| `index.ts` | Constants barrel export |

---

### 4.14 Data (`src/data/`)

| File | Purpose |
|------|---------|
| `landingData.ts` | Landing page content (features, pricing, testimonials) |
| `aboutData.ts` | About page content |
| `index.ts` | Data exports barrel |

---

### 4.15 Styles (`src/styles/`)

| File | Purpose |
|------|---------|
| (directory exists) | Custom CSS beyond Tailwind utilities |

---

### 4.16 Shared Package (`packages/shared/src/`)

| File | Purpose |
|------|---------|
| `constants.ts` | Shared constants |
| `permissions.ts` | Shared permission definitions |
| `schemas.ts` | Shared Zod validation schemas |
| `types.ts` | Shared TypeScript types |
| `index.ts` | Barrel export |

> [!WARNING]
> `packages/shared` declares `zod: "^3.24.2"` while the main project uses `zod: "^4.6.5"`. These are API-incompatible versions. Any schemas in the shared package using zod v3 syntax will break if imported by the main application code using zod v4.

---

## 5. Database (`supabase/migrations/`) — 60 Migrations

### Sequential Migrations (001–024) — Original Foundation
| Migration | Subject |
|-----------|---------|
| 001 | Schools and onboarding |
| 002 | Academic years |
| 003 | Classes, sections, subjects |
| 004 | Subscriptions |
| 005 | Website setup |
| 006 | Staff |
| 007 | Students foundations |
| 008 | Students sensitive data + records |
| 009 | Students operations |
| 010 | Fees |
| 011 | Fee collection |
| 012 | Fee operations |
| 013 | Online payments |
| 014 | Transport core |
| 015 | Transport assignments |
| 016 | Fix students RLS authorization |
| 017 | Fee cycle terms |
| 018 | Fix subscription + feature gating |
| 019 | Reusable fee structures |
| 020 | Student bulk import RPC |
| 021 | Student drafts unique index |
| 022 | Multi-tenant isolation hardening |
| 023 | Phase 0 foundations reconcile |
| 024 | School subscription payments |

### Timestamped Migrations (2026xxxx) — Feature & Hardening Iterations
| Migration | Subject |
|-----------|---------|
| 20260920120000 | Onboarding v2 simplification |
| 20261012180000 | School onboarding upgrade |
| 20261013000000 | Academic years calendar range update |
| 20261013010000 | Fix profiles RLS + immutability |
| 20261013020000 | School assets storage |
| 20261013030000 | Admission enquiries |
| 20261013040000 | Transport staff Aadhaar encryption |
| 20261016080000 | Secure counters + admission number standardization |
| 20261016090000 | Transport production hardening |
| 20261016100000 | Route stop pricing |
| 20261016110000 | Student concessions workflow |
| 20261016120000 | Fee reminder templates + tracking |
| 20261016130000 | Fee structures production hardening |
| 20261016140000 | Fix nursery fee structure data |
| 20261016150000 | Fee collections real data hardening |
| 20261016160000 | Fee structure auto-assignment |
| 20261016190000 | Phase 2b invoice reliability + integrity |
| 20261016200000 | Phase 2c financial calculation hardening |
| 20261017220000 | Fee architecture refactor |
| 20261017220000_rollback | Fee architecture refactor **rollback** |
| 20261017230000 | Transport billing hardening |
| 20261017230000_rollback | Transport billing hardening **rollback** |
| 20261025070000 | Fee + receipt settings rebuild |
| 20261026000000 | Complete data purge + account deletion |
| 20261026020000 | Invoice system upgrade |
| 20261027170000 | Fee dashboard performance + aggregation |
| 20261027180000 | Fee structures workflow + lifecycle hardening |
| 20261027190000 | Student fee management RPC |
| 20261027200000 | Fee collections management RPC |
| 20261027210000 | Student billing ledger reconciliation |
| 20261027220000 | Invoice + receipt settings enhancements |
| 20261106090000 | Master admin foundation |
| 20261106100000 | Subscription invoices |
| 20261106110000 | Support tickets |
| 20261106120000 | Platform announcements + settings |
| 20261107000000 | Platform cross-tenant access |

### Supabase Scripts
| File | Purpose |
|------|---------|
| `supabase/scripts/phase2d_historical_repair.sql` | Historical data repair script |

> [!NOTE]
> Two rollback scripts exist (`20261017220000_fee_architecture_refactor_rollback.sql` and `20261017230000_transport_billing_hardening_rollback.sql`). These are intentional safety rollback scripts, not duplicates.

> [!NOTE]
> `phase2d_historical_repair.sql` in `supabase/migrations/` root is **not** in the `migrations/` subdirectory — it may not be tracked by Supabase CLI. Needs verification.

---

## 6. Tests Inventory

### `tests/` Directory — 86 TypeScript Test Files

Organized by domain:

| Domain | File Count | Examples |
|--------|-----------|---------|
| Fee Management | ~25 | `test-fee-structures-hardening.ts`, `test-fee-collections-hardening.ts` |
| Student Management | ~15 | `test-students-wizard.ts`, `test-student-billing-ledger.ts` |
| Transport | ~6 | `test-transport-production-flow.ts`, `test-route-stop-pricing.ts` |
| Security/RLS | ~4 | `test-rls-isolation.ts`, `test-cross-tenant-isolation-exhaustive.ts` |
| Invoices | ~8 | `test-invoice-system-upgrade.ts`, `test-invoices-lifecycle.ts` |
| Master Admin | ~6 | `test-phase1-master-admin-auth.ts`, `test-phase3-school-management.ts` |
| Phase Integration Tests | ~12 | `test-phase0-auth.ts` through `test-phase7-8-settings-monitoring-audit.ts` |
| Misc | ~10 | `test-encryption-app-master-key.ts`, `test-subscription.ts` |

### `scripts/` TypeScript Test Files — 31 Additional Test Files

| File | Purpose |
|------|---------|
| `audit_financial_calculations.ts` | Financial calculation audit |
| `audit_invoices_db.ts` | Invoice DB audit |
| `audit_phase2c_historical_dry_run.ts` | Historical data dry-run audit |
| `test_billing_cycles.ts` | Billing cycle tests |
| `test_browser_login.ts` | Browser-based login test |
| `test_dues_reminders.ts` | Dues reminder tests |
| `test_fee_structures.ts` | Fee structure tests |
| `test_invoices.ts` | Invoice tests |
| `test_razorpay.ts` | Razorpay integration test |
| `test_subscription_razorpay.ts` | Subscription + Razorpay test |
| `verify_dashboard_redesign.ts` | Dashboard UI verification |
| `verify_landing_ctas.ts` | Landing page CTA verification |
| `verify_login_production.ts` | Login production verification |
| `verify_website_production.ts` | Website production verification |
| + 17 more | Various database inspection, diagnosis, and verification scripts |

---

## 7. `scripts/` Directory — Notable Mixed Content

The `scripts/` directory contains **heterogeneous content** that should be organized:

| Content Type | Files | Notes |
|-------------|-------|-------|
| Operational scripts | `create_backup.cjs`, `create_post_repair_backup.cjs`, `optimize-images.cjs`, `recover_financial_tables.cjs` | Node.js CJS scripts |
| Test runner | `run_all_tests.mjs`, `run_all_tests.py` | Test orchestration |
| Diagnostic TS scripts | `diagnose_page_mount.ts`, `inspect_db_schema.ts`, `inspect_exact_data.ts`, `inspect_known_schools.ts` | Development diagnostics |
| Validation scripts | `validate-agents.ps1/.sh`, `validate-all.ps1/.sh`, `validate-encoding.ps1/.sh`, etc. | PowerShell/Bash |
| Search scripts | `search_repo.ps1/.sh`, `setup_search.ps1/.sh` | Repository search utilities |
| **Financial backups** | `phase2b_financial_backup_pre.json` (401 KB), `phase2b_financial_recovery.sql` (462 KB), `phase2d_post_repair_live_backup_20261017.json` (686 KB), `phase2d_pre_commit_backup_20261017.json` (401 KB) | ⚠️ **May contain real production data** |
| **Student data** | `peace_convent_students.json` (27 KB) | ⚠️ **May contain real student PII** |
| **UI Screenshots** | 28 PNG files (various screen sizes) | Dashboard, navbar, cards screenshots |
| Python scripts | `parse_spec.py`, `run_all_tests.py`, `spec.sh` | Mixed Python/shell |
| Misc | `audit_financial_calculations.ts`, `generate_phase2c_report.ts`, etc. | Audit utilities |

> [!CAUTION]
> The files `peace_convent_students.json`, `phase2b_financial_backup_pre.json`, `phase2d_post_repair_live_backup_20261017.json`, and `phase2d_pre_commit_backup_20261017.json` may contain real personally identifiable information (PII) or financial data. These must be verified against gitignore rules and not committed to public repositories.

---

## 8. Documentation (`docs/`) — 56 Files

### Top-level docs files (mixed dates/authors)
| File | Date | Notes |
|------|------|-------|
| `ARCHITECTURE.md` | Apr 2026 + Nov 6 | Duplicate name in root and master-admin/ |
| `CLEANUP_CHANGELOG.md` | Nov 5 | Cleanup history |
| `DATABASE_AUDIT_REPORT.md` | Nov 5 | Database audit |
| `DEPENDENCY_AUDIT.md` | Nov 5 | Dependency analysis |
| `FINAL_VERIFICATION_REPORT.md` | Nov 7 | Verification report |
| `FOLDER_STRUCTURE.md` | Nov 5 | Folder structure doc |
| `gap-report.md` | Apr 2026 | Gap analysis |
| `LOGIN_PAGE_PRODUCTION_REPORT.md` | Nov 7 | Production login audit |
| `MASTER_ADMIN_*.md` (6 files) | Nov 6-7 | Master admin implementation docs |
| `MULTI_TENANT_ARCHITECTURE_AUDIT.md` | Apr 2026 | Tenant isolation audit |
| `PRODUCTION_READINESS_REPORT.md` | Nov 7 | Production readiness |
| `REPOSITORY_AUDIT_REPORT.md` | Nov 5 | Repository audit |
| `SECURITY_AUDIT_REPORT.md` | Nov 5 | Security audit |
| `SEO_IMPLEMENTATION_REPORT.md` | Nov 7 | SEO audit |
| `UI_UX_IMPROVEMENTS.md` | Nov 7 | UI improvements |
| `VERIFICATION_REPORT.md` | Nov 5 | Verification |
| `WEBSITE_AUDIT_REPORT.md` | Nov 7 | Website audit |

### `docs/master-admin/` (6 files)
Master admin implementation architecture, API design, security model, etc.

### `docs/modules/fees/` (10 files)
Fee module detailed documentation — changelog, schema, API, security, troubleshooting.

### `docs/modules/students/` (10 files)
Student module detailed documentation — same structure as fees.

> [!NOTE]
> There are **duplicate filenames** in the docs directory. For example, `ARCHITECTURE.md` appears both at `docs/ARCHITECTURE.md` (Apr 2026) and `docs/ARCHITECTURE.md` (Nov 6 version). Similarly, `docs/CLEANUP_CHANGELOG.md` and `docs/CHANGELOG.md` may overlap. These need deduplication.

---

## 9. Configuration Files

| File | Purpose | Priority |
|------|---------|----------|
| `package.json` | npm config + scripts | Critical |
| `package-lock.json` | Exact dependency versions | Critical — do not delete |
| `tsconfig.json` | TypeScript compiler config | Critical |
| `vite.config.ts` | Vite build config | Critical |
| `.env.example` | Environment template | Important |
| `.gitignore` | Git ignore rules | Important |
| `server.ts` | Backend server | Critical |
| `index.html` | Vite SPA entry | Critical |
| `.github/workflows/ci.yml` | GitHub CI | Important |
| `.github/workflows/react-doctor.yml` | React health check CI | Important |
| `metadata.json` | Gemini app config | Agent config |
| `model_capabilities.yaml` | AI model config | Agent config |
| `skills-lock.json` | AI skills lock | Agent config |
| `CLAUDE.md` | Claude instructions | Agent config |
| `GSD-STYLE.md` | GSD workflow guide | Agent config |
| `PROJECT_RULES.md` | Development rules | Agent config |

---

## 10. AI Agent Configuration Files

The repository has an unusually rich set of AI coding agent configurations:

| Directory | Agent | Purpose |
|-----------|-------|---------|
| `.agent/` | GSD Agent | Workflow commands (plan, execute, audit, etc.) |
| `.agents/` | Multi-agent | Skills library (codebase-mapper, debugger, planner, supabase, etc.) |
| `.claude/` | Claude Code | Adapter documentation |
| `.gemini/` | Gemini | Gemini agent config |
| `adapters/` | Multiple | CLAUDE.md, GEMINI.md, GPT_OSS.md — agent adapter docs |
| `agent/` | GSD | Active GSD project context |
| `.gsd/` | GSD | GSD framework templates + examples |
| `CLAUDE.md` (root) | Claude Code | Root-level Claude instructions |

> [!NOTE]
> This level of agent configuration is intentional and should be preserved. These are the developer's AI-assisted workflow configurations.

---

## 11. Key Architectural Findings

### 11.1 Architecture Pattern: Hybrid SPA + Express

The app uses a **hybrid architecture**:
- **Frontend:** React 19 SPA built by Vite (`src/`)
- **Backend:** Express.js server (`server.ts`) serving:
  - API routes for transport, Razorpay, deletion, master admin
  - Gemini AI proxy endpoint
  - Demo request capture
  - Subdomain-based school routing
  - Static file serving (Vite build output) in production

### 11.2 Routing Strategy

```
/ (root)              → LandingPage (or PublicSchoolWebsite if subdomain)
/about               → AboutPage
/s/:subdomain        → PublicSchoolWebsite
/school/:subdomain   → PublicSchoolWebsite
/pay/:token          → ParentPayPage (no auth)
/login, /register... → Auth pages (lazy, Supabase loaded here)
/onboarding/*        → Onboarding wizard (ProtectedRoute)
/admin/*             → School admin panel (ProtectedRoute)
/master-admin/*      → Platform control plane (MasterAdminRoute)
```

### 11.3 Multi-Tenant Isolation Model

- **Frontend:** `useAuth` hook reads `school_id` from Supabase session; all service calls scoped to `school_id`
- **Backend:** `requireSchoolContext` middleware resolves `school_id` exclusively from verified JWT + profiles table
- **Database:** PostgreSQL Row-Level Security (RLS) policies on every tenant table
- Two separate auth systems:
  1. **School Admin Auth:** Supabase Auth (email/password + Google OAuth)
  2. **Master Admin Auth:** Separate JWT-based system (`masterAdminAuth.ts`)

### 11.4 Notable Concerns Requiring Follow-up

| Concern | Location | Severity |
|---------|----------|----------|
| Zod version mismatch (v3 vs v4) | `packages/shared/package.json` | High |
| `razorpay_windows_x86_64.zip` in repo root | Root | Medium |
| `dist/` committed to Git | Root | Medium |
| Potential PII in `scripts/backups/` | `scripts/backups/*.json` | High |
| `phase2d_historical_repair.sql` not in migrations/ subdir | `supabase/migrations/` root | Medium |
| Mixed content in `scripts/` | `scripts/` | Medium |
| Duplicate doc filenames | `docs/` | Low |
| `ModulePlaceholder` for academics, staff, exams, etc. | `AppRoutes.tsx` | Low (by design) |
| `checkStudentLimit()` returns hardcoded values | `src/middleware/features.ts` | Medium |
| `localStorage` check in backend middleware | `src/middleware/features.ts` | High — Backend code should not reference `localStorage` |

---

## 12. Summary Statistics

| Category | Count |
|----------|-------|
| Total repo files | ~11,314 |
| Source files (`src/`) | 321 |
| Supabase migrations | 60 |
| Test files (`tests/`) | 86 |
| Test/diagnostic scripts (`scripts/*.ts`) | 31 |
| Service files | 49 |
| Component files | 99 |
| Page files | 97 |
| Documentation files | 56 |
| Environment variables required | 9 |
| Active modules (implemented) | 7 (Students, Fees, Transport, Website, Auth, Onboarding, Master Admin) |
| Placeholder modules | ~8 (Academics, Staff, Exams, Timetable, Communication, Library, Inventory, Reports) |

---

*Phase 1 Complete. No files were modified, moved, or deleted during this phase.*  
*Next: Phase 2 — File Classification*

