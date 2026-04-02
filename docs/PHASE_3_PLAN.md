# Phase 3 — Admin Implementation Plan

---

## 1. Admin Modules

### 1.1 Dashboard — `/admin`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/page.tsx` |
| API | `GET /api/admin/voyages?status=OPEN` (count), `GET /api/ops/queue` (summary), direct Supabase count queries |
| Auth | Admin (via layout) |
| Data | Active voyage count, upcoming departures (next 3), open ops count by type, stale hold count, recent bookings count (24h) |
| Actions | Links to voyages, ops queue |

### 1.2 Vessel List — `/admin/vessels`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/vessels/page.tsx` |
| API | `GET /api/admin/vessels` (new — add GET to existing route) |
| Auth | Admin |
| Data | Table: name, base_lane_meters, base_m2, base_passenger_capacity, cabin_type_count, commissioned_at |
| Actions | Link to create vessel |

### 1.3 Vessel Create — `/admin/vessels/new`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/vessels/new/page.tsx` |
| API | `POST /api/admin/vessels` (upgrade stub) |
| Auth | Admin |
| DB | Direct INSERT `vessels` + `vessel_cabin_types` |
| Validation | `createVesselSchema` |
| Actions | Submit form → create vessel → redirect to vessel list |

### 1.4 Voyage List — `/admin/voyages`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/voyages/page.tsx` |
| API | `GET /api/admin/voyages` (new — add GET to existing route) |
| Auth | Admin |
| Data | Table: vessel_name, origin→destination, departure_utc, status, confirmed_booking_count. Filter by status. Sort by departure_utc. |
| Actions | Link to create voyage, click row → voyage detail |

### 1.5 Voyage Create — `/admin/voyages/new`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/voyages/new/page.tsx` |
| API | `POST /api/admin/voyages` (upgrade stub) |
| Auth | Admin |
| DB | Direct INSERT `voyages` (status=DRAFT). Trigger auto-creates VCC row. |
| Validation | `createVoyageSchema` |
| Actions | Submit form → create voyage → redirect to voyage detail |

### 1.6 Voyage Detail + Lifecycle — `/admin/voyages/[id]`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/voyages/[id]/page.tsx` |
| API | `GET /api/admin/voyages/[id]` (new — add GET), lifecycle POSTs (upgrade stubs) |
| Auth | Admin |
| DB wrappers | `openVoyage`, `closeVoyage`, `departVoyage`, `cancelVoyage` |
| Data | Voyage details, capacity counters, cabin inventory, booking counts by status |
| Actions | Lifecycle buttons: Open (DRAFT→OPEN), Close (OPEN→CLOSED), Depart (CLOSED→DEPARTED), Cancel. Only valid transitions shown. Cabin inventory setup for DRAFT voyages (INSERT/UPDATE `voyage_cabin_inventory`). |

### 1.7 Manifest — `/admin/voyages/[id]/manifest`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/voyages/[id]/manifest/page.tsx` |
| API | `GET /api/admin/voyages/[id]/passenger-manifest` (upgrade stub), `GET /api/admin/voyages/[id]/vehicle-manifest` (upgrade stub) |
| Auth | Admin |
| DB wrappers | `passengerManifest`, `vehicleManifest` |
| Data | Two tabs: Passenger table (name, doc, booking status, cancelled flag) + Vehicle table (plate, type, dimensions, cancelled flag). Active/cancelled toggle. Count badges. |
| Actions | CSV export (client-side) |

### 1.8 Revenue — `/admin/voyages/[id]/revenue`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/voyages/[id]/revenue/page.tsx` |
| API | `GET /api/admin/voyages/[id]/revenue` (upgrade stub) |
| Auth | Admin |
| DB wrappers | `revenueSummary` |
| Data | Cards: gross captured, total refunded, net realized, open refund liability, unknown payments, failed payments. Booking counts by status. |
| Actions | None (read-only) |

