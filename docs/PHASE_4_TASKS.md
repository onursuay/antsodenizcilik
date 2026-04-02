# Phase 4 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group C — Shared Public UI

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| C0 | Voyage card component | `src/components/domain/voyage-card.tsx` | — | Client component. Accepts voyage object (origin, destination, departure_utc, arrival_utc, capacity). Renders card with route, date/time, capacity indicators. Green/yellow/red color based on passengers_available percentage (>50% green, 10-50% yellow, <10% red). Accepts `onClick` handler. | `[P][B]` |
| C1 | Search filters component | `src/components/domain/search-filters.tsx` | — | Client component. Renders row: origin text input, destination text input, from date input, to date input, search button, clear button. Accepts `onFilter(params)` callback with `{ origin?, destination?, from?, to? }`. Manages local state for inputs. | `[P][B]` |
| C2 | Booking item builder component | `src/components/domain/item-builder.tsx` | — | Client component. Multi-section form: (1) Passenger count input (integer ≥ 1). (2) Vehicle list with add/remove rows — each row: vehicle_type select, length_cm, width_cm, height_cm, weight_kg, lane_meters, m2. (3) Cabin list with add/remove rows — each row: cabin_type_id select (from props), quantity. Running capacity summary shown at bottom. Accepts `cabinTypes[]` prop for dropdown options. Accepts `onSubmit(items: HoldItemInput[])` callback that builds the `p_items` JSONB array matching `createHoldSchema`. | `[CP][B]` |
| C3 | Countdown timer component | `src/components/domain/countdown-timer.tsx` | — | Client component. Accepts `expiresAt: string` (ISO) and `onExpired: () => void`. Displays `MM:SS` countdown via `setInterval(1000)`. Text turns red when < 120 seconds remaining. Calls `onExpired` once when counter hits zero. Cleans up interval on unmount. | `[P][B]` |
| C4 | Booking summary component | `src/components/domain/booking-summary.tsx` | — | Accepts `passengers[]`, `vehicles[]`, `cabins[]`, each with optional `cancelled_at`. Renders three sections: passenger list (name, doc type, doc number, nationality), vehicle list (plate, type, dimensions), cabin list (type, count). Cancelled items shown dimmed with strikethrough. | `[P][B]` |
| C5 | Refund tracker component | `src/components/domain/refund-tracker.tsx` | — | Accepts `refunds[]` (refund_id, status, amount_kurus, queued_at, confirmed_at). Renders list with StatusBadge per refund. Shows amount formatted as TL. Shows timestamps for queued_at and confirmed_at (if present). | `[P][B]` |
| C6 | QR code component | `src/components/domain/qr-code.tsx` | npm install | Client component. Accepts `value: string` and optional `size: number` (default 200). Renders QR code onto `<canvas>` using `qrcode` npm package (`QRCode.toCanvas`). Shows fallback text if generation fails. | `[P][B]` |
| C7 | Install QR dependency | `package.json` | — | Run `npm install qrcode && npm install -D @types/qrcode`. Verify `npm ls qrcode` shows package installed. | `[P][B]` |

---

## Group S — Voyage Search & Detail Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| S0 | Voyage search page | `src/app/(public)/page.tsx` (update) | C0, C1 | Client component. Uses `useApi('/api/voyages?...')` with filter params from `SearchFilters`. Renders `VoyageCard` per voyage. Clicking card navigates to `/voyages/[id]`. Shows loading spinner. Shows "Sefer bulunamadi" when empty. Filter params update URL and API call. PublicHeader included. | `[P]` |
| S1 | Voyage detail page | `src/app/(public)/voyages/[id]/page.tsx` (update) | C0 | Server component fetches voyage. Renders voyage info: route, vessel, departure/arrival times. Capacity section: lane meters, m2, passengers — shows used/total with progress bars or StatCards. Cabin inventory table: type, total, available. "Rezervasyon Yap" button links to `/voyages/[id]/book`. PublicHeader included. | `[P]` |

---

## Group B — Booking Wizard Flow

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| B0 | Booking wizard page | `src/app/(public)/voyages/[id]/book/page.tsx` (update) | C2 | Client component. Fetches voyage detail via `useApi('/api/voyages/[id]')` for capacity display + cabin type options. Renders `ItemBuilder` with cabinTypes from voyage cabin inventory. On submit: generates `X-Idempotency-Key` via `generateIdempotencyKey()`, calls `POST /api/holds` via `useMutation` with items array. Uses `withRetry` wrapper for 409 lock contention. On success: `router.push('/holds/[holdId]/pay')`. On 422 (capacity): show error message, stay on page. On 404 (voyage): show "Sefer bulunamadi". PublicHeader included. | `[CP]` |

