# Transport module review — Part C

| ID | Criterion / Spec ref | Status | File : line | Notes |
|----|----------------------|--------|-------------|-------|
| C15-1 | Every `/api/transport` endpoint returns 402 `PLAN_REQUIRED` for Basic school | PASS | `transportRoutes.ts:55` — `transportRouter.use(requireFeature('transport'))` applies to all routes | Plan gate is a single middleware applied before all handlers |
| C15-2 | Direct table queries under a Basic school's JWT return zero rows (RLS) | PASS | `014_transport_core.sql:206` + `015_transport_assignments.sql:100` | All 11 tables have `school_has_feature('transport')` in their policies |
| C15-3 | Assigning student 41 to a 40-seat route fails without override; override stores reason + audit row | PASS | `transportAssignmentService.ts:209-227` | `getActiveRidersCountForRoute` + `logTransportAudit` on override |
| C15-4 | Vehicle with expired insurance document cannot be assigned to route with blocking on; override audited | PASS | `transportCoreService.ts` — `createRoute/updateRoute` checks `block_expired_documents` | Compliance block + audit in route save |
| C15-5 | Assign, change and stop produce correct fee dues and roll back if Fee service fails | PASS | `transportAssignmentService.ts:315-334, 441-481, 555-573` | Rollback deletes assignment from localStorage or Supabase |
| C15-6 | Driver API returns only the caller's trips and riders; querying another route returns 403 and RLS empty | MISSING | — | Driver-app endpoints (`GET /driver/today`, `POST /driver/trips/:id/start`, `POST /driver/events`, `POST /driver/trips/:id/bus-empty`, `POST /driver/trips/:id/end`, `POST /driver/problems`) are not implemented in `transportRoutes.ts` |
| C15-7 | Offline: 50 boarding events queued offline sync in order, twice, no duplicates | MISSING | — | No offline boarding event queue or `trip_boarding_events` table/service exists yet (Phase 6 driver app) |
| C15-8 | Ending a trip without bus-empty check or unresolved riders is rejected; admin override audited | MISSING | — | Trip lifecycle endpoints not implemented |
| C15-9 | Guardian handover records authorised parent; unauthorised parent not selectable | PASS (partial) | `transportAssignmentService.ts:296` — `requires_guardian_handover` stored; UI: `AssignTransportDrawer.tsx:111` | Drawer toggles handover flag; enforcing from an authorised-parent list is a driver-app concern (Phase 6) |
| C15-10 | Opted-out parents receive nothing; tracking links expire when trip ends; approaching alerts fire once per stop per trip | MISSING | — | Tracking and approaching-alert logic is Phase 9; opted-out check not yet in notification queue |
| C15-11 | Live tracking: parent link shows only child's bus, only during trip, 404 afterwards | MISSING | — | `GET /public/track/:token` not implemented |
| C15-12 | Document expiry job creates exactly one alert per document per threshold | PASS | `transportExpiryJob.ts:80-82` | `dedupe_key = doc_expiry_${schoolId}_vehicle_${doc.id}_t${threshold}` checked before writing |
| C15-13 | Trip generation is idempotent and respects `run_days` | MISSING | — | Trip generation service/scheduler not implemented |
| C15-14 | Driver app usable at 360 px, primary buttons ≥ 56 px, works offline after first load | MISSING | — | Driver app (PWA) not implemented |
| C2-1 | `transport.manage` permission enforced — only owner/transport_manager can manage vehicles/staff/routes | FAIL | `transportRoutes.ts:55` | Middleware only checks plan feature, not role-level permissions. All authenticated users pass through |
| C2-2 | `transport.assign` enforced on assignment endpoints | FAIL | `transportRoutes.ts:400-540` | Same as above — no per-role gate on `/assignments` endpoints |
| C2-3 | `transport.fees.manage` enforced on fee zone endpoints | FAIL | `transportRoutes.ts:310-365` | No role check on `POST/PUT/DELETE /fees` |
| C3-RLS | All C3 tables have RLS with `school_has_feature('transport')` | PASS | `014_transport_core.sql:193-255`, `015_transport_assignments.sql:93-117` | 11 of 11 tables covered |
| C3-MISS | Tables `transport_trips`, `trip_checklists`, `trip_stop_events`, `trip_boarding_events`, `trip_location_pings` missing | MISSING | — | These trip-phase tables are not in any migration (Phase 6 scope, but needed for C15 tests) |
| C4.1 | Dashboard: needs-attention section, today's trips, fleet snapshot, primary actions | PASS (partial) | `TransportDashboard.tsx:90-280` | Needs-attention and fleet snapshot present; today's trips board shows empty state only — no actual trip data |
| C4.2 | Vehicles list + profile (tabs: overview, documents, maintenance, trips) | PASS (partial) | `VehiclesPage.tsx`, `VehicleProfileModal.tsx` | Maintenance (Phase 10) and Trips tab not implemented; document renewal keeps history ✓ |
| C4.3 | Drivers and attendants — license fields, masked ID proof, driver-app invite | PASS | `TransportStaffPage.tsx`, `transportRoutes.ts:243` | Last-4 masking present; invite generates WhatsApp link |
| C4.4 | Route builder — drag reorder, time helper, seat meter, optional Leaflet map, printable route sheet | PASS (partial) | `RouteBuilderPage.tsx`, `PrintableRouteSheet.tsx` | Drag reorder ✓, time helper ✓, seat meter ✓, Leaflet map ✓; `GET /routes/:id/sheet` endpoint MISSING in router (only UI page exists) |
| C4.5 | Fee zones — three bases, billing months, apply to existing (approval flow for above-threshold changes) | PASS (partial) | `FeeZonesPage.tsx`, `transportRoutes.ts:310` | Three bases ✓, billing months ✓; `POST /fees/:id/apply-to-existing` endpoint MISSING |
| C5.1 | Assign from student profile drawer — route search, stops, service type, live fee, guardian handover, success panel, capacity override | PASS | `AssignTransportDrawer.tsx`, `StudentProfile.tsx:1628-2064` | All steps present; capacity override shows reason field |
| C5.2 | Bulk assign — two-pane, requests tab, seat limits, confirmation summary | PASS | `BulkAssignPage.tsx` | Both panes; requests tab; seat check; confirmation dialog |
| C5.3 | Change or stop transport — fee preview, stop cancels dues, mark not travelling | PASS | `StudentProfile.tsx:1668-1940`, `transportAssignmentService.ts:358-580` | Change drawer ✓, stop modal ✓, mark not travelling ✓ (absence) |
| C5.4 | Year renewal page — preview table, bulk confirm, unrenewed list, idempotent commit | PASS | `YearRenewalPage.tsx`, `transportAssignmentService.ts:588-680` | Idempotent: unique index blocks duplicate active assignments |
| C7.1 | One active assignment per student per academic year | PASS | `015_transport_assignments.sql:27` — unique partial index | Enforced at DB level |
| C7.4 | Fee creation via `createTransportDues`, rolls back on failure | PASS | `transportAssignmentService.ts:315-334` | Both Supabase and localStorage paths handled |
| C7.8 | Withdrawn/transferred student ends active assignment | PASS | `studentOperationsService.ts:1299-1303` | `changeStudentStatus` calls `stopAssignment` |
| C9-1 | Route roster report | PASS | `transportAssignmentService.ts` — `getRouteRosterReport`; `transportRoutes.ts:576` | |
| C9-2 | Riders by route and stop | PASS | `getRidersByRouteAndStopReport` | |
| C9-3 | Vehicle utilisation | PASS | `getVehicleUtilisationReport` | |
| C9-4 | Document expiry report | FAIL | `transportRoutes.ts:568` | Not a key in `/reports/:key`; only exposed via `POST /expiry-check` which runs the job; no read-only query for all docs with expiry status |
| C9-5 | Unassigned and requests report | PASS | `getUnassignedAndRequestsReport` | |
| C9-6 | Trip performance report | MISSING | — | No trip data tables or service |
| C9-7 | Boarding and absence report | MISSING | — | No trip boarding tables |
| C9-8 | Transport fee report | PASS | `getTransportFeeReport` | |
| C9-9 | Assignment history report | MISSING | — | Not in `/reports/:key` switch; history kept in table but no report endpoint |
| C10-1 | Registration number unique per school, uppercase, no spaces | PASS | `transportCoreService.ts` — normalises on create |
| C10-4 | Route stops — continuous sequence, times increase | PASS | `transportCoreService.ts` — `saveRouteStops` validation |
| C10-5 | Soft delete everywhere (archived, not removed) | PASS | Services set `status = 'inactive'/'retired'` or `ended`, never DELETE |
| C10-6 | Boarding events immutable — corrections add new row | MISSING | — | No boarding event service |
| C13-DRIVER | Driver app API endpoints (`/driver/today`, `/driver/trips/:id/start`, `/driver/events`, `/driver/trips/:id/bus-empty`, `/driver/trips/:id/end`, `/driver/problems`) | MISSING | — | Not in `transportRoutes.ts` |
| C13-TRIPS | `/trips` CRUD + `PATCH /trips/:id` (reassign/cancel) | MISSING | — | Not implemented |
| C13-LIVE | `GET /live`, `GET /trips/:id/trace`, `GET /public/track/:token` | MISSING | — | Not implemented (Phase 9 for live tracking; driver app Phase 6) |
| C13-DELAY | `POST /trips/:id/delay-notice` | MISSING | — | Not implemented |
| C13-SHEET | `GET /routes/:id/sheet` | FAIL | `transportRoutes.ts` | UI page `PrintableRouteSheet.tsx` exists but no API endpoint |
| C13-APPLY | `POST /fees/:id/apply-to-existing` | MISSING | — | Not implemented |
| PLAN-GATE | Server-side plan gate on all routes | PASS | `transportRoutes.ts:55` — global `use(requireFeature('transport'))` | |
| ROLE-GATE | Per-role permission gate on sensitive routes | FAIL | `transportRoutes.ts` throughout | `requireRole` / `requirePermission` middleware not applied; all authenticated users can manage vehicles, assign, etc. |
| IDEMPOTENCY | Money routes idempotent (createTransportDues called twice = one set of dues) | PASS | `feeDuesService.ts:170-179` — `dueExists()` check | |
| AUDIT | Audit rows on assign, change, stop, capacity override | PASS | `transportAssignmentService.ts:344, 487, 576` — `logTransportAudit` called | |
| SKELETON | Loading/skeleton states in transport UI pages | FAIL | `BulkAssignPage.tsx:130`, `YearRenewalPage.tsx` | BulkAssignPage and YearRenewalPage show no skeleton; plain `loading…` text only; VehiclesPage and RouteBuilderPage have skeleton |
| EMPTY | Empty states in all transport UI pages | PASS (partial) | `TransportDashboard.tsx:243`, `BulkAssignPage.tsx` | Most pages have empty states; YearRenewalPage shows "No eligible students" ✓ |
| ERROR | Error states handled and shown to user | PASS | `AssignTransportDrawer.tsx:75`, `BulkAssignPage.tsx:70` | Error messages rendered in UI |
| 360PX | Layout works at 360 px (no horizontal overflow) | PASS (partial) | `RouteBuilderPage.tsx:417` — `overflow-x-auto`; all pages use `w-full` | Two-pane `BulkAssignPage` uses `flex gap-4` which may overflow at 360 px without wrap |
| KEYBOARD | Keyboard navigation through forms | PASS (partial) | Inputs use standard `<input>`, `<select>`, `<button>` | No explicit `onKeyDown` submit; tab order follows DOM order |
| COPY | Sentence-case labels, no emojis | PASS | Grep of all `transport/*.tsx` shows no emoji characters; labels are sentence-case |

