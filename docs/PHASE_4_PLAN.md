# Phase 4 — Public Wizard Implementation Plan

---

## 1. Public Pages/Modules

### 1.1 Voyage Search — `/`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/page.tsx` |
| API | `GET /api/voyages?origin=&destination=&from=&to=` (Phase 1 — already implemented) |
| Auth | None |
| Data | List of OPEN voyages with available capacity. Filter by origin, destination, date range. |
| Actions | Filter inputs at top. Click voyage card → `/voyages/[id]`. |
| Response | `{ voyages: [{ voyage_id, origin_port, destination_port, departure_utc, arrival_utc, capacity: { lane_meters_available, m2_available, passengers_available } }] }` |

### 1.2 Voyage Detail — `/voyages/[id]`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/voyages/[id]/page.tsx` |
| API | `GET /api/voyages/[id]` (Phase 1 — already implemented) |
| Auth | None |
| Data | Voyage info, capacity breakdown (lane/m2/pax), cabin availability. |
| Actions | "Rezervasyon Yap" button → `/voyages/[id]/book` (requires auth — middleware redirects to login). |
| Response | `{ voyage, capacityCounters, cabinInventory }` |

### 1.3 Booking Wizard — `/voyages/[id]/book`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/voyages/[id]/book/page.tsx` |
| API | `POST /api/holds` (Phase 1 — already implemented) |
| Auth | Required (middleware redirects to login) |
| Data | Voyage capacity for display. Form to build `p_items` JSONB array. |
| Actions | Step 1: Select passengers (quantity). Step 2: Add vehicles (type, dimensions, quantity). Step 3: Add cabins (type, quantity). Step 4: Review + submit. Client generates `X-Idempotency-Key`. On success → redirect to `/holds/[holdId]/pay`. On capacity error → show message, stay on page. On lock contention → auto-retry via `withRetry`. |
| Response | `{ holdId, expiresAt }` |

### 1.4 Payment Page — `/holds/[id]/pay`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/holds/[id]/pay/page.tsx` |
| API | `POST /api/holds/[id]/payment` (Phase 1 — already implemented) |
| Auth | Required (owner) |
| Data | Hold summary (items, TTL countdown), payment amount. |
| Actions | Display countdown timer (hold TTL). "Odeme Yap" button → calls `POST /api/holds/[id]/payment` with amount/currency/gateway. If `checkoutUrl` returned → redirect to gateway. If no checkout URL → show "gateway not configured" message. On hold expired → show message + link back to search. Poll hold status for expiry detection. |
| Response | `{ paymentId, status, isExisting, checkoutUrl }` |

### 1.5 Booking Confirmation — `/bookings/[id]/confirmation`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/bookings/[id]/confirmation/page.tsx` |
| API | `GET /api/bookings/[id]` (Phase 1 — already implemented) |
| Auth | Required (owner) |
| Data | Booking details, passenger list, vehicle list, cabin list, payment status. |
| Actions | Show success message + booking summary. Generate QR code from `booking_id` (client-side). Link to booking detail. Link to user bookings. |
| Response | `{ booking, passengers, vehicles, cabins, payment, refunds, cancellations }` |

### 1.6 Booking Detail + Cancel — `/bookings/[id]`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/bookings/[id]/page.tsx` |
| API | `GET /api/bookings/[id]`, `POST /api/bookings/[id]/cancel` (Phase 1 — both implemented) |
| Auth | Required (owner) |
| Data | Full booking with passengers, vehicles, cabins, payment, refunds, cancellation records. |
| Actions | View booking details. "Iptal Et" button for full cancellation. Per-line cancel buttons for partial cancellation (each passenger/vehicle/cabin). Refund status tracking per cancellation. Cancel actions require confirmation dialog. |
| Response | Same as 1.5 |

### 1.7 My Bookings — `/account/bookings`

| Field | Value |
|-------|-------|
| Page | `src/app/(public)/account/bookings/page.tsx` |
| API | `GET /api/users/me/bookings?status=&limit=&offset=` (Phase 1 — already implemented) |
| Auth | Required |
| Data | List of user's bookings with status, date, voyage info. Pagination. Optional status filter. |
| Actions | Status filter tabs (All, Confirmed, Checked-in, Cancelled). Click booking → `/bookings/[id]`. Pagination (next/prev). |
| Response | `{ bookings: [...], total }` |

---

## 2. Shared Public UI/Components

### 2.1 Voyage Card — `src/components/domain/voyage-card.tsx`

Card displaying: origin → destination, departure date/time, available capacity indicators (pax, vehicles, cabins). Click navigates to voyage detail. Shows capacity as color-coded bars or text (green/yellow/red based on availability percentage).

### 2.2 Search Filters — `src/components/domain/search-filters.tsx`

Row of filter inputs: origin text, destination text, from date, to date. Submit triggers URL query param update. Clear button resets filters.

### 2.3 Booking Item Builder — `src/components/domain/item-builder.tsx`

Multi-step form component for building `p_items` JSONB: passenger quantity input, vehicle add/remove (type + dimensions), cabin type selector. Running total of capacity impact shown. Client component with local state.

### 2.4 Countdown Timer — `src/components/domain/countdown-timer.tsx`

Client component. Accepts `expiresAt` ISO string. Shows `MM:SS` countdown. Turns red below 2 minutes. Calls `onExpired` callback when reaches zero. Uses `setInterval` with 1-second tick.

### 2.5 Booking Summary — `src/components/domain/booking-summary.tsx`

Displays booking details: passenger list (name, document), vehicle list (plate, type), cabin list. Shows cancelled items dimmed. Reusable on confirmation + detail pages.