---

## Group P — Payment Page

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P0 | Payment page | `src/app/(public)/holds/[id]/pay/page.tsx` (update) | C3 | Client component. Fetches hold data via direct Supabase query or new lightweight endpoint (hold_id, items, expires_at). Renders hold item summary. Renders `CountdownTimer` with `expiresAt`. On expired: show "Hold suresi doldu" message + link to `/`. "Odeme Yap" button: calls `POST /api/holds/[id]/payment` via `useMutation` with `{ amountKurus, currency: 'TRY', gateway: 'default', idempotencyKey }`. If response has `checkoutUrl`: `window.location.href = checkoutUrl`. If `checkoutUrl` is null: show "Odeme altyapisi henuz yapilandirilmamis" message. Show payment status if payment already exists (`isExisting: true`). PublicHeader included. | `[CP]` |

---

## Group D — Confirmation & Detail Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| D0 | Booking confirmation page | `src/app/(public)/bookings/[id]/confirmation/page.tsx` (update) | C4, C6 | Client component. Fetches `GET /api/bookings/[id]` via `useApi`. Renders success banner. Renders `BookingSummary` with passengers/vehicles/cabins. Renders `QRCode` with `booking_id` as value. Shows payment status via StatusBadge. Links: "Rezervasyonlarim" → `/account/bookings`, "Detay" → `/bookings/[id]`. PublicHeader included. | `[P]` |
| D1 | Booking detail + cancel page | `src/app/(public)/bookings/[id]/page.tsx` (update) | C4, C5 | Client component. Fetches `GET /api/bookings/[id]` via `useApi`. Renders `BookingSummary`. Renders payment info with StatusBadge. Renders `RefundTracker` for existing refunds. If booking status != CANCELLED: "Tum Rezervasyonu Iptal Et" button → ConfirmDialog → `POST /api/bookings/[id]/cancel` with `{ scope: 'FULL', initiatedBy: 'user', refundAmountKurus: payment.amount_kurus }`. Per-line cancel buttons on each non-cancelled passenger/vehicle/cabin → ConfirmDialog → `POST /api/bookings/[id]/cancel` with `{ scope: 'PARTIAL', initiatedBy: 'user', refundAmountKurus: 0, partialTargetType, partialTargetId }`. On cancel success: `refetch()`. Shows cancellation records list. PublicHeader included. | `[CP]` |

---

## Group A — Account Bookings Page

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| A0 | My bookings page | `src/app/(public)/account/bookings/page.tsx` (update) | — | Client component. Status filter tabs: Tumu, Onaylanmis (CONFIRMED), Check-in (CHECKED_IN), Iptal (CANCELLED). `useApi('/api/users/me/bookings?status=&limit=20&offset=')` with filter + pagination state. Renders list of booking cards (voyage route, date, status badge, confirmed_at). Click → `/bookings/[id]`. Pagination: prev/next buttons based on `total` and current `offset`. PublicHeader included. | `[P]` |

---

## Group V — Verification

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| V0 | Build check | — | All above | `npm run build` succeeds with 0 errors. No placeholder/stub text in any public page. All 7 public pages render without errors. QR code package compiles. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Shared Components + Install
```
C7 (npm install qrcode)
C0, C1, C2, C3, C4, C5, C6 (all parallel after C7 for C6)
```
**7 new files + 1 npm install. Blocker for all pages.**

### Wave 2 — Browse + Account Pages (parallel)
```
S0, S1, A0 (all parallel)
```
**3 files updated.**

### Wave 3 — Booking Flow (sequential)
```
B0 ──► P0
```
**2 files updated.**

### Wave 4 — Post-Booking Pages (parallel)
```
D0, D1 (parallel)
```
**2 files updated.**

### Wave 5 — Verify
```
V0
```

### Parallelism Map

| Wave | Tasks | Count |
|------|-------|-------|
| 1 | C0–C7 | 8 (7 parallel + 1 npm) |
| 2 | S0, S1, A0 | 3 (all parallel) |
| 3 | B0, P0 | 2 (sequential) |
| 4 | D0, D1 | 2 (parallel) |
| 5 | V0 | 1 |

**Total tasks: 16**
**Total files: 7 new + 7 updated = 14 file operations + 1 npm install**
**Critical path: C2 → B0 → P0 → V0 = 4 tasks**
