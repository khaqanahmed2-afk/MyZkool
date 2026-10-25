# Students Module: End-to-End Data Flow

## 1. Data Flow Overview

Data in the Students module flows through strict, unidirectional pipelines ensuring full multi-tenant isolation, caching resilience, and audit compliance.

```
[User Action in UI]
       ↓
[React Component / Hook Event Handler]
       ↓
[Service Layer (studentService / classSectionService / studentOperationsService)]
       ↓
[Authorization Guard (Role Perms & Tenant Isolation Scoping)]
       ↓
[Supabase Client (Parameterized Query / RPC / RLS Filtering)]
       ↓
[PostgreSQL Database (Multi-tenant Tables & Canonical Views)]
       ↓
[Response Sanitization & Type Hydration]
       ↓
[Component State Update & React Re-render]
```

---

## 2. Sequence Diagrams

### 2.1 Initial Page Load

```mermaid
sequenceDiagram
    autonumber
    actor User as School Admin
    participant UI as StudentList.tsx
    participant Strip as StudentSummaryStrip.tsx
    participant ClassSvc as classSectionService.ts
    participant StudentSvc as studentService.ts
    participant DB as Supabase / PostgreSQL

    User->>UI: Navigates to /admin/students
    UI->>ClassSvc: getClassesWithSections(schoolId, academicYearId)
    ClassSvc->>DB: SELECT * FROM classes WHERE school_id = $1
    DB-->>ClassSvc: Return school classes
    ClassSvc-->>UI: Populate Class dropdown options

    par Summary Metrics
        UI->>Strip: Mount with loading skeleton
        UI->>StudentSvc: getStudentSummaryMetrics(schoolId, academicYearId)
        StudentSvc->>DB: COUNT(*) FROM students (Total, Enrolled, New Admissions)
        StudentSvc->>DB: SELECT student_id FROM student_dues WHERE balance_paise > 0
        DB-->>StudentSvc: Aggregation counts & unique debtor IDs
        StudentSvc-->>Strip: Hydrate KPI metrics (Total, Enrolled, Admissions, Pending Fees)
    and Student Directory
        UI->>StudentSvc: listStudents(schoolId, { page: 1, limit: 50, sort: created_at desc })
        StudentSvc->>DB: SELECT students + enrollments + parents LIMIT 50 OFFSET 0
        StudentSvc->>DB: SELECT COUNT(*) FROM students WHERE school_id = $1
        DB-->>StudentSvc: 50 Student rows + totalCount
        StudentSvc-->>UI: Render table rows, update pagination total
    end
```

### 2.2 Class Selection Followed by Section Selection

```mermaid
sequenceDiagram
    autonumber
    actor User as School Admin
    participant UI as StudentFilterChips.tsx
    participant Parent as StudentList.tsx
    participant ClassSvc as classSectionService.ts
    participant StudentSvc as studentService.ts
    participant DB as Supabase / PostgreSQL

    Note over UI: User selects Class 10 (id: cls-10)
    UI->>Parent: onFilterChange({ ...filters, class_id: "cls-10", section_id: undefined })
    Parent->>Parent: Abort previous section request (sectionAbortController.abort())
    Parent->>Parent: setSections([]) & setIsLoadingSections(true)
    Parent->>ClassSvc: getSectionsForClass(schoolId, "cls-10", signal)
    ClassSvc->>DB: SELECT * FROM sections WHERE school_id = $1 AND class_id = 'cls-10'
    DB-->>ClassSvc: Sections [10-A, 10-B]
    ClassSvc-->>Parent: return { sections: [...] }
    Parent-->>UI: Enable Section dropdown with [10-A, 10-B]

    Parent->>StudentSvc: listStudents(schoolId, { class_id: "cls-10", page: 1 })
    StudentSvc->>DB: Query students in cls-10
    DB-->>StudentSvc: Filtered students
    StudentSvc-->>Parent: Update table with Class 10 students

    Note over UI: User selects Section 10-A (id: sec-10a)
    UI->>Parent: onFilterChange({ ...filters, section_id: "sec-10a" })
    Parent->>StudentSvc: listStudents(schoolId, { class_id: "cls-10", section_id: "sec-10a", page: 1 })
    StudentSvc->>DB: Validate section belongs to class AND query students
    DB-->>StudentSvc: Students matching Class 10 AND Section 10-A
    StudentSvc-->>Parent: Update table with Class 10-A students
```

### 2.3 Search and Server-Side Pagination

```mermaid
sequenceDiagram
    autonumber
    actor User as School Admin
    participant UI as StudentList.tsx
    participant StudentSvc as studentService.ts
    participant DB as Supabase / PostgreSQL

    User->>UI: Types "Sharma" in search bar
    Note over UI: 300ms Debounce delay
    UI->>UI: Reset page to 1 & sync URL (?search=Sharma)
    UI->>StudentSvc: listStudents(schoolId, { search: "Sharma", page: 1, limit: 50 })
    StudentSvc->>DB: SELECT id, student_parents(student_id) FROM parents WHERE full_name ILIKE '%Sharma%'
    DB-->>StudentSvc: Matched parent student IDs: [std-1, std-4]
    StudentSvc->>DB: SELECT * FROM students WHERE (first_name ILIKE '%Sharma%' OR last_name ILIKE '%Sharma%' OR id IN (std-1, std-4)) LIMIT 50 OFFSET 0
    DB-->>StudentSvc: Matched student records & exact total count
    StudentSvc-->>UI: Display paginated results (Page 1 of 2, 85 total results)
```

### 2.4 Student Export Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as School Admin
    participant UI as StudentList.tsx
    participant OpsSvc as studentOperationsService.ts
    participant DB as Supabase / PostgreSQL

    User->>UI: Clicks "Export CSV" (selected 12 students or full filtered dataset)
    UI->>OpsSvc: exportStudentsList(schoolId, actorId, { class_id, section_id, student_ids: [...] })
    OpsSvc->>DB: Fetch targeted student records + enrollments + parents + classes
    DB-->>OpsSvc: Hydrated tabular dataset
    OpsSvc->>OpsSvc: Generate RFC-4180 compliant CSV string & escape special characters
    OpsSvc-->>UI: Return { csv, count, filename: "students_export_2026-10-25.csv" }
    UI->>User: Initiates browser download (Blob -> ObjectURL -> anchor click)
```
