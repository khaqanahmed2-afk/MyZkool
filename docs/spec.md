# MyZkool: Students, Fee and Transport Modules

Build specification, version 1.0, 20 September 2026
Owner: Khaqan Ahmad, MyZkool Technologies

This document is the single source of truth for building three modules of the MyZkool school ERP: Students, Fee and Transport. It covers user flows, screens, UI and UX behaviour, data model, business rules, permissions, APIs, notifications, edge cases, tests and build order.

---

## 0. How to use this document (instructions for the AI coding tool)

1. **Audit before you build.** The Students module (`/admin/students`) is already partly built (86 passing tests, zero TypeScript errors at last verification). Before writing any code, read the existing code and produce a gap report against Part A with three columns: present, partial, missing. Do not rewrite anything that already works. All existing tests must keep passing.
2. **Build in phases.** Part E lists the phases. Run one phase at a time. Each phase ends with passing tests, zero TypeScript errors and a short summary of what changed.
3. **Do not invent business rules.** Anything marked `[DECISION]` is an open founder decision. Implement it behind a school-level setting with the stated default, and list every `[DECISION]` you touched in your phase summary.
4. **Follow the principles in section 1.2 without exception.** They are firm, not suggestions.
5. **Definition of done for every feature:** works on a 360px wide phone and a 1366px laptop, has loading, empty and error states, is keyboard usable, is tenant-isolated by RLS, is gated by role and by plan on the server, writes to the audit log where this spec says so, and has tests.
6. **Naming is fixed.** Use the entity and route names in this document. If you must deviate, say so in the phase summary.

---

## 1. Global foundations (shared by all three modules)

### 1.1 Product context

MyZkool is a multi-tenant SaaS for K-12 schools in India, mostly Tier-2 and Tier-3 cities. It combines a school website builder with a school ERP. The differentiator is WhatsApp-first parent communication, and the price point is low (Basic Rs 999 per month, Pro Rs 1,799 per month). Most school offices use one or two ageing laptops, phones, and unreliable internet. Fee counter staff are not technical and work under queue pressure. Design for that reality.

Stack (fixed): React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide React on the front end. Express.js on Node.js for the API. Supabase for Auth, Postgres with Row Level Security, and Storage. WhatsApp Business is the parent communication channel.

### 1.2 Non-negotiable principles

1. **Plan gating is enforced on the server.** Hiding a menu item is not gating. Every Transport API route and every Transport table policy must check the school's plan on the server (section 1.5).
2. **Hard deletes are prohibited.** Students with any history are soft-deleted (archived) only. Financial records are never deleted; they are reversed with a new entry.
3. **Aadhaar is masked by default** with role-based reveal, a stated reason, and an audit entry. Exports of sensitive fields follow the DPDP Act 2023 rules in section 1.3.
4. **Parents live in a standalone `parents` table** linked to students through a join table. This prevents duplicate parent records and enables sibling linking, sibling fee concessions and family-level fee payment.
5. **Medical data is role-gated.** Being an admin does not grant access to it.
6. **No generic admin-form UI.** The product has a defined visual quality bar (section 1.8). Long stacked forms, unstyled data grids and modal-on-modal flows are rejected.
7. **Money is an integer.** Store all amounts as integer paise (`bigint`). Never use floating point for money anywhere, including JavaScript calculations (use integer paise arithmetic and format only at the edge).
8. **Every tenant table carries `school_id`** and is protected by RLS.

### 1.3 Multi-tenancy, security and privacy

- Every table has `school_id uuid not null` and RLS policies of the form: a row is visible only if `school_id` equals the caller's school (resolved from `school_members` for `auth.uid()`). The Express API must never use the Supabase service key for user-initiated requests except in explicitly listed background jobs and webhooks.
- Create a SQL helper `current_school_id()` and a helper `has_role(role text[])`. Policies use these helpers so they are testable.
- Write a cross-tenant isolation test for every table: a user of school A must get zero rows and cannot insert or update rows of school B.
- Aadhaar: optional field (schools must not make it mandatory). Store encrypted at application level (AES-256-GCM, key from environment or KMS, never in the database). Store `aadhaar_last4` separately for display. Default display is `XXXX XXXX 1234`. Reveal requires the `students.reveal_sensitive` permission, a typed reason, and creates an `audit_logs` row. Revealed values are shown for 30 seconds and then re-masked in the UI. Exports mask Aadhaar unless the owner explicitly includes it, which is also audited.
- Children's data: the school is the data fiduciary for enrolled students. Store parent consent for WhatsApp messaging (`communication_consents`, section 1.7). Collect only the data this spec lists. `[DECISION]` Confirm with a lawyer the DPDP position on verifiable parental consent for school-managed data and on location tracking of minors before Transport Phase 8 goes live.
- Uploaded files go to private Supabase Storage buckets, paths prefixed by `school_id/`, served only through short-lived signed URLs (60 seconds). Accept JPG, PNG, PDF, max 5 MB per file, scan the MIME type on the server rather than trusting the extension.
- Audit log: every create, update, status change, reveal, export, cancellation and permission change on sensitive entities writes to `audit_logs` (who, when, entity, entity id, action, before and after JSON, IP, user agent). Audit rows are append-only; no update or delete policy exists.
- Rate limit login-adjacent and OTP endpoints. Validate all input with a shared schema (Zod) used by both client and server.

### 1.4 Roles and base permission model

| Role key | Who | Notes |
|---|---|---|
| `owner` | School owner or principal | Full access in the school. Approves sensitive actions. |
| `admin` | Office admin | Day-to-day student administration. No medical, no Aadhaar reveal by default. |
| `accountant` | Fee counter and accounts | Fee module. Read-only basic student data. |
| `teacher` | Class teacher or subject teacher | Own class and section only. |
| `transport_manager` | Transport incharge | Transport module. Read-only basic student data for riders. |
| `driver` | Driver or attendant | Driver app only. Sees only the assigned route and its riders. |
| `parent` | Guardian | Sees only their linked children. No admin app access. |

Permissions are stored as keys such as `students.create`, `fees.collect`, `transport.routes.manage`. Roles map to default permission sets (below in each part), and the owner can grant or revoke individual permissions per user in Settings, Users. The API checks permission keys, never role names, so custom grants work.

### 1.5 Plan gating (server-side)

| Capability | Basic (Rs 999, up to 800 students) | Pro (Rs 1,799, up to 1,800 students) |
|---|---|---|
| Students module | Yes | Yes |
| Fee module (setup, collection, receipts, reports, reminders) | Yes | Yes |
| Transport module | No | Yes |
| Student limit | 800 active students | 1,800 active students |

Custom plan (1,800+ students or multi-branch) is handled manually and not in this scope.

Implementation:

- Table `school_plans(school_id, plan_key, student_limit, features jsonb, billing_status, valid_until)`.
- SQL function `school_has_feature(feature text) returns boolean` reads the caller's school plan. Every Transport table has an RLS policy that requires `school_has_feature('transport')`.
- Express middleware `requireFeature('transport')` is mounted on every `/api/transport/*` route and on any fee route that touches transport dues. It returns HTTP 402 with `{ code: "PLAN_REQUIRED", feature: "transport" }`.
- Student limit is enforced by the API on student creation and re-admission, counting students with status `enrolled`. At 90 percent of the limit show a warning banner to the owner. At the limit, block creation with an upgrade message. `[DECISION]` Hard block versus a 5 percent grace buffer. Default: hard block, no buffer.
- The UI on Basic shows the Transport menu item in a locked state with a preview screen and an "Upgrade to Pro" action. It never renders real transport data on Basic, even if the API were called.
- If a school downgrades from Pro to Basic, Transport data is retained but read-locked; no data is deleted; transport fee dues already generated remain collectible in the Fee module.
- Write tests that call Transport endpoints and query Transport tables as a Basic school with a valid token and assert rejection at both the API and RLS layers.

### 1.6 Conventions

| Topic | Rule |
|---|---|
| IDs | `uuid` primary keys (`gen_random_uuid()`). |
| Timestamps | `timestamptz`, stored UTC, displayed in Asia/Kolkata. Every table has `created_at`, `updated_at`; user-authored tables also `created_by`, `updated_by`. |
| Dates | Display `DD/MM/YYYY` in tables and `12 Apr 2026` in prose and receipts. Date pickers accept typed input. |
| Money | `bigint` paise in DB and API. UI shows Indian grouping: `Rs 12,34,567` using `₹` symbol; use `Intl.NumberFormat('en-IN')`. Receipts also show amount in words using the Indian system (lakh, crore). |
| Academic year | April to March by default, labelled `2026-27`. Setting `academic_year_start_month` defaults to 4. Exactly one year has `is_current = true` per school. |
| Soft delete | `deleted_at timestamptz null`, `deleted_by`, `delete_reason`. Default queries exclude deleted rows. |
| Status fields | `text` with a `check` constraint, not Postgres enums, so values can be added by migration without locks. |
| Idempotency | Every money-changing POST accepts an `Idempotency-Key` header, stored in a unique index with the result, so a double click or a retried request never creates two receipts. |
| Pagination | Cursor-based for lists over 200 rows: `?limit=50&cursor=...`. Return `{ data, next_cursor, total_estimate }`. |
| Errors | JSON `{ code, message, field_errors? }`. `message` is written for the end user: what went wrong and how to fix it. |
| Search | Trigram index on student name, admission number and parent phone. Search must return within 300 ms for 2,000 students. |
| Concurrency | Sequential numbers (admission number, receipt number) come from the `counters` table using `select ... for update` inside the same transaction as the insert. No gaps on success; numbers are consumed only when the transaction commits. |
| Background jobs | Use a Postgres-backed queue (`pg-boss` or equivalent) so jobs survive restarts. Jobs are idempotent. |

### 1.7 Shared entities

These tables are used by all three modules. If any already exist, extend them; do not duplicate.

```
academic_years
  id, school_id, label ('2026-27'), start_date, end_date,
  is_current bool, status ('open'|'closed'), closed_at, closed_by

classes
  id, school_id, name ('Nursery', 'Class 1' ... 'Class 12'), display_order, stage ('pre_primary'|'primary'|'middle'|'secondary'|'senior')

sections
  id, school_id, class_id, academic_year_id, name ('A'), capacity, class_teacher_id null

student_enrollments            -- one row per student per academic year
  id, school_id, student_id, academic_year_id, class_id, section_id null,
  roll_no null, status ('active'|'promoted'|'detained'|'left'|'passed_out'),
  enrolled_on, ended_on null
  unique (student_id, academic_year_id)
```

If the current build stores class and section directly on `students`, add `student_enrollments`, migrate existing values into the current year's enrollment, and keep the old columns as read-only until every read path is switched. Fees and transport are per academic year, so per-year enrollment is required.

```
counters                       -- gap-free sequences
  school_id, key ('admission_no' | 'receipt:2026-27' | 'tc_no' ...), next_value bigint
  primary key (school_id, key)

audit_logs                     -- append-only
  id, school_id, actor_id, actor_role, entity_type, entity_id, action,
  before jsonb, after jsonb, reason text null, ip, user_agent, created_at

communication_consents
  id, school_id, parent_id, channel ('whatsapp'|'sms'|'email'), status ('opted_in'|'opted_out'),
  captured_at, source ('admission_form'|'parent_reply'|'admin_entry'), captured_by

notification_outbox
  id, school_id, channel, template_key, recipient_phone, recipient_parent_id null,
  params jsonb, related_type, related_id, dedupe_key unique null,
  status ('queued'|'sent'|'delivered'|'read'|'failed'|'skipped'),
  provider_message_id, error text, attempts int, scheduled_at, sent_at, created_at
```

### 1.8 Design system and UX rules

**Visual identity (already defined for MyZkool, reuse existing tokens; do not create parallel ones):**

| Token | Value | Use |
|---|---|---|
| Brand blue | `#2158E0` | Primary buttons, links, focus rings, selected states |
| WhatsApp emerald | `#1FAE7A` | WhatsApp actions, "paid" and success states |
| Display font | Plus Jakarta Sans | Page titles, section headings, large numbers |
| Body font | Inter | Tables, forms, body copy, with `tabular-nums` for every column of numbers |
| Neutrals | Slate scale from the existing Tailwind theme | Text, borders, canvas |
| Warning | Amber | Due soon, expiring documents |
| Danger | Red | Overdue, bounced, cancelled, destructive actions |

Type scale: 12, 13, 14 (default in tables), 16 (forms on mobile, to stop iOS zoom), 20, 24, 32. Line length under 80 characters for prose.

**Layout patterns**

- App shell: left navigation (collapses to icons at 1024px, bottom tab bar on phones), top bar with global search (`/` focuses it), school name, academic year switcher, user menu.
- Lists use a table with a right-side **quick view drawer** (opens on row click, 480px wide, slides in 180 ms). A full page exists for deep work. This avoids modal-on-modal flows.
- Profiles use a header card with tabs. Single fields edit inline (click, type, Enter to save, Esc to cancel) instead of opening an edit form.
- Wizards are used only for admission. Everything else is a page or a drawer.
- Forms are grouped into short sections with progressive disclosure. Two columns at 1024px and above, one column below. Group related fields; never present more than about 8 fields at once without a section break.
- Dashboards lead with what needs action (dues today, expiring documents) rather than vanity totals.

**Interaction rules**

- **Tables:** row height 44 px (36 px compact toggle), sticky header, column chooser, saved views, multi-select with a bulk-action bar that replaces the header when rows are selected, remembered sort and filters per user. On phones, rows become cards showing the three most important fields and one primary action.
- **Loading:** skeletons that match the final layout. No full-page spinners.
- **Empty states:** one sentence saying what belongs here, one primary action. Example: "No students in this class yet. Add a student."
- **Errors:** say what happened and how to fix it, without apology. Example: "This phone number already belongs to Rakesh Verma, father of Aarav (Class 4-A). Link to this parent instead."
- **Copy:** sentence case everywhere. No emojis. No all-caps labels. No small labels above headings that just repeat the heading. Buttons name the exact action ("Collect fee", "Save student", "Send reminders") and the toast repeats the same verb ("Fee collected"). Avoid hype words such as "seamless" and "revolutionize".
- **Confirmations:** destructive or money actions show a summary of what will change, not a bare "Are you sure?". Reversible actions get an 8 second undo toast instead. Money actions never have undo; they have a cancel-with-reason flow.
- **Motion:** only in response to user actions (drawer opens, row expands, payment confirms). No entrance animations on load. Respect `prefers-reduced-motion`.
- **Accessibility:** visible 2 px blue focus ring, WCAG AA contrast, full keyboard operation, labels bound to inputs, error messages linked with `aria-describedby`, status conveyed by text as well as colour.
- **Responsive:** every screen works at 360 px. Primary action sits in a sticky bottom bar on phones. Touch targets are at least 44 px.
- **Low connectivity:** show a persistent "Offline, changes will sync" strip; keep unsent form drafts in `IndexedDB`; retry with backoff; money-collection actions are blocked offline with a clear message rather than queued (to avoid duplicate or lost receipts). The driver app is the exception (section C6).
- **Language:** English UI at launch with i18n scaffolding (`react-i18next`, keys from day one). Receipts and WhatsApp templates support English and Hindi per school setting. `[DECISION]` Full Hindi UI timing.
- **Print:** receipts, route sheets, fee statements and ID cards have dedicated print stylesheets. Receipts support A5 portrait and 80 mm thermal roll.
- **Global search (`/`):** searches students, parents (by phone), receipts (by number). Results grouped, keyboard navigable, recent items first.

### 1.9 Notification framework (WhatsApp first)

- All outbound messages go through `notification_outbox`. Nothing calls the WhatsApp provider directly from a request handler.
- A worker sends queued messages, retries with exponential backoff (max 5 attempts), and records provider status callbacks (sent, delivered, read, failed).
- **Templates:** WhatsApp Business requires pre-approved templates for messages sent outside the 24 hour reply window. Keep a `notification_templates` registry (key, language, body with `{{1}}` style variables, category, approval status). Draft template bodies are listed in Part D. Template approval takes time; start submitting them early.
- **Consent:** never message a parent whose latest `communication_consents` row for that channel is `opted_out`. New admissions capture opt-in on the parents step of the wizard.
- **Quiet hours:** reminders and non-urgent messages are held between 21:00 and 08:00 local time. Receipts and payment confirmations are always sent immediately.
- **Deduplication:** every outbox row has a `dedupe_key` such as `fee_reminder:{student}:{due}:{yyyy-mm-dd}` so a rerun of a job cannot double-send.
- **Fallback:** if WhatsApp delivery fails, and the school has enabled SMS, fall back to SMS with a shorter text. `[DECISION]` SMS provider and DLT registration.
- **Provider abstraction:** wrap the provider behind an interface (`sendTemplate`, `parseWebhook`) so the business solution provider can change without touching modules. `[DECISION]` Meta Cloud API directly versus a BSP.