### 1.9 Ops Queue — `/admin/ops`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/ops/page.tsx` |
| API | `GET /api/ops/queue` (upgrade stub), `GET /api/ops/queue/[issueType]` (upgrade stub) |
| Auth | Admin or Ops |
| DB wrappers | `opsQueueSummary` |
| Data | Summary cards per issue_type: count, oldest, newest. Click card → issue list. |
| Actions | Click card → navigate to filtered list |

### 1.10 Ops Entry Detail — `/admin/ops/[reviewId]`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/ops/[reviewId]/page.tsx` |
| API | `GET /api/ops/queue/entry/[id]` (upgrade stub), `POST /api/ops/queue/entry/[id]/resolve` (upgrade stub) |
| Auth | Admin or Ops |
| DB wrappers | `resolveOpsReview` |
| Data | Full ops entry with related hold/booking/payment/refund context. Status, timestamps, description. |
| Actions | Resolve button → modal with resolution_action text input + confirm. |

### 1.11 Reconciliation — `/admin/reconciliation/[voyageId]`

| Field | Value |
|-------|-------|
| Page | `src/app/(admin)/admin/reconciliation/[voyageId]/page.tsx` |
| API | `GET /api/ops/integrity/[voyageId]` (upgrade stub), `POST /api/ops/reconcile/drift/[voyageId]` (upgrade stub), `POST /api/ops/reconcile/payment/[paymentId]` (upgrade stub) |
| Auth | Admin or Ops |
| DB wrappers | `assertCapacityConsistency`, `reconcileCounterDrift`, `reconcilePaymentUnknown` |
| Data | Capacity consistency status (green/red). List of UNKNOWN payments for this voyage. |
| Actions | "Check Integrity" button, "Fix Drift" button (with confirmation), "Resolve Payment" button per payment (select SETTLED/FAILED). |

---

## 2. Admin API Routes

### New GET endpoints (add to existing route files)

| Method | Path | File | Data |
|--------|------|------|------|
| GET | `/api/admin/vessels` | `src/app/api/admin/vessels/route.ts` | All vessels with cabin type count |
| GET | `/api/admin/voyages` | `src/app/api/admin/voyages/route.ts` | All voyages (filter by status), join vessel name + booking count |
| GET | `/api/admin/voyages/[id]` | `src/app/api/admin/voyages/[id]/route.ts` | Voyage + VCC + VCI + booking counts |

### Upgrade existing POST/PATCH stubs

| Method | Path | File | DB Action |
|--------|------|------|-----------|
| POST | `/api/admin/vessels` | existing stub | Validate `createVesselSchema` → INSERT vessels + vessel_cabin_types |
| POST | `/api/admin/voyages` | existing stub | Validate `createVoyageSchema` → INSERT voyages (DRAFT) |
| PATCH | `/api/admin/voyages/[id]` | existing stub | Validate `updateVoyageSchema` → UPDATE voyages WHERE status=DRAFT |
| POST | `/api/admin/voyages/[id]/open` | existing stub | `openVoyage(supabase, id)` |
| POST | `/api/admin/voyages/[id]/close` | existing stub | `closeVoyage(supabase, id)` |
| POST | `/api/admin/voyages/[id]/depart` | existing stub | `departVoyage(supabase, id)` |
| POST | `/api/admin/voyages/[id]/cancel` | existing stub | `cancelVoyage(supabase, id)` |
| GET | `/api/admin/voyages/[id]/passenger-manifest` | existing stub | `passengerManifest(supabase, id)` |
| GET | `/api/admin/voyages/[id]/vehicle-manifest` | existing stub | `vehicleManifest(supabase, id)` |
| GET | `/api/admin/voyages/[id]/revenue` | existing stub | `revenueSummary(supabase, id)` |

### Upgrade existing Ops stubs