### 2.6 Refund Tracker — `src/components/domain/refund-tracker.tsx`

Displays refund status per cancellation record: QUEUED → SUBMITTED → CONFIRMED/FAILED/MANUAL_REVIEW. StatusBadge for current state. Timestamps for each transition.

### 2.7 QR Code — `src/components/domain/qr-code.tsx`

Client component. Renders QR code from booking_id string. Uses a lightweight QR library (e.g., `qrcode` npm package or canvas-based generator). No external service calls.

---

## 3. Implementation Order

### Wave 1 — Shared Components (blocker)

| ID | Task | File |
|----|------|------|
| C0 | Voyage card | `src/components/domain/voyage-card.tsx` |
| C1 | Search filters | `src/components/domain/search-filters.tsx` |
| C2 | Item builder | `src/components/domain/item-builder.tsx` |
| C3 | Countdown timer | `src/components/domain/countdown-timer.tsx` |
| C4 | Booking summary | `src/components/domain/booking-summary.tsx` |
| C5 | Refund tracker | `src/components/domain/refund-tracker.tsx` |
| C6 | QR code | `src/components/domain/qr-code.tsx` |

All parallel. **7 new files.** QR code requires `npm install qrcode @types/qrcode`.

### Wave 2 — Browse Pages (parallel)

| ID | Task | File | Depends |
|----|------|------|---------|
| W0 | Voyage search page | `src/app/(public)/page.tsx` | C0, C1 |
| W1 | Voyage detail page | `src/app/(public)/voyages/[id]/page.tsx` | C0 |
| W2 | My bookings page | `src/app/(public)/account/bookings/page.tsx` | — |

All parallel. **3 files updated.**

### Wave 3 — Booking Flow (sequential)

| ID | Task | File | Depends |
|----|------|------|---------|
| W3 | Booking wizard page | `src/app/(public)/voyages/[id]/book/page.tsx` | C2 |
| W4 | Payment page | `src/app/(public)/holds/[id]/pay/page.tsx` | C3 |

Sequential: W3 creates hold → W4 initiates payment. **2 files updated.**

### Wave 4 — Post-Booking Pages (parallel)

| ID | Task | File | Depends |
|----|------|------|---------|
| W5 | Confirmation page | `src/app/(public)/bookings/[id]/confirmation/page.tsx` | C4, C6 |
| W6 | Booking detail + cancel | `src/app/(public)/bookings/[id]/page.tsx` | C4, C5 |

Parallel. **2 files updated.**

### Wave 5 — Verify

| ID | Task |
|----|------|
| V0 | Build check. No placeholder text in public pages. |

### Dependency Graph

```
C0–C6 (parallel components)
  │
  ├──► W0, W1, W2 (parallel browse)
  │
  ├──► W3 ──► W4  (sequential booking flow)
  │
  └──► W5, W6 (parallel post-booking)
         │
         └──► V0
```

**Total tasks: 15**
**Total files: 7 new + 7 updated = 14 file operations + 1 npm install**
**Critical path: C2 → W3 → W4 → V0 = 4 tasks**

---

## 4. Definition of Done — Phase 4

### Page Checks

| # | Check |
|---|-------|
| 1 | Voyage search loads open voyages with capacity data |
| 2 | Origin/destination/date filters update results |
| 3 | Voyage detail shows capacity breakdown + cabin availability |
| 4 | "Rezervasyon Yap" button navigates to booking wizard (requires login) |
| 5 | Booking wizard allows adding passengers, vehicles, cabins |
| 6 | Hold creation sends `X-Idempotency-Key` header |
| 7 | After hold creation, redirects to payment page with hold ID |
| 8 | Payment page shows hold summary + TTL countdown |
| 9 | Countdown timer turns red below 2 minutes |
| 10 | "Odeme Yap" initiates payment and redirects to gateway (or shows not-configured) |
| 11 | Confirmation page shows booking summary + QR code |
| 12 | My bookings lists user's bookings with status filter + pagination |
| 13 | Booking detail shows full data + cancel options |

### API Integration Checks

| # | Check |
|---|-------|
| 14 | Voyage search page calls `GET /api/voyages` with query params |
| 15 | Voyage detail page calls `GET /api/voyages/[id]` |
| 16 | Booking wizard calls `POST /api/holds` with correct items JSONB |
| 17 | Payment page calls `POST /api/holds/[id]/payment` |
| 18 | Confirmation page calls `GET /api/bookings/[id]` |
| 19 | Booking detail calls `GET /api/bookings/[id]` |
| 20 | Cancel action calls `POST /api/bookings/[id]/cancel` with correct scope |
| 21 | My bookings calls `GET /api/users/me/bookings` with pagination params |

### Auth Checks

| # | Check |
|---|-------|
| 22 | Voyage search + detail work without auth |
| 23 | `/voyages/[id]/book` redirects to login if not authenticated |
| 24 | `/holds/[id]/pay` redirects to login if not authenticated |
| 25 | `/bookings/[id]` redirects to login if not authenticated |
| 26 | `/account/bookings` redirects to login if not authenticated |

### Booking Flow Checks

| # | Check |
|---|-------|
| 27 | Full flow: search → detail → book → hold → pay → confirm works end-to-end |
| 28 | Hold expiry during payment shows expired message |
| 29 | Idempotent hold creation returns same hold on retry |
| 30 | Full cancellation removes booking + queues refund |
| 31 | Partial cancellation cancels single passenger/vehicle/cabin line |
| 32 | Refund status updates visible on booking detail page |