---

# PART A: STUDENTS MODULE

Route root: `/admin/students`. Available on Basic and Pro.

## A1. Purpose and scope

The Students module is the master record of every child in the school: identity, family, academic placement, documents, medical information and history. Fee and Transport both depend on it, so the record must be accurate, de-duplicated and year-aware.

In scope: admission (8-step wizard), student list, student profile, family and sibling linking, Document Vault, medical record, bulk import, class and section placement, year-end promotion, status changes (withdrawal, transfer certificate, passed out), re-admission, export, ID card print.

Out of scope for this build: attendance, exams, timetable, library, hostel (separate modules that will read from this one).

Status of existing build (verify in the audit): photo upload, separate mother and father fields, Aadhaar with masking, previous school details, Document Vault, and the standalone `parents` plus join-table design are already built or in progress. This part specifies the complete target; the audit decides what remains.

## A2. Permissions

| Capability (permission key) | owner | admin | accountant | teacher | transport_manager | driver | parent |
|---|---|---|---|---|---|---|---|
| View list and basic profile (`students.read`) | Yes | Yes | Yes (read only) | Own class | Riders only | Route riders only, name, photo, stop | Own children |
| Create and edit (`students.write`) | Yes | Yes | No | No | No | No | No |
| See parent contact numbers (`students.contacts.read`) | Yes | Yes | Yes | Own class | Riders only | Riders' guardian phone (route only) | Self |
| Reveal Aadhaar (`students.reveal_sensitive`) | Yes | No (grantable) | No | No | No | No | No |
| Read medical (`students.medical.read`) | Yes | No (grantable) | No | No | No | No | Own child |
| Edit medical (`students.medical.write`) | Yes | No (grantable) | No | No | No | No | No |
| Upload and verify documents (`students.documents.manage`) | Yes | Yes | No | No | No | No | Upload only |
| Change status, issue TC (`students.status.manage`) | Yes | Prepare only, owner approves `[DECISION]` | No | No | No | No | No |
| Promote students (`students.promote`) | Yes | Yes | No | No | No | No | No |
| Bulk import (`students.import`) | Yes | Yes | No | No | No | No | No |
| Export (`students.export`) | Yes | Yes, masked | No | No | No | No | No |
| Archive (soft delete) (`students.archive`) | Yes | No | No | No | No | No | No |

## A3. Data model

```
students
  id, school_id,
  admission_no text            -- unique per school, generated from counters
  sr_no text null              -- scholar register number, optional, unique per school when present
  apaar_id text null           -- 12 digits, optional
  first_name, middle_name null, last_name,
  dob date, gender ('male'|'female'|'other'),
  blood_group null, nationality default 'Indian', religion null, category ('general'|'obc'|'sc'|'st'|'ews') null,
  mother_tongue null,
  is_rte bool default false,             -- admitted under the RTE 25 percent quota (drives fee concessions)
  photo_path null,
  aadhaar_enc bytea null, aadhaar_last4 text null, aadhaar_hash text null,   -- hash (HMAC with server key) only for duplicate detection
  admission_date date, admission_type ('new'|'re_admission'|'transfer_in'),
  admission_class_id,
  status ('enrolled'|'inactive'|'transferred'|'withdrawn'|'passed_out'),
  status_changed_on date, status_reason text null,
  house null, medium null,
  deleted_at null, deleted_by null, delete_reason null,
  created_at, updated_at, created_by, updated_by
  unique (school_id, admission_no)

student_addresses
  id, school_id, student_id, kind ('current'|'permanent'),
  line1, line2 null, locality null, landmark null, city, district, state, pin char(6)

parents                                   -- standalone, one row per real person per school
  id, school_id, full_name, phone text (10 digits, normalised, no +91),
  whatsapp_phone null, email null, occupation null, qualification null,
  annual_income_band null, photo_path null,
  deleted_at null, created_at ...
  unique (school_id, phone)               -- two parents cannot share one number
  `[DECISION]` Some families share a phone between father and mother. Default: phone is unique per parent record; the
  UI offers "Same number as [linked parent]" which links the same parent record only if it is the same person.

student_parents                           -- join table
  id, school_id, student_id, parent_id,
  relation ('father'|'mother'|'guardian'),
  is_primary_contact bool, is_fee_payer bool, is_emergency_contact bool, can_pickup bool, lives_with bool
  unique (student_id, parent_id)
  partial unique index: one primary contact per student

student_previous_schools
  id, school_id, student_id, school_name, board null, last_class null, tc_no null, tc_date null,
  result_percent numeric(5,2) null, reason_for_leaving null, medium null

student_achievements
  id, school_id, student_id, kind ('academic'|'sports'|'arts'|'olympiad'|'other'),
  title, level ('school'|'district'|'state'|'national'|'international'), year int, position_or_award null, document_id null

student_documents                          -- Document Vault
  id, school_id, student_id, doc_type text (from document_types), storage_path null,
  status ('pending'|'uploaded'|'verified'|'rejected'), expected_on date null,
  verified_by null, verified_at null, rejection_reason null, file_name, mime, size_bytes,
  uploaded_by, uploaded_at

document_types                              -- per school, editable
  id, school_id, key, label, required_for ('all'|'new'|'category'|'rte'), is_required bool, display_order

student_medical                             -- separate table so RLS can gate it on its own permission
  student_id pk, school_id, allergies null, conditions null, medications null,
  special_needs null, vision_hearing_aids null, immunisation_notes null,
  emergency_instructions null, doctor_name null, doctor_phone null, preferred_hospital null,
  updated_by, updated_at

student_events                              -- timeline shown on the profile
  id, school_id, student_id, kind ('admitted'|'class_changed'|'status_changed'|'document_verified'|'promoted'|'tc_issued'|'readmitted'|'note'),
  summary, meta jsonb, created_by, created_at

student_drafts
  id, school_id, created_by, step int, payload jsonb, updated_at

student_transfer_certificates
  id, school_id, student_id, tc_no (from counters), issued_on, last_class_id, last_academic_year_id,
  reason, conduct null, remarks null, dues_cleared bool, dues_override_reason null,
  approved_by, pdf_path, is_duplicate_copy bool default false, original_tc_id null

import_batches
  id, school_id, created_by, file_name, total_rows, created_rows, skipped_rows, status ('validated'|'committed'|'rolled_back'|'failed'), error_report_path, created_at

promotion_batches
  id, school_id, from_year_id, to_year_id, status ('draft'|'running'|'committed'|'failed'|'reverted'), summary jsonb, created_by, created_at

view v_student_siblings                     -- students sharing at least one parent
```

## A4. Screens

### A4.1 Student list (`/admin/students`)

Purpose: find any student in seconds and act on them.

Layout, top to bottom:

1. **Header row:** page title "Students", academic year chip, primary button "Add student", secondary "Import", overflow menu (Export, Promote students, Print ID cards). If drafts exist, a text link "Continue draft (2)".
2. **Summary strip** (single row, not four identical cards): total enrolled, girls and boys, admitted this year, documents pending. When Fee module data exists, add "with dues". Each figure is a filter shortcut when clicked.
3. **Search and filters:** one search box (name, admission number, parent phone, SR number) plus filter chips: class, section, status (default Enrolled), gender, category, RTE, has dues, uses transport (Pro), documents pending, admission year. Saved views: "Documents pending", "New this month", "Left this year", and user-created views.
4. **Table:** default columns are student (photo, name, admission number underneath), class and section, primary parent (name and phone with a WhatsApp icon button that opens `wa.me`), fee status chip ("Paid up" or "Dues Rs 4,500"), transport chip (route name, Pro only), documents chip ("2 pending"), status chip. Column chooser adds gender, DOB, category, admission date, house, SR number.
5. **Row click** opens the quick view drawer: photo, key facts, parents with call and WhatsApp buttons, sibling cards, fee summary, and an "Open full profile" button.
6. **Bulk actions** (select rows): Send WhatsApp message (template picker), Assign section, Export selected, Print ID cards, Mark documents requested.

States: skeleton rows while loading; empty state for a school with no students ("Add your first student or import a class list" with two buttons); no-results state with "Clear filters"; error state with retry.

Mobile: cards, one line for name and class, one line for parent phone, chips below. Floating "Add student" button.

### A4.2 Admission wizard (`/admin/students/new`)

Eight steps in this order: **Basic info, Academic info, Parents and guardian, Previous school, Address, Achievements, Documents, Medical.** Step 8 ends with a review panel; it is not a ninth step.

Wizard behaviour:

- Stepper across the top on desktop (clickable for completed steps), and "Step 3 of 8, Parents and guardian" with a thin progress bar on phones.
- At 1280 px and wider, a sticky right-hand summary card shows the photo, name, class, admission number and a completeness meter, and updates live.
- Sticky footer: Back, "Save draft", Next. Enter moves to the next field; Enter on the last field goes Next.
- Auto-save to `student_drafts` on field blur and step change. Drafts are per user. A draft older than 30 days is deleted by a job.
- Validation runs per step on Next. An error summary at the top links to each invalid field. Inline errors appear on blur, not on every keystroke.
- Steps 4 and 6 are skippable. Step 7 can be completed with documents pending. Step 8 is skipped automatically when the user lacks `students.medical.write`, with the line "Medical details can be added later by authorised staff."

**Step 1: Basic info**

| Field | Rules |
|---|---|
| Photo | Camera capture on mobile, upload on desktop. Square crop. Compress client-side to under 300 KB. Optional. |
| First name, last name | Required. Middle name optional. Trim, collapse spaces, store as typed with title-case suggestion. |
| Date of birth | Required. Must produce an age between 2 and 22. Warn if the age is outside the normal range for the class chosen in step 2. |
| Gender | Required: male, female, other. |
| Blood group | Optional list. |
| Nationality | Default Indian. |
| Religion, category | Optional. Category values: general, OBC, SC, ST, EWS. Explain in a helper line that they are used only for government reports and concessions. |
| Aadhaar number | Optional. 12 digits, Verhoeff checksum validation, input masked as typed. Stored encrypted. Helper line: "Optional. Schools cannot require Aadhaar for admission." |
| SR number, APAAR ID | Optional. SR unique per school. APAAR is 12 digits. |
| Admission number | Auto-generated preview, format from settings (default `{PREFIX}/{YYYY}/{0000}`). Only users with `students.write` and the setting "allow manual admission number" can override; uniqueness checked on blur. |

Duplicate check: when first name, last name and date of birth are all filled (or an Aadhaar hash matches), call the duplicate endpoint. If a match exists show an inline card: "A student named Aarav Verma born 14/03/2016 already exists (Class 4-A, enrolled). Open that record or continue anyway." "Continue anyway" needs a typed reason and is audited.

**Step 2: Academic info**

| Field | Rules |
|---|---|
| Academic year | Default current year. |
| Admission date | Required, default today, not in the future beyond 30 days. |
| Class | Required. Shows seat availability per section: "4-A 38 of 40, 4-B 40 of 40". |
| Section | Optional at admission; can be assigned later. Full sections are disabled with a reason. |
| Roll number | Optional, unique within the section for the year. |
| Admission type | New, re-admission (search existing inactive students), transfer in. Choosing re-admission switches to the re-admission flow (A5.4). |
| RTE quota | Toggle "Admitted under RTE quota". When on, the fee module applies the RTE concession rule automatically (Part B). |
| House, medium | Optional. |
| Fee preview | Read-only line: "Estimated annual fee for Class 4: Rs 38,400" once the Fee module has a structure for the class. Links to the fee structure. |

**Step 3: Parents and guardian**

Three collapsible cards: Father, Mother, Guardian (guardian is optional; required only if neither parent is entered).

Each card starts with **phone number first**. On a valid 10 digit number:

- Look up `parents` by phone. If found, show a linkable card: name, "father of Aarav (Class 4-A)", and "Link this parent" or "This is someone else". Linking fills every field and locks it (editable through the parent record).
- If not found, reveal the remaining fields.

Fields per person: full name (required), relation (fixed by card), phone (required for at least one person), WhatsApp number (toggle "Same as phone", otherwise separate number), email, occupation, qualification, annual income band (optional; used for EWS or scholarship decisions; visible only with `students.contacts.read`).

Role flags: primary contact (exactly one; default father, changeable), fee payer, emergency contact, authorised for pickup.

Communication consent: a checkbox per person "Agrees to receive fee, attendance and school updates on WhatsApp", checked by default only if the parent has consented on the admission form; the office member ticks it on the parent's behalf and the source is recorded as `admission_form`. Timestamp and user recorded.

Validation: at least one person with a phone; one primary contact; phone must be a valid Indian mobile (starts with 6, 7, 8 or 9, ten digits); father and mother cannot share the same parent record.

**Step 4: Previous school** (skippable, "Fresh admission, no previous school" toggle for Nursery and LKG)

School name, board (CBSE, ICSE, UP Board, other state board, other), last class attended, TC number, TC date, result percentage, reason for leaving, medium.

**Step 5: Address**

Current address (line 1, line 2, locality or village, landmark, city or town, district, state, PIN of six digits). "Permanent address same as current" toggle. PIN lookup auto-fills district and state when online. The landmark field carries the hint "Nearest well-known place; helps with bus stop assignment."

**Step 6: Achievements** (skippable)

Repeating rows, "Add achievement": type, title, level, year, position or award, certificate upload (optional). Rows can be reordered and removed before saving.

**Step 7: Documents**

A checklist built from `document_types` for this student (required set changes with category, RTE and admission type). Each row shows the document name, a status chip, and actions: "Upload", "Scan" (camera, mobile), or "Mark pending" with an expected date. Default document list: birth certificate, previous TC, previous report card, address proof, passport photo, Aadhaar copy (optional), category certificate (if category is SC, ST, OBC or EWS), income certificate (if EWS or RTE), immunisation record (optional).

Setting `allow_admission_with_pending_docs` (default on). Pending documents appear as a chip on the list and in a "Documents pending" saved view, and generate a reminder to the parent after 7 days (Part D template `docs_pending`).

**Step 8: Medical** (only with `students.medical.write`)

Allergies, chronic conditions, current medication, special needs, vision or hearing aids, immunisation notes, emergency instructions, family doctor name and phone, preferred hospital. A note at the top reads: "Only the owner and staff you authorise can see this." All fields optional.

**Review and save panel:** three columns of cards (Student, Family, Records) with an "Edit" link that jumps back to the relevant step. Warnings (pending documents, no WhatsApp consent, section not assigned) appear as a checklist, none of them blocking. Primary button "Save student".

**On save (one database transaction):** create the student, enrollment, addresses, parents (create or link), links, previous school, achievements, document rows, medical row, timeline event, audit rows; take the admission number from `counters`; queue the admission confirmation WhatsApp to the primary contact if consented. Fee dues are generated automatically if the setting `auto_assign_fee_on_admission` is on (default on, Part B).

**Success screen:** shows the student card and next actions: "Assign fee structure" (if auto assign is off), "Add transport" (Pro), "Print admission form", "Add a sibling" (opens the wizard with parents, address and previous school prefilled), and "Add another student".

### A4.3 Student profile (`/admin/students/:id`)

Header card: photo (click to change), name, admission number, class and section, status chip, age, primary contact with call and WhatsApp buttons, and quick actions: Edit, Collect fee (with `fees.collect`), Add transport (Pro), Print ID card, more menu (Change status, Issue TC, Archive, Print admission form).

Tabs:

| Tab | Content |
|---|---|
| Overview | Key facts, alert cards (documents pending, dues, transport document issues), sibling cards with class and dues, latest timeline events. |
| Personal | Identity fields and addresses. Inline editing. Aadhaar masked with "Reveal" button (permission and reason dialog). |
| Family | Linked parents as cards with role flags. Actions: change primary contact, add guardian, link another parent, "View all children of this parent". |
| Academics | Enrollment history by year (class, section, roll number, result of the year: promoted, detained, left). Placeholder slots for exams and attendance when those modules ship. |
| Fees | Summary and ledger from the Fee module (B5.5), collect button. Hidden without `fees.read`. |
| Transport | Current route, stop, fee and history (Pro only). Hidden on Basic. |
| Documents | Document Vault (A4.4). |
| Medical | Visible only with `students.medical.read`. Others do not see the tab at all. |
| Timeline | Every event: admission, class changes, status changes, verified documents, receipts (summary only), promotions, TC. Filterable. |

