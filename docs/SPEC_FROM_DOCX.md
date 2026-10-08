MyZkool: Product and Technical Spec

Modules: Onboarding, Student, Fee, Transport, Website Prepared for: Khaqan Ahmad, MyZkool Technologies | Date: 8 October 2026 | Status: Draft v1.0, ready to build from

0. Scope, Assumptions and Carried-Forward Decisions

This document covers five modules in one place: PRD, app flow, UI/UX brief, TRD, backend schema and implementation plan. Items marked [VALIDATE] are assumptions that need your confirmation before they are locked.

Decisions already made (not reopened here)

Multi-tenant SaaS on React 19 + TypeScript + Vite + Tailwind v4 (frontend), Express/Node (backend), Supabase (Auth, Postgres with RLS, Storage).

Tier gating is enforced on the server, never by hiding UI alone. Basic excludes Transport, Exams, Timetable and Records; Pro includes everything.

Students with history are soft-deleted only. Aadhaar is masked with role-based reveal. Medical data is role-gated. A standalone parents table with a join table links siblings.

One official MyZkool Parent App for all schools. PIN login day to day; OTP only for first verification, PIN recovery and key fallbacks.

Each school connects its own Razorpay account. Money goes parent to school; MyZkool never aggregates funds. Any payment charge is auto-calculated and added to the parent's payable amount per the school's policy.

Push notifications replace the WhatsApp API for automated alerts. WhatsApp is manual: an authorised school user picks a parent or group. Fast2SMS handles SMS and OTP, subject to DLT registration.

School documents live in the school's Google Drive via "Continue with Google".

Bootstrap-first: the five modules below are built in order, with Transport added after Student and Fee are stable.

Assumptions to confirm

[VALIDATE] A1: Website is available on both Basic and Pro; Transport is Pro only (matches the pricing exclusions).

[VALIDATE] A2: A free trial exists at signup (assumed 14 days, no card). Not found in your pricing notes.

[VALIDATE] A3: Transport v1 uses manual trip status (started, reached stop, completed) by the driver or attendant. Live GPS is a later phase using the staff app in driver mode.

[VALIDATE] A4: Razorpay is connected by the school entering its own Key ID, Key Secret and webhook secret (encrypted at rest). Razorpay's partner OAuth is a later improvement.

1. Product Requirements Document (PRD)

1.1 Problem

K-12 schools in Tier-2 and Tier-3 cities run admissions, fees and transport on paper registers and scattered spreadsheets. The result is fee leakage, no clear dues picture, duplicate student records and parents who learn about changes by phone calls. This was observed repeatedly in conversations with principals and owners; it still needs formal validation through the planned 15 to 20 interviews and pilots.

1.2 Goals and Non-Goals

Goals

A school signs up and reaches a live website and a usable dashboard in under 10 minutes.

An office user can admit a student in under 4 minutes using the wizard, and collect a fee with a printed receipt in under 30 seconds.

Parents see dues, pay online and view bus details without calling the school.

Every rupee and every record change is traceable (audit trail, immutable receipts).

Non-goals (this release)

Payroll, exams, timetable, library, hostel.

Custom domains (website P2), live bus GPS (Transport phase 2), WhatsApp Business API automation.

Multi-branch consolidation (Custom plan, later).

1.3 Personas

Persona

Who

Primary needs

Owner / Principal

Decision maker, often not technical

Collection summary, dues, student strength, website live

Admin / Office

Front-desk clerk

Admit students, search fast, collect fees, print receipts

Accountant

Part-time or full-time

Fee structures, concessions, day book, reconciliation

Teacher

Later staff app

View own class students (read-only in this release)

Driver / Attendant

Low literacy, low-end phone

One-tap trip status, student list for the route

Parent

Mobile-only, mixed literacy

See fee due, pay, receipts, bus info, notices

1.4 Functional Requirements

Priority: P0 = launch blocker, P1 = needed within first pilot cycle, P2 = later.

M1. Onboarding (simplified: Account, School, Website basics)

The earlier Subjects and Staff steps are removed. Classes and fee setup move to a post-signup checklist so signup stays short.

ID

Requirement

Pri

ON-1

Signup with owner name, mobile, email; mobile verified once by OTP (Fast2SMS)

P0

ON-2

Owner sets a 6-digit PIN (and optional password); PIN is the daily login

P0

ON-3

School details: name, board (CBSE/ICSE/State/Other), medium, city, state, pincode, contact number, approximate student strength

P0

ON-4

Subdomain picker: live availability check, lowercase letters, digits and hyphens, 3 to 30 chars, reserved words blocked

P0

ON-5

Website basics only: logo, tagline, primary colour, address, phone. Everything else is edited later

P0

ON-6

Plan shown with trial state; student cap enforced by server on creation

P0

ON-7

First-login setup checklist: academic year and classes (presets from Nursery to 12), fee structure, import or add first student, connect Google Drive, connect Razorpay

P0

ON-8

Signup is resumable: closing the browser mid-way returns to the same step

P1

ON-9

Invite staff by mobile number with a role; invite accepted via OTP then PIN setup

P1

ON-10

Hindi UI toggle on onboarding screens

P2

M2. Student

ID

Requirement

Pri

ST-1

8-step admission wizard: Basic Info, Academic Info, Parents/Guardian, Previous School, Address, Achievements, Documents, Medical. Draft auto-saves; resume later

P0

ST-2

Auto admission number per school and year (configurable prefix); unique, never reused

P0

ST-3

Parents: search existing parent by mobile before creating; selecting links the student, which makes siblings visible automatically

P0

ST-4

Separate mother, father and guardian records; one primary contact for notifications

P0

ST-5

Aadhaar optional, stored encrypted, shown masked (XXXX XXXX 1234); reveal only for Owner and Admin with a logged reason

P0

ST-6

Photo upload with client-side compression; documents (birth certificate, TC, marksheet, address proof) stored in the school's Google Drive, with the link and metadata in MyZkool

P0

ST-7

Medical step visible and editable only to roles granted the Medical permission; hidden entirely from others

P0

ST-8

Student list: search by name, admission number, parent mobile; filters by class, section, status, transport; pagination

P0

ST-9

Student profile tabs: Overview, Parents, Fees, Transport, Documents, Medical (gated), Activity log

P0

ST-10

Statuses: Active, Inactive, TC Issued, Alumni. No hard delete; archive with reason

P0

ST-11

Bulk import from CSV/Excel with a template, row-level validation report and a dry-run step

P1

ST-12

Year-end promotion: bulk move class and section with preview and undo window

P1

ST-13

Duplicate warning on name + date of birth + parent mobile match

P1

ST-14

Export with DPDP guardrails: sensitive columns excluded unless role permits, every export logged

P1

ST-15

Transfer Certificate generation

P2

M3. Fee

ID

Requirement

Pri

FE-1

Fee heads (Tuition, Admission, Annual, Exam, Transport, Custom) with frequency: one-time, monthly, quarterly, annual

P0

FE-2

Fee structure per class per academic year: list of heads with amounts and installment schedule

P0

FE-3

Assign structure to students automatically on admission; generates dues (one row per head per installment)

P0

FE-4

Concessions: fixed or percentage, per head or whole, with reason and approver (sibling, staff ward, scholarship, RTE)

P0

FE-5

Counter collection: select student, see all pending dues, choose heads, enter mode (cash, UPI, cheque, bank transfer), partial payment allowed

P0

FE-6

Sequential receipt numbers per school and year; printable A4 and thermal 80mm; PDF share

P0

FE-7

Receipts and payments are immutable. Corrections happen through cancel-with-reason plus a fresh entry; both stay in the book

P0

FE-8

Late fine rule (per day or flat after due date) with waiver permission

P1

FE-9

Online payment in Parent App via the school's Razorpay; payment charge shown as a separate line and added to the payable total per school policy; webhook-confirmed before marking paid

P0

FE-10

Dues dashboard and defaulter list by class, amount and days overdue

P0

FE-11

Reminders: push notification to parent app (automatic, scheduled); one-tap manual WhatsApp or SMS for selected parents

P1

FE-12

Day book, collection report by mode, by head, by class, by date range; CSV and PDF export

P0

FE-13

Refunds and adjustments with approval, linked to the original payment

P1

FE-14

Cheque tracking: received, deposited, cleared, bounced

P2

FE-15

Razorpay reconciliation view: gateway payments versus recorded receipts, with mismatches flagged

P1

M4. Transport (Pro only)

ID

Requirement

Pri

TR-1

Vehicles: registration, type, capacity, insurance and fitness expiry dates with reminders

P0

TR-2

Drivers and attendants: name, mobile, licence number and expiry; optional app login

P0

TR-3

Routes with ordered stops, morning pickup time and afternoon drop time per stop

P0

TR-4

Stop-wise fee slabs per academic year (by stop or by distance band)

P0

TR-5

Assign students to a route and stops (pickup and drop can differ); capacity check per vehicle

P0

TR-6

Assignment auto-creates or updates the Transport fee dues in the Fee module; removal stops future dues, past dues remain

P0

TR-7

Parent App shows route, stop, pickup time, vehicle number, driver contact

P0

TR-8

Driver mode: today's trip, stop-wise student list, tap Started, Reached stop, Completed

P1

TR-9

Push notifications on trip start and stop reached

P1

TR-10

Live GPS with map for parents

P2

TR-11

Transport reports: students per route, vehicle occupancy, transport dues

P1

