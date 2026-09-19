# Gap Report: Students Module Audit Against A3, A6, A8

Audit date: 2026-09-20
Status values: `present` (fully implemented and verified), `partial` (structure/logic partly implemented), `missing` (not yet implemented)

---

## 1. Data Model (Spec A3 & 1.7)

| Item | Status | File Path | Note |
|---|---|---|---|
| `students` table | present | `supabase/migrations/007_students_foundations.sql` | Schema with admission_no, aadhaar_enc/last4/hash, RTE flag, status, soft delete, indexes |
| `student_addresses` table | present | `supabase/migrations/007_students_foundations.sql` | Current and permanent address records with student_id, school_id, RLS |
| `parents` table | present | `supabase/migrations/007_students_foundations.sql` | Standalone parents table with unique (school_id, phone) constraint and RLS |
| `student_parents` join table | present | `supabase/migrations/007_students_foundations.sql` | Join table with relation, flags, partial unique index for single primary contact |
| `student_previous_schools` table | present | `supabase/migrations/007_students_foundations.sql` | Prior school history, board, TC details, percentage, reason for leaving |
| `student_achievements` table | present | `supabase/migrations/007_students_foundations.sql` | Student achievements by category, level, year, award |
| `student_documents` table | present | `supabase/migrations/007_students_foundations.sql` | Document Vault table with status, verification, MIME, file size, storage path |
| `document_types` table | present | `supabase/migrations/007_students_foundations.sql` | School-level document types configuration with required_for rules |
| `student_medical` table | present | `supabase/migrations/007_students_foundations.sql` | Dedicated table with independent RLS policy and permission gating |
| `student_events` table | present | `supabase/migrations/007_students_foundations.sql` | Timeline events table for student lifecycle milestones |
| `student_drafts` table | present | `supabase/migrations/007_students_foundations.sql` | Wizard draft autosave with step number and JSONB payload |
| `student_transfer_certificates` table | present | `supabase/migrations/007_students_foundations.sql` | TC records with sequence numbers, dues clearance status, approved_by |
| `import_batches` table | present | `supabase/migrations/007_students_foundations.sql` | Bulk import tracking with row counts, error report path, status |
| `promotion_batches` table | present | `supabase/migrations/007_students_foundations.sql` | Academic year promotion batch tracking with summary JSONB |
| `v_student_siblings` view | present | `supabase/migrations/007_students_foundations.sql` | View joining students sharing parent records |
| `academic_years` table | present | `supabase/migrations/002_academic_years.sql` | Academic calendar cycles with is_current flag and status |
| `classes` table | present | `supabase/migrations/003_classes_sections_subjects.sql` | Grade levels with display_order and stage enum |
| `sections` table | present | `supabase/migrations/003_classes_sections_subjects.sql` | Class sections with capacity and class_teacher_id |
| `student_enrollments` table | present | `supabase/migrations/007_students_foundations.sql` | One enrollment per student per academic year with roll_no, status |
| `counters` table | present | `supabase/migrations/007_students_foundations.sql` | Concurrency-safe sequences for admission_no, receipt_no, tc_no |
| `audit_logs` table | present | `supabase/migrations/007_students_foundations.sql` | Append-only audit trail with actor_id, entity, before/after JSONB |
| `communication_consents` table | present | `supabase/migrations/007_students_foundations.sql` | Parent channel opt-in/opt-out consents (WhatsApp, SMS, email) |
| `notification_outbox` table | present | `supabase/migrations/007_students_foundations.sql` | WhatsApp-first outbox queue with dedupe_key, status, retry tracking |
| `school_plans` table | present | `supabase/migrations/007_students_foundations.sql` | Plan tracking (plan_key, student_limit, features jsonb, billing_status) |

---

## 2. Business Rules & Validations (Spec A6 & 1.5)

| Item | Status | File Path | Note |
|---|---|---|---|
| Admission number unique & immutable | partial | `src/services/studentService.ts` | Unique per school generated from counters; immutable enforcement in update |
| One enrollment per academic year | present | `supabase/migrations/007_students_foundations.sql` | Unique constraint (student_id, academic_year_id) enforced |
| Parent phone uniqueness per school | present | `supabase/migrations/007_students_foundations.sql` | Unique constraint (school_id, phone) enforced; link action provided |
| Exactly one primary contact per student | present | `supabase/migrations/007_students_foundations.sql` | Partial unique index on student_parents where is_primary_contact = true |
| Age validation (warn but not block) | present | `src/services/studentService.ts` | Validates age against class range, returns warning flag without blocking |
| Class capacity warning at 100% | present | `src/services/studentService.ts` | Checks section enrolled count vs capacity, warns at 100% |
| RTE flag and category change audited | present | `src/services/studentService.ts` | Modifying RTE or category writes explicit audit_logs entry |
| Soft delete (archive) with reason | present | `src/services/studentService.ts` | Soft delete via deleted_at/deleted_by/delete_reason, hard deletes blocked |
| Document validation (JPG/PNG/PDF, 5MB) | present | `src/services/studentService.ts` | File extension, size and MIME validation implemented |
| Student count limit enforcement | present | `src/services/studentService.ts` | Enforces Basic (800) and Pro (1,800) active enrolled limits with 90% warning |
| Role scoping in list queries | present | `src/services/studentService.ts` | Scoping by section for teachers, linked children for parents |
| Sensitive documents not exposed publicly | present | `src/services/studentService.ts` | Private storage paths with time-limited signed URL generation |