Right rail on wide screens: siblings, open alerts, quick notes.

### A4.4 Document Vault

A grid of document cards per student (thumbnail for images, PDF icon for PDFs), status chip, upload date, uploader. Actions: preview (in an overlay, signed URL), replace, download, verify, reject with reason (the reason is sent to the parent if consented), delete (allowed only before verification; after verification it can only be superseded, and the old file is kept). Multi-file drag and drop, camera scan on mobile with auto-crop and contrast enhancement if available. Upload progress per file with retry.

A school-level page, Settings, Document types, lets the owner add or reorder types and mark them required.

### A4.5 Bulk import (`/admin/students/import`)

Steps: (1) Download the template (Excel and CSV, prefilled with the school's classes and sections, one example row); (2) Upload; (3) Map columns (auto-mapped by header name, editable); (4) Validate: a table of rows with an error column, filters "Errors only", downloadable error report; (5) Commit with a progress bar.

Rules: max 2,000 rows per file. Required columns: first name, last name, DOB, gender, class, father or mother name, and at least one parent phone. Parents are matched by phone and linked to the same parent record (this is how siblings link during import). Rows failing validation are skipped, not partially imported. Dry run is the default; nothing is written until "Commit". A committed batch can be rolled back (soft-deleted) only while none of its students have receipts, transport assignments or later edits. Import history lists every batch.

### A4.6 Promotion (`/admin/students/promotion`)

A guided page for year-end: choose the source and target year, review the class mapping (Class 4 to Class 5; the last class maps to "Passed out"), see per-class counts, override individual students (promote, detain, leave, pass out), choose how to assign sections (keep the same letter, distribute evenly, or leave unassigned), and see a warning list for students with outstanding dues (they are still promoted; dues carry forward as arrears, see B6.9). "Preview" shows exact results. "Run promotion" executes as a background job with progress and a summary. Enrollments for the new year are created; the old enrollment is marked `promoted`, `detained` or `passed_out`. Not reversible after fees or attendance exist in the new year; before that, "Undo promotion" is available for 24 hours. `[DECISION]` Confirm the 24 hour undo window.

### A4.7 Status change and transfer certificate

"Change status" dialog: new status (inactive, withdrawn, transferred, passed out), effective date, reason (required). For transferred or withdrawn:

1. The system checks dues. If dues exist, the dialog shows the amount and blocks TC issue unless the owner overrides with a typed reason.
2. It checks transport: if the student has an active assignment, it offers to end it on the effective date.
3. TC form: last class, last academic year, reason for leaving, conduct, remarks. TC number comes from `counters` (`tc_no`).
4. `[DECISION]` Admin prepares and owner approves (default on). TC PDF on school letterhead, printable, with a QR that verifies the TC number. A TC register page lists all issued TCs, and duplicate copies are marked "Duplicate" with the original number.

Status changes never delete anything; the student disappears from default lists (status filter) but remains searchable.

### A4.8 Classes and sections (`/admin/settings/classes`)

Classes with display order, sections per year with capacity and class teacher, "Copy sections from last year". Capacity is enforced softly (warning) with an owner override.

### A4.9 Parent record and merge

Parent detail drawer (from a student's Family tab or global search by phone): all linked children, contact details, consent state. "Merge parents" (owner and admin): choose the duplicate, preview what moves (links, consents), confirm. All links move to the surviving record, the merged record is soft-deleted, and an audit row is written. Use case: the same person entered with two phone numbers.

### A4.10 ID card (optional, Phase 1c)

Print sheet layout for 86 x 54 mm cards, batch by class, with photo, name, class, admission number, guardian phone and a QR encoding the student id. Template selection is minimal at launch (one clean design using the brand colours).

## A5. User flows

**A5.1 New admission (front office, about 4 minutes):** Add student, fill Basic info (duplicate check passes), pick class and section, enter father's phone (existing parent found, link), enter mother, address, skip previous school, mark two documents uploaded and two pending, skip achievements and medical, review, Save student, land on the success screen, tap "Assign fee structure" if not automatic, tap "Collect fee" to take the admission fee immediately.

**A5.2 Admission of a sibling:** On the success screen or the sibling card of any student, "Add a sibling". Wizard opens with parents linked, address and previous school prefilled and step 1 empty. Saving links the new student to the same parents, which enables sibling concessions (Part B).

**A5.3 Editing:** Profile, click a field, edit inline, Enter to save. Fields that affect money (class, RTE flag, category) show a confirmation with the impact: "Changing class from 4 to 5 updates the fee structure. Review fee dues afterwards." Every edit writes an audit row with before and after.

**A5.4 Re-admission:** Search the student among inactive records, "Re-admit", choose class, section and year. The same student record and admission number are reused (`[DECISION]` default keep the number), a new enrollment is created, status becomes enrolled, and the timeline records the event. Outstanding dues from the earlier stay remain visible.

**A5.5 Documents follow-up:** Saved view "Documents pending", select students, bulk "Request documents" queues the `docs_pending` WhatsApp template listing which documents are missing.

**A5.6 Year-end promotion:** open Promotion, preview, resolve warnings, run, review the summary, print new class lists.

**A5.7 Leaving school:** Change status to transferred, dues check, TC issue, print, done.

**A5.8 Data request or correction from a parent:** Update the field, and the audit log shows who changed what and when. Exports of a single student's data (for a parent request) come from the profile menu, "Download student data", a PDF that excludes staff-only notes.

## A6. Business rules and validations

1. Admission number is unique per school and immutable after creation except by the owner, with audit.
2. A student has exactly one enrollment per academic year.
3. A parent phone is unique per school. Creating a second parent with an existing phone is blocked with a link action.
4. Exactly one primary contact per student. Removing the primary contact requires choosing another.
5. Age validation warns but does not block. Name fields reject digits and symbols other than space, dot, apostrophe and hyphen. Unicode (Devanagari) names are allowed.
6. Class capacity: warn at 100 percent of section capacity, owner can override with a reason.
7. RTE flag and category are editable only by users with `students.write`, and every change is audited.
8. A student with any receipt, transport assignment, attendance or exam record is never hard-deleted. Archive requires the owner and a reason, hides the student from default views, and keeps every financial record intact.
9. Uploaded documents: allowed types JPG, PNG, PDF; max 5 MB; server verifies MIME; virus scan hook available.
10. Student count limit is enforced on create and re-admission (section 1.5).
11. All list queries respect role scoping: teachers see only their sections; drivers see only their route's riders; parents see only linked children.
12. Photo and documents are never exposed via public URLs.

## A7. Notifications (Students)

Templates: `admission_confirmation`, `docs_pending`, `tc_issued`, `birthday_greeting` (optional, off by default). Bodies in Part D.

## A8. API

All routes under `/api`, require authentication, school scoping and the permission listed.

| Method and path | Permission | Purpose |
|---|---|---|
| `GET /students` | `students.read` | List with filters, search and cursor pagination |
| `POST /students` | `students.write` | Create from wizard payload (transaction) |
| `GET /students/:id` | `students.read` | Profile |
| `PATCH /students/:id` | `students.write` | Field-level update, audited |
| `POST /students/duplicate-check` | `students.write` | Name, DOB and Aadhaar hash match |
| `POST /students/:id/photo` | `students.write` | Upload photo |
| `GET/POST /students/:id/documents` | `students.read` / `documents.manage` | Vault |
| `PATCH /students/:id/documents/:docId` | `documents.manage` | Verify or reject |
| `POST /students/:id/reveal-aadhaar` | `students.reveal_sensitive` | Body: reason. Audited. |
| `GET/PUT /students/:id/medical` | `medical.read` / `medical.write` | Medical record |
| `POST /students/:id/status` | `status.manage` | Change status |
| `POST /students/:id/readmit` | `students.write` | Re-admission |
| `POST /students/:id/archive` | `students.archive` | Soft delete |
| `GET /students/:id/siblings` | `students.read` | Siblings through shared parents |
| `GET/PUT/DELETE /student-drafts` | `students.write` | Wizard drafts |
| `GET /parents/lookup?phone=` | `students.write` | Find parent by phone |
| `POST /parents/merge` | `students.write` | Merge duplicates |
| `POST /students/import/validate`, `POST /students/import/commit`, `POST /students/import/:batchId/rollback` | `students.import` | Bulk import |
| `POST /promotions/preview`, `POST /promotions/commit`, `POST /promotions/:id/undo` | `students.promote` | Year-end |
| `POST /tc`, `GET /tc/:id/pdf`, `GET /tc` | `status.manage` | Transfer certificates |
| `GET /students/export` | `students.export` | CSV or XLSX, masked by default |

## A9. Edge cases

- Two staff create the same student at the same time: duplicate check plus a unique index on (school, admission number); the second save fails with a clear message and a link to the created record.
- Twins: same parents, same DOB, different first names. Duplicate check uses first name, so no false block; the warning message is advisory only.
- Parent changes phone number: edit the parent record; all children update; the old number is kept in an audit entry.
- A parent with children in different classes: the parent drawer lists all, and fee collection can pay for several children in one transaction (Part B).
- Student photo missing: initials avatar in the brand colour, never a broken image.
- Bulk import contains a father phone that already belongs to a parent with a different name: row flagged "Phone belongs to a different parent name", user chooses link or skip.
- Class has no sections: section field is hidden and the student is placed at class level.
- Admission after the academic year has ended: blocked with a message to open the next year.
- Very long names: truncate with a tooltip in tables; full text in profile.
- Student left mid-year: enrollment ends on the effective date; fee dues after that date are cancelled through the Fee module prompt (B6.11).

## A10. Acceptance criteria and tests

- All existing 86 tests still pass; new tests are added for every rule in A6.
- The wizard saves a student with all eight steps filled in one transaction; a forced failure in the last insert leaves no partial rows.
- Draft autosave restores the exact state after a page refresh.
- Duplicate check catches identical name plus DOB and identical Aadhaar hash.
- Parent lookup by phone links instead of creating a duplicate; sibling view shows both children.
- Aadhaar is never present in any API response except the reveal endpoint; the reveal writes an audit row; a user without the permission gets 403.
- Medical endpoints return 403 for an admin without the grant, and RLS blocks direct table reads.
- A teacher sees only students of their own sections; a driver sees only their route's riders.
- Import: 500 valid rows commit in under 15 seconds; invalid rows produce an error report; rollback works only before dependent records exist.
- Student limit: creating student 801 on Basic fails with `LIMIT_REACHED`; Pro allows up to 1,800.
- Promotion of 1,000 students completes as a background job; preview counts equal committed counts.
- Cross-tenant isolation test passes on every new table.
- Lighthouse accessibility score of at least 90 on list, wizard and profile; keyboard-only completion of the wizard is possible.

---

# PART B: FEE MODULE

Route root: `/admin/fees`. Available on Basic and Pro. The transport fee lines appear only for schools on Pro with Transport in use.

## B1. Purpose and scope

The Fee module defines what each student owes, records what is paid, and tells the school what is still outstanding, with a trail that survives audits. The fee counter is the highest-pressure screen in the whole product: a parent is standing in a queue, so speed and correctness matter more than anything else here.

In scope: fee setup (heads, terms, class structures, concessions, late fee rules, receipt settings), dues generation, fee collection at the counter (cash, UPI, card, cheque, bank transfer), split payments, sibling and family payment, receipts (print, PDF, WhatsApp), student ledger and statement, defaulters and reminders, cheque tracking, refunds, receipt cancellation, day closing, online payment through a parent pay link, approvals, reports, year-end carry forward.

Out of scope: payroll, expense accounting, inventory (uniform and book sales), GST invoicing, Tally sync, multi-branch consolidation. `[DECISION]` Tax treatment on receipts. Default: no tax lines; verify with a chartered accountant before launch.

## B2. Permissions

| Capability (permission key) | owner | admin | accountant | others |
|---|---|---|---|---|
| View fee data (`fees.read`) | Yes | Limited: dues status only `[DECISION]` | Yes | Parent: own children |
| Configure heads, terms, structures (`fees.setup`) | Yes | No | Yes (changes after dues exist need owner approval) | No |
| Assign or regenerate dues (`fees.dues.manage`) | Yes | No | Yes | No |
| Collect fee (`fees.collect`) | Yes | Grantable | Yes | No |
| Give concession within limit (`fees.concession.give`) | Yes | No | Yes, up to threshold | No |
| Approve concession above threshold (`fees.approve`) | Yes | No | No | No |
| Waive late fee (`fees.waive_late`) | Yes | No | Grantable | No |
| Backdate receipt (`fees.backdate`) | Yes | No | No | No |
| Cancel receipt (`fees.receipt.cancel`) | Yes | No | Request only, or with owner PIN at the counter | No |
| Refund (`fees.refund`) | Approve: Yes | No | Request | No |
| Day closing (`fees.day_close`) | Yes | No | Yes | No |
| Reports (`fees.reports`) | Yes | No | Yes | No |
| Send reminders (`fees.remind`) | Yes | Yes | Yes | No |

## B3. Data model

```
fee_heads
  id, school_id, name, code, kind ('recurring'|'one_time'), is_refundable bool, rte_waivable bool,
  is_system bool,              -- Transport fee, Late fee, Previous year dues; not editable or deletable
  display_order, is_active

fee_terms                      -- one term set per academic year in v1
  id, school_id, academic_year_id, name ('April', 'Q1', 'Term 1'), period_start, period_end,
  due_date, late_grace_days default 0, sort_order

fee_structures
  id, school_id, academic_year_id, class_id, name, applies_to ('all'|'new_admission'|'existing'),
  version int, status ('draft'|'active'|'archived')
  unique (academic_year_id, class_id, applies_to) where status = 'active'

fee_structure_items
  id, school_id, structure_id, fee_head_id, pattern ('equal_all_terms'|'first_term_only'|'custom')

fee_structure_item_terms       -- explicit amount per head per term; the UI patterns only generate these rows
  item_id, term_id, amount_paise bigint

student_fee_assignments
  id, school_id, student_id, academic_year_id, structure_id, structure_version, assigned_at, assigned_by, status ('active'|'replaced')

student_dues                   -- what the student owes; one row per head per term
  id, school_id, student_id, academic_year_id, fee_head_id, term_id null,
  source ('structure'|'transport'|'manual'|'late_fee'|'carry_forward'|'adjustment'),
  source_ref uuid null,        -- e.g. transport_assignment_id, parent_due_id for late fee, origin_due_id for carry forward
  description text,
  gross_paise, concession_paise default 0, net_paise, paid_paise default 0,
  balance_paise generated (net_paise - paid_paise),
  due_date, status ('pending'|'partial'|'paid'|'cancelled'|'carried_forward'|'waived'),
  created_at, created_by
  check (paid_paise >= 0 and paid_paise <= net_paise)

concession_rules
  id, school_id, name, basis ('sibling'|'staff_ward'|'rte'|'ews'|'merit'|'management'|'other'),
  type ('percent'|'fixed'), value numeric, fee_head_ids uuid[], sibling_from_rank int null,
  auto_apply bool, needs_approval bool, is_active

student_concessions
  id, school_id, student_id, academic_year_id, rule_id null, type, value, fee_head_ids uuid[],
  reason text, document_id null, from_term_id null, approved_by null, approved_at null, status ('active'|'revoked')

late_fee_rules
  id, school_id, name, fee_head_ids uuid[] null (null = all), method ('flat_once'|'per_day'|'per_week'|'per_month'|'percent_once'),
  value bigint_or_numeric, grace_days int, max_cap_paise null, is_active

fee_receipts
  id, school_id, receipt_no text, student_id, academic_year_id, receipt_date date,
  total_paise, status ('active'|'cancelled'|'bounced'),
  source ('counter'|'online'|'import'),
  payment_group_id uuid null,        -- links receipts created in one family payment
  collected_by, remarks, idempotency_key unique,
  print_count int default 0, whatsapp_sent_at null,
  cancelled_by null, cancelled_at null, cancel_reason null,
  unique (school_id, receipt_no)

fee_receipt_items
  id, receipt_id, due_id, fee_head_id, amount_paise, concession_paise default 0

fee_payments                        -- one or more per receipt (split payments)
  id, school_id, receipt_id, mode ('cash'|'upi'|'card'|'cheque'|'bank_transfer'|'dd'|'online'|'other'),
  amount_paise, reference_no null, bank_name null, instrument_no null, instrument_date null,
  cheque_status null ('received'|'deposited'|'cleared'|'bounced'),
  gateway_order_id null, gateway_payment_id null

fee_ledger                          -- append-only; sum per student per year equals outstanding
  id, school_id, student_id, academic_year_id, due_id null, receipt_id null,
  entry_type ('due_created'|'concession'|'payment'|'refund'|'reversal'|'waiver'|'late_fee'|'adjustment'|'carry_forward'|'cancel_due'),
  amount_paise bigint,              -- positive increases what the student owes, negative reduces it
  note, created_by, created_at

fee_credits                         -- advance or excess payment held for the student
  id, school_id, student_id, academic_year_id, amount_paise, remaining_paise, source_receipt_id, created_at

fee_refunds
  id, school_id, student_id, receipt_id null, amount_paise, reason, mode, reference_no null,
  status ('requested'|'approved'|'paid'|'rejected'), requested_by, approved_by null, paid_at null

approval_requests                   -- shared with other modules
  id, school_id, kind ('discount'|'receipt_cancel'|'refund'|'backdate'|'late_fee_waiver'|'tc_override'|'structure_change'),
  entity_type, entity_id null, payload jsonb, requested_by, status ('pending'|'approved'|'rejected'|'expired'),
  decided_by null, decided_at null, decision_note null, created_at

day_closings
  id, school_id, business_date, opening_cash_paise, system_cash_paise, refunds_cash_paise,
  expected_cash_paise, counted_cash_paise, denominations jsonb, difference_paise, notes,
  status ('closed'|'reopened'), closed_by, closed_at
  unique (school_id, business_date)

fee_settings                        -- one row per school
  receipt_prefix, receipt_paper ('a5'|'thermal80'), receipt_language ('en'|'hi'|'both'),
  allow_partial bool default true, min_partial_paise default 0, allow_advance bool default true,
  allocation_mode ('auto_oldest_first'|'manual'), round_to_rupee bool default true,
  backdate_days_limit int default 0, discount_approval_threshold_percent numeric default 10,
  auto_assign_fee_on_admission bool default true, auto_late_fee bool default false,
  cheque_receipt_timing ('on_receipt'|'on_clearance') default 'on_receipt',
  parent_pay_enabled bool default false, gateway_fee_bearer ('school'|'parent') default 'school',
  auto_print_receipt bool default false, owner_pin_hash null

fee_reminder_rules
  id, school_id, name, trigger ('before_due'|'on_due'|'after_due'), offset_days, repeat_every_days null,
  max_sends int, min_balance_paise default 0, template_key, is_active

fee_followups
  id, school_id, student_id, note, promised_on date null, created_by, created_at

online_payment_orders
  id, school_id, parent_id, student_ids uuid[], due_ids uuid[], amount_paise, gateway ('razorpay'|'cashfree'|'payu'|'other'),
  gateway_order_id, status ('created'|'authorised'|'captured'|'failed'|'expired'|'refunded'),
  receipt_ids uuid[] null, created_at, captured_at null, settlement_id null, gateway_fee_paise null

gateway_webhook_events
  id, gateway, event_id text, payload jsonb, processed_at null, status
  unique (gateway, event_id)
```

Integrity rules for the tables above:

- `student_dues.paid_paise` is updated only inside the collect, cancel, refund and reversal transactions, never directly by other code.
- Every change to what a student owes or has paid also inserts a `fee_ledger` row in the same transaction.
- A nightly job compares `sum(net_paise - paid_paise)` per student against the ledger and raises an alert row if they differ.
- `fee_receipts`, `fee_receipt_items`, `fee_payments` and `fee_ledger` have no update-delete policy for normal users. The only allowed change to a receipt is its status (cancellation) plus print and WhatsApp counters through named functions.

## B4. Setup screens (`/admin/fees/setup`)

### B4.0 Guided setup checklist

The first visit shows a checklist panel with six items and a progress line ("3 of 6 done"): fee heads, terms, class fee structures, concessions, late fee rules (optional), receipt details. Each item opens its screen. When the required items are done, the panel offers "Generate dues for all students" and then collapses into the dashboard.

### B4.1 Fee heads

A simple table (name, code, type, refundable, RTE waivable, active) with an "Add fee head" side drawer. "Add suggested heads" opens a checklist to add the common set in one click: admission fee, registration fee, tuition fee, annual charges, development fee, exam fee, computer fee, activity fee, library fee, lab fee, caution deposit (refundable), miscellaneous. System heads (transport fee, late fee, previous year dues) are shown locked with a lock icon and a tooltip explaining why. Drag to reorder; the order controls receipt line order and allocation ties.

### B4.2 Terms

Presets: monthly (12 terms), quarterly (4), three terms, half-yearly (2), yearly (1), custom. Choosing a preset generates terms with sensible names and due dates (for example the 10th of each month) that can be edited inline. Each term has a due date and late-fee grace days. A validation warns if due dates fall outside the academic year. Changing terms after dues exist is blocked, with a message pointing to "Regenerate dues".

### B4.3 Class fee structures

Purpose: define, for every class, what each head costs in each term.

Layout: class list on the left, editable matrix on the right. Rows are fee heads, columns are terms, the last column is the yearly total, the last row is the term total. A top bar shows the structure name, applies-to selector (all students, new admissions only, existing students only) and status.

Editing:

- The grid behaves like a spreadsheet: arrow keys and Tab move between cells, typing replaces, Enter commits and moves down, paste from Excel works.
- "Fill" per row: choose a pattern (same amount in every term, first term only, custom) and an amount; the grid fills the cells. Patterns only generate cell values; the database stores explicit per-term amounts.
- "Copy to other classes" (multi-select, with optional percentage adjustment).
- "Copy from last year" with an increase percentage.
- Live checks: a row with a value in a term outside the school's terms is impossible by construction; an empty structure cannot be activated.
- Versioning: activating a structure creates a version. If dues already exist for students, changing amounts asks: "Apply to new dues only" or "Recalculate unpaid dues for [N] students" with a preview of the difference per student. Paid amounts are never touched. Changes after dues exist by an accountant create an `approval_requests` row of kind `structure_change` for the owner.

### B4.4 Concessions

Table of concession rules. Add or edit in a drawer: name, basis (sibling, staff ward, RTE, EWS, merit, management, other), type (percent or fixed), value, heads it applies to, "apply automatically", "needs owner approval".

Defaults offered on first setup (all off until the owner turns them on): sibling (second and later children, percent on tuition), RTE (100 percent on heads flagged RTE waivable, applied automatically when the student is marked RTE), staff ward. `[DECISION]` Sibling order (default: by admission number ascending, first child pays full) and RTE handling of reimbursement from the government.

Stacking rule: the total concession on a due can never exceed its gross amount.

### B4.5 Late fee rules

Simple form: name, which heads, method (flat once, per day, per week, per month, percent once), value, grace days, maximum cap. A preview line explains the effect in plain language: "Rs 10 per day after 5 days grace, at most Rs 300 per due." Automatic application is a separate switch (`auto_late_fee`, default off) so schools can begin by adding late fees manually.

### B4.6 Receipt and school settings

Receipt prefix and format preview, paper size (A5 or 80 mm thermal), language (English, Hindi, or both), school logo, address, phone, affiliation number, footer note, signature image, owner PIN (set and change), whether to auto-print after collection, whether partial payment and advance are allowed, backdate limit, discount approval threshold, cheque receipt timing.

### B4.7 Payments (online)

Connect gateway credentials (stored encrypted, per school), choose who bears gateway charges, enable the parent pay link, choose accepted methods. `[DECISION]` Gateway provider and whether online payment is on Basic. A "Send test payment of Rs 1" tool verifies the connection.

## B5. Operations screens

### B5.1 Fee dashboard (`/admin/fees`)

Answers three questions in order: what needs action, how much has come in, where is the money stuck.

1. **Action row:** items that need attention with counts: cheques to deposit, approvals pending, day not closed, failed online payments, students with promised payment today.
2. **Collection panel:** today, this week and this month collected against expected; a slim progress bar for the year (collected of total demand); split by payment mode as a single stacked bar.
3. **Where is the money stuck:** outstanding by class as a horizontal bar chart (click a bar to open defaulters filtered to that class) and aging buckets (0 to 30, 31 to 60, 61 to 90, over 90 days).
4. **Recent receipts:** last 10 with receipt number, student, amount, mode, collector.
5. Primary buttons: "Collect fee", "Send reminders".

### B5.2 Generate and assign dues (`/admin/fees/dues`)

- **Bulk generation:** choose classes (or all), academic year, and whether to include students who already have dues (skipped by default). "Preview" shows the number of students, number of due lines and total demand, plus students skipped and why (no structure for their class, RTE, already generated). "Generate" runs as a background job and is idempotent: running it twice does not duplicate. The result screen lists exceptions.
- **Single student:** from the profile, "Assign fee structure" picks the structure (default by class and new-versus-existing) and generates dues. Mid-year admission asks the proration option: "Full year", "From the current term" (default), "From a chosen term".
- **Manual due:** add a one-off charge (fine, damage charge, event fee) with head, amount, due date, and description. Requires `fees.dues.manage`.
- Auto assignment on admission is on by default (`auto_assign_fee_on_admission`). New admissions get the "new admission" structure plus the "all students" structure for their class.
- RTE students: concession rule for RTE applies automatically at generation.

### B5.3 Collect fee (`/admin/fees/collect`)

This is the counter screen. Everything is designed for speed with the keyboard and for a busy person.

**Search (autofocus).** One box. Accepts name, admission number, parent phone or a scanned ID-card QR. Results appear as rows (photo, name, class-section, admission number, father's name, phone, a chip "Dues Rs 6,200") within 300 ms. Below the box, "Recent" shows the last five students served. Selecting a student opens the collect view without a page navigation.

**Collect view (two panels).**

Left panel, dues:

- Student strip: photo, name, class-section, admission number, parent phone, and chips for RTE, concession, sibling count.
- Tabs: Current dues, Credits (advance balance), Siblings (with count and combined dues).
- Dues table grouped by term. Columns: checkbox, description (head and term), due date (red with "12 days late" when overdue), amount, concession, paid, balance. Group headers show a subtotal and a group checkbox. Late fee lines appear as separate rows with a "Waive" action for permitted users.
- Quick selectors above the table: "All overdue", "Up to [term]" dropdown, "Everything". Default selection: all overdue and current-term dues.
- Previous year dues (arrears) are pinned at the top with a distinct label.

Right panel, payment (sticky):

- **Amount to collect:** large figure that equals the selected balances. The field is editable. If the user types a different amount, an allocation preview lists how it will be applied (oldest first per the school's rule) and what remains unpaid. If the amount exceeds selected dues, the excess is shown as "Advance credit Rs X" (only when advance is allowed).
- **Concession:** "Add concession" opens an inline block: pick a rule or enter a custom amount, type a reason (required). If it exceeds the school's threshold, the button becomes "Request owner approval" and an owner PIN field ("Owner override") appears so the owner can approve in person.
- **Payment mode:** segmented control: Cash, UPI, Card, Cheque, Bank transfer, Other. "Split payment" adds another row so an amount can be divided across modes. Extra fields appear by mode: UPI reference (optional), cheque number, bank, date; bank transfer reference. Cash shows "Received" and computes "Return change".
- **Payment date:** today and locked, unless the user has `fees.backdate`.
- **Remarks:** optional.
- **Summary:** total dues selected, concession, late fee, net, advance created, balance remaining after this payment.
- **Button:** "Collect Rs 12,400", enabled only when the payment rows sum to the net amount. Keyboard: Ctrl+Enter.

**Behaviour**

- One request creates one receipt, its items, its payment rows, ledger rows, dues updates, the outbox message and the audit row, in a single transaction. The client generates an idempotency key when the collect view opens and reuses it on retry.
- The button disables on click and shows progress. If the network fails, show "We could not confirm this payment. Check receipts before trying again" with a link to the receipts list filtered to this student; never auto-retry without the same idempotency key.
- Collect is blocked while offline, with the message "You are offline. Fee collection needs a connection so receipts are not duplicated."
- **Success panel** replaces the payment panel: receipt number, amount, mode, balance remaining. Actions: "Print receipt" (P), "Send on WhatsApp" (W, emerald button), "Download PDF", "Collect for next student" (N; clears and refocuses search). If `auto_print_receipt` is on, printing starts automatically.
- **Siblings tab:** each sibling shows their dues. "Add to this payment" merges their selected dues into the same collection. The result is one receipt per child, sharing a `payment_group_id`, and one WhatsApp message that lists all receipts with a combined total.
- **Keyboard map:** `/` focus search; Up and Down navigate results; Enter select; Space toggle a due row; `A` select all overdue; Alt+1 to Alt+6 choose payment mode; Ctrl+Enter collect; P print; W WhatsApp; N next; Esc back to search.

### B5.4 Receipts (`/admin/fees/receipts`)

Table: receipt number, date, student, class, amount, mode, collector, status chip (Active, Cancelled, Bounced). Filters: date range, mode, collector, class, status. Search by receipt number or student. Row click opens a drawer with the full receipt and actions: Print (increments print count; reprints after the first are stamped "Duplicate copy"), Send on WhatsApp, Download PDF, Cancel receipt (permission and rule B6.10).

**Receipt layout (A5 portrait and 80 mm thermal):** school logo, name, address, phone, affiliation number; title "Fee receipt"; receipt number and date; student name, class and section, admission number, father's name, academic year; a table of lines (head, term, amount, concession); late fee; total; amount in words in the Indian system; payment mode with reference; balance dues after this payment; collector name; signature line; QR code that opens a receipt-verification page; footer text "This is a computer generated receipt." Cancelled receipts print a diagonal "Cancelled" watermark. Hindi or bilingual per school setting.

### B5.5 Student ledger (tab in the student profile and `/admin/fees/students/:id`)

Top: summary tiles for total demand, concession, paid, balance, credit. Below: a timeline table of every ledger entry (date, description such as "Tuition fee, July" or "Receipt MZ/2026-27/000412", debit, credit, running balance). Filters by year and type. Actions: Collect fee, Add manual due, Add concession, Assign fee structure, Send statement on WhatsApp, Download statement PDF. A "Family" toggle shows the combined ledger for all children of the primary parent.

### B5.6 Dues and defaulters (`/admin/fees/dues-report`)

Filters: class, section, term, minimum balance, overdue days, has promise date, RTE, uses transport. Table: student, class, parent and phone, oldest due date, days overdue, balance, last reminder, follow-up note. Aging chips above the table (0 to 30, 31 to 60, 61 to 90, over 90) act as filters.

Actions: select rows then "Send reminder" (template preview shows the exact message and parent count, skipping opted-out parents), "Add follow-up" (note plus promised date), "Export". A row's follow-up note and promise date show inline. Promised-today items surface on the dashboard.

Automatic reminders (Settings, Reminders): default rules are 3 days before due, on the due date, 7 days after, 15 days after and 30 days after, maximum 5 sends per due, skip balances under a set minimum, skip paid dues, respect quiet hours and consent. The outbox `dedupe_key` prevents repeats.

### B5.7 Cheques (`/admin/fees/cheques`)

Tabs by status: received, deposited, cleared, bounced. Each row shows cheque number, bank, date, amount, student, receipt. Actions move a cheque forward. On "Bounced": the cheque payment is reversed (ledger reversal entries, the dues reopen), the receipt status becomes `bounced`, an optional bounce charge can be added as a manual due, and the parent may be notified. With `cheque_receipt_timing = on_clearance`, dues stay open until cleared and the receipt is issued on clearing.

### B5.8 Refunds and adjustments (`/admin/fees/refunds`)

- Refund requests come from the student ledger or a receipt. Fields: amount (cannot exceed paid amount), reason, mode. Refundable heads (for example caution deposit) and credits can be requested by the accountant; refunds of non-refundable heads need owner approval. Status flows requested, approved, paid.
- Paid refunds create ledger entries and appear in the day book as outflow.
- "Adjustment" moves credit between dues or corrects a wrong due (requires reason, appears in the ledger, needs owner approval when the amount is above the threshold).

### B5.9 Day closing (`/admin/fees/day-close`)

Shows the day's totals by mode and by collector, expected cash (opening cash plus cash receipts minus cash refunds), and a denomination counter (notes and coins) for the cash count. The user enters counted cash; the difference is shown in red or green. "Close day" locks the date: receipts dated that day cannot be cancelled or created (including backdating) unless the owner reopens the day with a reason. Print a day book.

### B5.10 Online payments and parent pay link

**Flow for a parent (no password, no app):**

1. The parent receives a WhatsApp message (a reminder or a receipt follow-up) with a button "View and pay fees" that opens `https://{school}.myzkool.com/pay/{token}`. The token is opaque, tied to a parent, and expires in 30 days.
2. The page shows the school name and asks for a one-time code sent to the registered WhatsApp number (6 digits, valid 5 minutes, 3 attempts, rate limited). After verification the session lasts 30 minutes.
3. The parent sees each child as a card with total dues, and can expand to select dues (default: overdue and current term). A single total updates live.
4. "Pay Rs 12,400" starts the gateway checkout (UPI intent on Android, UPI and cards otherwise). Convenience fee, if the school passes gateway charges to the parent, is shown before payment.
5. The result page shows success or failure with plain instructions. On success, a receipt is generated, shown with a download button, and sent on WhatsApp.
6. The page is mobile first, big tap targets, English and Hindi toggle, works on slow networks, and never shows Aadhaar or medical data.

**Server rules:**

- The server recomputes the amount from the selected `due_ids`; it never trusts an amount sent by the client.
- Create an `online_payment_orders` row and a gateway order. Set the order to expire after 30 minutes.
- Create the receipt only after the gateway reports `captured`, in the webhook handler or in the reconciliation job, whichever comes first. Both paths are idempotent by `gateway_order_id`.
- Verify the webhook signature. Store every event in `gateway_webhook_events` with a unique event id and ignore duplicates.
- A reconciliation job runs every 15 minutes: for orders in `created` or `authorised` for more than 10 minutes, query the gateway and finalise or expire them.
- If two parents pay the same due simultaneously, the second capture becomes advance credit (never a double payment on the same due) and the accountant sees an alert.
- Settlement report: match captured orders to gateway settlements, show gateway fees and net payout, and flag mismatches.

### B5.11 Reports (`/admin/fees/reports`)

Each report has filters, an on-screen table with totals, and export to XLSX and PDF, and printing.

| Report | Contents |
|---|---|
| Day book | All receipts, refunds and cancellations for a date, by mode and collector, with totals and cash in hand |
| Collection summary | By date range, split by head, class, mode, collector |
| Outstanding | Class-wise and student-wise balance with aging |
| Defaulters | Students over N days late |
| Concession register | Every concession with rule, reason, approver, amount |
| Cheque register | Status, dates, amounts |
| Refund register | Requests, approvals, payments |
| Cancelled receipts | Number, date, amount, who cancelled, reason |
| Online settlement | Captured, fees, net payout, mismatches |
| Fee head ledger | Demand, collected, concession, balance per head |
| Transport fee report | Route-wise demand and collection (Pro) |
| Year-end summary | Demand, collected, waived, carried forward |

Reports over long ranges must use SQL views or materialised summaries and return within 3 seconds for a school of 1,800 students and 3 years of data.

### B5.12 Approvals (`/admin/approvals`)

A list of pending requests (discounts above threshold, receipt cancellations, refunds, late-fee waivers, backdating, structure changes, TC overrides) with the requester, amount, reason and a one-line impact. The owner approves or rejects with a note. New requests show a badge on the navigation and, if the owner opts in, a WhatsApp alert. At the counter, "Owner override" accepts the owner's PIN (rate limited to 5 tries, then 15 minute lock) and records the approval as `approved by owner via PIN`.

## B6. Business rules

1. **Money and rounding.** All amounts are integer paise. Percent concessions and late fees are calculated in paise then rounded half-up to the nearest whole rupee when `round_to_rupee` is on. When an amount is split across lines, any rounding remainder goes to the last line so parts always sum to the total.
2. **Receipt numbering.** Format `{prefix}/{academic year}/{six-digit sequence}`, for example `MZ/2026-27/000123`. The sequence resets each academic year, is gap free, and comes from `counters` in the same transaction as the receipt. Cancelled numbers are never reused. `[DECISION]` A separate series per collector or counter (default: single series).
3. **Dues generation.** Dues come from the assigned structure's per-term amounts. Generation is idempotent by (student, year, head, term, source). An RTE student receives the RTE concession on heads flagged waivable.
4. **Allocation order.** Default `auto_oldest_first`: previous-year arrears, then late fees, then dues by due date ascending, ties broken by head display order. When the user manually selects dues, allocation applies to exactly those, in that order. In `manual` mode the counter always requires explicit selection.
5. **Partial payments.** Allowed if `allow_partial`. A payment smaller than a due's balance leaves the due `partial`. If `min_partial_paise` is set, payments below it are rejected. Partial payment never creates a new due line.
6. **Concessions.** Applied to the gross of the due; a concession cannot reduce net below zero. Auto-apply rules run at dues generation and on RTE or sibling changes. Concessions above `discount_approval_threshold_percent` of the receipt's dues require owner approval or PIN. Every concession has a reason and appears in the ledger and the concession register. A revoked concession increases the balance of unpaid dues only.
7. **Late fee.** A nightly job at 00:30 Asia/Kolkata evaluates each unpaid due past its due date plus grace days. It creates or updates one `late_fee` due linked to the parent due. Never compounds. `percent_once` is calculated once on the unpaid balance at the first evaluation after grace and then fixed. Payment of the parent due stops further accrual. The job is idempotent by (due, date). Waiving requires `fees.waive_late`, writes a ledger `waiver` entry and records who waived it.
8. **Advance and credit.** If `allow_advance` and the amount exceeds selected dues, the excess is stored in `fee_credits`. Credit auto-applies to the next dues generated for that student, in due-date order, and appears as a visible line on the collect screen. Credit can be refunded on request.
9. **Year-end carry forward.** When an academic year is closed, every student with a balance gets one `carry_forward` due in the new year (system head "Previous year dues") for the exact balance. The old dues become `carried_forward` (not deleted), with a ledger entry. Carry forward is previewed before closing, can be repeated safely, and shows students with balance above a chosen amount for owner review.
10. **Cancellation and reversal.** Receipts are never edited or deleted. Cancelling a receipt requires `fees.receipt.cancel` (or owner PIN with an accountant present), a reason of at least 10 characters, and an open business day. The system reverses ledger entries, restores each affected due's paid amount and status, marks the receipt `cancelled`, keeps the receipt number, and lists it in the cancelled receipts report. To correct a mistake, cancel and issue a new receipt with a new number. A receipt older than the current financial period or on a closed day needs the owner and a reopened day.
11. **Student leaves or changes class mid-year.**
    - On status change to withdrawn or transferred, the system lists dues with a due date after the effective date and offers "Cancel unpaid future dues" (default on). Paid future dues become credit or a refund request, decided by the owner. Past dues stay collectible and block TC issue (Part A).
    - On class change mid-year, the user chooses "Recalculate from next term". Unpaid dues from that term onward are cancelled and replaced from the new class structure. Paid dues are unaffected. The difference is shown before confirming.
12. **Backdating and locked periods.** Receipt date defaults to today and equals the server date. Backdating up to `backdate_days_limit` needs `fees.backdate`; default limit 0 (owner approval per case). Nothing can be created or cancelled on a closed day.
13. **Approval thresholds.** Configurable per school. Default: concession above 10 percent of the due amount, any receipt cancellation by an accountant, any refund of a non-refundable head, any backdating, any late fee waiver over Rs 500, any structure change after dues exist.
14. **Siblings and family payment.** Siblings are students sharing at least one parent record. Sibling concession rules use sibling rank. Family payment creates one receipt per child, linked by `payment_group_id`, and one WhatsApp message.
15. **Transport fee integration.** The Fee module owns dues. The Transport module calls Fee service functions (`createTransportDues`, `cancelTransportDues`, `changeTransportDues`) and never writes to `student_dues` directly. The head "Transport fee" is a locked system head. On Basic these functions return `PLAN_REQUIRED`. See C7 for the assignment rules.
16. **Permissions on data.** Parents see only their own children's dues and receipts. Teachers do not see fee data by default.
17. **Audit.** Structure changes, concession changes, collection, cancellation, refund, waiver, day close and reopen, backdating and setting changes all write audit rows.

## B7. User flows

**B7.1 First-time setup (owner or accountant, about 45 minutes):** open Fees, follow the checklist: add suggested heads, choose terms, build the Class 1 structure in the grid and copy it to other classes with a percentage change, turn on RTE and sibling concessions, set receipt details, generate dues, review the exceptions.

**B7.2 Collect a regular fee (about 30 seconds):** press `/`, type a name or phone, choose the student, review the pre-selected dues, choose Cash, confirm the amount, Ctrl+Enter, press P to print, press N for the next student.

**B7.3 Partial payment:** type a smaller amount, read the allocation preview, collect. The remaining balance shows on the receipt and in the WhatsApp message.

**B7.4 Two children in one payment:** open the first child, open the Siblings tab, add the second child's dues, pay by UPI in one transaction, print both receipts or send one combined WhatsApp message.

**B7.5 Concession at the counter:** add concession, choose "Management discretion", type a reason, if within the threshold it applies immediately, otherwise the owner enters the PIN on the spot.

**B7.6 Cancel a receipt:** open Receipts, find the receipt, choose Cancel, enter the reason, owner PIN or request, confirm the summary of what reverses, then collect again correctly.

**B7.7 Cheque bounce:** Cheques, mark bounced, choose whether to add a bounce charge, review the reopened dues, send a reminder.

**B7.8 Chasing dues:** Defaulters, filter 31 to 60 days late, select all, preview the message, send, record promises, watch the promised-today list.

**B7.9 Online payment:** the parent taps the WhatsApp button, enters the code, selects dues, pays by UPI, receives the receipt. The accountant sees the receipt in the list with source "Online" and reconciles the settlement next day.

**B7.10 Day end:** Day closing, count cash, enter denominations, review the difference, close, print the day book.

**B7.11 Year end:** review outstanding by class, close the year, review the carry forward preview, run it, verify arrears show as "Previous year dues" in the new year.

## B8. Notifications (Fee)

Templates: `fee_receipt`, `fee_receipt_family`, `fee_due_upcoming`, `fee_due_today`, `fee_overdue`, `payment_failed`, `cheque_bounced`, `refund_processed`, `fee_statement`. Bodies in Part D. Receipt and payment confirmations send immediately; reminders follow quiet hours.

## B9. API

Prefix `/api/fee`. Every route requires authentication, school scoping and the permission shown. Money in paise.

| Method and path | Permission | Purpose |
|---|---|---|
| `GET/POST/PATCH /heads` | `fees.read` / `fees.setup` | Fee heads |
| `GET/POST/PATCH /terms` | same | Terms |
| `GET/POST /structures`, `PUT /structures/:id/grid`, `POST /structures/:id/activate`, `POST /structures/copy` | `fees.setup` | Structures and grid |
| `GET/POST/PATCH /concession-rules`, `POST /students/:id/concessions`, `DELETE /students/:id/concessions/:cid` | `fees.setup` / `fees.concession.give` | Concessions |
| `GET/POST/PATCH /late-fee-rules` | `fees.setup` | Late fee rules |
| `GET/PATCH /settings` | `fees.setup` | Settings, owner PIN |
| `POST /dues/generate` (`mode=preview|commit`), `POST /dues/manual`, `POST /students/:id/assign-structure` | `fees.dues.manage` | Dues |
| `GET /collect/search?q=` | `fees.collect` | Counter search |
| `GET /students/:id/collect-context` | `fees.collect` | Dues, credits, siblings, concessions |
| `POST /collect` (header `Idempotency-Key`) | `fees.collect` | Create receipt or receipts |
| `GET /receipts`, `GET /receipts/:id`, `GET /receipts/:id/pdf` | `fees.read` | Receipts |
| `POST /receipts/:id/send`, `POST /receipts/:id/print-log` | `fees.collect` | WhatsApp and print counter |
| `POST /receipts/:id/cancel` | `fees.receipt.cancel` or approval | Cancellation |
| `GET /students/:id/ledger`, `GET /students/:id/statement.pdf` | `fees.read` | Ledger |
| `GET /defaulters`, `POST /reminders/send`, `GET/POST /followups` | `fees.remind` | Defaulters |
| `GET /cheques`, `POST /cheques/:id/status` | `fees.collect` | Cheques |
| `POST /refunds`, `PATCH /refunds/:id` | `fees.refund` | Refunds |
| `GET /day-close/:date`, `POST /day-close`, `POST /day-close/:date/reopen` | `fees.day_close` | Day closing |
| `GET /dashboard`, `GET /reports/:key` | `fees.read`, `fees.reports` | Dashboard and reports |
| `POST /year-close/preview`, `POST /year-close/commit` | owner | Carry forward |
| `GET /approvals`, `POST /approvals/:id/decide`, `POST /approvals/owner-pin` | `fees.approve` | Approvals |
| `POST /public/pay/otp/send`, `POST /public/pay/otp/verify`, `GET /public/pay/dues`, `POST /public/pay/orders` | Token plus OTP session | Parent pay link |
| `POST /webhooks/payments/:gateway` | Signature | Gateway webhook |
| `GET /online/reconciliation` | `fees.reports` | Settlement report |

## B10. Edge cases

- Two counters collect for the same student at the same time: dues are locked with `select ... for update`; the second request sees updated balances and fails with "Dues changed. Review and collect again."
- Payment recorded for a due that has just been cancelled by structure recalculation: rejected with a refreshed dues list.
- Parent pays online and at the counter for the same due: the second becomes advance credit; an alert row appears for the accountant.
- Network drops after the server commits the receipt: the client retries with the same idempotency key and gets the original receipt.
- Amount in words for values such as Rs 1,00,05,000 and paise-level amounts are tested.
- A student with no structure for their class: dues generation lists the exception and the collect screen shows "No fee structure assigned. Assign one" with a button.
- Fee structure changed after payments: only unpaid dues are recalculated; totals in reports show both the old and the recalculated demand in the change log.
- Student moved to a section or class with a different structure: see B6.11.
- Clock and time zone: business date is computed in Asia/Kolkata on the server, never from the client.
- Large families: the collect screen supports at least 6 siblings.
- Printing on thermal paper without a logo: layout falls back gracefully.
- Gateway payment succeeds but the parent's session expired: the webhook still creates the receipt.

## B11. Acceptance criteria and tests

- Property tests on money: the sum of allocation lines equals the amount paid for any random input; no negative balances; rounding remainders land on the last line.
- 50 parallel collects across 10 students produce unique, gap-free receipt numbers and no double payment on any due.
- Retrying `POST /collect` with the same idempotency key returns the original receipt, never a second one.
- Cancelling a receipt restores every due's balance exactly and the ledger sums back to the prior state.
- Late fee job run twice on the same day produces no duplicate lines; waiver writes ledger entries.
- Year close then repeat produces exactly one carry forward due per student.
- Webhook replay (same event id) is ignored; a forged signature is rejected; an order captured only through reconciliation still produces one receipt.
- A closed day rejects creation and cancellation on that date; reopening requires the owner.
- Cross-tenant isolation on every table; a parent token cannot read another parent's dues.
- Collect transaction p95 under 400 ms; counter search p95 under 300 ms; 1,800-student outstanding report under 3 seconds.
- The full collect flow is possible without a mouse; the flow works on a 360 px phone.
- Receipt PDF matches the layout in B5.4 for A5 and 80 mm; amount in words is correct for a table of at least 30 test values.

---

# PART C: TRANSPORT MODULE

Route root: `/admin/transport`. **Pro plan only.** Every route, table and realtime channel in this part is gated on the server (section 1.5). On Basic, the sidebar shows Transport in a locked state with a preview screen and an "Upgrade to Pro" action.

## C1. Purpose and scope

The Transport module manages the school's vehicles, drivers, routes and stops, connects students to routes, bills transport fees through the Fee module, records who boarded and who was dropped, and (in a later phase) shows parents where the bus is. In a small city, the bus is the part of the school day parents worry about most, so reliability and child safety come before features.

In scope: vehicles and compliance documents, drivers and attendants, routes and stops, fee zones, student assignment (assign, change, stop, renew), transport requests, driver app (PWA) with trips and boarding records, guardian handover, bus-empty check, delay notices, document expiry alerts, reports, live tracking and parent tracking page (Phase 9), maintenance log (later).

Out of scope: payroll for drivers, fuel purchase accounting, route optimisation algorithms, hardware GPS integrations beyond a webhook interface.

## C2. Permissions

| Capability (permission key) | owner | admin | accountant | transport_manager | driver | parent |
|---|---|---|---|---|---|---|
| View transport data (`transport.read`) | Yes | Yes | Read fee zones and dues only | Yes | Own route only | Own child only |
| Manage vehicles, staff, routes, stops (`transport.manage`) | Yes | No | No | Yes | No | No |
| Manage fee zones (`transport.fees.manage`) | Yes | No | Yes | Propose only | No | No |
| Assign, change, stop students (`transport.assign`) | Yes | Yes | No | Yes | No | No |
| Override capacity or expired-document blocks (`transport.override`) | Yes | No | No | Owner approval | No | No |
| Run trips in the driver app (`transport.trips.run`) | Yes | No | No | Yes | Yes | No |
| Send delay notices (`transport.notify`) | Yes | No | No | Yes | No | No |
| View live location (`transport.tracking.view`) | Yes | No | No | Yes | Own trip | Own child's bus during a trip |
| Reports (`transport.reports`) | Yes | Yes | Yes | Yes | No | No |

## C3. Data model

```
transport_settings                      -- one row per school
  school_id pk, fee_basis ('stop'|'zone'|'distance') default 'zone',
  billing_months int[] default {4,5,6,7,8,9,10,11,12,1,2,3},     -- months in which transport is billed
  run_days int[] default {1,2,3,4,5,6},                            -- Monday=1
  drop_order ('reverse'|'same') default 'reverse',
  require_pretrip_checklist bool default false,
  guardian_handover_stages text[] default {'pre_primary'},          -- stages needing guardian at the drop stop
  block_expired_documents bool default true,
  expiry_alert_days int[] default {30,15,7,1},
  tracking_enabled bool default false, notify_boarding bool default false,
  notify_approaching bool default true, approaching_meters int default 800,
  partial_month_rule ('full_month'|'from_next_month') default 'full_month'

transport_vehicles
  id, school_id, registration_no text (unique per school, uppercase, spaces removed),
  vehicle_type ('bus'|'mini_bus'|'van'|'auto'|'other'), make_model, manufacture_year,
  capacity int,                                   -- student seats only
  fuel_type, ownership ('owned'|'contract'), vendor_name null, vendor_phone null,
  gps_device_id null, odometer_km null,
  safety_items jsonb,                             -- toggles: first_aid, fire_extinguisher, speed_governor, cctv, gps, attendant_seat
  status ('active'|'maintenance'|'retired'), notes

vehicle_documents
  id, school_id, vehicle_id, doc_type ('rc'|'insurance'|'fitness'|'puc'|'road_tax'|'permit'|'speed_governor'|'other'),
  doc_number, issued_on null, expires_on, file_path null, is_mandatory bool

transport_staff                                  -- drivers and attendants
  id, school_id, staff_type ('driver'|'attendant'), full_name, phone (unique per school), photo_path null,
  license_no null, license_class null, license_expires_on null, badge_no null,
  police_verified_on null, medical_fit_on null, experience_years null,
  address null, emergency_contact_name null, emergency_contact_phone null,
  id_proof_type null, id_proof_last4 null, joined_on, status ('active'|'inactive'), user_id null

staff_documents
  id, school_id, staff_id, doc_type ('license'|'police_verification'|'id_proof'|'medical'|'other'), expires_on null, file_path

transport_routes
  id, school_id, name, code, description null,
  default_vehicle_id null, default_driver_id null, default_attendant_id null,
  pickup_start_time time, drop_start_time time, est_duration_min int,
  status ('draft'|'active'|'inactive')

route_stops
  id, school_id, route_id, name, landmark null, lat numeric null, lng numeric null,
  sequence int, pickup_time time, drop_time time, distance_km numeric null, fee_zone_id null
  unique (route_id, sequence)

transport_fee_zones
  id, school_id, name, distance_from_km null, distance_to_km null,
  monthly_fee_paise, pickup_only_monthly_paise, drop_only_monthly_paise, is_active

transport_requests
  id, school_id, student_id, requested_location text, note null, status ('pending'|'approved'|'rejected'), decided_by null, created_at

transport_assignments                            -- history kept; one active row per student per year
  id, school_id, student_id, academic_year_id, route_id, pickup_stop_id, drop_stop_id,
  service_type ('both'|'pickup_only'|'drop_only'),
  effective_from date, effective_to date null,
  monthly_fee_paise bigint,                       -- snapshot at assignment
  requires_guardian_handover bool, status ('active'|'ended'), end_reason null,
  created_by, created_at
  exclusion: no overlapping active ranges for the same student

transport_absences                                -- office marks "not travelling"
  id, school_id, student_id, date_from, date_to, reason null, created_by

transport_trips
  id, school_id, route_id, trip_date, direction ('pickup'|'drop'),
  vehicle_id, driver_id, attendant_id null, override_reason null,
  status ('scheduled'|'in_progress'|'completed'|'cancelled'),
  scheduled_start timestamptz, started_at null, ended_at null, cancelled_reason null,
  bus_empty_confirmed_at null, bus_empty_confirmed_by null
  unique (route_id, trip_date, direction)

trip_checklists
  id, trip_id, items jsonb, completed_by, completed_at

trip_stop_events
  id, trip_id, stop_id, arrived_at null, departed_at null, client_event_id unique, source ('driver'|'attendant'|'admin')

trip_boarding_events                              -- immutable log; corrections are new rows
  id, school_id, trip_id, student_id, stop_id, event ('boarded'|'dropped'|'absent'|'not_travelling'|'no_show'),
  handed_over_to_parent_id null, occurred_at timestamptz, recorded_at timestamptz,
  client_event_id unique, corrects_event_id null, recorded_by, source

trip_location_pings                               -- Phase 9
  id, trip_id, lat, lng, speed_kmh null, heading null, accuracy_m null, recorded_at

vehicle_maintenance                               -- Phase 10
  id, school_id, vehicle_id, kind ('service'|'repair'|'tyre'|'accident'|'breakdown'|'inspection'),
  done_on, cost_paise null, odometer_km null, vendor null, notes null, next_due_on null, next_due_km null
```

Every table above has RLS requiring `school_id = current_school_id()` and `school_has_feature('transport')`. Parent and driver access is expressed through additional narrow policies (a driver reads only the routes, riders and trips assigned to their `transport_staff.user_id`).

## C4. Setup screens

### C4.1 Transport dashboard (`/admin/transport`)

Lead with what needs action.

1. **Needs attention:** documents expired or expiring in 30 days (vehicles and drivers), routes with no driver or vehicle, routes over capacity, students with a pending transport request, trips today that have not started 10 minutes after schedule.
2. **Today:** a compact board of today's trips (pickup and drop per route) with status, driver, boarded count and delay flags. Click a trip to open its live detail.
3. **Fleet snapshot:** vehicles active, routes active, students using transport, seat utilisation (for example "412 of 520 seats, 79 percent") shown as one bar per route.
4. Primary actions: "Assign students", "Add route", "Add vehicle".

### C4.2 Vehicles (`/admin/transport/vehicles`)

List: registration number, type, capacity, assigned routes, document status chip (Valid, Expiring in N days, Expired), status. Filter by status and document state.

Vehicle profile (page with tabs): Overview (details, safety items toggles, assigned routes, seats used), Documents, Maintenance (Phase 10), Trips (history).

Documents tab: a card per document type (RC, insurance, fitness, PUC, road tax, permit, speed governor certificate) with number, issue date, expiry date, file, and a status chip. Missing mandatory documents show as "Not added" in amber. Adding a document requires the expiry date. Renewal replaces the current document but keeps the old file in history.

Safety items are plain toggles (first aid box, fire extinguisher, speed governor, CCTV, GPS, attendant seat). State and board rules differ, so the module records what the vehicle has and does not assert what the law requires; the school confirms which items apply. `[DECISION]` Whether to add a configurable safety checklist that blocks trips when items are missing.

Retiring a vehicle with active routes is blocked until routes are reassigned.

### C4.3 Drivers and attendants (`/admin/transport/staff`)

List with role, phone, license expiry chip, police verification date, assigned route, status. Profile: personal details, license (class, number, expiry), badge number, police verification date, medical fitness date, emergency contact, documents (uploads, expiry where relevant), assigned routes, trip history. ID proof shows only the last four digits (same masking rule as Aadhaar).

Driver login: "Invite to driver app" sends a WhatsApp link to the driver's phone; the driver signs in with a one-time code, no password. Deactivating a staff member revokes access immediately.

### C4.4 Routes and stops (`/admin/transport/routes`)

**Route list:** name, code, vehicle, driver, stops count, riders count, seat meter, pickup and drop start time, status.

**Route builder** (page with a left column for route details and a main area for stops):

- Route details: name, code, default vehicle, driver and attendant (each checks compliance and overlaps), pickup start time, drop start time, estimated duration.
- **Stops list:** vertical timeline. Each stop row: drag handle, sequence number (this is a real sequence), stop name, landmark, pickup time, drop time, monthly fee zone (or fee), riders assigned count. Add a stop at the end or between stops. Reordering recomputes times with a prompt "Shift following times by the same amount?".
- **Time helper:** enter the first pickup time and the average minutes between stops; times fill automatically and stay editable. "Generate drop times" reverses the sequence (`drop_order = reverse`) or copies pickup times.
- **Map panel (optional):** an OpenStreetMap map (Leaflet) where the user drops a pin to set latitude and longitude for a stop; without coordinates everything else still works. Coordinates are required only for live tracking and approaching alerts. `[DECISION]` Map provider (default OpenStreetMap tiles, no key cost).
- **Seat meter:** "32 of 40 seats used" with a per-stop rider count. Over capacity turns red with a message.
- **Route sheet:** "Print route sheet" produces the driver's roster (stops in order with rider names, class, guardian phone, times).
- Validation: sequence must be continuous, times must increase along the sequence, a stop with riders cannot be deleted (reassign first), and a route with no vehicle or driver stays `draft` and cannot generate trips.

### C4.5 Fee zones (`/admin/transport/fees`)

Choose the basis:

- **By zone:** create zones (for example "Zone A, up to 5 km") with a monthly fee for both ways, and separate pickup-only and drop-only monthly fees. Assign each stop a zone.
- **By stop:** each stop has its own monthly fees (the screen creates a hidden zone per stop).
- **By distance:** zones are defined by km ranges; a stop's zone is chosen from its `distance_km` automatically.

The screen shows a table (zone, fee both ways, pickup only, drop only, stops using it, riders using it). Changing a fee asks "Apply to new assignments only" (default) or "Also apply to existing riders from [term]" with a preview of affected students and total change; the second option needs `transport.fees.manage` and creates an `approval_requests` row for the owner when the change is above the fee threshold. Billing months (which months carry transport fees) are set here.

## C5. Assignment screens

### C5.1 Assign from the student profile (Transport tab)

"Add transport" opens a right-hand drawer with these steps in one scroll:

1. Route (search by name or stop). Each option shows seats left ("6 seats left") and the vehicle.
2. Pickup stop, and drop stop (defaults to the same). Stops show times. A chip shows if a sibling already uses the route ("Riya, Class 2-B, uses this route").
3. Service type: both ways, pickup only, drop only. The fee updates live: "Rs 1,200 per month".
4. Effective from (default today).
5. Guardian handover at drop: default on for pre-primary students, editable.
6. "Save assignment": creates the assignment and the fee dues through the Fee service (rule C7.4), shows a success state with "Send details to parent on WhatsApp" (template `transport_assigned`) and "Print transport slip".

If the route is full, the save button becomes "Request capacity override" with a reason field, visible to owner and transport manager.

### C5.2 Bulk assignment (`/admin/transport/assign`)

Two panes. Left: students without transport (search, filter by class, showing address locality and landmark to help matching) plus a "Requests" tab listing pending `transport_requests`. Right: a route selector with its stops as a list, each stop showing seats used. The user selects students, selects a stop (and service type), and presses "Assign selected". A confirmation summary lists the students, stop, monthly fee and total monthly change in demand. Seat limits apply, and over-capacity is blocked with an override request.

### C5.3 Change or stop transport

- **Change route or stop:** dialog with the new route, stop, service type and the effective date. A preview shows the fee effect: unpaid dues from the effective term are cancelled, new dues at the new rate are created, and any amount already paid ahead is shown as credit. The old assignment ends the day before the effective date and a new one begins.
- **Stop transport:** effective date and reason (required). Unpaid dues after that date are cancelled; paid future dues become credit for owner review (Fee rule B6.11). The student is removed from future trips' rider lists.
- **Not travelling today or a date range:** quick action "Mark not travelling" (from the student profile or a route roster). The driver app shows these students as "Not travelling" so the driver does not wait for them.

### C5.4 Year renewal (`/admin/transport/renewal`)

At year change, assignments do not carry over silently. The renewal page lists last year's riders who are promoted (not passed out or left) with their previous route, stop and the new fee. The transport manager reviews and confirms in bulk (select all, uncheck exceptions). Confirming creates new assignments for the new year and generates dues through the Fee service. Unrenewed students appear in "Not renewed" for follow-up.

## C6. Driver app and trips

### C6.1 Trip generation

A nightly job creates the next day's trips for every active route, in both directions, on the days in `run_days` (also skipping dates the school has marked as holidays). Each trip copies the route's default vehicle, driver and attendant. The transport manager can change the vehicle or driver of a trip on the day (a reason is required; the new driver gets a WhatsApp notice), or cancel a trip with a reason (parents on the route are notified only if the manager chooses to).

### C6.2 Driver app (`/driver`, installable PWA)

Design goals: works with one hand, in early morning light and on a low-end Android phone, with minimal typing and intermittent internet.

- **Sign in:** phone number and one-time code. The session lasts 30 days on the device.
- **Home:** today's trips as large cards ("Morning pickup, Route 3, 7:15, 32 students, UP32 AB 1234") with a status and a single primary button "Start trip". Cards for later trips are visible but inactive.
- **Roster download:** the day's roster (students, photos, stops, guardian phones for tap-to-call, pickup authorisations) is downloaded when the app opens with a connection and cached until the end of the day.
- **Pre-trip checklist** (if enabled): four or five items (tyres, fuel, first aid box, fire extinguisher, brakes) each a one-tap toggle, then "Start trip".
- **Trip screen:** a vertical list of stops in order with the current stop highlighted. The header shows the trip status and counts (boarded, absent, remaining). Tap a stop to expand its riders. Each rider row shows a large photo, name and class, with two large buttons: "Boarded" and "Absent" (pickup) or "Dropped" (drop). Buttons are at least 56 px high. Tapping is instant (optimistic) and queued if offline. Riders flagged "Not travelling" are shown greyed and pre-marked.
- **Arrived at stop:** a button per stop that timestamps arrival. Once the stop's riders are handled, "Next stop" moves the highlight.
- **Unlisted rider:** "Add rider not on list" lets the driver search the school's riders on any route by name (restricted to name and class), which records the event and flags the trip for the transport manager.
- **Guardian handover (drop trips):** for riders with `requires_guardian_handover`, "Dropped" becomes "Handed over" and asks the driver to pick who received the child from the authorised people list (names only, from `can_pickup` parents). If nobody authorised is present, the driver taps "Not handed over" and the child stays on the bus, the office is alerted, and the driver sees the guardian's phone to call.
- **End of trip:** "End trip" is available after the last stop. The **bus empty check** is a required step: a screen with "I have checked every seat. No child is left on the bus." and a confirm button; the timestamp and driver are stored. Trip summary shows boarded, absent, dropped and unresolved riders. Unresolved riders (for example boarded in the morning but never dropped) block trip completion and alert the office.
- **Delays and issues:** "Report a problem" with three choices (breakdown, delay, other) and an optional note; the transport manager sees it instantly.
- **Attendant device:** an attendant on the same trip sees the same list. Both can record events; events are merged by `client_event_id`, and conflicts (for example boarded and absent for the same child) appear in the trip timeline for review instead of being silently overwritten.
- **Data minimisation:** the app shows only the current trips' riders: name, class, photo, stop, and the guardian phone for tap-to-call. No addresses, no fee data, no medical data, no Aadhaar.
- **Offline:** every event is stored in IndexedDB with `client_event_id` and `occurred_at`, then synced in order when the connection returns, with a visible "3 events waiting to send" strip. The server accepts events idempotently by `client_event_id`. This is the one place where offline writes are allowed, because the driver cannot wait for signal to mark a child.
- **Language and theme:** English and Hindi toggle, high contrast, automatic dark mode.

### C6.3 Trips board (admin, `/admin/transport/trips`)

Today's trips as a table with route, direction, vehicle, driver, scheduled and actual start, status chip, boarded and absent counts, and flags (late start over 10 minutes, unresolved riders, bus-empty check missing). Click a trip to see its stop-by-stop timeline and boarding log. History filters by date, route, driver and vehicle. The transport manager can send a delay notice from here (C8.4).

## C7. Assignment rules and fee integration

1. **One active assignment per student per academic year.** Pickup and drop may be different stops on the same route. `[DECISION]` Allow different routes for pickup and drop (default: same route only).
2. **Capacity.** A route's seats used equals the number of students with an active assignment on it. Assignment is blocked when it would exceed the assigned vehicle's `capacity`, unless an owner override with a reason is recorded.
3. **Compliance blocks.** With `block_expired_documents` on, a vehicle with an expired mandatory document or a driver with an expired license cannot be assigned to a route or a trip. An override needs `transport.override` and a reason, and is audited. Existing trips show a red banner instead of being cancelled.
4. **Fee creation.** Saving an assignment calls the Fee service `createTransportDues(assignmentId)`, which creates dues in `student_dues` with head "Transport fee", `source = 'transport'` and `source_ref = assignment id`. Amounts are computed per term as `monthly_fee_paise` multiplied by the number of `billing_months` inside the term, starting from `effective_from` per `partial_month_rule`. If fee creation fails, the assignment is rolled back in the same transaction.
5. **Snapshot.** The monthly fee is copied onto the assignment at creation. Later zone fee changes affect only new assignments unless the owner runs "Apply new fee to existing riders" (C4.5).
6. **Change.** `changeTransportDues` cancels unpaid transport dues from the effective term and creates new ones. Paid amounts stay paid; the difference becomes a credit or a new due depending on the direction of change.
7. **Stop.** `cancelTransportDues` cancels unpaid dues after the effective date; paid future dues become credit for owner review.
8. **Student leaves school.** When a student's status changes to withdrawn or transferred (Part A), an active assignment is ended on the effective date with the same Fee handling.
9. **Renewal.** Assignments do not roll over automatically (C5.4).
10. **Plan change.** If a school moves from Pro to Basic, no assignment is ended; new assignments and edits are blocked; existing dues remain collectible.

## C8. Live tracking and parent notifications (Phase 9)

### C8.1 Location capture

The driver app can publish location while a trip is `in_progress`. A web app cannot track reliably in the background on many phones, so the default approach is a mounted phone with the app open and the screen kept awake using the Wake Lock API, and a persistent on-screen reminder while a trip runs. `[DECISION]` Choose the tracking approach before Phase 9: (a) driver phone PWA (default, no hardware cost), (b) a native wrapper app with background location, or (c) hardware GPS trackers sending data through a webhook. The data model and the parent page are the same in all three.

- Ping every 10 seconds while moving and every 30 seconds when stationary, batching uploads when connectivity is poor.
- Store pings in `trip_location_pings`. Keep raw pings for 30 days for incident review, then keep only a simplified trace.
- Stop capture immediately when the trip ends or is cancelled.

### C8.2 Live map (admin)

`/admin/transport/live`: map of all in-progress trips with a bus marker, route line, stops, and a side list (trip, driver, speed, last update, stops completed). Stale locations (no ping for 2 minutes) turn grey with "Last seen 3 min ago". Access is limited to `transport.tracking.view`.

### C8.3 Parent tracking page

- The parent receives a WhatsApp message when the trip starts (`bus_tracking_link`) with a signed link opening `https://{school}.myzkool.com/track/{token}`. No login. The token is tied to a student and route and expires when the trip ends.
- The page shows a map with the bus, the child's stop, status text such as "Bus is 4 stops away, about 12 minutes" and the last update time. ETA in the first version is distance to the stop divided by the recent average speed, clearly labelled approximate.
- It shows nothing outside an active trip, shows only this child's bus, never lists other riders and never shows location history.
- It is hidden if the child is marked absent for that trip.

### C8.4 Notifications (Transport)

| Trigger | Message | Default |
|---|---|---|
| Trip started | `bus_tracking_link` to parents of riders on the trip | On when tracking enabled |
| Rider boarded | `bus_boarded` | Off (`notify_boarding`) |
| Approaching a stop (within `approaching_meters` or about 5 minutes) | `bus_approaching`, once per stop per trip | On when tracking enabled |
| Rider dropped or handed over | `bus_dropped` | On |
| Delay | `bus_delayed`, sent manually by the transport manager after confirming minutes | Manual |
| Assignment created, changed or stopped | `transport_assigned`, `transport_changed`, `transport_stopped` | On |
| Document expiring | In-app and WhatsApp to owner and transport manager at each `expiry_alert_days` value | On |

Messages follow the framework in section 1.9 (consent, dedupe, quiet hours except live trip alerts).

## C9. Reports and alerts

| Report | Contents |
|---|---|
| Route roster | Printable list per route, stops in order, riders, class, guardian phone, times |
| Riders by route and stop | Counts and names, exportable |
| Vehicle utilisation | Seats used versus capacity per vehicle and per route |
| Document expiry | All vehicle and staff documents with expiry status, filter by window |
| Unassigned and requests | Students who requested transport and have none |
| Trip performance | On-time starts, delays, cancellations by route and driver |
| Boarding and absence | Per student and per route for a date range |
| Transport fee | Route-wise demand, collected, outstanding (links to Fee reports) |
| Assignment history | Route and stop changes with dates and who made them |
| Maintenance cost per vehicle | Phase 10 |

A daily job at 08:00 Asia/Kolkata evaluates document expiry and writes in-app notifications and outbox messages (deduped by document and threshold).

## C10. Business rules (summary and additions)

1. Registration number is unique per school, stored uppercase without spaces.
2. A vehicle can serve several routes only if their scheduled windows (start time plus estimated duration) do not overlap.
3. A driver or attendant cannot be assigned to two overlapping trips.
4. Route stops have a continuous unique sequence; times must increase along the sequence.
5. Deleting is soft; vehicles, routes, stops, staff and assignments with history are archived, never removed.
6. Boarding events are immutable; corrections add a new event that references the original.
7. Guardian handover is recorded with the parent chosen from the student's `can_pickup` parents.
8. A trip cannot be completed with unresolved riders or without the bus empty check (admin can complete with a reason).
9. Only current trip riders are exposed to a driver; RLS enforces this, not just the UI.
10. Every override (capacity, document, trip reassignment) needs a reason and is audited.

## C11. User flows

**C11.1 Set up transport (about 2 hours for a 10 bus school):** add vehicles and their documents, add drivers and attendants, set fee basis and zones, build each route with stops and times, assign the default vehicle and driver, review the dashboard for warnings.

**C11.2 Enrol a student:** student profile, Transport tab, Add transport, choose route and stop, confirm fee, save, send details to the parent on WhatsApp.

**C11.3 Bulk assign a class after admissions:** Assign students page, filter class, select students living near the same stop, choose the stop, assign, review the total.

**C11.4 Daily run:** the driver opens the app, starts the trip, marks children at each stop, arrives at school, completes the bus empty check, ends the trip. The office watches the trips board.

**C11.5 Bus breaks down:** driver taps Report a problem, the transport manager reassigns the trip to a spare vehicle, the new vehicle and driver appear on the trip, the manager sends a delay notice to the route's parents.

**C11.6 Document expiry:** an alert arrives 30 days before a vehicle's insurance expires, the manager uploads the renewed document with its new expiry date, the chip turns green.

**C11.7 Year renewal:** Renewal page, review last year's riders, confirm in bulk, new dues appear in the Fee module.

## C12. Notifications (Transport)

Templates: `transport_assigned`, `transport_changed`, `transport_stopped`, `bus_tracking_link`, `bus_boarded`, `bus_approaching`, `bus_dropped`, `bus_delayed`, `transport_doc_expiry`. Bodies in Part D.

## C13. API

Prefix `/api/transport`. All routes use `requireFeature('transport')`.

| Method and path | Permission | Purpose |
|---|---|---|
| `GET/POST/PATCH /vehicles`, `GET/POST/PATCH /vehicles/:id/documents` | `transport.read` / `transport.manage` | Vehicles and documents |
| `GET/POST/PATCH /staff`, `POST /staff/:id/invite` | same | Drivers and attendants |
| `GET/POST/PATCH /routes`, `PUT /routes/:id/stops` (ordered list), `GET /routes/:id/sheet` | same | Routes and stops |
| `GET/POST/PATCH /fee-zones`, `POST /fee-zones/:id/apply-to-existing` | `transport.fees.manage` | Fee zones |
| `GET /students/:id/transport`, `POST /assignments`, `POST /assignments/:id/change`, `POST /assignments/:id/stop` | `transport.assign` | Assignment lifecycle |
| `POST /assignments/bulk` | `transport.assign` | Bulk assign |
| `GET/POST /requests`, `PATCH /requests/:id` | `transport.assign` | Transport requests |
| `POST /absences` | `transport.assign` | Not travelling |
| `GET /renewal/preview`, `POST /renewal/commit` | `transport.assign` | Year renewal |
| `GET /trips`, `GET /trips/:id`, `PATCH /trips/:id` (reassign or cancel) | `transport.read` / `transport.manage` | Trips |
| `GET /driver/today`, `POST /driver/trips/:id/start`, `POST /driver/events` (batched, idempotent), `POST /driver/trips/:id/bus-empty`, `POST /driver/trips/:id/end`, `POST /driver/problems` | `transport.trips.run` | Driver app |
| `POST /trips/:id/locations` (batched) | `transport.trips.run` | Location pings (Phase 9) |
| `GET /live`, `GET /trips/:id/trace` | `transport.tracking.view` | Admin live view |
| `GET /public/track/:token` | Signed token | Parent tracking data |
| `POST /trips/:id/delay-notice` | `transport.notify` | Delay notice |
| `GET /dashboard`, `GET /reports/:key` | `transport.read`, `transport.reports` | Dashboard and reports |
| `GET/PATCH /settings` | `transport.manage` | Transport settings |

## C14. Edge cases

- Two students in the same family on the same route: seats count separately; the drawer shows the sibling chip; the family shares one stop by default.
- Student changes address mid-year: change stop, effective date, fee recalculated by rule C7.6.
- Driver's phone dies or has no signal for a whole trip: the office can record boarding events for the trip from the admin trips page (source `admin`), each requiring the trip to be selected and the student list to be reviewed.
- Two trips overlap because a route ran late: the next trip start warns but does not block.
- Public holiday not in the calendar: the manager cancels the day's trips in one action ("Cancel all trips today") with a reason and an optional notice to parents.
- A vehicle's capacity is edited below current riders: the change is blocked with a list of routes to fix.
- A stop is renamed: history keeps the stop id, not the old name; reports show the current name.
- Driver removed while a trip is in progress: the trip continues with the recorded driver; the assignment applies from the next trip.
- Parent's phone number changed: tracking links are re-sent to the new number on the next trip.
- Fee zone deleted while used: blocked; deactivate instead.
- Student moves to Basic-only behaviour after plan downgrade: read-only display, message explains the plan.

## C15. Acceptance criteria and tests

- Every Transport endpoint returns 402 `PLAN_REQUIRED` for a Basic school, and direct table queries under a Basic school's JWT return zero rows (RLS test).
- Assigning student 41 to a 40-seat route fails without an override; an override stores a reason and an audit row.
- A vehicle with an expired insurance document cannot be assigned to a route when blocking is on; the owner override is audited.
- Assign, change and stop each produce correct Fee dues (verified against the Fee ledger) and roll back fully if the Fee service fails.
- The driver API returns only the caller's trips and riders; querying another route's data returns 403 and an RLS-level empty result.
- Offline test: 50 boarding events queued offline sync in order, twice, with no duplicates.
- Ending a trip without the bus empty check or with unresolved riders is rejected; the admin override is audited.
- Guardian handover records the selected authorised parent; choosing someone who is not authorised is not possible.
- Notifications: opted-out parents receive nothing; tracking links expire when the trip ends; approaching alerts fire once per stop per trip.
- Live tracking: a parent link shows only that child's bus, only during a trip, and returns 404 afterwards.
- Document expiry job creates exactly one alert per document per threshold.
- Trip generation is idempotent and respects `run_days`.
- The driver app is usable at 360 px, all primary buttons at least 56 px high, and works after loading once and then going offline.

---

# PART D: CROSS-MODULE RULES, NAVIGATION AND MESSAGES

## D1. Module boundaries

Modules talk through service functions, never by writing into each other's tables.

| Service function | Owned by | Called by | Purpose |
|---|---|---|---|
| `StudentService.getSummary(studentId)` | Students | Fee, Transport | Name, class, section, parents, status, photo |
| `StudentService.listByIds(ids)` | Students | Fee, Transport | Bulk lookup for tables and reports |
| `FeeService.getStudentBalance(studentId)` | Fee | Students, Transport | Dues chip on the list and profile |
| `FeeService.assignStructure(studentId)` | Fee | Students | Auto assignment at admission |
| `FeeService.createTransportDues(assignmentId)` | Fee | Transport | Creates transport dues |
| `FeeService.changeTransportDues(assignmentId, newAssignmentId)` | Fee | Transport | Route or fee change |
| `FeeService.cancelTransportDues(assignmentId, effectiveDate)` | Fee | Transport, Students | Stop or leave |
| `FeeService.cancelFutureDues(studentId, effectiveDate)` | Fee | Students | Withdrawal or transfer |
| `FeeService.carryForward(yearId)` | Fee | Year close | Arrears |
| `TransportService.getStudentTransport(studentId)` | Transport | Students | Route chip and Transport tab |
| `TransportService.endAssignment(studentId, date, reason)` | Transport | Students | Withdrawal or transfer |
| `PlanService.hasFeature(schoolId, feature)` | Platform | All | Gating helper |

Rules: a service function that changes money runs inside the caller's database transaction; failures roll back the whole action; every function checks permission and plan itself.

## D2. Events that cross modules

| Event | Effects |
|---|---|
| Student admitted | Enrollment created; fee structure assigned and dues generated (if `auto_assign_fee_on_admission`); admission WhatsApp; success screen offers transport (Pro) |
| Student class changed mid-year | Prompt for fee recalculation (B6.11); no automatic change to transport |
| RTE flag or category changed | Concession rules re-run; approval request if a manual concession changes |
| Student marked withdrawn or transferred | Dues check for TC; future dues cancelled per B6.11; transport assignment ended (C7.8); TC issued |
| Student archived | Requires zero dues or owner override; hidden from default lists; all records retained |
| Promotion committed | New enrollments created; fee arrears carried forward only at year close (B6.9); transport renewal page lists promoted riders |
| Academic year closed | Carry forward preview and commit; drafts cleared; transport renewal opened |
| Parent phone changed | Outbox recipients update; parent pay and tracking tokens are reissued at the next message |
| Plan downgraded to Basic | Transport becomes read-locked; existing transport dues remain collectible; new transport actions rejected |
| Student count reaches the plan limit | Owner warned at 90 percent; creation blocked at 100 percent |

## D3. Navigation (information architecture)

Left navigation, in this order:

- Dashboard
- Students: All students, Add student, Import, Promotion
- Fees: Overview, Collect fee, Receipts, Dues and defaulters, Cheques, Refunds, Day closing, Reports, Setup
- Transport (Pro): Overview, Trips today, Live map, Routes, Vehicles, Drivers and attendants, Assign students, Renewal, Reports, Settings
- Approvals (badge for pending count)
- Settings: School profile, Academic years, Classes and sections, Users and permissions, Document types, Reminders, Message templates, Plan and billing, Audit log

Items are hidden when the user lacks the permission. Transport items on Basic are shown once, as a single locked "Transport" entry.

Global search (`/`), the academic year switcher and the user menu live in the top bar. "Collect fee" and "Add student" are also available as quick actions in the top bar for permitted roles.

## D4. WhatsApp templates (drafts for approval)

All are in the utility category. English drafts are below; add Hindi versions before submission. `{{n}}` are template variables. Do not add emojis. Keep each under 400 characters. `{{school}}` is the school name in every message.

| Key | Sent when | Draft body |
|---|---|---|
| `admission_confirmation` | Student saved | Hello {{1}}, {{2}} has been admitted to Class {{3}} at {{4}}. Admission number: {{5}}. For any query, call {{6}}. |
| `docs_pending` | Manual or 7 days after admission | Hello {{1}}, these documents for {{2}} are still pending at {{3}}: {{4}}. Please submit them by {{5}}. |
| `tc_issued` | TC issued | Hello {{1}}, Transfer Certificate {{2}} for {{3}} has been issued by {{4}}. You can collect it from the school office. |
| `fee_receipt` | Receipt created | Hello {{1}}, we received Rs {{2}} for {{3}} on {{4}}. Receipt number: {{5}}. Balance dues: Rs {{6}}. Download your receipt: {{7}}. {{8}} |
| `fee_receipt_family` | Family payment | Hello {{1}}, we received Rs {{2}} on {{3}} for {{4}}. Receipts: {{5}}. Remaining dues: Rs {{6}}. {{7}} |
| `fee_due_upcoming` | Reminder rule | Hello {{1}}, fee of Rs {{2}} for {{3}} is due on {{4}}. Pay online: {{5}}. {{6}} |
| `fee_due_today` | Reminder rule | Hello {{1}}, fee of Rs {{2}} for {{3}} is due today. Pay online: {{4}}. {{5}} |
| `fee_overdue` | Reminder rule | Hello {{1}}, fee of Rs {{2}} for {{3}} is overdue by {{4}} days. Pay online: {{5}}, or visit the school office. {{6}} |
| `payment_failed` | Online payment failed | Hello {{1}}, your payment of Rs {{2}} for {{3}} did not go through. No amount is due from you for this attempt. Try again: {{4}}. {{5}} |
| `cheque_bounced` | Cheque bounced | Hello {{1}}, the cheque {{2}} of Rs {{3}} for {{4}} was returned by the bank. Please contact the school office to pay the dues. {{5}} |
| `refund_processed` | Refund paid | Hello {{1}}, a refund of Rs {{2}} for {{3}} has been processed by {{4}} on {{5}}. |
| `fee_statement` | Manual | Hello {{1}}, here is the fee statement for {{2}} from {{3}}: {{4}}. |
| `transport_assigned` | Assignment saved | Hello {{1}}, {{2}} is assigned to {{3}}. Pick-up: {{4}} at about {{5}}. Drop-off: {{6}} at about {{7}}. Bus: {{8}}. Driver: {{9}}, {{10}}. |
| `transport_changed` | Route or stop changed | Hello {{1}}, transport for {{2}} has changed from {{3}}. New route: {{4}}, stop: {{5}}, pick-up about {{6}}. Effective from {{7}}. |
| `transport_stopped` | Assignment ended | Hello {{1}}, school transport for {{2}} has been stopped from {{3}}. |
| `bus_tracking_link` | Trip started | Hello {{1}}, the bus for {{2}} has left. Track it here: {{3}}. The link works until the trip ends. |
| `bus_boarded` | Optional | {{1}} boarded the bus at {{2}} ({{3}}). |
| `bus_approaching` | Geofence | The bus is about {{1}} minutes from {{2}}'s stop, {{3}}. |
| `bus_dropped` | Drop recorded | {{1}} was dropped at {{2}} at {{3}}. |
| `bus_delayed` | Manager sends | Bus {{1}} on {{2}} is running about {{3}} minutes late today. We will update you if this changes. {{4}} |
| `transport_doc_expiry` | Expiry job (staff) | {{1}} of {{2}} expires on {{3}}. Please renew it. |

Each template row in the registry stores approval status; the app must not attempt to send a template that is not approved and shows a clear message in Settings, Message templates.

## D5. Reporting and export rules

- Every report and list export logs who exported it, when, and which filters were used.
- Exports mask Aadhaar, medical and income bands unless the owner includes them explicitly with a reason.
- XLSX exports contain real numbers and dates, not text, with Indian number formatting applied by cell format only.
- PDF exports carry the school letterhead, the date and time generated (Asia/Kolkata) and the name of the user.

## D6. Data retention

- Financial records: retained at least 8 years; never purged by the product. `[DECISION]` Confirm retention period with the school's chartered accountant.
- Drafts: 30 days. Location pings: 30 days raw, then a simplified trace. Audit logs: retained for the life of the school account.
- Data of archived students stays in the database, hidden from default views, and is available for reports and audits.
- Account closure: the owner can request an export; deletion handling is a separate, reviewed process outside this scope.

---

# PART E: BUILD PLAN

Build in the order below. Each phase is one focused run of the coding tool. A phase is complete only when its exit criteria pass.

| Phase | Deliverables | Depends on | Exit criteria |
|---|---|---|---|
| 0. Audit and foundations | Gap report for Students against Part A. Shared tables (academic years, enrollments, counters, audit logs, outbox, approvals, communication consents, school plans). `current_school_id()`, `has_role()`, `school_has_feature()` helpers. Permission keys and default role sets. Server-side plan gating middleware. Idempotency middleware. Notification worker with a fake provider. RLS test harness. Design token check against section 1.8 | None | Existing 86 tests pass. RLS test harness runs on all tables. Plan gating tests for Basic versus Pro pass. |
| 1a. Students core | Enrollment migration, student list (filters, saved views, drawer, bulk bar), student profile tabs (Overview, Personal, Family, Academics, Timeline), inline editing, siblings | 0 | List returns within 300 ms for 2,000 students. Profile edits are audited. |
| 1b. Admission wizard and records | 8-step wizard with drafts, duplicate check, parent lookup and link, consent capture, review panel, success screen with sibling shortcut, Document Vault, medical tab with its own permission, Aadhaar reveal | 1a | Transaction test for the full save. Aadhaar and medical gating tests pass. |
| 1c. Students operations | Bulk import with validate and rollback, promotion, status change and TC, re-admission, parent merge, export, ID card print, class and section settings, student limit enforcement | 1b | Import, promotion and limit tests pass. |
| 2. Fee setup and dues | Heads, terms, structure grid, concessions, late fee rules, receipt settings, guided checklist, dues generation (bulk, single, manual), auto assignment on admission, approvals table and screen | 1c | Generation is idempotent. RTE concession applies. Grid keyboard navigation works. |
| 3. Fee collection | Counter screen, allocation engine, split payments, sibling collect, receipts (A5 and thermal, PDF, print, WhatsApp), student ledger and statement, ledger integrity job, cancel receipt with approvals and owner PIN | 2 | Concurrency and idempotency tests. Money property tests. Receipt PDF review. |
| 4. Fee operations | Dashboard, defaulters, reminder rules and job, follow-ups, cheques, refunds, adjustments, day closing, reports, late fee job, year close carry forward | 3 | Late fee and year close idempotency tests. Reports meet the 3 second target. |
| 5. Online payments | Gateway abstraction, parent pay link with OTP, orders, webhooks, reconciliation job, settlement report, failed payment handling | 4 | Webhook replay and forged signature tests. Reconciliation produces exactly one receipt. |
| 6. Transport core | Settings, vehicles and documents, drivers and attendants, routes and stops (builder), fee zones, plan gating everywhere, document expiry job, dashboard | 0 and 4 | Basic school rejected at API and RLS. Builder validations pass. |
| 7. Transport assignment and fees | Assign from profile, bulk assign, requests, change, stop, absences, renewal, Fee service integration, reports, notifications | 6 | Fee ledger checks for assign, change and stop. Capacity and override tests. |
| 8. Driver app and trips | PWA sign in, trip generation, roster cache, boarding events, guardian handover, bus empty check, offline queue, trips board, delay notice | 7 | Offline sync test. Driver data isolation test. |
| 9. Live tracking | Location capture, admin live map, parent tracking page, approaching alerts, ETA, retention job | 8 and DPDP review | Token scope and expiry tests. Battery and network behaviour checked on real low-end phones. |
| 10. Hardening | Performance pass, accessibility audit, security review (RLS, storage, tokens), backups and restore test, error monitoring, maintenance log, pilot with two schools | All | Lighthouse accessibility at least 90 on core screens. Restore drill passes. Pilot feedback recorded. |

**Prompt skeleton for each phase** (paste this with the relevant Part of this document):

1. Context: MyZkool stack, section 1.2 principles, and the phase name.
2. Read: the sections of this document relevant to the phase, plus the existing code for those areas.
3. Audit first: list what exists, what is partial, what is missing; do not change anything yet.
4. Build: the deliverables in the phase row, following the data model, business rules and screen descriptions exactly; mark any deviation.
5. Tests: write the tests from the acceptance criteria of the relevant Part, run the full suite and the type check.
6. Report: what changed, migrations added, `[DECISION]` items touched with the default used, and anything left undone.

---

# PART F: OPEN DECISIONS

Everything below has a default in this document so building is never blocked. Confirm each before the phase in the last column.

| # | Decision | Default in this spec | Needed by |
|---|---|---|---|
| 1 | Student limit behaviour at 100 percent | Hard block, no grace | Phase 0 |
| 2 | WhatsApp provider: Meta Cloud API directly or a business solution provider | Provider interface; fake provider until chosen | Phase 0 |
| 3 | Parents sharing one phone number | One parent record per phone; "same number" link only for the same person | Phase 1b |
| 4 | Teachers see emergency medical alerts for their class | Off | Phase 1b |
| 5 | Full Hindi UI timing | English UI, Hindi receipts and WhatsApp templates | Phase 1 |
| 6 | TC approval flow | Admin prepares, owner approves | Phase 1c |
| 7 | Re-admission reuses the old admission number | Yes | Phase 1c |
| 8 | Promotion undo window | 24 hours if no new-year activity | Phase 1c |
| 9 | Fee visibility for admin role | Dues status only | Phase 2 |
| 10 | Sibling concession order and values | By admission number, first child pays full, rule off until owner enables | Phase 2 |
| 11 | RTE handling and government reimbursement tracking | 100 percent concession on flagged heads; no reimbursement tracking | Phase 2 |
| 12 | Tax treatment on receipts | No tax lines; confirm with a chartered accountant | Phase 3 |
| 13 | Receipt number series per collector | Single series | Phase 3 |
| 14 | SMS fallback and DLT registration | Off | Phase 4 |
| 15 | Payment gateway, whether online payment is on Basic, who bears charges | Provider interface; school bears charges; pay link available to both plans | Phase 5 |
| 16 | Map provider | OpenStreetMap tiles | Phase 6 |
| 17 | Block expired vehicle and driver documents | Block, owner override | Phase 6 |
| 18 | Safety checklist that blocks trips when items are missing | Record only, no blocking | Phase 6 |
| 19 | Partial-month transport billing | Full month from the month containing the start date | Phase 7 |
| 20 | Different routes for pickup and drop | Same route only | Phase 7 |
| 21 | GPS approach: driver phone PWA, native wrapper, or hardware trackers | Driver phone PWA with Wake Lock | Phase 9 |
| 22 | DPDP position on children's data consent and location tracking of minors | Explicit parent consent, purpose limitation, 30 day retention; lawyer review | Before Phase 9 and before pilot |
| 23 | Data retention period for financial records | 8 years | Phase 4 |
| 24 | Fee module included in Basic (assumed, because Basic is described as core features) | Included in Basic and Pro | Phase 0 |
| 25 | Meaning of "Records" (excluded from Basic) and whether any part of the Students module falls under it | Students module fully available on Basic | Phase 0 |

---

# APPENDIX A: WIREFRAMES

These are layout guides, not pixel designs. Follow the visual rules in section 1.8.

**A.1 Student list**

```
+----------------------------------------------------------------------------+
| Students  [2026-27]                     [Continue draft (2)] [Import] [Add student] |
| 812 enrolled | 401 girls, 411 boys | 96 new this year | 23 documents pending |
| [ Search name, admission no, phone ]  Class v Section v Status v  More filters v |
| Views: All | Documents pending | New this month | Left this year        |
+----------------------------------------------------------------------------+
| [ ] Student              Class  Parent           Fees          Transport  Docs |
| [ ] (ph) Aarav Verma     4-A    Rakesh 98xx (wa) Dues Rs 6,100 Route 3   2 pending |
|      MZ/2026/0412                                                           |
| [ ] (ph) Riya Verma      2-B    Rakesh 98xx (wa) Paid up       Route 3   Complete |
+----------------------------------------------------------------------------+
Click a row: 480 px drawer on the right (photo, key facts, parents, siblings, fee summary).
```

**A.2 Collect fee**

```
+----------------------------------------------------------------------------+
| [ Search name, admission no or phone ]                Recent: Riya, Kabir   |
+--------------------------------------------+-------------------------------+
| (ph) Aarav Verma, 4-A, MZ/2026/0412        | Amount to collect             |
| Rakesh 98765 43210   [2 siblings]          |   Rs 6,100                    |
| [Current dues] [Credits] [Siblings (1)]    | [Add concession]              |
| Select: [All overdue] [Up to: July v]      | Mode: [Cash][UPI][Card][Cheque]|
| [x] Previous year dues           Rs 1,000  | [+ Split payment]             |
| April                                      | Received [ 6,500 ] Change 400 |
| [x] Tuition   due 10/04   late    Rs 2,400 | Date 20/09/2026 (locked)      |
| [x] Late fee                      Rs   300 | Remarks [                   ] |
| May                                        |-------------------------------|
| [x] Tuition   due 10/05   late    Rs 2,400 | Dues 6,100  Concession 0      |
| [ ] Exam fee  due 10/10           Rs   500 | Balance after payment 0       |
|                                            | [ Collect Rs 6,100 ]          |
+--------------------------------------------+-------------------------------+
After success: receipt number, [Print (P)] [Send on WhatsApp (W)] [Next student (N)]
```

**A.3 Route builder**

```
+----------------------------------------------------------------------------+
| Route 3, Civil Lines            Seats 32 of 40 [########--]   [Print sheet]  |
| Vehicle UP32 AB 1234 v  Driver Ramesh Kumar v  Attendant Sunita v          |
| Pickup starts 07:10  Drop starts 13:40                                     |
+---------------------------------------+------------------------------------+
| Stops                       [+ Add stop]| Map (optional)                    |
| = 1  Civil Lines Chowk  07:10  Zone A 9 |   .  (pin)                        |
| = 2  Kali Mandir        07:18  Zone A 7 |        .  (pin)                   |
| = 3  Station Road       07:26  Zone B 8 |             .  (pin)              |
| = 4  Green Park         07:35  Zone B 8 |                                   |
| Times: first pickup [07:10] gap [8 min] [Fill times] [Generate drop times]  |
+---------------------------------------+------------------------------------+
```

**A.4 Driver trip screen (phone)**

```
+--------------------------------+
| Morning pickup, Route 3         |
| In progress   Boarded 14  Absent 2  Left 16 |
+--------------------------------+
| 1  Civil Lines Chowk   07:10  done |
| 2  Kali Mandir         07:18  <- current |
|    (photo) Aarav V.   4-A       |
|    [   Boarded   ] [  Absent  ]|
|    (photo) Kabir S.   3-B       |
|    [   Boarded   ] [  Absent  ]|
| 3  Station Road        07:26     |
+--------------------------------+
| [ Arrived at Kali Mandir ]      |
| 3 events waiting to send        |
+--------------------------------+
```

**A.5 Parent pay page (phone)**

```
+--------------------------------+
| Sunrise Public School           |
| Fees for Rakesh Verma           |
+--------------------------------+
| Aarav, Class 4-A                |
|  Dues Rs 6,100   [Select dues v]|
| Riya, Class 2-B                 |
|  Paid up                        |
+--------------------------------+
| Total to pay        Rs 6,100    |
| [      Pay Rs 6,100        ]    |
| English | Hindi                 |
+--------------------------------+
```

---

# APPENDIX B: DEMO AND TEST DATA

Create a seed script (development only) that builds a realistic school: 12 classes with 2 sections each, 480 students with realistic Indian names including Devanagari names, 380 families (about 100 sibling pairs, 5 families with three children), 3 RTE students, 6 routes with 8 to 12 stops each, 8 vehicles with a mix of valid, expiring and expired documents, 8 drivers and attendants, a full fee structure for all classes, dues generated for the current year, 200 receipts across cash, UPI and cheque, 3 bounced cheques, 10 cancelled receipts, 40 defaulters with different aging, and two schools on different plans (one Basic, one Pro) for gating tests. Seeds must be deterministic so screenshots and tests are repeatable.

---

End of specification.
