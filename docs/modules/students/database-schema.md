# Students Module: Database Schema and Relationships

## 1. Relational Entity Overview

The Students module is powered by PostgreSQL tables in Supabase with strict tenant isolation, composite foreign keys `(school_id, foreign_key_id)`, and Row-Level Security (RLS).

```
 ┌──────────────────────┐               ┌──────────────────────┐
 │       classes        │               │       schools        │
 ├──────────────────────┤               ├──────────────────────┤
 │ PK  id (uuid)        │◄──────┐       │ PK  id (uuid)        │
 │ FK  school_id (uuid) │       │       └──────────┬───────────┘
 └──────────┬───────────┘       │                  │
            │ 1                 │                  │ 1
            │                   │                  │
            ▼ N                 │                  ▼ N
 ┌──────────────────────┐       │       ┌──────────────────────┐
 │       sections       │       │       │       students       │
 ├──────────────────────┤       │       ├──────────────────────┤
 │ PK  id (uuid)        │       │       │ PK  id (uuid)        │
 │ FK  school_id (uuid) │       │       │ FK  school_id (uuid) │
 │ FK  class_id (uuid)  │       │       │     admission_no     │
 └──────────┬───────────┘       │       │     first_name       │
            │ 1                 │       │     last_name        │
            │                   │       │     status           │
            ▼ N                 │       └──────────┬───────────┘
 ┌──────────────────────────────┴─────┐            │ 1
 │        student_enrollments         │            │
 ├────────────────────────────────────┤            │
 │ PK  id (uuid)                      │            │
 │ FK  school_id (uuid)               │            │
 │ FK  student_id (uuid) ─────────────┼────────────┘
 │ FK  class_id (uuid)                │
 │ FK  section_id (uuid, nullable)    │
 │ FK  academic_year_id (uuid)        │
 │     status (active, promoted, etc.)│
 └────────────────────────────────────┘

 ┌──────────────────────┐               ┌──────────────────────┐
 │       parents        │               │     student_dues     │
 ├──────────────────────┤               ├──────────────────────┤
 │ PK  id (uuid)        │               │ PK  id (uuid)        │
 │ FK  school_id (uuid) │◄──┐           │ FK  school_id (uuid) │
 │     full_name        │   │           │ FK  student_id (uuid)│
 │     phone            │   │           │     balance_paise    │
 └──────────┬───────────┘   │           │     status           │
            │ 1             │           └──────────────────────┘
            │               │
            ▼ N             │
 ┌──────────────────────────┴─────────┐
 │          student_parents           │
 ├────────────────────────────────────┤
 │ PK  id (uuid)                      │
 │ FK  school_id (uuid)               │
 │ FK  student_id (uuid)              │
 │ FK  parent_id (uuid)               │
 │     relation (father/mother/etc)   │
 │     is_primary_contact (boolean)   │
 └────────────────────────────────────┘
```

---

## 2. Table Specifications

### 2.1 `students`
- **Purpose**: Core tenant-scoped student demographic record.
- **Primary Key**: `id` (`uuid DEFAULT gen_random_uuid()`).
- **Foreign Keys**:
  - `school_id REFERENCES schools(id) ON DELETE CASCADE`.
- **Columns**:
  - `admission_no text NOT NULL`: Unique admission number within the school.
  - `sr_no text`: State scholar register number.
  - `first_name text NOT NULL`, `middle_name text`, `last_name text NOT NULL`.
  - `dob date NOT NULL`, `gender text NOT NULL`, `blood_group text`, `nationality text NOT NULL`.
  - `category text`: `'general' | 'obc' | 'sc' | 'st' | 'ews'`.
  - `is_rte boolean DEFAULT false`: Right to Education Act quota flag.
  - `status text DEFAULT 'enrolled'`: `'enrolled' | 'inactive' | 'transferred' | 'withdrawn' | 'passed_out'`.
  - `admission_date date NOT NULL`, `admission_type text NOT NULL`.
  - `deleted_at timestamptz`: Soft-deletion timestamp.
- **Indexes**:
  - `idx_students_school_deleted (school_id, deleted_at)`.
  - `idx_students_admission_no (school_id, lower(admission_no))`.
  - `idx_students_search (school_id, first_name gin_trgm_ops, last_name gin_trgm_ops)`.

### 2.2 `classes`
- **Purpose**: Academic grade levels defined by the school (e.g. Nursery, Class 1 to Class 12).
- **Primary Key**: `id` (`uuid DEFAULT gen_random_uuid()`).
- **Composite Unique**: `UNIQUE(school_id, lower(name))` or `UNIQUE(school_id, academic_year_id, lower(name))`.
- **Columns**: `school_id`, `academic_year_id`, `name`, `display_name`, `sort_order`, `status`.

### 2.3 `sections`
- **Purpose**: Section divisions belonging to a specific class (e.g. Section A, Science, Blue).
- **Primary Key**: `id` (`uuid DEFAULT gen_random_uuid()`).
- **Composite Foreign Key**:
  - `FOREIGN KEY (school_id, class_id) REFERENCES classes(school_id, id) ON DELETE CASCADE`.
- **Columns**: `school_id`, `class_id`, `academic_year_id`, `name`, `capacity`, `class_teacher_id`, `sort_order`, `status`.

### 2.4 `student_enrollments`
- **Purpose**: Links a student to a class and section for an academic year.
- **Primary Key**: `id` (`uuid DEFAULT gen_random_uuid()`).
- **Foreign Keys**:
  - `(school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE`.
  - `(school_id, class_id) REFERENCES classes(school_id, id)`.
  - `(school_id, section_id) REFERENCES sections(school_id, id)`.
- **Columns**: `roll_no`, `status` (`'active' | 'promoted' | 'detained' | 'left' | 'passed_out'`), `enrolled_on`.

### 2.5 `parents` & `student_parents`
- **`parents`**: Guardian identity with `full_name`, `phone`, `email`, `occupation`, `aadhaar_last4`.
- **`student_parents`**: Many-to-many junction with `relation`, `is_primary_contact`, `is_fee_payer`, `can_pickup`.

### 2.6 `student_dues`
- **Purpose**: Canonical source for student fee liability.
- **Columns**: `school_id`, `student_id`, `academic_year_id`, `balance_paise`, `status` (`'pending' | 'partial' | 'paid'`).
- **Pending Fees Rule**: Any student with `balance_paise > 0` and status in `('pending', 'partial')`.

---

## 3. Row-Level Security (RLS) & Multi-Tenant Isolation

All student-related tables have RLS enabled:
```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_dues ENABLE ROW LEVEL SECURITY;
```

Tenant isolation is enforced by the helper function `auth_school_id()`:
```sql
CREATE POLICY "Tenant isolation for students"
ON students FOR ALL
TO authenticated
USING (school_id = auth_school_id())
WITH CHECK (school_id = auth_school_id());
```
Any attempt by a user authenticated under School A to query or mutate records from School B is rejected at the database engine level with zero rows returned or an authorization error.