M5. Website Builder

ID

Requirement

Pri

WB-1

Site created automatically at onboarding on {subdomain}.myzkool.in with a default template filled from onboarding data

P0

WB-2

Four launch templates sharing one section library; switching a template keeps content

P0

WB-3

Standard pages: Home, About, Academics, Admissions, Gallery, News and Events, Contact; plus up to N custom pages by plan

P0

WB-4

Section blocks: Hero, About, Principal's Message, Key Numbers, Programs, Facilities, Gallery, Notices, Admission CTA, Contact and Map, FAQ, Footer. Add, reorder, hide, edit inline

P0

WB-5

Theme: logo, brand colour, curated font pairs, button style

P0

WB-6

Draft and Published states; preview link; publish creates an immutable snapshot, rollback to previous 10 versions

P0

WB-7

Admission enquiry form on the site feeds a leads inbox in the ERP with a push alert to office users

P0

WB-8

Notices posted in ERP can be toggled to appear on the website

P1

WB-9

SEO per page: title, description, share image; sitemap, robots, structured data (EducationalOrganization), clean URLs

P0

WB-10

Media library with image compression, per-plan storage limit

P0

WB-11

Fast on 4G: target Lighthouse performance 90+ on mobile; no layout shift

P0

WB-12

Custom domain connection

P2

WB-13

No fabricated content: templates ship with clearly marked placeholder text, never fake testimonials or logos

P0

1.5 Non-Functional Requirements

Performance: list screens under 1.5 s on mid-range Android over 4G; fee collection screen interactive under 2 s; API p95 under 400 ms for reads.

Availability: 99.5% target in year one; daily automated backups, 7-day point-in-time restore on paid Supabase tier when affordable.

Security and privacy: DPDP Act 2023 consent captured at signup and at parent data collection; encryption in transit and at rest; field-level encryption for Aadhaar and payment secrets; audit log for sensitive reads and exports.

Scale target (year one): 500 schools, about 400,000 students, about 1,00,000 fee transactions per month. The design below handles this on one Postgres instance with indexes and partitioning of the largest tables later.

Low-cost operation: one small API instance, Supabase, Cloudflare free tier for CDN and DNS, no paid messaging APIs.

1.6 Success Metrics

Metric

Target

Signup to published website

under 10 minutes median

Students admitted in first week per pilot school

80% of the school's strength (via import or wizard)

Share of fee collected through MyZkool receipts

90% in month 2

Parent App activation

60% of parents with a mobile in 60 days

Support tickets per school per month

under 3 after month 2

2. App Flow

2.1 Surfaces

Marketing site (myzkool.in): landing, pricing, signup entry.

School web admin ({subdomain}.myzkool.in/admin): Owner, Admin, Accountant.

School public website ({subdomain}.myzkool.in): public visitors and prospective parents.

Parent App (single official app): parents.

Staff app (later): teachers, drivers; Admin and Accountant folded in later.

2.2 Onboarding Flow

Visitor taps Start free on the landing page and lands on step 1.

Step 1 Account: name, mobile, email. Server sends OTP via Fast2SMS. Owner enters OTP; verified once. Owner sets a 6-digit PIN. A Supabase user and a pending school are created.

Step 2 School: school name, board, medium, city, state, pincode, contact, strength band. Saved on Continue; the step is resumable.

Step 3 Website basics and subdomain: subdomain with live availability, logo, tagline, brand colour, address, phone. On finish the server provisions: school row, owner membership, default academic year, default site from template, trial subscription, and a seed set of classes if the owner chose presets.

Redirect to /admin with the setup checklist: Academic year and classes, Fee structure, Add or import students, Connect Google Drive, Connect Razorpay, Invite staff, Review website.

Each checklist item opens the real module screen, not a separate wizard. Completed items tick off from real data, not manual toggles.

Error paths: OTP not received (resend after 30 s, change number after 3 attempts); subdomain taken (suggest three alternatives); duplicate mobile (prompt to log in instead); provisioning failure (transaction rolls back and the user sees a retry, never a half-created school).

2.3 Daily Login

Mobile + PIN. Five wrong attempts lock for 15 minutes; Forgot PIN triggers OTP then a new PIN. A new device after 30 days of inactivity asks for OTP once.

2.4 Student Admission Flow

Students > Add student. Wizard opens at step 1; a draft is created on first keystroke.

Steps 1 to 8 in order; the sidebar shows completion state and allows jumping back. Required fields are flagged per step, but only Basic Info, Academic Info and one parent contact are needed to save as Active; the rest can be completed later.

In Parents step: enter mobile first. If a parent exists, show the match and link it; siblings appear as a chip on the profile.

Documents step: pick file; it uploads to the school's Google Drive folder MyZkool/{Year}/{Admission No} and only the reference is stored.

Medical step appears only for permitted roles; others skip silently.

Review and Submit: admission number assigned, fee structure applied, dues generated, optional "Collect admission fee now" shortcut into the Fee counter.

2.5 Fee Collection Flow (Counter)

Fees > Collect. Search by name, admission number or parent mobile.

Student card shows pending dues by head and installment, concessions applied, fines.

Select dues (default: all overdue and current), edit amount for partial payment, pick mode and reference.

Confirm creates one payment and one receipt atomically. Print or share PDF.

Cancel a receipt: Owner, Admin or Accountant with permission, reason mandatory; original stays visible as Cancelled.

2.6 Online Fee Payment Flow (Parent App)

Parent opens Fees; sees child-wise dues. Taps Pay.

App shows amount, school policy charge as a separate line, and total.

Server creates a Razorpay order using the school's own keys, and records a pending payment attempt.

Razorpay checkout completes. The app does not mark paid. The webhook (payment.captured) verifies the signature, then the server creates the payment and receipt idempotently.

Parent gets a push with the receipt; the receipt is in Fees history. If the webhook is delayed, the app shows Processing and polls for up to 2 minutes.

2.7 Transport Flow

Admin creates vehicles, drivers, routes and stops with times; sets stop fee slabs.

Admin assigns a student: pick route, pickup stop, drop stop. Capacity and plan checks run on the server.

The Transport fee is added to that student's dues through the Fee module for the right installments.

Each morning the driver opens driver mode, starts the trip; parents receive a push; Reached stop alerts go to the parents of that stop.

Removing a student from transport ends future dues from the chosen effective date.

2.8 Website Flow

Website > Editor shows the page list and a live preview. Selecting a section opens an edit panel (text, image, visibility).

Changes save to a draft automatically. Preview opens the draft at a private URL.

Publish creates a snapshot, purges the CDN cache for that site, and the public page serves the new version within seconds.

Visitor submits the Admission enquiry form; it appears in Admissions > Leads and sends a push to office users.

3. UI/UX Design Brief

3.1 Principles

Not a generic admin template. Generic admin-form patterns are rejected. Screens should feel designed: clear hierarchy, generous space where decisions happen, density where staff work all day.

Speed over decoration in operational screens (Collect fee, student search): keyboard-first, instant search, no modal chains.

Mobile first for parents and drivers, desktop first for the office, but every admin screen must still work on a 360 px phone because many Tier-3 owners run schools from a phone.

Plain language. Labels say what they do. Money always shows the rupee sign and Indian digit grouping (1,25,000).

Safe by default. Destructive and sensitive actions need a reason, show who did what, and never feel hidden.

3.2 Visual Identity

Display font Plus Jakarta Sans; body Inter. Brand blue #2158E0; success and WhatsApp-related actions emerald #1FAE7A.

Neutral greys on warm-white backgrounds; one accent per screen. Status colours: green paid, amber partial or due soon, red overdue, grey inactive.

Floating card surfaces with soft shadows on dashboards and parent screens; flat bordered tables for dense data.

Icons: Lucide, one stroke weight. Motion: short, purposeful transitions only (wizard step change, sheet open), respecting reduced-motion settings.

Product and marketing copy: no emojis, no ALL-CAPS labels, no inflated words such as "seamless" or "revolutionize", no invented testimonials or logos.

3.3 Layout System

Admin shell: left rail (collapsible to icons) with Dashboard, Students, Fees, Transport, Website, Admissions, Settings; top bar with global search, academic year switcher, notifications, profile. On phones the rail becomes a bottom bar with a More sheet.

Parent App: bottom tabs Home, Fees, Transport, Notices, Profile; a child switcher at the top when siblings are linked.

Driver mode: one large screen, one primary button.

3.4 Key Screens

Module

Screens

Notes

Onboarding

Account, OTP and PIN, School, Website basics and subdomain, Setup checklist

Three visible steps with a progress bar; checklist is the home screen on day one

Student

List, Wizard (8 steps), Profile, Bulk import, Promotion

Wizard has a sticky summary rail on desktop and a stepper sheet on mobile

Fee

Dashboard, Fee heads and structures, Collect, Receipts, Dues and defaulters, Reports, Razorpay settings

Collect screen is the most polished screen in the product

Transport

Overview, Vehicles, Drivers, Routes and stops, Assignments, Fee slabs

Route editor uses a vertical stop list with drag to reorder

Website

Editor, Templates, Theme, Media, Pages, Leads

Split view: structure and edit panel on the left, live preview on the right

Parent App

Home, Fees and Pay, Receipts, Transport, Notices

One-thumb reach for Pay

3.5 Pattern Details

Wizard: left step list (desktop) or top stepper (mobile), autosave indicator, Back always visible, per-step validation inline, no full-page reload. Optional steps show Skip for now.