| Method | Path | File | DB Action |
|--------|------|------|-----------|
| GET | `/api/ops/queue` | existing stub | `opsQueueSummary(supabase)` |
| GET | `/api/ops/queue/[issueType]` | existing stub | Direct query `ops_review_queue WHERE status='OPEN' AND issue_type=$type` |
| GET | `/api/ops/queue/entry/[id]` | existing stub | Direct query ops entry + related entities |
| POST | `/api/ops/queue/entry/[id]/resolve` | existing stub | `resolveOpsReview(supabase, { reviewId, resolutionAction, resolvedBy })` |
| GET | `/api/ops/integrity/[voyageId]` | existing stub | `assertCapacityConsistency(supabase, voyageId)` — 200 on pass, 422 on fail |
| POST | `/api/ops/reconcile/drift/[voyageId]` | existing stub | `reconcileCounterDrift(supabase, voyageId)` |
| POST | `/api/ops/reconcile/payment/[paymentId]` | existing stub | `reconcilePaymentUnknown(supabase, { paymentId, authoritativeOutcome })` |

---

## 3. Shared Admin Infrastructure

### 3.1 Admin Data Table — `src/components/ui/data-table.tsx`

Generic table component accepting `columns[]` and `data[]`. Supports: header labels, row click handler, empty state message. No client-side sorting/pagination (server-side via query params).

### 3.2 Status Badge — `src/components/ui/status-badge.tsx`

Colored badge for voyage status, booking status, payment status, refund status, ops status. Color map: OPEN/ACTIVE/CONFIRMED → green, CLOSED/CHECKED_IN → blue, DRAFT/PENDING/QUEUED → yellow, CANCELLED/FAILED/EXPIRED → red, UNKNOWN/MANUAL_REVIEW → orange, DEPARTED/SETTLED/RESOLVED → gray.

### 3.3 Confirm Dialog — `src/components/ui/confirm-dialog.tsx`

Modal with title, message, confirm/cancel buttons. Used for lifecycle transitions and resolve actions. Accepts `onConfirm` async callback, shows loading state.

### 3.4 Stat Card — `src/components/ui/stat-card.tsx`

Card with label, value, optional subtitle. Used in dashboard and revenue page.

### 3.5 Admin Form Wrapper — `src/components/ui/admin-form.tsx`

Form with loading state, error display, and submit handler. Used for vessel create, voyage create, ops resolve.

### 3.6 API Fetcher Hook — `src/hooks/use-api.ts`

`useApi<T>(url)` — client-side fetch with loading/error/data states. `useMutation<T>(url, method)` — client-side POST/PATCH/DELETE with loading/error/success states. Both include JSON parsing and error extraction.

---

## 4. Implementation Order

### Wave 1 — Shared UI + Hooks (blocker)

| ID | Task | Files |
|----|------|-------|
| A0 | Data table component | `src/components/ui/data-table.tsx` |
| A1 | Status badge component | `src/components/ui/status-badge.tsx` |
| A2 | Confirm dialog component | `src/components/ui/confirm-dialog.tsx` |
| A3 | Stat card component | `src/components/ui/stat-card.tsx` |
| A4 | Admin form wrapper | `src/components/ui/admin-form.tsx` |
| A5 | API fetcher hook | `src/hooks/use-api.ts` |

All parallel. **6 new files.**

### Wave 2 — Admin API Routes (parallel)

| ID | Task | Files |
|----|------|-------|
| A6 | Vessel API (GET + POST) | `src/app/api/admin/vessels/route.ts` |
| A7 | Voyage list API (GET + POST) | `src/app/api/admin/voyages/route.ts` |
| A8 | Voyage detail API (GET + PATCH) | `src/app/api/admin/voyages/[id]/route.ts` |
| A9 | Voyage lifecycle APIs (4 files) | `open/route.ts`, `close/route.ts`, `depart/route.ts`, `cancel/route.ts` |
| A10 | Manifest APIs (2 files) | `passenger-manifest/route.ts`, `vehicle-manifest/route.ts` |
| A11 | Revenue API | `revenue/route.ts` |
| A12 | Ops queue APIs (3 files) | `queue/route.ts`, `queue/[issueType]/route.ts`, `queue/entry/[id]/route.ts` |
| A13 | Ops resolve API | `queue/entry/[id]/resolve/route.ts` |
| A14 | Ops reconciliation APIs (3 files) | `drift/route.ts`, `payment/route.ts`, `integrity/route.ts` |

All parallel. **17 files updated.**

### Wave 3 — Admin Pages (mostly parallel, some sequential)

