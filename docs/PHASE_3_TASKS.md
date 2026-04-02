# Phase 3 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group U — Shared Admin UI

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| U0 | Data table component | `src/components/ui/data-table.tsx` | — | Exports `DataTable<T>({ columns, data, onRowClick?, emptyMessage? })`. Renders `<table>` with header row from `columns[].label` and body rows mapped via `columns[].render(row)`. Shows `emptyMessage` when `data.length === 0`. `onRowClick` fires with row on `<tr>` click. | `[P][B]` |
| U1 | Status badge component | `src/components/ui/status-badge.tsx` | — | Exports `StatusBadge({ status })`. Returns `<span>` with colored background. Color map: green (OPEN, ACTIVE, CONFIRMED, APPROVED), blue (CLOSED, CHECKED_IN, SUBMITTED), yellow (DRAFT, PENDING, QUEUED), red (CANCELLED, FAILED, EXPIRED, DENIED), orange (UNKNOWN, MANUAL_REVIEW, ESCALATED), gray (DEPARTED, SETTLED, RESOLVED, RELEASED). | `[P][B]` |
| U2 | Confirm dialog component | `src/components/ui/confirm-dialog.tsx` | — | Exports `ConfirmDialog({ open, title, message, confirmLabel?, onConfirm, onCancel })`. Client component. Renders modal overlay when `open=true`. Confirm button calls `onConfirm` (async), shows loading spinner, disables buttons during call. Cancel button calls `onCancel`. | `[P][B]` |
| U3 | Stat card component | `src/components/ui/stat-card.tsx` | — | Exports `StatCard({ label, value, subtitle? })`. Renders card with large value, label above, optional subtitle below. | `[P][B]` |
| U4 | Admin form wrapper | `src/components/ui/admin-form.tsx` | — | Exports `AdminForm({ onSubmit, children, submitLabel?, loading?, error? })`. Client component. Wraps children in `<form>`, shows error banner if `error` set, submit button with loading state. `onSubmit` is async. | `[P][B]` |
| U5 | API fetcher hook | `src/hooks/use-api.ts` | — | Exports `useApi<T>(url: string)` → `{ data, error, loading, refetch }`. Client hook. Fetches on mount + on `refetch()`. Exports `useMutation<TReq, TRes>(url, method?)` → `{ trigger(body), data, error, loading }`. Both parse JSON, extract `error` field on non-2xx. | `[P][B]` |

---

