# Remaining Technical Debt & Future Milestones

> **Phase 10 & 11 — Quality Auditor & Handover Findings**  
> **Audited Date:** 2026-11-11

---

## 1. Technical Debt Register

### 1.1 Dual-Environment Gating in `src/middleware/features.ts`
- **Current State:** `features.ts` serves both as an Express backend middleware (`requireFeature`) and a client-side capability check (`checkSchoolFeature`). It contains a guarded check for `typeof localStorage !== "undefined"`.
- **Target Architecture:** Extract the client-side capability checking into a dedicated React hook `useFeatures()` or service `src/services/clientFeatureService.ts`, leaving `src/middleware/features.ts` exclusively responsible for Express HTTP route protection.

### 1.2 Dynamic Student Capacity Enforcement
- **Current State:** `checkStudentLimit()` in `src/middleware/features.ts` returns a hardcoded limit of 800 with `canCreate: true`.
- **Target Architecture:** Replace the stub with a real-time database query `SELECT count(*) FROM students WHERE school_id = $1 AND status = 'active'` compared against `schools.subscription_plan_student_limit`.

### 1.3 Pre-Existing Test Assertion Reconciliation
- **Current State:** 6 test specs in `tests/` exhibit assertion drift on specific mock scenario numbers or template watermark strings.
- **Target Architecture:** Update the 6 test fixtures to match current print templates and ledger scenarios without changing the underlying accounting formulas.

### 1.4 Placeholder Modules (Future Development Roadmap)
The following routes in `AppRoutes.tsx` currently render `ModulePlaceholder.tsx` and represent the future feature roadmap:
- `/admin/academics` (Curriculum & Lesson Planning)
- `/admin/staff` (Full Staff HR & Payroll)
- `/admin/timetable` (Automated Timetable Generator)
- `/admin/exams` (Exam Schedules, Grading & Report Cards)
- `/admin/communication` (WhatsApp & SMS Broadcast Management)
- `/admin/library` (Library Book Inventory & Issue Tracking)
- `/admin/inventory` (School Assets & Stationery Inventory)
