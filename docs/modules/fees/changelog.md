# Fee Management — Changelog

## [2.3.0] - Student Fee Management Redesign & Navigation Polish (2026-10-25)

### Changed & Redesigned
- **Student Fee Management Page (`/admin/fees/invoices`) Redesign**:
  - Reorganized page header according to official UI reference:
    - Breadcrumb: `Admin / Fees / Student Fee Management`
    - Main title: **Student Fee Management**
    - Subtitle: `Manage student fee dues, generate term invoices, track payments, and issue receipts.`
    - Header actions: `Send Reminders` (button with paper airplane icon), `Bulk Actions` (dropdown menu with Bulk Generate, Bulk Reminders, Export CSV), and solid blue `+ Collect Fee` (`bg-blue-600 hover:bg-blue-700 text-white`).
  - Removed green `+ Collect Payment` button completely; preserved blue `+ Collect Fee` button as the primary action invoking `CollectFeeDrawer`.
  - Removed horizontal fee sub-navigation bar (`FeeNavHeader`) and the redundant `More` dropdown from this page. Positioned the 7 financial KPI summary cards directly below the page header.
  - Left sidebar navigation remains untouched, preserving direct access to all other fee subroutes (`Overview`, `Fee Structures`, `Invoices`, `Collections`, `Discounts & Concessions`, `Dues & Reminders`, `Reports`).
- **Retired Invoices Register Feature from `/admin/fees/invoices`**:
  - Completely removed the redundant segmented view switcher (`viewMode === "students" | "invoices"`), invoice-only table, and invoice-only pagination controls.
  - Dedicates `/admin/fees/invoices` purely to student fee management, dues tracking, and fee collection.
- **Improved 7 KPI Summary Cards & Student Table**:
  - Styled 7 KPI cards with exact colors, typography, and badges:
    - Total Enrolled (101 across all classes)
    - Structure Assigned (14 active fee structures)
    - Total Billed (₹3,06,200 19 with invoices)
    - Total Collected (₹0 0% collection)
    - Total Pending (₹3,06,200 19 with dues)
    - Overdue Amount (₹2,12,600 19 overdue)
    - Students with Dues (19 18.8% of total)
  - Quick status filter pills: `With Invoices 19`, `Structure Assigned 14`, `Transport Only 5`, `With Dues 19`, `Overdue 19`, `Fully Paid 0`, `All Enrolled 101`.
  - Student table with avatar initials, class/section, fee structure badges, financial columns (Total Billed, Discounts, Amount Paid, Outstanding, Overdue, Next Due Date, Status), `View` pill button opening `StudentFeeLedgerDrawer`, and `...` dropdown menu.
  - Clean pagination matching UI reference (`Showing 1–8 of 19 students`, page buttons, items per page selector).
- **Added Structure Name to CSV Export**:
  - Updated `exportStudentFeeCSV` in `src/services/studentFeeLedgerService.ts` to output `Fee Structure` column.

### Verification & Testing
- Added `tests/test-student-fee-management-page.ts` covering 14 assertions across KPI metrics, filter pills, table resolution, and CSV export (100% green).
- Passed full financial calculation engine test suite (`test-financial-calculation-engine.ts`: 37 passed).
- Passed cross-page financial reconciliation test suite (`test-financial-cross-page-reconciliation.ts`: passed).
- Passed fee dashboard & ledger regression test suite (`test-fee-dashboard-and-ledger-regression.ts`: 20 passed).
- Passed `npm run lint` (`tsc --noEmit`) with 0 errors.
- Passed `npm run build` with clean production bundle in 9.87s.

---

## [2.2.0] - Invoices Management & Dual-View Student Fee Refactor (2026-10-25)

### Added
- **Dual-View Switcher for Invoices Page (`/admin/fees/invoices`)**:
  - **View 1: Student Fee Summaries**: Comprehensive student-wise view with enrolled status, fee structure assignment, gross billed, discounts/concessions, amount paid, net pending, overdue debt, and quick actions (Collect Fee, View Full Ledger, WhatsApp Reminder).
  - **View 2: Invoices Register**: Individual invoice view compiling line items by billing term, invoice numbers, due dates, gross/net/paid/balance amounts, and status badges.
