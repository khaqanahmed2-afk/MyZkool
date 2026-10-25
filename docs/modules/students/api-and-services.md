# Students Module: API and Service Contracts

## 1. Core Service Layer Overview

The Students module is supported by three primary service modules:
1. [`src/services/studentService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/studentService.ts): Querying, filtering, searching, summary metrics, and audit logging.
2. [`src/services/classSectionService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/classSectionService.ts): Class and dependent section lookups.
3. [`src/services/studentOperationsService.ts`](file:///c:/Users/yadav/Desktop/MyZkool/src/services/studentOperationsService.ts): Bulk operations, status changes, promotion, and CSV export.

---

## 2. Service Function Signatures & Contracts

### 2.1 `listStudents`
Retrieves a paginated list of students filtered by class, section, status, dues, and multi-field search.

```typescript
export async function listStudents(
  schoolId: string,
  params?: StudentListParams
): Promise<{ response?: StudentListResponse; error?: string }>
```

- **Parameters (`StudentListParams`)**:
  - `search?: string`: Substring search against student name, admission number, SR number, parent name, parent phone.
  - `class_id?: string`: Filter by assigned class.
  - `section_id?: string`: Filter by assigned section (requires `class_id`).
  - `status?: StudentStatus`: `'enrolled' | 'inactive' | 'transferred' | 'withdrawn' | 'passed_out'`.
  - `has_dues?: boolean`: Filter students with outstanding fee balances (`balance_paise > 0`).
  - `is_new_admission?: boolean`: Filter new admissions.
  - `page?: number`: 1-indexed page number (default: 1).
  - `limit?: number`: Number of records per page (default: 50).
  - `sort_by?: string`: Sort column (default: `'created_at'`).
  - `sort_order?: 'asc' | 'desc'`: Sort direction (default: `'desc'`).
- **Response Shape (`StudentListResponse`)**:
  - `data: StudentListItem[]`: Array of hydrated table items.
  - `total: number`: Exact total matching records in database.
  - `page: number`: Current active page.
  - `limit: number`: Page size limit.
  - `total_pages: number`: Total number of pages.
  - `next_cursor?: string | null`: Cursor for cursor-based pagination.
- **Validation Rules**:
  - Returns error if `section_id` is supplied without `class_id`.
  - Rejects mismatched class and section combinations with empty results.

---

### 2.2 `getStudentSummaryMetrics`
Calculates high-level summary KPIs directly from database counts.

```typescript
export async function getStudentSummaryMetrics(
  schoolId: string,
  academicYearId?: string,
  academicYearStartDate?: string
): Promise<{ metrics?: StudentSummaryData; error?: string }>
```

- **Response Shape (`StudentSummaryData`)**:
  - `totalStudents: number`: Total non-deleted students for the school.
  - `enrolledCount: number`: Active students with `status = 'enrolled'`.
  - `newAdmissionsCount: number`: Students admitted in current academic year.
  - `feePendingCount: number`: Unique students with `balance_paise > 0` in `student_dues`.

---

### 2.3 `getSectionsForClass`
Retrieves sections belonging exclusively to a specific class.

```typescript
export async function getSectionsForClass(
  schoolId: string,
  classId: string,
  signal?: AbortSignal
): Promise<{ sections: SchoolSection[]; error?: string }>
```

- **Behavior**:
  - If `classId` is empty/undefined, immediately returns `{ sections: [] }`.
  - Scoped to `school_id = schoolId AND class_id = classId`.
  - Supports `AbortSignal` for instant cancellation on subsequent class changes.

---

### 2.4 `exportStudentsList`
Generates an RFC-4180 compliant CSV export of student records respecting active filters or selected IDs.

```typescript
export async function exportStudentsList(
  schoolId: string,
  actorId: string,
  filters?: ExportStudentsListFilter,
  actorRole: string = "admin"
): Promise<{ csv: string; count: number; filename: string }>
```

- **Behavior**:
  - Validates `students.export` permission.
  - If `filters.student_ids` is provided, exports only those selected records.
  - Otherwise, exports all students matching the active `class_id`, `section_id`, `status`, and `search` filters.
  - Returns UTF-8 formatted CSV string, record count, and formatted filename (e.g. `students_export_2026-10-25.csv`).

---

### 2.5 `bulkChangeStudentStatus`
Batch updates status for multiple students with mandatory audit logging.

```typescript
export async function bulkChangeStudentStatus(
  schoolId: string,
  studentIds: string[],
  newStatus: StudentStatus,
  reason: string,
  actorId: string,
  actorRole: string = "admin"
): Promise<BulkChangeStudentStatusResult>
```

- **Behavior**:
  - Validates `reason` is non-empty.
  - Automatically handles transport assignment termination on `'withdrawn'` or `'transferred'`.
  - Writes individual status change timeline events and audit logs.
  - Returns `{ success: boolean, updatedCount: number, errors: string[] }`.
