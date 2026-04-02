# Phase 5 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group I — Infrastructure & Shared UI

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| I0 | Check-in DB wrapper | `src/lib/db/checkin.ts` | — | Exports `recordCheckInAttempt(supabase, { bookingId, operatorId, outcome, documentVerified, denialReason?, writeAuditIfAlreadyCheckedIn? })`. Calls `supabase.rpc('fn_record_check_in_attempt', { p_booking_id, p_operator_id, p_outcome, p_document_verified, p_denial_reason, p_write_audit_if_already_checked_in })`. Returns `{ o_check_in_record_id: string | null, o_booking_status: string }`. Maps errors via `mapDbError`. | `[P][B]` |
| I1 | Install html5-qrcode | `package.json` | — | Run `npm install html5-qrcode`. `npm ls html5-qrcode` shows installed. | `[P][B]` |
| I2 | QR scanner component | `src/components/domain/qr-scanner.tsx` | I1 | Client component. Accepts `onScan(value: string)` and `onClose()`. Renders camera preview via `Html5QrcodeScanner` from `html5-qrcode`. On successful decode: calls `onScan(decodedText)`, stops scanner. Close button calls `onClose()`. Handles camera permission denial gracefully (shows message). Cleanup on unmount. | `[CP][B]` |
| I3 | Booking lookup form | `src/components/domain/checkin-lookup.tsx` | I2 | Client component. Text input for booking ID (UUID). "Ara" submit button. "QR Tara" button toggles `QRScanner` visibility. On QR scan: fills input + auto-submits. Accepts `onLookup(bookingId: string)` callback. Loading state. Error display. | `[CP][B]` |
| I4 | Check-in action panel | `src/components/domain/checkin-actions.tsx` | — | Client component. Accepts `booking` (status, booking_id), `passengers[]`, `vehicles[]`, `onApprove(documentVerified: boolean)`, `onDeny(reason: string)`, `loading`, `error`. Shows passenger/vehicle summary. "Belgeler Dogrulandi" checkbox. "Onayla" button (green, disabled until checkbox checked). "Reddet" button (red, expands denial reason textarea + confirm). Already CHECKED_IN: show info badge, optional "Tekrar Kayit" button. CANCELLED: show blocked state, no buttons. | `[P][B]` |
| I5 | Check-in result card | `src/components/domain/checkin-result.tsx` | — | Accepts `outcome: 'APPROVED' | 'DENIED'`, `bookingId`, `denialReason?`, `timestamp`. APPROVED: green card "Boarding izni verildi". DENIED: red card "Boarding reddedildi" + reason. "Yeni Tarama" link → `/checkin`. | `[P][B]` |
| I6 | Check-in history table | `src/components/domain/checkin-history-table.tsx` | — | Client component. Uses `DataTable` with columns: booking_id (truncated mono), outcome (StatusBadge APPROVED=green / DENIED=red), operator_id, attempted_at (formatted), denial_reason (truncated). Accepts `records[]` and `onRowClick(bookingId)`. | `[P][B]` |

---

## Group A — Check-in API Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| A0 | Check-in lookup API | `src/app/api/checkin/lookup/route.ts` (new) | I0 | GET handler. `withApiHandler`, `requireOperator`. Reads `bookingId` from query param. Validates UUID format (400 if invalid/missing). Queries `bookings WHERE booking_id = $id` + `booking_passengers` + `booking_vehicles` + `check_in_records WHERE booking_id = $id ORDER BY attempted_at DESC`. Returns `{ booking, passengers, vehicles, checkInHistory }`. 404 if booking not found. | `[P]` |
| A1 | Check-in record API | `src/app/api/checkin/record/route.ts` (new) | I0 | POST handler. `withApiHandler`, `requireOperator`. `parseBody` with inline Zod: `{ bookingId: uuid, outcome: 'APPROVED'|'DENIED', documentVerified: boolean, denialReason?: string, writeAuditIfAlreadyCheckedIn?: boolean }`. Refine: DENIED requires denialReason non-empty. Gets operator email from `getAuthUser`. Calls `recordCheckInAttempt(supabase, { bookingId, operatorId: user.email, outcome, documentVerified, denialReason, writeAuditIfAlreadyCheckedIn })`. Returns `{ checkInRecordId: result.o_check_in_record_id, bookingStatus: result.o_booking_status }` with 201. | `[P]` |
| A2 | Check-in history API | `src/app/api/checkin/history/route.ts` (new) | — | GET handler. `withApiHandler`, `requireOperator`. Reads `limit` (default 50, max 100), `offset` (default 0), `outcome` (optional filter) from query params. Queries `check_in_records WHERE attempted_at > now() - interval '24 hours'` with optional `.eq('outcome', outcome)`. Count with `{ count: 'exact' }`. Order by `attempted_at DESC`. Returns `{ records, total }`. | `[P]` |

