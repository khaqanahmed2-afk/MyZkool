# MyZkool Students Management Module

## 1. Overview & Purpose

The **Students Management Module** (`/admin/students`) is the central operational hub of MyZkool SaaS. It serves school administrators, principals, accountants, teachers, and transport managers in managing student admissions, academic enrollments, parent relationships, compliance documents, fee dues status, transport allocation, bulk operations, and graduation lifecycles.

As a multi-tenant SaaS application designed to scale smoothly to **500+ schools and hundreds of thousands of student records**, the Students module enforces:
- Strict **tenant isolation** via Supabase Row-Level Security (RLS) and server-side authorization.
- Dependent **Class → Section hierarchical filtering** with cross-tenant and mismatch guards.
- Robust **server-side multi-field search** covering student name, admission identifier, parent name, and parent phone.
- **Deterministic server-side pagination** (`sort_by`, `id`) preventing duplicate or skipped records.
- Accurate **summary metrics** computed from real database aggregations and canonical financial ledgers (`student_dues`).
- Zero UI stalls, AbortController request deduplication, and responsive mobile-ready table views.

---

## 2. Main Features & Workflows

1. **Student Directory & Table (`StudentList.tsx`)**:
   - Filterable, searchable, and paginated student directory.
   - Student avatar, name, admission number, SR number, roll number, and enrollment status badge.
   - Primary guardian display with formatted contact details and WhatsApp quick-action.
   - Quick row actions: View Profile, Edit Profile, Collect Fees, Manage Transport, and Delete/Archive.
2. **Strict Dependent Class → Section Filter**:
   - When no class is selected: section dropdown is disabled with a neutral placeholder ("Select a class first") and lists 0 sections.
   - Selecting a class queries only that class's authorized sections.
   - Changing or clearing the class clears the section selection and unloads stale options.
   - Validated on both client and server.
3. **Canonical Financial Summary Cards**:
   - **Total Students**: Total active/non-deleted student population in the school.
   - **Active Enrolled**: Students currently enrolled with status `'enrolled'`.
   - **New Admissions**: Students admitted in the active academic year or with admission type `'new'`.
   - **Pending Fees**: Unique students with outstanding balance (`balance_paise > 0`) in `student_dues`.
4. **Multi-field Search & URL State**:
   - Searches student first name, last name, admission number, SR number, parent full name, and parent phone number.
   - Preserves active search, class, section, status, and dues filters in URL query parameters (`useSearchParams`).
5. **Bulk Operations**:
   - Row-level checkboxes and select-all on active page.
   - Bulk status transition (`enrolled`, `inactive`, `transferred`, `withdrawn`, `passed_out`) with mandatory audit reason.
   - Filtered CSV export honoring active class, section, and search parameters.
   - Direct shortcuts to Bulk Promotion, ID Card Generation, and Transport Assignment.

---

## 3. Module Entry Points & Key Files

| Layer | File Path | Description |
| :--- | :--- | :--- |
| **Page Route** | [`src/pages/admin/students/StudentList.tsx`](file:///c:/Users/yadav/Desktop/MyZkool/src/pages/admin/students/StudentList.tsx) | Main Students management dashboard container |
| **Toolbar & Filters** | [`src/pages/admin/students/StudentFilterChips.tsx`](file:///c:/Users/yadav/Desktop/MyZkool/src/pages/admin/students/StudentFilterChips.tsx) | Class-Section dropdowns, status chips, clear filters |
| **Summary Strip** | [`src/pages/admin/students/StudentSummaryStrip.tsx`](file:///c:/Users/yadav/Desktop/MyZkool/src/pages/admin/students/StudentSummaryStrip.tsx) | Summary metric cards with loading skeletons and retry states |
| **Bulk Actions** | [`src/pages/admin/students/StudentBulkActions.tsx`](file:///c:/Users/yadav/Desktop/MyZkool/src/pages/admin/students/StudentBulkActions.tsx) | Selection bar, status modal, promotion & export triggers |
| **Service (Core)** | [`src/services/studentService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/studentService.ts) | Queries (`listStudents`, `getStudentSummaryMetrics`), audit logs |
| **Service (Ops)** | [`src/services/studentOperationsService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/studentOperationsService.ts) | Status changes, bulk mutations, CSV export, promotion |
| **Service (Curriculum)**| [`src/services/classSectionService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/classSectionService.ts) | Class and section queries (`getSectionsForClass`) |
| **Domain Types** | [`src/types/students.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/types/students.ts) | TypeScript interfaces, pagination params, summary metrics types |

---

## 4. Dependencies & Inter-Module Integrations

- **Academics (`src/types/curriculum.ts`, `classSectionService.ts`)**:
  - Class and Section definitions, teacher allocations, capacities.
- **Fees & Financials (`src/services/feeService.ts`, `student_dues`)**:
  - Student fee dues calculation, ledger balances, fee collection navigation.
- **Transport (`src/services/transportAssignmentService.ts`)**:
  - Active route and stop assignments, auto-termination on student withdrawal.
- **Communication (`src/types/communication.ts`)**:
  - WhatsApp notification triggers, parent contact hydration, outbox queue.
- **Audit Logging (`audit_logs`)**:
  - Mandatory immutable audit trail on student edits, status changes, and deletions.

---

## 5. Local Setup & Testing

Run all student verification and regression suites:

```bash
# 1. Dependent Class-Section filtering, search, pagination, summary metrics
npx tsx tests/test-students-class-section-filtering.ts

# 2. Student list, profile hydration, audit logging, role scoping
npx tsx tests/test-students-list-profile.ts

# 3. Operations, bulk import, promotion pipeline, status change
npx tsx tests/test-students-operations.ts

# 4. TypeScript compilation check
npm run lint
```

---

## 6. Documentation Index

- [Page Architecture & UI Hierarchy](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/page-architecture.md)
- [End-to-End Data Flow](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/data-flow.md)
- [Database Schema & Multi-Tenant Isolation](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/database-schema.md)
- [Filtering & Search Rules](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/filtering-and-search.md)
- [Performance & Scalability Guide (500+ Schools)](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/performance-and-scalability.md)
- [Security, Authorization & Permissions](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/security-and-permissions.md)
- [API & Service Contracts](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/api-and-services.md)
- [Testing & QA Plan](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/testing-and-qa.md)
- [Troubleshooting & Runbook](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/troubleshooting.md)
- [Changelog & Architecture History](file:///c:/Users/yadav/Desktop/MyZkool/docs/modules/students/changelog.md)