## Group API — Admin API Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| A0 | Vessel API (GET + POST) | `src/app/api/admin/vessels/route.ts` (update) | — | GET: `withApiHandler`, `requireAdmin`, query `vessels` with cabin type count via left join or subquery, return `{ vessels }`. POST: `requireAdmin`, `parseBody(createVesselSchema)`, INSERT `vessels` then INSERT `vessel_cabin_types` for each cabin type, return `{ vessel }` with 201. | `[P]` |
| A1 | Voyage list API (GET + POST) | `src/app/api/admin/voyages/route.ts` (update) | — | GET: `requireAdmin`, query `voyages` joined with `vessels.name`. Optional `?status=` filter. Return `{ voyages }` with vessel_name. POST: `requireAdmin`, `parseBody(createVoyageSchema)`, INSERT `voyages` (status defaults to DRAFT), return `{ voyage }` with 201. | `[P]` |
| A2 | Voyage detail API (GET + PATCH) | `src/app/api/admin/voyages/[id]/route.ts` (update) | — | GET: `requireAdmin`, query voyage + VCC + VCI + booking counts (grouped by status). Return `{ voyage, capacityCounters, cabinInventory, bookingCounts }`. PATCH: `requireAdmin`, `parseBody(updateVoyageSchema)`, verify voyage status=DRAFT, UPDATE voyages, return `{ voyage }`. | `[CP]` |
| A3 | Voyage open API | `src/app/api/admin/voyages/[id]/open/route.ts` (update) | — | `withApiHandler`, `requireAdmin`, `openVoyage(supabase, id)`, return `jsonOk({ success: true })`. | `[P]` |
| A4 | Voyage close API | `src/app/api/admin/voyages/[id]/close/route.ts` (update) | — | Same pattern, `closeVoyage`. | `[P]` |
| A5 | Voyage depart API | `src/app/api/admin/voyages/[id]/depart/route.ts` (update) | — | Same pattern, `departVoyage`. | `[P]` |
| A6 | Voyage cancel API | `src/app/api/admin/voyages/[id]/cancel/route.ts` (update) | — | Same pattern, `cancelVoyage`. | `[P]` |
| A7 | Passenger manifest API | `src/app/api/admin/voyages/[id]/passenger-manifest/route.ts` (update) | — | `withApiHandler`, `requireAdmin`, `passengerManifest(supabase, id)`, return `{ passengers }`. | `[P]` |
| A8 | Vehicle manifest API | `src/app/api/admin/voyages/[id]/vehicle-manifest/route.ts` (update) | — | Same pattern, `vehicleManifest(supabase, id)`, return `{ vehicles }`. | `[P]` |
| A9 | Revenue API | `src/app/api/admin/voyages/[id]/revenue/route.ts` (update) | — | `withApiHandler`, `requireAdmin`, `revenueSummary(supabase, id)`, return `{ revenue }`. | `[P]` |
| A10 | Ops queue summary API | `src/app/api/ops/queue/route.ts` (update) | — | `withApiHandler`, `requireOps`, `opsQueueSummary(supabase)`, return `{ summary }`. | `[P]` |
| A11 | Ops queue by type API | `src/app/api/ops/queue/[issueType]/route.ts` (update) | — | `withApiHandler`, `requireOps`, query `ops_review_queue WHERE status='OPEN' AND issue_type=params.issueType` ordered by `created_at ASC`, return `{ entries }`. | `[P]` |
| A12 | Ops entry detail API | `src/app/api/ops/queue/entry/[id]/route.ts` (update) | — | `withApiHandler`, `requireOps`, query ops entry by review_id. Join related hold, booking, payment, refund if IDs are non-null. Return `{ entry, hold?, booking?, payment?, refund? }`. | `[P]` |
| A13 | Ops resolve API | `src/app/api/ops/queue/entry/[id]/resolve/route.ts` (update) | — | `withApiHandler`, `requireOps`, parse body `{ resolutionAction: string, resolvedBy: string }` (Zod inline), `resolveOpsReview(supabase, { reviewId: id, resolutionAction, resolvedBy })`, return `jsonOk({ success: true })`. | `[P]` |
| A14 | Integrity check API | `src/app/api/ops/integrity/[voyageId]/route.ts` (update) | — | `withApiHandler`, `requireOps`, try `assertCapacityConsistency(supabase, voyageId)` → `jsonOk({ consistent: true })`. Catch ApiError(422) → `jsonOk({ consistent: false, error: message })`. | `[P]` |
| A15 | Reconcile drift API | `src/app/api/ops/reconcile/drift/[voyageId]/route.ts` (update) | — | `withApiHandler`, `requireOps`, `reconcileCounterDrift(supabase, voyageId)`, return `jsonOk({ success: true })`. | `[P]` |
| A16 | Reconcile payment API | `src/app/api/ops/reconcile/payment/[paymentId]/route.ts` (update) | — | `withApiHandler`, `requireOps`, parse body `{ authoritativeOutcome: 'SETTLED'|'FAILED', amountCapturedKurus?: number }` (Zod inline), `reconcilePaymentUnknown(supabase, params)`, return `jsonOk({ success: true })`. | `[P]` |

---

## Group VP — Vessel Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P0 | Vessel list page | `src/app/(admin)/admin/vessels/page.tsx` (update) | U0, U5, A0 | Client component. `useApi('/api/admin/vessels')`. Renders `DataTable` with columns: name, base_lane_meters, base_m2, base_passenger_capacity, cabin count, commissioned_at. "Yeni Gemi" link at top. Loading/error/empty states. | `[P]` |
| P1 | Vessel create page | `src/app/(admin)/admin/vessels/new/page.tsx` (update) | U4, U5, A0 | Client component. `AdminForm` wrapping inputs: name, baseLaneMeters, baseM2, basePassengerCapacity, commissionedAt. Dynamic cabin types list (add/remove rows: label, baseCount, berthsPerCabin). `useMutation('POST', '/api/admin/vessels')`. On success → `router.push('/admin/vessels')`. | `[P]` |

---

## Group VY — Voyage Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P2 | Voyage list page | `src/app/(admin)/admin/voyages/page.tsx` (update) | U0, U1, U5, A1 | Client component. `useApi('/api/admin/voyages')`. Status filter dropdown. Renders `DataTable` with columns: vessel_name, origin→destination, departure_utc, status (StatusBadge), booking count. Row click → `/admin/voyages/[id]`. "Yeni Sefer" link at top. | `[P]` |
| P3 | Voyage create page | `src/app/(admin)/admin/voyages/new/page.tsx` (update) | U4, U5, A0, A1 | Client component. `useApi('/api/admin/vessels')` for vessel select. `AdminForm`: vessel dropdown, originPort, destinationPort, departureUtc (datetime-local), arrivalUtc, operationalLaneMeters, operationalM2, operationalPassengerCapacity, overbookingDelta. `useMutation('POST', '/api/admin/voyages')`. On success → `/admin/voyages/[id]`. | `[P]` |
| P4 | Voyage detail + lifecycle page | `src/app/(admin)/admin/voyages/[id]/page.tsx` (update) | U1, U2, U3, U5, A2, A3–A6 | Client component. `useApi('/api/admin/voyages/[id]')`. Shows: voyage info, capacity bars (StatCards for reserved/confirmed/available per dimension), cabin inventory table, booking count by status. Lifecycle buttons: conditionally rendered based on current status. Each button → `ConfirmDialog` → `useMutation('POST', '/api/admin/voyages/[id]/[action]')` → `refetch()`. DRAFT voyages show cabin inventory edit form (INSERT/UPDATE VCI via direct API — add inline PATCH support or separate endpoint). | `[CP]` |