---

## 3. API Contract (Spec A8)

| Method & Path | Permission | Status | File Path | Note |
|---|---|---|---|---|
| `GET /students` | `students.read` | partial | `src/services/studentService.ts` | listStudents() implemented with filters and cursor pagination; route pending |
| `POST /students` | `students.write` | partial | `src/services/studentService.ts` | admitStudent() transactional admission implemented; route pending |
| `GET /students/:id` | `students.read` | partial | `src/services/studentService.ts` | getStudentProfile() implemented; route pending |
| `PATCH /students/:id` | `students.write` | partial | `src/services/studentService.ts` | updateStudent() implemented with field-level audit; route pending |
| `POST /students/duplicate-check` | `students.write` | partial | `src/services/studentService.ts` | checkDuplicateStudent() matches name, DOB, Aadhaar hash; route pending |
| `POST /students/:id/photo` | `students.write` | partial | `src/services/studentService.ts` | Storage upload handler implemented; route pending |
| `GET/POST /students/:id/documents` | `students.read` / `documents.manage` | partial | `src/services/studentService.ts` | Document Vault listing and upload implemented; route pending |
| `PATCH /students/:id/documents/:docId` | `documents.manage` | partial | `src/services/studentService.ts` | verifyStudentDocument() implemented; route pending |
| `POST /students/:id/reveal-aadhaar` | `students.reveal_sensitive` | partial | `src/services/studentService.ts` | revealAadhaar() requires reason, writes audit_log; route pending |
| `GET/PUT /students/:id/medical` | `medical.read` / `medical.write` | partial | `src/services/studentService.ts` | Medical get/update with permission checks; route pending |
| `POST /students/:id/status` | `status.manage` | partial | `src/services/studentService.ts` | Status change with timeline event; route pending |
| `POST /students/:id/readmit` | `students.write` | partial | `src/services/studentService.ts` | Re-admission service logic implemented; route pending |
| `POST /students/:id/archive` | `students.archive` | partial | `src/services/studentService.ts` | Soft delete with reason; route pending |
| `GET /students/:id/siblings` | `students.read` | partial | `src/services/studentService.ts` | Sibling query via v_student_siblings; route pending |
| `GET/PUT/DELETE /student-drafts` | `students.write` | partial | `src/services/studentService.ts` | Draft save, restore, delete implemented; route pending |
| `GET /parents/lookup?phone=` | `students.write` | partial | `src/services/studentService.ts` | lookupParentByPhone() implemented; route pending |
| `POST /parents/merge` | `students.write` | partial | `src/services/studentService.ts` | Parent merge logic implemented; route pending |
| `POST /students/import/*` | `students.import` | partial | `src/services/studentService.ts` | Import batch validate, commit, rollback logic; route pending |
| `POST /promotions/*` | `students.promote` | partial | `src/services/studentService.ts` | Promotion preview, commit, undo logic; route pending |
| `POST/GET /tc` | `status.manage` | partial | `src/services/studentService.ts` | TC generation with counters; route pending |
| `GET /students/export` | `students.export` | partial | `src/services/studentService.ts` | Masked CSV/XLSX export logic; route pending |

---

## 4. Foundations & Infrastructure (Spec 1.2–1.9, D1)

| Item | Status | File Path | Note |
|---|---|---|---|
| `current_school_id()` SQL helper | present | `supabase/migrations/007_students_foundations.sql` | Returns tenant school_id for authenticated user |
| `has_role(roles text[])` SQL helper | present | `supabase/migrations/007_students_foundations.sql` | Checks user role against role list |
| `school_has_feature(feature text)` | present | `supabase/migrations/007_students_foundations.sql` | Reads school_plans table and returns boolean |
| RLS on every tenant table | present | `supabase/migrations/007_students_foundations.sql` | RLS enabled with school_id tenant isolation policies on all 20+ tables |
| Cross-tenant isolation test harness | present | `tests/test-rls-isolation.ts` | Verifies School A cannot access School B data on all tenant tables |
| Permission keys & role sets (A2) | present | `src/types/students.ts` | Permission keys defined, role mappings from A2 matrix |
| Key-based permission middleware | present | `src/middleware/permissions.ts` | requirePermission() checks permission keys, not role names |
| Feature gating middleware (1.5) | present | `src/middleware/features.ts` | requireFeature() returns HTTP 402 PLAN_REQUIRED |
| Idempotency middleware (1.6) | present | `src/middleware/idempotency.ts` | Validates Idempotency-Key header |
| WhatsApp notification worker (1.9) | present | `src/workers/notificationWorker.ts` | Worker with retry, dedupe_key, consent, quiet-hours, FakeNotificationProvider |
| Service stubs (Spec D1) | present | `src/services/feeService.ts`, `src/services/transportService.ts` | FeeService.getStudentBalance (0), assignStructure (no-op), TransportService.endAssignment (no-op) |
