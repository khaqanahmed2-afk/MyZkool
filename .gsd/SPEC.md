# SPEC.md — MyZkool Admin Attendance Management System

> **Status**: `FINALIZED`
>
> **Module**: Attendance Management (Admin Panel v1.0)
> **PRD Source**: MyZkool – Admin Attendance Management System Product Requirements Document v1.0

## Vision
The MyZkool Attendance Management System is a centralized, multi-tenant digital attendance solution that enables school administrators to record, manage, monitor, and analyze student attendance digitally. It eliminates manual attendance paper registers and provides schools with accurate, secure, auditable, and easily accessible attendance records.

## Goals
1. **Digitize student attendance records** with fast, reliable manual and QR-based attendance recording.
2. **Centralized administration** with class-wise and section-wise enrollment lookups for the active academic year.
3. **Prevent duplicate & invalid entries** with database-level uniqueness constraints and server-side validation.
4. **Audit trail & correction management** allowing administrative corrections with logged reasons, user attribution, and timestamps.
5. **Real-time dashboard & reporting** calculating live statistics, class summaries, daily/monthly/student reports, and CSV/printable exports.
6. **Multi-tenant isolation & security** ensuring complete separation between schools with server-side validation and RLS policies.
7. **Future-proof architecture** designing underlying tables, business logic, and APIs to cleanly support future Teacher Web App access without re-architecting.

## Non-Goals (Out of Scope for Phase 1)
- Separate Teacher Web App (reserved for Phase 2).
- Native Android APK / Mobile App builds.
- Parent attendance portal & parent push/WhatsApp notifications.
- GPS-based attendance / Geo-fencing.
- Facial recognition / Biometric hardware integration.
- Hardware school-gate turnstiles.
- Offline attendance peer-to-peer sync.
- Advanced predictive ML attendance analytics.

## Constraints
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide React icons, React Router v7.
- **Backend**: Express 4 (`server.ts`, `src/routes/`), Node.js / TypeScript.
- **Database**: Supabase PostgreSQL with RLS, cascade constraints, and tenant isolation via `school_id`.
- **Existing Integration**: Reuse existing `schools`, `academic_years`, `classes`, `sections`, `students`, `student_enrollments`, and `student_id_cards` tables.

## Success Criteria (Acceptance Criteria)
- [ ] Administrator can access Attendance from the Admin Panel navigation.
- [ ] Administrator can select an academic year, class, section, and date.
- [ ] Correct enrolled students are displayed with photo, name, admission number, roll number, and status.
- [ ] Administrator can mark attendance manually (Present, Absent, Late, Leave), mark all present, and change individual statuses.
- [ ] Attendance can be saved successfully with validation and duplicate prevention.
- [ ] Saved attendance can be reopened and viewed in Attendance History.
- [ ] Attendance can be corrected with an audit trail logging user, timestamp, previous status, new status, and reason.
- [ ] QR attendance scanner validates student QR tokens from `student_id_cards` and records attendance seamlessly.
- [ ] Dashboard statistics reflect real saved records (Total, Present, Absent, Late, Leave, Attendance Percentage, class summaries).
- [ ] Attendance reports (Daily, Monthly, Student-wise) generate accurate metrics and support export.
- [ ] School-level multi-tenant data isolation is strictly enforced on all queries and mutations.
- [ ] No existing student, school, or fee functionality is broken.