---

## Group MR — Manifest & Revenue Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P5 | Manifest page | `src/app/(admin)/admin/voyages/[id]/manifest/page.tsx` (update) | U0, U1, U5, A7, A8 | Client component. Two tabs: "Yolcular" / "Araclar". Each tab: `useApi` for manifest endpoint. `DataTable` with StatusBadge for cancelled rows. Toggle to show/hide cancelled. Count badges: total active, total checked-in, total cancelled. CSV export button (client-side from data array). | `[P]` |
| P6 | Revenue page | `src/app/(admin)/admin/voyages/[id]/revenue/page.tsx` (update) | U3, U5, A9 | Client component. `useApi('/api/admin/voyages/[id]/revenue')`. 6 StatCards: gross_captured_kurus (format as TRY), total_refunded_kurus, net_realized_kurus, open_refund_liability_kurus, unknown_payment_count, failed_payment_count. 3 booking count cards: confirmed, cancelled, checked_in. Format kurus values as `X.XX TL`. | `[P]` |

---

## Group OP — Ops & Reconciliation Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P7 | Ops queue page | `src/app/(admin)/admin/ops/page.tsx` (update) | U1, U3, U5, A10 | Client component. `useApi('/api/ops/queue')`. Render one `StatCard` per issue_type: open_count as value, issue_type as label, oldest/newest dates as subtitle. Click card → `/admin/ops?type=[issueType]` or inline expandable list via `useApi('/api/ops/queue/[issueType]')`. | `[P]` |
| P8 | Ops entry detail + resolve page | `src/app/(admin)/admin/ops/[reviewId]/page.tsx` (update) | U1, U2, U5, A12, A13 | Client component. `useApi('/api/ops/queue/entry/[reviewId]')`. Display: issue_type (StatusBadge), status, description, created_at, related entity links (hold, booking, payment, refund — link to relevant admin pages). If status=OPEN: "Cozumle" button → `ConfirmDialog` with textarea for resolution_action. `useMutation('POST', '/api/ops/queue/entry/[id]/resolve')` with `{ resolutionAction, resolvedBy: user.email }`. On success → `refetch()`. | `[P]` |
| P9 | Reconciliation page | `src/app/(admin)/admin/reconciliation/[voyageId]/page.tsx` (update) | U1, U2, U3, U5, A14, A15, A16 | Client component. **Integrity section:** "Kontrol Et" button → `useMutation('GET', '/api/ops/integrity/[voyageId]')`. Green StatCard if consistent, red if not. **Drift fix section:** "Drift Duzelt" button → `ConfirmDialog` → `useMutation('POST', '/api/ops/reconcile/drift/[voyageId]')`. **UNKNOWN payments section:** Query `payments WHERE status='UNKNOWN'` for this voyage (via admin supabase or new endpoint). List with "Cozumle" button per payment → dialog with SETTLED/FAILED select → `useMutation('POST', '/api/ops/reconcile/payment/[paymentId]')`. | `[P]` |

---

## Group V — Verification

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| V0 | Build check | — | All above | `npm run build` succeeds with 0 errors. No `"Not implemented"` string in any admin or ops API route file. All admin pages render without errors. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Shared UI + Hooks
```
U0, U1, U2, U3, U4, U5  (all parallel)
```
**6 new files. Blocker for all pages.**

### Wave 2 — Admin API Routes
```
A0–A16  (all 17 parallel — each is an independent route file update)
```
**17 files updated. Blocker for pages that consume them.**

### Wave 3 — Admin Pages
```
P0–P9  (all 10 parallel — each is an independent page update)
```
**10 files updated.**

### Wave 4 — Verify
```
V0
```

### Parallelism Map

| Wave | Tasks | Count |
|------|-------|-------|
| 1 | U0–U5 | 6 (all parallel) |
| 2 | A0–A16 | 17 (all parallel) |
| 3 | P0–P9 | 10 (all parallel) |
| 4 | V0 | 1 |

**Total tasks: 34**
**Total files: 6 new + 27 updated = 33 file operations**
**Critical path: U0 → A2 → P4 → V0 = 4 tasks**