- **Printable Tax Invoice Integration (`InvoiceDetailModal`)**:
  - Integrated `InvoiceDetailModal` directly into the Invoices Register and student ledger workflow.
  - Enabled one-click browser-based printing of official A4 tax invoices with watermarks (PAID, OVERDUE, VOID) and amounts in words.
- **Date Range Filtering in `invoiceService`**:
  - Added `due_date_from` and `due_date_to` parameters to `InvoiceFilters` in `fees.ts`.
  - Implemented date range filtering in `getSchoolInvoices`.
- **Invoices Management Test Suite**:
  - Created `tests/test-invoices-management-and-dual-views.ts` asserting invoice compilation, date range filtering, tax invoice generation, and cross-view financial reconciliation.

### Fixed
- **Invoice Status Overdue vs Partial Precedence Bug**:
  - Fixed a critical accounting bug in `src/services/invoiceService.ts` where partially paid invoices past their due date were incorrectly marked as `"partial"` instead of `"overdue"`.
  - Re-ordered status precedence so that past due dates with positive balance are strictly marked `"overdue"`.
- **Navigation & Layout Alignment**:
  - Integrated `FeeNavHeader` on `InvoicesPage.tsx` to align navigation breadcrumbs and tabs with the rest of the Fee Management module.

---

## [2.1.0] - Production-Ready Refactor & Financial Hardening (2026-10-25)

### Fixed
- **Fixed Vite 404 & HMR Reload Failure**:
  - Investigated and resolved the root cause of `StudentFeeLedgerView.tsx` 404 and Vite HMR failure in `StudentFeeLedgerDrawer.tsx`.
  - Confirmed export signatures and validated live development server (`curl` returned HTTP 200).
  - Verified bundle generation: `dist/assets/StudentFeeLedgerView-VOI34CwC.js` (119.93 kB).
- **Fixed Student & Class Resolution Defects on Fee Dashboard**:
  - Removed erroneous join on `students.class_id` which failed PostgREST schema evaluation.
  - Implemented multi-table query joining `students`, `student_enrollments`, and `classes` with complete fallback to localStorage cache (`myzkool_classes_${schoolId}`).
  - Eliminated generic placeholders (`"Student"`, `"Class"`, `"Admission: —"`) in Recent Collections and Top Pending Dues tables.
- **Fixed Donut Chart Percentage Invariant**:
  - Corrected chart rounding in `DonutChart` component in `FeeDashboard.tsx` to guarantee `cpct + ppct + opct === 100%`.

### Changed & Refactored
- **Dashboard Financial KPI Cards**:
  - Card 2 ("Total Outstanding Dues") now explicitly displays the breakdown between current and overdue debt: `{current} current • {overdue} overdue`.
  - Card 3 ("Overdue Dues") now includes a clear subtitle stating it is a `(Subset of Outstanding)`.
  - Prohibited adding overdue amounts on top of total outstanding obligations.
- **Top Pending Dues Table**:
  - Broadened student name truncation to support long names (`max-w-[140px] sm:max-w-[180px]`).
  - Added student initial avatars and admission numbers.
- **Test Suite Updates**:
  - Added `tests/test-fee-dashboard-and-ledger-regression.ts` validating component exports, financial metrics, and student ledger resolution (20 tests passed).
  - Hardened TypeScript typings for test mock fixtures.

### Scalability & Performance
- Zero TypeScript compiler errors across the codebase (`tsc --noEmit` exited with code 0).
- Production build compiles in 12.38s with zero warnings or errors.
- Documented composite indexing and query plan analysis for 500+ schools.

### Documentation
- Created complete documentation suite in `docs/modules/fees/`:
  - `README.md`
  - `page-architecture.md`
  - `data-flow.md`
  - `database-schema.md`
  - `financial-rules.md`
  - `performance-and-scalability.md`
  - `security-and-permissions.md`
  - `api-and-services.md`
  - `testing-and-qa.md`
  - `troubleshooting.md`
  - `changelog.md`