| ID | Task | Files | Depends |
|----|------|-------|---------|
| A15 | Dashboard page | `admin/page.tsx` | A5 |
| A16 | Vessel list page | `admin/vessels/page.tsx` | A0, A5, A6 |
| A17 | Vessel create page | `admin/vessels/new/page.tsx` | A4, A6 |
| A18 | Voyage list page | `admin/voyages/page.tsx` | A0, A1, A5, A7 |
| A19 | Voyage create page | `admin/voyages/new/page.tsx` | A4, A7 |
| A20 | Voyage detail page | `admin/voyages/[id]/page.tsx` | A1, A2, A3, A5, A8, A9 |
| A21 | Manifest page | `admin/voyages/[id]/manifest/page.tsx` | A0, A1, A5, A10 |
| A22 | Revenue page | `admin/voyages/[id]/revenue/page.tsx` | A3, A5, A11 |
| A23 | Ops queue page | `admin/ops/page.tsx` | A3, A5, A12 |
| A24 | Ops entry detail page | `admin/ops/[reviewId]/page.tsx` | A1, A2, A5, A12, A13 |
| A25 | Reconciliation page | `admin/reconciliation/[voyageId]/page.tsx` | A1, A2, A5, A14 |

All parallel after Wave 2. **11 files updated.**

### Wave 4 — Verify

| ID | Task |
|----|------|
| A26 | Build check. No 501 stubs in admin or ops routes. |

### Dependency Graph

```
A0–A5 (parallel UI components)
  │
  └──► A6–A14 (parallel API routes)
         │
         └──► A15–A25 (parallel pages)
                │
                └──► A26 (verify)
```

**Total tasks: 27**
**Total files: 6 new + 28 updated = 34 file operations**
**Critical path: A0 → A6 → A16 → A26 = 4 tasks**

---

## 5. Definition of Done — Phase 3

### Page Checks

| # | Check |
|---|-------|
| 1 | Dashboard shows active voyage count, open ops count, upcoming departures |
| 2 | Vessel list displays all vessels in a table |
| 3 | Vessel create form validates and creates vessel + cabin types |
| 4 | Voyage list displays all voyages with status filter |
| 5 | Voyage create form validates and creates DRAFT voyage |
| 6 | Voyage detail shows capacity counters and booking counts |
| 7 | Voyage lifecycle buttons trigger correct state transitions |
| 8 | Only valid lifecycle transitions are shown as buttons |
| 9 | Manifest page shows passenger + vehicle tables with active/cancelled distinction |
| 10 | Revenue page shows all 10 summary fields |
| 11 | Ops queue shows summary cards per issue type |
| 12 | Ops entry detail shows full context + resolve button |
| 13 | Reconciliation page shows integrity status + fix/resolve actions |

### API Checks

| # | Check |
|---|-------|
| 14 | All admin GET endpoints return correct data shapes |
| 15 | All admin POST/PATCH endpoints validate input with Zod |
| 16 | Voyage PATCH rejects updates on non-DRAFT voyages |
| 17 | Lifecycle endpoints return 422 on invalid transitions (not 500) |
| 18 | Manifest endpoints return correct row shapes |
| 19 | Revenue endpoint returns all 10 fields with 0 defaults |
| 20 | Ops resolve validates non-empty resolution_action and resolved_by |

### Role/Auth Checks

| # | Check |
|---|-------|
| 21 | All `/api/admin/*` routes return 401 without auth, 403 without admin role |
| 22 | All `/api/ops/*` routes accept both admin and ops roles |
| 23 | Admin pages redirect to login when unauthenticated |
| 24 | Admin layout blocks non-admin users |

### Ops Workflow Checks

| # | Check |
|---|-------|
| 25 | Resolve ops entry: OPEN → RESOLVED with action + resolver |
| 26 | Resolve ops entry: idempotent with same params |
| 27 | Resolve ops entry: rejects different params on already-resolved |
| 28 | Reconcile drift: fixes counters and marks drift resolved |
| 29 | Reconcile payment: resolves UNKNOWN → SETTLED or FAILED |
| 30 | Integrity check: returns 200 on consistent, 422 on drift |