Tables: sticky header, column chooser, saved filters, row click opens a side drawer before a full page, bulk actions bar appears on selection.

Search: one box, debounced, matches name, admission number and mobile; results show class and photo.

Collect fee: two-pane layout: student and dues on the left, payment summary on the right; Enter to confirm, Esc to cancel; totals update live.

Empty states: every list explains what belongs here and offers the one next action. No blank tables.

Loading and errors: skeletons, not spinners, for lists; human-readable errors with a retry; offline banner for the Parent App.

Sensitive fields: masked by default with an eye control that asks for a reason and writes to the audit log.

Accessibility: WCAG AA contrast, 44 px touch targets, visible focus, labels on every input, Hindi text support with Noto Sans Devanagari fallback.

3.6 Content Rules

Sentence case for buttons and labels. Verbs for actions: Add student, Collect fee, Publish site.

Confirmation copy states the consequence: "Cancel receipt R-2026-0412? The amount returns to dues. The receipt stays in the record as Cancelled."

Hindi strings stored in a translation file from day one so the toggle is not a rewrite later.

4. Technical Requirements Document (TRD)

4.1 System Components

Component

Technology

Responsibility

School web admin

React 19, TypeScript, Vite, Tailwind v4

Office and owner workflows

Public site renderer

Express + React server rendering

Serves each school website from a published snapshot, SEO-ready HTML

API

Express/Node, TypeScript, zod

Business rules, tier gating, payments, notifications, audit

Database

Supabase Postgres with RLS

Source of truth, tenant isolation

Auth

Supabase Auth

Sessions and tokens; OTP and PIN logic wrapped by the API

Storage

Supabase Storage

Website media, student photos, generated receipts

School documents

