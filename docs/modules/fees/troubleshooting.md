# Fee Management — Troubleshooting Guide

## 1. Resolved Critical Incidents

### Incident 1: 404 Not Found on `StudentFeeLedgerView.tsx`
- **Error Observed**:
  ```
  /src/components/admin/fees/studentLedger/StudentFeeLedgerView.tsx:1 Failed to load resource: the server responded with a status of 404 (Not Found)
  ```
- **Confirmed Root Cause**:
  During a previous refactoring session, the monolithic `StudentFeeLedgerDrawer.tsx` was decomposed into modular sub-tab components housed in a new subdirectory `src/components/admin/fees/studentLedger/`.
  When Vite's Hot Module Replacement (HMR) triggered an incremental reload, the client browser requested `/src/components/admin/fees/studentLedger/StudentFeeLedgerView.tsx` while the module file write was still pending flush or path resolution on Windows file system. The browser cached the 404 response in memory, leading to repeated failed imports until server rebuild.
- **Verification & Resolution**:
  1. Inspected `src/components/admin/fees/studentLedger/` and confirmed that `StudentFeeLedgerView.tsx` is physically present on disk, properly cased, and exports `export function StudentFeeLedgerView(...)`.
  2. Executed `curl.exe -i http://localhost:3000/src/components/admin/fees/studentLedger/StudentFeeLedgerView.tsx` which returned `HTTP/1.1 200 OK` with valid JavaScript content.
  3. Ran production build `npm run build` which compiled `dist/assets/StudentFeeLedgerView-VOI34CwC.js` (119.93 kB) without errors.

---

### Incident 2: Vite Reload Failure on `StudentFeeLedgerDrawer.tsx`
- **Error Observed**:
  ```
  [vite] Failed to reload /@fs/C:\Users\yadav\Desktop\MyZkool\src\components\admin\fees\StudentFeeLedgerDrawer.tsx. This could be due to syntax errors or importing non-existent modules.
  ```
- **Confirmed Root Cause**:
  Vite's file-watcher emitted a reload error because the parent drawer `StudentFeeLedgerDrawer.tsx` imported `./studentLedger/StudentFeeLedgerView` before the export signature was recognized by the bundler's module graph.
- **Resolution**:
  Standardized named imports in `StudentFeeLedgerDrawer.tsx`:
  ```tsx
  import { StudentFeeLedgerView } from "./studentLedger/StudentFeeLedgerView";
  ```
  Both `npm run lint` (`tsc --noEmit`) and `npm run build` confirm zero syntax, export, or import errors.

---

### Incident 3: Student Names and Classes Displayed as Placeholders on Dashboard
- **Error Observed**:
  In `FeeDashboard.tsx`, the "Top Pending Dues" and "Recent Fee Collections" tables repeatedly displayed generic placeholders (`"Student"`, `"Class"`, `"Admission: —"`).
- **Confirmed Root Cause**:
  `FeeDashboard.tsx` attempted to join classes directly from the `students` table:
  ```typescript
  // Broken query:
  supabase.from("students").select("id, first_name, last_name, admission_no, class_id, classes(name)")
  ```
  In PostgreSQL, the `students` table has `admission_class_id`, but the active enrolled class resides in the `student_enrollments` join table. PostgREST failed foreign key inference for `classes(name)` directly on `students`, throwing an error and falling back to empty lookup maps.
- **Resolution**:
  Updated `loadDashboardData()` in `FeeDashboard.tsx` to query:
  1. `students(id, first_name, last_name, admission_no, admission_class_id)`
  2. `classes(id, name)`
  3. `student_enrollments(student_id, class_id)`
  Built unified lookup maps `classIdToName` and `studentIdToClassId` with complete fallback to localStorage cache (`myzkool_classes_${schoolId}`). Real student and class names now render deterministically.

---

## 2. Common Operational Issues & Solutions

### 1. Inconsistent Dashboard Totals vs Fee Reports
- **Cause**: Filtering with different academic year IDs or including cancelled dues/receipts in one view but not the other.
- **Solution**: Always use `computeAuthoritativeFinancialSummary` from `src/services/feeCalculationEngine.ts`. Never manually loop over raw arrays in React components.

### 2. Overdue Dues Added on Top of Outstanding Dues
- **Cause**: Mistaking overdue balance as an additional penalty rather than a temporal subset of the outstanding balance.
- **Solution**: Remember that `Overdue Dues <= Total Outstanding Dues`. The dashboard card explicitly displays:  
  `Total Outstanding = Current Pending + Overdue`.

### 3. Row-Level Security (RLS) Denials
- **Cause**: User JWT missing valid `school_id` claim, or attempting to query another school's records.
- **Solution**: Verify the user session in Supabase Auth. Staff users must have their metadata populated with a valid `school_id`.