---

## Group P — Check-in Pages

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P0 | Check-in dashboard page | `src/app/(checkin)/checkin/page.tsx` (update) | I3, A0 | Client component. Renders `CheckinLookup` component. `onLookup(bookingId)`: calls `GET /api/checkin/lookup?bookingId=` via fetch. On success (booking found): `router.push('/checkin/[bookingId]')`. On 404: show "Rezervasyon bulunamadi" error. On CANCELLED booking: show "Bu rezervasyon iptal edilmis" warning. | `[CP]` |
| P1 | Approve/deny page | `src/app/(checkin)/checkin/[bookingId]/page.tsx` (update) | I4, I5, A0, A1 | Client component. Fetches `GET /api/checkin/lookup?bookingId=params.bookingId` via `useApi`. Renders `CheckinActions` with booking data. On approve: `POST /api/checkin/record` with `{ bookingId, outcome: 'APPROVED', documentVerified: true }`. On deny: same with `outcome: 'DENIED'` + `denialReason`. After action: show `CheckinResult` card with outcome. Previous check-in attempts shown below actions (from `checkInHistory` in lookup response). | `[CP]` |
| P2 | Audit history page | `src/app/(checkin)/checkin/history/page.tsx` (update) | I6, A2 | Client component. Outcome filter tabs: Tumu, Onaylandi (APPROVED), Reddedildi (DENIED). `useApi('/api/checkin/history?limit=50&offset=0&outcome=')` with filter state. Renders `CheckinHistoryTable`. Row click → `router.push('/checkin/[bookingId]')`. Pagination: prev/next based on total. | `[P]` |

---

## Group V — Verification

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| V0 | Build check | — | All above | `npm run build` succeeds with 0 errors. No stub text in check-in pages. No `"Not implemented"` in check-in API routes. All 3 check-in pages render. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Infrastructure
```
I0 (DB wrapper)     ──► A0, A1 (Wave 2)
I1 (npm install)    ──► I2 (scanner) ──► I3 (lookup) ──► P0 (Wave 3)
I4, I5, I6 (parallel with everything)
```
**1 npm install + 7 new files.**

### Wave 2 — API Routes
```
A0, A1, A2 (all parallel)
```
**3 new route directories + files.**

### Wave 3 — Pages
```
P0 (dashboard) — depends on I3, A0
P1 (approve/deny) — depends on I4, I5, A0, A1
P2 (history) — depends on I6, A2
All parallel after their deps.
```
**3 files updated.**

### Wave 4 — Verify
```
V0
```

### Parallelism Map

| Wave | Tasks | Count |
|------|-------|-------|
| 1 | I0, I1, I2, I3, I4, I5, I6 | 7 (I0+I1 parallel start; I2→I3 sequential; I4–I6 parallel) |
| 2 | A0, A1, A2 | 3 (all parallel) |
| 3 | P0, P1, P2 | 3 (all parallel after deps) |
| 4 | V0 | 1 |

**Total tasks: 14**
**Total files: 1 DB wrapper + 6 components + 3 API routes + 3 page updates = 13 file operations + 1 npm install**
**Critical path: I1 → I2 → I3 → P0 → V0 = 5 tasks**