Google Drive (school's own account)

Student document vault files

Worker

Node process using a Postgres jobs table

Scheduled dues, reminders, reconciliation, expiry alerts

Parent App

React app wrapped with Capacitor, FCM push [VALIDATE]

Shares components with web; avoids a second codebase while bootstrapping

Edge

Cloudflare free tier

DNS, wildcard subdomain, CDN cache, Turnstile bot check

Start with one API instance running the worker in the same process. Split the worker out only when job volume demands it.

4.2 Multi-Tenancy and Row-Level Security

Every tenant table carries school_id uuid not null, indexed, and is the leading column of composite indexes.

Membership table school_members(user_id, school_id, role, active) drives access. A SQL helper my_school_ids() returns the active school IDs for auth.uid().

Standard policy: school_id in (select my_school_ids()) for select; insert and update add with check on the same condition plus a role permission check.

The API forwards the user's JWT to Supabase so RLS applies on all normal reads and writes. The service-role key is used only in provisioning, webhooks, jobs and the public site renderer, and every such code path sets school_id explicitly from a verified source, never from request input.

Subdomain to school resolution happens in middleware using an in-memory cache with a 60-second TTL.

Mandatory test: an automated test creates two schools and proves that a user of school A cannot read or write any row of school B on every tenant table. It runs in CI on every migration.

4.3 Authentication

One identity per person. Mobile number is the identifier; the 6-digit PIN is the day-to-day secret, stored as the Supabase password hash.

OTP service: Supabase's built-in phone auth needs a provider we are not using, so the API issues OTPs itself via Fast2SMS. Table otp_requests stores a hashed code, purpose (signup, pin_reset, new_device), expiry (5 minutes), attempt count (max 5), and the sending IP. After verification the API creates or updates the Supabase user through the admin API and returns a session.

PIN protections: a 6-digit PIN has low entropy, so protection comes from controls: login rate limit per mobile and per IP, lockout after 5 failures for 15 minutes, alerts on repeated lockouts, and OTP re-verification on a new device after 30 days. Owner and Accountant accounts can be required to also set a password [VALIDATE].

Parents: created when a school adds a parent mobile; the first Parent App login verifies by OTP and sets a PIN. One parent account can see children across different schools.

4.4 Roles and Permissions

Permissions are strings checked in the API and mirrored in RLS where data is sensitive. Defaults below are editable by the Owner later.

Permission

Owner

Admin

Accountant

Teacher

Driver

Parent

student.read

Yes

Yes

Yes

Own class

Route list only

Own child

student.write

Yes

Yes

No

No

No

No

student.aadhaar_reveal

Yes

Yes

No

No

No

No

student.medical

Yes

Granted

No

Granted

No

Own child

student.export

Yes

Granted

Granted

No

No

No

fee.collect

Yes

Yes

Yes

No

No

Pay own

fee.structure

Yes

No

Yes

No

No

No

fee.concession_approve

Yes

No

Yes

No

No

No

fee.receipt_cancel

Yes

Granted

Yes

No

No

No

transport.manage

Yes

Yes

No

No

No

No

transport.trip

Yes

Yes

No

No

Yes

No

website.edit

Yes

Yes

No

No

No

No

settings.integrations

Yes

No

No

No

No

No

4.5 Tier Gating (Server-Side)

Table plan_features(plan, feature, limit_value) is the single source: Basic has no transport, exams, timetable or records; Basic student cap 800; Pro student cap 1,800.

SQL function has_feature(school_id, feature) reads the school's current subscription, including trial and grace state.

Express middleware requireFeature('transport') runs before every Transport route and returns 403 FEATURE_LOCKED with the plan needed. RLS policies on Transport tables also call has_feature, so a direct database call cannot bypass it.

A database trigger on students insert enforces the plan's student cap; the API turns the violation into a clear upgrade message.

The UI reads the same entitlements from GET /me/entitlements only to render lock states and upgrade prompts, never as the enforcement.

Subscription lapse: 7-day grace in read-write, then read-only; data is never deleted on lapse.

4.6 API Conventions

REST under /api/v1, JSON, zod schemas shared with the frontend through a common package.

Money is always an integer in paise. Dates are ISO strings; the academic year is an explicit resource, not a derived guess.

Cursor pagination, filters as query parameters. Errors: { code, message, details } with stable codes.

Creation of payments, receipts and online orders requires an Idempotency-Key header; repeated requests return the original result.

Every write passes an audit middleware that records actor, action, entity, before and after for sensitive entities.

Rate limits per IP and per user; stricter on auth, OTP, enquiry and payment routes.

Group

Key endpoints

Onboarding

POST /auth/otp/send, POST /auth/otp/verify, POST /auth/pin, POST /auth/login, GET /onboarding/subdomain-check, POST /onboarding/complete

Students

GET/POST /students, GET/PATCH /students/:id, PUT /students/:id/draft, POST /students/import, POST /students/promote, GET /parents/search?mobile=, POST /students/:id/aadhaar/reveal, POST /students/:id/documents

Fees

GET/POST /fee/heads, GET/POST /fee/structures, POST /fee/assign, GET /students/:id/dues, POST /fee/payments, POST /fee/receipts/:id/cancel, GET /fee/reports/*, POST /fee/online/order, POST /webhooks/razorpay/:schoolId

Transport

GET/POST /transport/vehicles, /drivers, /routes, /routes/:id/stops, /fee-slabs, POST /transport/assignments, POST /transport/trips/:id/events

Website

GET/PATCH /site, GET/POST/PATCH /site/pages, PATCH /site/sections/:id, POST /site/publish, POST /site/rollback, POST /site/media, GET /site/leads, POST /public/enquiries

Platform

GET /me/entitlements, POST /integrations/google/connect, POST /integrations/razorpay, GET /audit

4.7 Fee Engine Rules

Dues generation: assigning a structure to a student creates fee_dues rows, one per head per installment, with due date and amount in paise. Concessions create negative adjustment rows or reduce the due amount with a link to the concession record; the choice is a single function so reports stay consistent.

Balance is always derived: sum of dues minus sum of allocations. Never a stored mutable balance.

Payment allocation: a payment holds one or more payment_allocations(due_id, amount). Default order is oldest due first; the clerk can override by selecting dues.

Receipt numbers: a receipt_counters(school_id, academic_year_id, last_no) row is incremented inside the same transaction as the payment using update ... returning, so numbers are gapless and unique per school and year.

Immutability: no update or delete on payments and receipts through RLS. Cancellation inserts a reversal record (status = cancelled, reason, actor) and releases allocations; the original receipt number stays.

Late fine is computed by the daily job as separate due rows, so waiving one is one visible action.

Transport fees come from the Transport module through one internal function sync_transport_dues(student_id, effective_from) so Fee owns every rupee row.

4.8 Razorpay Integration (Per-School Accounts)

School keys are stored encrypted with AES-256-GCM using a master key held in the server environment; the secret is never returned to any client after saving.

Order creation happens on the server with the school's keys. Parent never sees a key.

Webhook route is per school: /webhooks/razorpay/:schoolId, verified with that school's webhook secret using the raw request body. A payment is recorded only on a verified payment.captured event.

Idempotency: unique constraint on razorpay_payment_id; a replayed webhook returns success without a second receipt.

Payment charge policy per school: absorb (school bears it) or pass_on (parent pays). Pass-on uses gross-up so the school receives the full due: payable = due / (1 - rate), rounded up to the paise, shown as a separate line with the rate used. GST on the charge and the exact Razorpay rate for the school's account must be confirmed with an accountant before launch [VALIDATE].

Nightly reconciliation job compares captured gateway payments to receipts and flags orphans in the Fee dashboard.

4.9 Notifications and Messaging

Push (primary automated channel): device tokens table; FCM; notifications are queued rows so retries and read state are tracked.

SMS and OTP: Fast2SMS with DLT-registered sender ID and templates. Production SMS is blocked until DLT registration is complete; a feature flag keeps SMS off in staging.

WhatsApp: no API. The admin UI builds a wa.me link with a prefilled message from a template for a chosen parent, and group messages by copying the text for the school's own WhatsApp group. Nothing is sent automatically.

User notification preferences and quiet hours are stored per user; fee reminders respect them.

4.10 Google Drive Integration

OAuth with the narrow drive.file scope, so MyZkool can see only files it creates. Refresh token is stored encrypted; tokens are tied to the school, not to an individual user.

Folder layout: MyZkool/{Academic year}/{Admission no}/{document}. File ID and metadata are stored in student_documents.

Files are never shared publicly. Downloads stream through the API after a permission check, so parents and teachers need no Drive access.

If the token is revoked or quota is full, uploads fail gracefully, the admin sees a banner with a reconnect action, and nothing else in the product breaks.

The permission screen is tested with non-technical staff during the pilot before it is declared done.

4.11 Website Rendering and Publishing

Editing writes to draft tables. Publish validates the full site against a zod schema and writes an immutable JSON snapshot to site_versions; sites.published_version_id moves to it in one transaction.

The public renderer maps the request host to a school, loads the published snapshot (memory cache plus Cloudflare cache), renders React section components to HTML on the server, and returns clean HTML with inline critical CSS and minimal JavaScript.

Publish triggers a CDN purge for that host. Cache header s-maxage=3600, stale-while-revalidate=86400.

Images are resized to 480, 960 and 1600 pixel WebP variants on upload (sharp), served with srcset, explicit width and height, lazy loading below the fold.

SEO output: unique title and description per page, canonical URLs, Open Graph tags, sitemap.xml, robots.txt, JSON-LD EducationalOrganization.

Enquiry endpoint is public: Cloudflare Turnstile, honeypot field, rate limit, server-side validation, and a consent line for DPDP.

Tier limits (page count, storage) are enforced on the server at create and upload time.

4.12 Background Jobs

A jobs table with run_at, status, attempts, payload is polled by the worker with FOR UPDATE SKIP LOCKED. Scheduled jobs: monthly and installment due generation, late fine calculation, fee reminder dispatch, vehicle insurance and licence expiry alerts, nightly Razorpay reconciliation, and trial-expiry notices. Every job is idempotent and logs its result.

4.13 Security and DPDP Compliance

Aadhaar is encrypted at the field level (AES-256-GCM); only the last four digits are stored in a separate column for masked display. Reveal goes through a dedicated endpoint that requires permission and a typed reason, and writes an audit entry.

consents table records who consented, to what, when, and the notice version, for school signup and for parent data collection.

Exports exclude sensitive columns unless the role has the permission, and every export is logged with row count and filters.

Soft delete on students and parents; hard deletes are blocked by RLS and revoke on the table. Data erasure requests follow a documented manual process that anonymises while preserving financial records the school must retain.

Standard hardening: HTTPS only, Helmet, strict CORS to known origins, input validation on every route, parameterised queries only, secrets in environment variables, PII kept out of logs, dependency audit in CI.

Breach runbook: contacts, 72-hour notification steps, and how to revoke sessions and rotate keys.

4.14 Observability, Environments and Delivery

Three environments: local, staging, production, each with its own Supabase project and Razorpay test or live keys.

Migrations through the Supabase CLI, reviewed in pull requests; every migration is forward-only with a documented rollback note.

CI (GitHub Actions): typecheck, lint, unit and integration tests, tenant-isolation test, build. Deploy only on green.

Monitoring: Sentry (errors), structured logs with pino, an uptime check on API and a sample school website, and a daily alert if the job worker has not run.

Backups: Supabase daily backups plus a weekly logical dump stored outside Supabase; a restore drill before the first paid school goes live.

4.15 Test Strategy

Unit: fee calculation, gross-up rounding, allocation order, receipt numbering under concurrency, subdomain validation.

Integration: RLS isolation across tenants, tier gating (Basic cannot reach Transport at API and DB level), webhook replay safety, student cap trigger.

End-to-end (Playwright): onboarding to first login, wizard admission with parent reuse, collect and cancel a receipt, parent payment through Razorpay test mode, publish a website and load it on its subdomain.

Existing student module tests (86 passing) stay in the suite and gate every change to that module.

Device testing: a low-end Android phone on throttled 4G for the Parent App and the public website.

5. Backend Schema (PostgreSQL / Supabase)

Conventions: uuid primary keys, school_id on every tenant table, created_at, updated_at, created_by, money in integer paise, soft delete with deleted_at where history matters. Enable RLS on every table below; the standard policy pattern is shown once in 5.7.

5.1 Platform and Tenancy

create table schools (  id uuid primary key default gen_random_uuid(),  name text not null,  subdomain text not null unique check (subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),  board text, medium text, city text, state text, pincode text,  contact_phone text, contact_email text, address text,  strength_band text,  status text not null default 'active' check (status in ('active','suspended','closed')),  onboarding_step smallint not null default 1,  created_at timestamptz not null default now());create table profiles (  user_id uuid primary key references auth.users(id),  full_name text not null,  mobile text not null unique,  email text,  last_login_at timestamptz,  locked_until timestamptz);create table school_members (  school_id uuid references schools(id),  user_id uuid references auth.users(id),  role text not null check (role in ('owner','admin','accountant','teacher','driver')),  extra_permissions text[] not null default '{}',  active boolean not null default true,  primary key (school_id, user_id));create table plans (code text primary key, name text, price_paise int, student_cap int);create table plan_features (plan text references plans(code), feature text, limit_value int, primary key (plan, feature));create table subscriptions (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  plan text not null references plans(code),  state text not null check (state in ('trial','active','grace','read_only','cancelled')),  billing_months smallint check (billing_months in (1,6,12)),  trial_ends_at timestamptz, current_period_end timestamptz);create table integrations (  school_id uuid references schools(id),  provider text check (provider in ('google_drive','razorpay')),  config_encrypted bytea not null,  status text not null default 'connected',  connected_at timestamptz default now(),  primary key (school_id, provider));create table otp_requests (  id uuid primary key default gen_random_uuid(),  mobile text not null, purpose text not null,  code_hash text not null, attempts smallint default 0,  expires_at timestamptz not null, verified_at timestamptz, ip inet);create table consents (  id uuid primary key default gen_random_uuid(),  school_id uuid references schools(id), subject_type text, subject_id uuid,  purpose text, notice_version text, given_at timestamptz default now(), given_by uuid);create table audit_logs (  id bigint generated always as identity primary key,  school_id uuid, actor_id uuid, action text not null,  entity text, entity_id uuid, reason text,  before jsonb, after jsonb, ip inet, at timestamptz default now());create index on audit_logs (school_id, at desc);create index on audit_logs (school_id, entity, entity_id);create table device_tokens (user_id uuid, token text, platform text, last_seen timestamptz, primary key (user_id, token));create table notifications (  id uuid primary key default gen_random_uuid(),  school_id uuid, user_id uuid, kind text, title text, body text, data jsonb,  sent_at timestamptz, read_at timestamptz, created_at timestamptz default now());create table jobs (  id bigint generated always as identity primary key,  kind text not null, payload jsonb, run_at timestamptz default now(),  status text default 'queued', attempts smallint default 0, last_error text);create index on jobs (status, run_at);

5.2 Academic Structure

create table academic_years (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  label text not null, starts_on date, ends_on date,  is_current boolean default false,  unique (school_id, label));create unique index one_current_year on academic_years (school_id) where is_current;create table classes (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  name text not null, sort_order smallint,  unique (school_id, name));create table sections (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, class_id uuid not null references classes(id),  name text not null, capacity smallint,  unique (class_id, name));

5.3 Student Module

create table students (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  admission_no text not null,  first_name text not null, last_name text,  dob date, gender text, blood_group text, religion text, category text, nationality text,  photo_path text,  aadhaar_encrypted bytea, aadhaar_last4 char(4),  class_id uuid references classes(id), section_id uuid references sections(id),  academic_year_id uuid references academic_years(id),  admission_date date, roll_no text,  status text not null default 'active' check (status in ('draft','active','inactive','tc_issued','alumni')),  previous_school jsonb,  address jsonb,  achievements jsonb,  deleted_at timestamptz, deleted_reason text,  created_at timestamptz default now(), created_by uuid,  unique (school_id, admission_no));create index on students (school_id, class_id, section_id) where deleted_at is null;create index on students (school_id, lower(first_name));create index on students (school_id, status);create table parents (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  user_id uuid references auth.users(id),  full_name text not null, mobile text not null, alt_mobile text, email text,  occupation text, address jsonb,  deleted_at timestamptz,  unique (school_id, mobile));create table student_parents (  student_id uuid references students(id),  parent_id uuid references parents(id),  school_id uuid not null,  relation text not null check (relation in ('father','mother','guardian')),  is_primary_contact boolean default false,  primary key (student_id, parent_id));create unique index one_primary_contact on student_parents (student_id) where is_primary_contact;create table student_documents (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null references students(id),  doc_type text not null, file_name text, mime text, size_bytes int,  drive_file_id text not null, uploaded_by uuid, uploaded_at timestamptz default now(),  deleted_at timestamptz);create table student_medical (  student_id uuid primary key references students(id),  school_id uuid not null,  allergies text, conditions text, medications text,  emergency_contact jsonb, doctor jsonb, notes text,  updated_by uuid, updated_at timestamptz default now());create table student_drafts (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, created_by uuid not null,  step smallint default 1, data jsonb not null, updated_at timestamptz default now());create table admission_counters (  school_id uuid, academic_year_id uuid, last_no int default 0,  primary key (school_id, academic_year_id));

Note: parents is unique on (school_id, mobile), so the same mobile cannot create two parent records inside one school, and siblings link through student_parents. A parent who has children in two different schools gets one user_id shared across both rows.

5.4 Fee Module

create table fee_heads (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  name text not null, kind text default 'regular' check (kind in ('regular','transport','fine','other')),  frequency text not null check (frequency in ('one_time','monthly','quarterly','half_yearly','annual')),  active boolean default true,  unique (school_id, name));create table fee_structures (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, academic_year_id uuid not null references academic_years(id),  class_id uuid not null references classes(id), name text,  unique (school_id, academic_year_id, class_id, name));create table fee_structure_items (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, structure_id uuid not null references fee_structures(id),  head_id uuid not null references fee_heads(id),  amount_paise int not null check (amount_paise >= 0),  schedule jsonb not null  -- [{label:'Apr', due_on:'2026-04-10', share_pct:...}] or fixed amounts);create table student_fee_assignments (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null references students(id),  structure_id uuid not null references fee_structures(id),  academic_year_id uuid not null, assigned_at timestamptz default now(),  unique (student_id, academic_year_id, structure_id));create table concessions (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null references students(id),  academic_year_id uuid not null, head_id uuid references fee_heads(id),  kind text check (kind in ('fixed','percent')), value int not null,  reason text not null, approved_by uuid not null, created_at timestamptz default now(),  revoked_at timestamptz);create table fee_dues (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  student_id uuid not null references students(id),  academic_year_id uuid not null, head_id uuid not null references fee_heads(id),  label text not null, due_on date not null,  gross_paise int not null, concession_paise int not null default 0,  net_paise int generated always as (gross_paise - concession_paise) stored,  source text default 'structure' check (source in ('structure','transport','fine','manual')),  source_ref uuid,  cancelled_at timestamptz,  unique (student_id, academic_year_id, head_id, label));create index on fee_dues (school_id, student_id, due_on);create index on fee_dues (school_id, due_on) where cancelled_at is null;create table receipt_counters (  school_id uuid, academic_year_id uuid, last_no int default 0,  primary key (school_id, academic_year_id));create table payments (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null references students(id),  academic_year_id uuid not null,  amount_paise int not null check (amount_paise > 0),  gateway_charge_paise int not null default 0,  mode text not null check (mode in ('cash','upi','cheque','bank','online')),  reference text, paid_on date not null default current_date,  razorpay_payment_id text unique, razorpay_order_id text,  idempotency_key text, collected_by uuid,  created_at timestamptz default now(),  unique (school_id, idempotency_key));create table payment_allocations (  payment_id uuid references payments(id),  due_id uuid references fee_dues(id),  school_id uuid not null,  amount_paise int not null check (amount_paise > 0),  released_at timestamptz,  primary key (payment_id, due_id));create table receipts (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, payment_id uuid not null unique references payments(id),  academic_year_id uuid not null, receipt_no int not null,  status text not null default 'valid' check (status in ('valid','cancelled')),  cancelled_by uuid, cancelled_reason text, cancelled_at timestamptz,  pdf_path text,  unique (school_id, academic_year_id, receipt_no));create table online_payment_attempts (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null, parent_user_id uuid,  due_ids uuid[] not null, base_paise int not null, charge_paise int not null,  razorpay_order_id text unique, status text default 'created', created_at timestamptz default now());create table fee_policies (  school_id uuid primary key references schools(id),  gateway_charge_mode text default 'absorb' check (gateway_charge_mode in ('absorb','pass_on')),  gateway_rate_bp int default 0,  gst_on_charge_bp int default 0,  late_fine_kind text, late_fine_value int, grace_days smallint default 0);

5.5 Transport Module (Pro)

create table vehicles (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  reg_no text not null, kind text, capacity smallint not null,  insurance_expiry date, fitness_expiry date, permit_expiry date,  active boolean default true, unique (school_id, reg_no));create table transport_staff (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, user_id uuid,  role text check (role in ('driver','attendant')),  full_name text not null, mobile text not null,  licence_no text, licence_expiry date, active boolean default true);create table routes (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, name text not null,  vehicle_id uuid references vehicles(id),  driver_id uuid references transport_staff(id), attendant_id uuid references transport_staff(id),  active boolean default true, unique (school_id, name));create table stops (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, route_id uuid not null references routes(id),  name text not null, seq smallint not null,  pickup_time time, drop_time time, lat numeric(9,6), lng numeric(9,6),  unique (route_id, seq));create table transport_fee_slabs (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, academic_year_id uuid not null,  stop_id uuid not null references stops(id), monthly_paise int not null,  unique (academic_year_id, stop_id));create table student_transport (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, student_id uuid not null references students(id),  academic_year_id uuid not null, route_id uuid not null references routes(id),  pickup_stop_id uuid references stops(id), drop_stop_id uuid references stops(id),  effective_from date not null, effective_to date);create unique index one_active_transport on student_transport (student_id, academic_year_id) where effective_to is null;create table trips (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, route_id uuid not null references routes(id),  trip_date date not null, direction text check (direction in ('morning','afternoon')),  status text default 'scheduled', started_at timestamptz, ended_at timestamptz,  unique (route_id, trip_date, direction));create table trip_events (  id bigint generated always as identity primary key,  school_id uuid not null, trip_id uuid not null references trips(id),  stop_id uuid references stops(id), kind text not null, at timestamptz default now(), by_user uuid);

Capacity check runs in the API inside a transaction: count of active student_transport rows for the route's vehicle against vehicles.capacity.

5.6 Website Module

create table sites (  school_id uuid primary key references schools(id),  template text not null default 'classic',  theme jsonb not null,           -- logo path, brand colour, font pair, button style  published_version_id uuid,  seo_defaults jsonb,  updated_at timestamptz default now());create table site_pages (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  slug text not null, title text not null, kind text default 'standard',  seo jsonb, sort_order smallint, visible boolean default true,  unique (school_id, slug));create table site_sections (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, page_id uuid not null references site_pages(id),  type text not null, content jsonb not null, sort_order smallint not null, visible boolean default true);create index on site_sections (page_id, sort_order);create table site_versions (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  snapshot jsonb not null, note text, published_by uuid, published_at timestamptz default now());create table site_media (  id uuid primary key default gen_random_uuid(),  school_id uuid not null, path text not null, width int, height int, bytes int,  alt text, created_at timestamptz default now());create table enquiries (  id uuid primary key default gen_random_uuid(),  school_id uuid not null references schools(id),  parent_name text not null, mobile text not null, child_name text, class_interest text, message text,  consent_given boolean not null, source text default 'website',  status text default 'new' check (status in ('new','contacted','visited','admitted','closed')),  assigned_to uuid, created_at timestamptz default now());create index on enquiries (school_id, status, created_at desc);

5.7 RLS Pattern and Key Functions

create function my_school_ids() returns setof uuid language sql stable security definer as $$  select school_id from school_members where user_id = auth.uid() and active$$;create function has_feature(p_school uuid, p_feature text) returns boolean language sql stable security definer as $$  select exists (    select 1 from subscriptions s join plan_features f on f.plan = s.plan    where s.school_id = p_school and s.state in ('trial','active','grace')      and f.feature = p_feature)$$;-- standard tenant policy, repeated per tablealter table students enable row level security;create policy tenant_read on students for select using (school_id in (select my_school_ids()));create policy tenant_write on students for all using (school_id in (select my_school_ids()))  with check (school_id in (select my_school_ids()));-- gated module policycreate policy transport_gate on vehicles for all  using (school_id in (select my_school_ids()) and has_feature(school_id, 'transport'));-- immutabilityrevoke update, delete on payments, receipts from authenticated;revoke delete on students, parents from authenticated;

Parent access uses separate policies: a parent user reads only students linked to them through student_parents.parent_id -> parents.user_id = auth.uid(), and only the fee, receipt, transport and notice rows for those students.

Receipt creation function (single transaction): lock counter row, increment, insert payment, allocations and receipt, return receipt id. The API calls it with the idempotency key so a retry cannot double-charge.

5.8 Entity Relationships (Summary)

A school has many members, academic years, classes, students, parents, fee heads and one site.

A student has many parents through student_parents, one medical row, many documents, one fee assignment per year, many dues, at most one active transport assignment per year.

A payment has many allocations against dues and exactly one receipt.

A route has many ordered stops; stops carry the transport fee slab; trips and trip events record daily running.

A site has pages, pages have sections, publishing freezes everything into a version snapshot.

6. Implementation Plan

6.1 Sequencing Logic

Order is chosen by dependency and by what lets a pilot school start using the product earliest: foundations and onboarding first, then Student (everything hangs off it), then Fee (the reason schools pay), then Website (acquisition and the integrated differentiator), then the Parent App (payments and notices reach parents), and Transport last because it is Pro-only and depends on both Fee and the Parent App. Week counts are estimates for one founder working with an AI coding tool and will move with pilot feedback.

6.2 Phases

Phase

Weeks

Scope

Exit criteria

0. Foundations

1 to 2

Repo and shared zod package, CI, three environments, platform migrations (5.1, 5.2), RLS helpers, tenant-isolation test, OTP and PIN auth, audit middleware, encryption utility, jobs worker skeleton

Two-tenant isolation test green in CI; login with OTP then PIN works end to end

1. Onboarding

2 to 4

Three-step signup, subdomain check, provisioning transaction, setup checklist, plan and trial state, staff invite, Hindi string scaffolding

A new school goes from landing page to dashboard in under 10 minutes; failed provisioning leaves no partial data

2. Student

3 to 6

Finish and verify the 8-step wizard, parent search and reuse, Google Drive connect and document upload, Aadhaar masking and reveal log, medical gating, list and profile, CSV import, promotion, duplicate warning

Existing 86 tests still green plus new tests; sibling linking verified; import handles 500 rows with a clear error report

3. Fee

5 to 9

Heads, structures, assignment, dues, concessions, counter collection, receipts (A4 and thermal), cancellation, dues dashboard, reports, late fines, policies

Concurrency test: 20 simultaneous collections produce gapless receipt numbers; cancel-and-recollect leaves a correct book; day book matches receipts to the paisa

4. Website

8 to 11

Snapshot publishing, public renderer, four templates, section library, theme, media pipeline, enquiry form and leads inbox, SEO outputs, tier limits

Published site passes Lighthouse mobile 90+ on a throttled connection; enquiry reaches Leads and triggers a push; rollback works

5. Parent App

11 to 14

Capacitor shell, parent OTP then PIN, child switcher, dues and Razorpay payment, receipts, notices, push, device tokens

Real test payment from a parent phone creates exactly one receipt even when the webhook is replayed

6. Transport

13 to 16

Vehicles, staff, routes and stops, slabs, student assignment, fee sync, parent view, driver mode, trip events and push

Basic plan blocked at API and database level; assigning and removing a student produces correct dues; capacity cannot be exceeded under concurrent assignments

7. Pilot hardening

16 to 20

Restore drill, performance pass on real data volumes, accessibility pass, support playbook, onboarding of pilot schools, feedback fixes

At least three pilot schools collecting fees through MyZkool for a full month with no data discrepancies

Phases overlap by design: Phase 1 starts while Phase 0 finishes, and Phase 2 starts once login works. Do not start Phase 5 until the Fee module's receipt and webhook logic has passed its exit criteria.

6.3 Work Pattern Per Phase

This follows your existing prompt-driven workflow with the coding tool:

Spec prompt: one markdown prompt per module slice (database migration, API, UI, tests), each citing the relevant sections of this document.

Migration first: schema and RLS go in before any screen, with the tenant-isolation test extended to the new tables.

API with tests: endpoints plus unit and integration tests; no UI work starts until these pass.

UI: screens built against the UI/UX brief, including empty, loading and error states.

Verification report: the coding tool reports tests added, TypeScript errors, and gaps against the requirement IDs (ST-1, FE-6 and so on). Use the IDs so gaps are unambiguous.

Gap-fix prompt: a targeted follow-up for whatever the report misses, then re-verify.

6.4 Non-Code Work That Has Long Lead Times

Start these now, in parallel, because they block production rather than development:

Item

Why it blocks

Owner

DLT registration, sender ID and SMS templates with Fast2SMS

No production OTP or SMS until approved

Khaqan

Google OAuth consent screen configuration for the drive.file scope

Needed before pilot schools can connect Drive; check current verification requirements

Khaqan

Razorpay accounts at pilot schools and written confirmation of their charge rates

Needed to test pass-on charges with real settings

Pilot schools

Accountant review of gateway charge pass-on and GST treatment

Wrong presentation creates disputes with parents

Accountant

Terms of service, privacy notice and DPDP consent text for schools and parents

Required before collecting any real student data

Khaqan, with legal review

Pilot agreements with the schools already identified

Defines data handling, support and feedback expectations

Khaqan

15 to 20 principal and owner interviews

Validates the problem and pricing before scaling; also shapes Phase 2 and 3 priorities

Khaqan

6.5 Definition of Done (Every Module)

Every requirement ID in scope is either met or listed with a reason in the verification report.

Zero TypeScript errors; lint clean; unit and integration tests pass; tenant-isolation test covers the new tables.

Server-side tier gating verified for the module (Basic versus Pro) by a test, not by looking at the UI.

Sensitive actions write audit entries; no secrets or personal data in logs.

Screens work at 360 px width; keyboard flow works on the Collect screen; Hindi strings come from the translation file.

Tried by one non-technical person at a real school, with their stumbling points recorded.

6.6 Risks and Mitigations

Risk

Impact

Mitigation

DLT approval delays

No production OTP

Start now; keep staging on a test mode; consider a fallback approved sender through the provider

PIN-only login is weaker than passwords

Account takeover on fee data

Throttling and lockout, new-device OTP, optional password for Owner and Accountant, alerts on lockouts

Receipt or due arithmetic errors

Loss of trust, disputes

Integer paise only, derived balances, concurrency tests, receipts immutable, reconciliation job

Drive permissions confuse non-technical staff

Documents not uploaded

Narrow scope, plain-language connect screen, pilot test with office staff, clear reconnect banner

Public sites slow on weak networks

Parents leave the site

Server-rendered HTML, image variants, CDN cache, throttled-network test in CI budget checks

Scope growth before the core is stable

Missed pilot dates

Transport, Staff, Expenses and Store stay behind the core modules; changes go through requirement IDs

Single-founder bandwidth

Delays

Fixed phase exits, weekly review of the verification report, cut P2 items first

Razorpay key leakage

Fraud exposure for a school

Encrypted storage, secrets never returned, restricted API key permissions recommended, rotation guide

Data loss

Existential

Daily backups, weekly external dump, restore drill before first paid school

7. Open Items for Founder Validation

A1: Website on both plans, Transport on Pro only. Confirm.

A2: Trial length and whether card is required at signup.

A3: Transport v1 with manual trip status, GPS later. Confirm that this fits the Pro promise made on the pricing page.

A4: Razorpay connection by pasting keys versus a partner OAuth flow.

Parent App technology: Capacitor-wrapped React (recommended for one codebase) versus Expo React Native.

Owner and Accountant second factor: optional password on top of PIN, yes or no.

Gateway charge: school-level absorb or pass-on, and who confirms the exact rate and GST treatment.

Receipt format: whether schools need their own receipt layout, header and footer, or a fixed MyZkool layout in v1.

Transport fee model: by stop (as specified) versus by distance band; and whether transport is billed monthly or follows the school's installment calendar.

Data erasure: acceptable retention period for financial records after a student leaves.

Hindi UI: which screens must ship in Hindi at pilot, if any.

Website limits: page count and storage per plan (Basic versus Pro).

8. Build Prompts for the Coding Tool

8.0 How to Use

Export this doc as Markdown and commit it to the repo as docs/SPEC.md. Every prompt below refers to its sections and requirement IDs (ON-, ST-, FE-, TR-, WB-).

Paste the Master Context (8.2) once into the coding tool's rules or project-instructions file so it applies to every session.

Run the phase prompts (8.3 to 8.10) in order, one at a time. Do not start a phase until the previous one's acceptance list passes.

After each phase, send the Verification Report Request (8.11). Paste the report back to me and I will write a targeted gap-fix prompt.

The repo already has a landing page, a simplified onboarding, the Student module (86 passing tests) and dashboard, fee and transport screens built earlier. Every prompt therefore starts with an audit of what exists. Nothing that already works is rewritten.

8.1 Spec Overrides

These corrections apply on top of sections 1 to 7 and win wherever they conflict:

Receipt cancellation and the immutability revoke (5.7): receipts.status and payment_allocations.released_at must change on cancel, so they cannot be blocked by a plain revoke. Instead, revoke direct update and delete on payments, receipts and payment_allocations from authenticated, and perform cancellation only inside a security definer function cancel_receipt(receipt_id, reason) that checks the fee.receipt_cancel permission, writes the audit row, and never deletes anything.

Student drafts (5.3): drafts live only in student_drafts. Remove 'draft' from the students.status check; a student row exists only when the wizard is submitted.

Payment recording: all inserts into payments, payment_allocations and receipts go through one security definer function record_payment(...), used by both the counter and the Razorpay webhook, so numbering and idempotency live in one place.

Provisioning: school creation uses one SQL function provision_school(...) that runs in a single transaction.

8.2 Master Context (Paste Once Into the Rules File)

You are the implementation engineer for MyZkool, a multi-tenant SaaS (school website builder + school ERP) for K-12 schools in India. The full specification is docs/SPEC.md. Treat it as the source of truth, including section 8.1 (Spec Overrides). If code and spec disagree, tell me in your report; do not silently pick one.STACKFrontend: React 19, TypeScript (strict), Vite, Tailwind CSS v4, Motion, Lucide React.Backend: Node.js, Express, TypeScript (strict), zod for validation.Data: Supabase (Postgres with RLS, Auth, Storage). Migrations via Supabase CLI in supabase/migrations, forward-only.Shared: packages/shared holds zod schemas, types and constants used by web and api.NON-NEGOTIABLE RULES1. Tenancy: every tenant table has school_id not null and RLS enabled. Every new table gets policies in the same migration. Extend the cross-tenant isolation test for every new table.2. Tier gating is enforced on the server (Express middleware requireFeature) AND in RLS via has_feature(). Hiding UI is never enforcement. Basic plan has no transport, exams, timetable, records.3. Money is integer paise everywhere. Never floats. Balances are derived, never stored.4. Students and parents are soft-deleted only. No hard deletes. payments, receipts and payment_allocations are immutable; changes happen through the security definer functions in SPEC 8.1.5. Aadhaar is encrypted (AES-256-GCM) with only last4 stored in clear; reveal goes through a permissioned endpoint that requires a reason and writes an audit row. Medical data is gated by the student.medical permission and must be absent from API responses for other roles.6. Secrets (Razorpay keys, Google tokens) are encrypted at rest and never returned to any client or written to logs. No personal data in logs.7. Use the service-role key only in provisioning, webhooks, jobs and the public site renderer, and always set school_id from a verified source, never from request input.8. All writes to sensitive entities go through the audit middleware.9. Idempotency-Key header is required for payment, receipt and online-order creation.10. No fake data in product code paths. Demo data lives only in scripts/seed and is labelled as demo.UI QUALITY BARGeneric admin-form UI is rejected. Follow SPEC section 3. Plus Jakarta Sans for display, Inter for body, brand blue #2158E0, emerald #1FAE7A for success and WhatsApp-related actions. Every list has designed empty, loading (skeleton) and error states. Every screen works at 360px width. Copy rules: sentence case, no emojis, no ALL-CAPS labels, no words like seamless or revolutionize, no invented testimonials or logos. UI strings go through the translation file so Hindi can be added later.ENGINEERING RULES- Before writing code in any phase, audit the existing repo for that area and report what exists, what matches the spec and what does not. Reuse and extend; do not rewrite working code. If a schema change is needed on existing tables, write a migration that preserves data.- Small, reviewable commits with clear messages. Migrations never edited after being applied; add a new one.- Every API route validates input with zod, returns { code, message, details } on error, and has at least one test.- Keep all existing tests green. Never delete or weaken a test to make it pass.- Run typecheck, lint and the full test suite before reporting done.- If something in the spec is ambiguous, choose the simplest option consistent with the spec, record it under ASSUMPTIONS in your report, and continue.ENVIRONMENT VARIABLES (never commit values)SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_MASTER_KEY (32-byte base64, for field encryption), FAST2SMS_API_KEY, FAST2SMS_SENDER_ID, SMS_MODE (console|live), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FCM_SERVICE_ACCOUNT_JSON, CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN, TURNSTILE_SECRET, PUBLIC_BASE_DOMAIN (myzkool.in).

8.3 Phase 0 Prompt: Foundations

PHASE 0: FOUNDATIONS. Read SPEC sections 4.1 to 4.6, 4.12 to 4.14, 5.1, 5.2, 5.7, 8.1.First audit the repo: folder structure, existing migrations, auth approach, existing tables. Report before coding.Do:1. Ensure a workspace layout: apps/web, apps/api, packages/shared, supabase/migrations, scripts/. Move code only if needed and keep imports working.2. CI (GitHub Actions): install, typecheck, lint, test, build; fail on any error.3. Migrations: reconcile existing tables with SPEC 5.1 and 5.2 (schools, profiles, school_members, plans, plan_features, subscriptions, integrations, otp_requests, consents, audit_logs, device_tokens, notifications, jobs, academic_years, classes, sections). Seed plans (basic, pro) and plan_features per SPEC 4.5.4. Functions my_school_ids() and has_feature(). Standard RLS policies on every tenant table.5. Cross-tenant isolation test: create two schools and two users; programmatically iterate every table that has school_id and prove user A cannot select, insert, update or delete school B rows. This test must fail loudly if a future table has school_id without RLS.6. Auth: OTP service (SPEC 4.3) with a Fast2SMS adapter and a console adapter selected by SMS_MODE; hashed codes, 5-minute expiry, 5 attempts, resend throttle. PIN login with per-mobile and per-IP rate limit, lockout after 5 failures for 15 minutes, new-device OTP after 30 days inactivity, PIN reset via OTP.7. Utilities: AES-256-GCM encrypt/decrypt using APP_MASTER_KEY (with unit tests), audit middleware, requireFeature middleware, requirePermission middleware using the SPEC 4.4 matrix, standard error format, Idempotency-Key helper.8. Jobs worker skeleton polling the jobs table with FOR UPDATE SKIP LOCKED, with one example job and tests.Do not: build any module UI; call real SMS in tests.Acceptance: isolation test green; OTP then PIN login works end to end in console mode; encryption round-trip tests pass; CI green.

8.4 Phase 1 Prompt: Onboarding

PHASE 1: ONBOARDING. Read SPEC sections 1.4 (M1, ON-1 to ON-10), 2.2, 2.3, 3, 5.1, 8.1.Audit the existing onboarding (it was already simplified to remove the Subjects and Staff steps). Report which ON- requirements are met.Do:1. Three-step flow: Account (name, mobile, email, OTP, PIN), School (name, board, medium, city, state, pincode, contact, strength band), Website basics and subdomain (logo, tagline, brand colour, address, phone). Progress is stored in schools.onboarding_step so the flow is resumable (ON-8).2. GET /onboarding/subdomain-check: lowercase letters, digits, hyphens, 3 to 30 characters, reserved-word list (www, app, admin, api, mail, support, static, assets, cdn, staging, dev, demo, myzkool and similar), uniqueness, and three suggested alternatives when taken. Debounced in the UI.3. SQL function provision_school(...) in one transaction: school row, owner membership, current academic year, trial subscription (14 days, VALIDATE), default site and pages from the default template filled from onboarding data, optional class presets Nursery to 12, consent record. Failure leaves no partial data (write a test that forces a mid-way failure).4. Redirect to /admin showing the setup checklist: academic year and classes, fee structure, add or import students, connect Google Drive, connect Razorpay, invite staff, review website. Items complete from real data, not manual toggles.5. Staff invite by mobile and role; accepted via OTP then PIN setup (ON-9). Entitlements endpoint GET /me/entitlements.6. UI per SPEC section 3: three visible steps with progress, plain labels, inline validation, error paths from SPEC 2.2 (OTP resend, taken subdomain, existing mobile).7. Hindi translation scaffolding only (strings file); no Hindi content required.Do not: add Subjects or Staff steps; send real SMS in tests.Acceptance: new school reaches dashboard in under 10 minutes by manual timing; failed provisioning leaves zero rows; duplicate mobile and taken subdomain paths tested; isolation test still green.

8.5 Phase 2 Prompt: Student

PHASE 2: STUDENT MODULE COMPLETION. Read SPEC sections 1.4 (M2, ST-1 to ST-15), 2.4, 3.5, 4.10, 4.13, 5.3, 8.1.Audit the existing /admin/students module, wizard, tests (86 passing) and schema. Report each ST- requirement as met, partial or missing. Keep every existing test green.Do (only what is missing or non-compliant):1. Reconcile schema with SPEC 5.3 using data-preserving migrations: students, parents (unique school_id + mobile), student_parents (single primary contact), student_documents, student_medical, student_drafts, admission_counters. Remove the draft status per 8.1.2. Admission number: generated from admission_counters inside the submit transaction, with configurable prefix; never reused.3. Wizard: 8 steps with autosave drafts, resume, sticky summary rail (desktop) and stepper sheet (mobile). Only Basic Info, Academic Info and one parent contact are required to submit.4. Parents: GET /parents/search?mobile= before creation; selecting links the existing parent; siblings show on the profile.5. Aadhaar: encrypted storage, last4 column, masked display, POST /students/:id/aadhaar/reveal requiring permission and a typed reason, audit entry.6. Medical: step and API fields present only for roles with student.medical; other roles must not receive the data at all (test this).7. Google Drive: OAuth with drive.file scope, encrypted refresh token in integrations, folder MyZkool/{Year}/{AdmissionNo}, upload and streaming download through the API after permission check, reconnect banner when the token is revoked.8. List and profile: search by name, admission number and parent mobile; filters; pagination; profile tabs (Overview, Parents, Fees, Transport, Documents, Medical when permitted, Activity). The Fees and Transport tabs show a designed empty state until those modules exist.9. CSV and Excel import with template download, dry run, row-level error report, 500-row test.10. Year-end promotion with preview and an undo window. Duplicate warning on name + dob + parent mobile. Export with sensitive columns excluded unless permitted, every export audited.11. Archive with reason instead of delete; hard delete blocked at database level.Do not: store files outside Drive except the student photo (Supabase Storage); expose Aadhaar or medical in list responses.Acceptance: existing 86 tests plus new tests green; sibling linking test; medical absence test; reveal-audit test; import of 500 rows works with a clear error report.

8.6 Phase 3 Prompt: Fee

PHASE 3: FEE MODULE. Read SPEC sections 1.4 (M3, FE-1 to FE-15 except FE-9 and FE-15), 2.5, 3.4, 3.5, 4.7, 5.4, 5.7, 8.1.Audit the existing fee screens (built earlier as UI) and report what is real data versus static. Reuse the visual work; wire it to real data.Do:1. Migration for SPEC 5.4 including receipt_counters and fee_policies, RLS on all tables, immutability revokes and the security definer functions record_payment(...) and cancel_receipt(...) per 8.1. record_payment locks the counter row, increments, inserts payment, allocations and receipt in one transaction, and honours the idempotency key.2. Fee heads, structures and items; assign_structure on admission and manually; generate_dues producing one fee_dues row per head per installment; concessions with reason and approver; sync_transport_dues(student_id, effective_from) as a stub that Transport will call later.3. Collect screen: search student, pending dues by head and installment, select dues, partial payment, modes cash, upi, cheque, bank, confirm creates payment and receipt atomically. Keyboard flow: Enter confirms, Esc cancels. This is the most polished screen in the product.4. Receipts: A4 and thermal 80mm printable layouts, PDF generation and share link, sequential numbering per school per year, cancel with mandatory reason (cancelled receipts stay visible).5. Dues dashboard and defaulters by class, amount, days overdue; reports: day book, by mode, by head, by class, date range; CSV and PDF export.6. Late fines via a daily job writing separate due rows, with waive permission. Manual reminder helper: build a wa.me link with a prefilled template for one parent; no automatic WhatsApp.7. Permissions per SPEC 4.4 enforced in API and RLS.Do not: store a mutable balance; allow update or delete of payments or receipts; use floats.Acceptance: concurrency test with 20 parallel collections gives gapless unique receipt numbers; idempotency test (same key twice gives one receipt); cancel then re-collect leaves a correct book; day book total equals the sum of valid receipts to the paisa; Basic and Pro both have Fee access.

8.7 Phase 4 Prompt: Website Builder

PHASE 4: WEBSITE MODULE. Read SPEC sections 1.4 (M5, WB-1 to WB-13), 2.8, 3, 4.11, 5.6, 8.1.Audit what exists for website setup from onboarding. Report before coding.Do:1. Migration for SPEC 5.6 with RLS. Plan limits for pages and media storage enforced server-side (use plan_features; VALIDATE the numbers, default Basic 8 pages and 200 MB, Pro 20 pages and 1 GB).2. Section library in packages/shared as typed zod schemas: Hero, About, Principal's Message, Key Numbers, Programs, Facilities, Gallery, Notices, Admission CTA, Contact and Map, FAQ, Footer. Each has an editor form and a server-renderable React component. Templates ship with clearly marked placeholder text, never fake testimonials or logos.3. Four templates sharing the library; switching a template preserves content.4. Editor: page list, section add, reorder, hide, inline edit panel, live preview, theme controls (logo, brand colour, curated font pairs, button style), autosave to draft tables, private preview URL.5. Publish: validate full site with zod, write immutable snapshot to site_versions, move sites.published_version_id in one transaction, purge Cloudflare cache for the host (adapter with a no-op mode when env vars are absent), rollback to the last 10 versions.6. Public renderer in Express: map Host header to school, load snapshot (memory cache), server-render React to HTML with inline critical CSS and minimal JS, cache headers per SPEC 4.11, sitemap.xml, robots.txt, canonical URLs, Open Graph, JSON-LD EducationalOrganization.7. Media pipeline: on upload generate 480, 960 and 1600 px WebP variants with sharp, store width and height, serve with srcset and lazy loading.8. Enquiry form: public POST /public/enquiries with Turnstile, honeypot, rate limit, consent checkbox, zod validation; Leads inbox in admin with status workflow; push notification job to office users.9. Optional: notices toggled to appear on the website (WB-8).Do not: depend on client-side rendering for page content; load third-party scripts on public pages except Turnstile on the form page.Acceptance: published site passes Lighthouse mobile performance 90 or higher on a throttled connection for the home page; enquiry lands in Leads; rollback restores the previous version; page and storage limits enforced by tests; a school can only edit its own site (isolation test).

8.8 Phase 5 Prompt: Parent App and Online Payments

PHASE 5: PARENT APP AND RAZORPAY. Read SPEC sections 1.4 (FE-9, FE-11, FE-15), 2.6, 3.3, 3.5, 4.3, 4.8, 4.9, 5.4, 8.1.Audit the repo for any parent-facing code. Report before coding.Do:1. apps/parent: React app wrapped with Capacitor (VALIDATE choice), sharing components and packages/shared with web. Bottom tabs Home, Fees, Transport, Notices, Profile; child switcher when siblings exist. Parent login: OTP first time then PIN; one parent user can see children across schools.2. Parent RLS policies: a parent reads only students linked to their parents row via student_parents, and only fee, receipt, transport and notice rows for those students. Write tests proving a parent cannot see another child.3. Settings > Razorpay (owner only): school enters Key ID, Key Secret and webhook secret; stored encrypted; secret never returned; a Test connection action. fee_policies screen for absorb or pass_on and rate in basis points, plus GST on charge.4. POST /fee/online/order: creates online_payment_attempts and a Razorpay order using that school's keys. Pass-on gross-up: payable = ceil(due / (1 - rate)), shown as a separate line. Idempotency-Key required.5. POST /webhooks/razorpay/:schoolId: verify signature over the raw body with that school's webhook secret; on payment.captured call record_payment once (unique razorpay_payment_id makes replays harmless). Never mark paid from the client.6. Parent UI: dues by child, Pay with amount, charge line and total, Processing state polling up to 2 minutes, receipt in history and as a push.7. Push: device token registration, FCM sender, notifications table with read state, quiet hours and preferences, scheduled fee reminder job.8. Nightly reconciliation job comparing captured gateway payments to receipts, with a flagged-mismatch list on the Fee dashboard (FE-15).Do not: send automated WhatsApp; return any key or secret to the client.Acceptance: with Razorpay test mode, one payment creates exactly one receipt even if the webhook fires three times; wrong-signature webhook is rejected; parent isolation tests pass; pass-on arithmetic unit tests cover rounding.

8.9 Phase 6 Prompt: Transport

PHASE 6: TRANSPORT MODULE (PRO ONLY). Read SPEC sections 1.4 (M4, TR-1 to TR-11 except TR-10), 2.7, 3.4, 4.5, 4.12, 5.5, 8.1.Audit the existing transport screens (built earlier as UI). Report real versus static. Reuse the visual work.Do:1. Migration for SPEC 5.5 with RLS. Every transport table policy also calls has_feature(school_id, 'transport'). Every transport route uses requireFeature('transport').2. Vehicles with insurance, fitness and permit expiry; drivers and attendants with licence expiry; daily expiry-alert job (30, 7 and 1 days).3. Routes with ordered stops (drag to reorder), pickup and drop times; stop-wise monthly fee slabs per academic year.4. Assign student: route, pickup stop, drop stop, effective_from. Capacity check inside a transaction (lock the vehicle row). One active assignment per student per year (partial unique index).5. Replace the sync_transport_dues stub: assignment creates or updates Transport fee dues in Fee; removal with effective_to ends future dues and leaves past dues intact.6. Parent App Transport tab: route, stop, pickup time, vehicle number, driver contact.7. Driver mode in the staff view: today's trip, stop-wise student list, buttons Started, Reached stop, Completed writing trip_events; push to the parents at that stop.8. Reports: students per route, vehicle occupancy, transport dues.Do not: build live GPS (TR-10 is later); let a Basic school reach any transport route or table by any path.Acceptance: tier-gating tests prove Basic is blocked at API level and at database level; capacity cannot be exceeded under concurrent assignments; assign and remove produce correct dues; parent sees only their child's route.

8.10 Phase 7 Prompt: Hardening and Pilot Readiness

PHASE 7: HARDENING. Read SPEC sections 1.5, 4.13, 4.14, 4.15, 6.5, 6.6.Do:1. Security review: list every table, confirm RLS and policies, confirm immutability revokes, confirm no endpoint returns Aadhaar, medical or secrets to an unauthorised role. Produce docs/SECURITY_CHECKLIST.md with evidence per item.2. Performance: seed a clearly labelled demo school with 3,000 students and 60,000 dues via scripts/seed; run EXPLAIN on student search, dues list and day book; add missing indexes; report timings. Add k6 or equivalent script for the Collect endpoint.3. Accessibility pass on the main flows: contrast, focus, labels, 44 px touch targets.4. Operations: scripts for weekly logical backup and a documented restore drill (docs/RUNBOOK.md) including key rotation and the breach steps from SPEC 4.13.5. Observability: Sentry, structured logs, health endpoints, uptime check targets, worker heartbeat alert.6. End-to-end tests (Playwright) for the flows in SPEC 4.15.7. Fix any item from earlier verification reports still open.Acceptance: security checklist complete; p95 targets from SPEC 1.5 measured and reported; restore drill performed and timed; all tests and CI green.

8.11 Verification Report Request (Send After Every Phase)

Stop coding. Produce VERIFICATION_REPORT.md for this phase with exactly these sections:1. REQUIREMENTS: a table of every requirement ID in scope with status (met, partial, missing) and the file or test that proves it.2. TESTS: number added, total passing, any skipped or flaky, and the commands to run them.3. TYPESCRIPT AND LINT: error counts (must be zero).4. TENANT AND TIER CHECKS: confirm the isolation test covers all new tables and tier gating is tested.5. MIGRATIONS: list of migrations added and whether any touch existing data.6. ASSUMPTIONS: every choice you made where the spec was ambiguous.7. DEVIATIONS: anything that differs from the spec and why.8. KNOWN GAPS: anything unfinished, with a suggested fix.Be honest. Do not mark an item met unless a test or a manual step you ran proves it.

8.12 Gap-Fix Prompt Template

Fix only the items below from the verification report. Do not change passing behaviour. Keep all tests green and add a test for every fix.GAPS:- [ID] description of what is missing or wrong- [ID] ...For each gap: state the root cause, make the smallest change that fixes it, and show the test. Then produce an updated VERIFICATION_REPORT.md.