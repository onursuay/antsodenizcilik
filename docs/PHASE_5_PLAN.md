# Phase 5 — Check-in Implementation Plan

---

## 1. Check-in Pages/Modules

### 1.1 Check-in Dashboard — `/checkin`

| Field | Value |
|-------|-------|
| Page | `src/app/(checkin)/checkin/page.tsx` |
| API | `GET /api/checkin/lookup?bookingId=` (new) |
| Auth | Operator (via layout) |
| Data | Booking lookup form (text input + submit). QR scanner trigger button. |
| Actions | Enter booking ID manually → lookup API → redirect to `/checkin/[bookingId]`. QR scan → decode booking_id → same redirect. Shows error if booking not found or already cancelled. |
| Response | `{ booking: { booking_id, status, voyage_id, confirmed_at, checked_in_at }, passengers[], vehicles[] }` |

### 1.2 Approve / Deny — `/checkin/[bookingId]`

| Field | Value |
|-------|-------|
| Page | `src/app/(checkin)/checkin/[bookingId]/page.tsx` |
| API | `GET /api/checkin/lookup?bookingId=` (reuse), `POST /api/checkin/record` (new) |
| Auth | Operator |
| Data | Booking summary: status, passenger list (name, doc type, doc number, nationality), vehicle list. Previous check-in attempts for this booking. |
| Actions | "Belgeler Dogrulandi" checkbox. "Onayla" button → `fn_record_check_in_attempt(booking_id, operator_id, 'APPROVED', true)`. "Reddet" button → denial reason textarea → `fn_record_check_in_attempt(booking_id, operator_id, 'DENIED', false, denial_reason)`. Already CHECKED_IN → show "Zaten check-in yapildi" with option to re-record audit. CANCELLED → show "Rezervasyon iptal edilmis", block actions. |
| Response | `{ checkInRecordId, bookingStatus }` |

### 1.3 Audit History — `/checkin/history`

| Field | Value |
|-------|-------|
| Page | `src/app/(checkin)/checkin/history/page.tsx` |
| API | `GET /api/checkin/history?limit=&offset=` (new) |
| Auth | Operator |
| Data | Last 24h of check-in records for the current operator. Table: booking_id, outcome (APPROVED/DENIED), operator_id, attempted_at, denial_reason. |
| Actions | Outcome filter (All / Approved / Denied). Click row → navigate to `/checkin/[bookingId]`. |
| Response | `{ records: [{ check_in_record_id, booking_id, outcome, operator_id, document_verified, denial_reason, attempted_at }], total }` |

---

## 2. New API Endpoints

### 2.1 GET /api/checkin/lookup

| Field | Value |
|-------|-------|
| Path | `/api/checkin/lookup?bookingId=` |
| Auth | `requireOperator` |
| DB | Direct query: `bookings WHERE booking_id = $id` + `booking_passengers` + `booking_vehicles` + `check_in_records WHERE booking_id = $id ORDER BY attempted_at DESC` |
| Response | `{ booking, passengers, vehicles, checkInHistory }` |
| Errors | 400 → missing bookingId param, 404 → booking not found |

### 2.2 POST /api/checkin/record

| Field | Value |
|-------|-------|
| Path | `/api/checkin/record` |
| Auth | `requireOperator` |
| DB wrapper | `recordCheckInAttempt(supabase, { bookingId, operatorId, outcome, documentVerified, denialReason?, writeAuditIfAlreadyCheckedIn? })` → `fn_record_check_in_attempt` |
| Request | `{ bookingId, outcome: 'APPROVED'|'DENIED', documentVerified: boolean, denialReason?: string, writeAuditIfAlreadyCheckedIn?: boolean }` |
| Response | `{ checkInRecordId, bookingStatus }` |
| Errors | 422 → booking cancelled / business rule, 404 → booking not found |

### 2.3 GET /api/checkin/history

| Field | Value |
|-------|-------|
| Path | `/api/checkin/history?limit=&offset=&outcome=` |
| Auth | `requireOperator` |
| DB | Direct query: `check_in_records WHERE attempted_at > now() - interval '24 hours'` with optional outcome filter. Operator sees all records (not filtered by operator_id — operators share the terminal). |
| Response | `{ records, total }` |
| Errors | None expected (empty result is valid) |

---

## 3. New DB Wrapper

### `src/lib/db/checkin.ts`

```
recordCheckInAttempt(supabase, params) → supabase.rpc('fn_record_check_in_attempt', {
  p_booking_id, p_operator_id, p_outcome, p_document_verified,
  p_denial_reason, p_write_audit_if_already_checked_in
})
```

Returns `{ o_check_in_record_id, o_booking_status }`.

---

## 4. Shared Check-in UI/Components

### 4.1 Booking Lookup Form — `src/components/domain/checkin-lookup.tsx`

Text input for booking_id (UUID or partial). Submit button. QR scan button (opens `QRCodeScanner`). Loading spinner during lookup. Error display. Client component.

### 4.2 QR Scanner — `src/components/domain/qr-scanner.tsx`

Client component. Uses device camera via `navigator.mediaDevices.getUserMedia`. Decodes QR from video frames using `jsQR` library (lightweight, no heavy deps) or the existing `qrcode` package (encode-only — need a decoder). Alternative: use `html5-qrcode` package. Calls `onScan(value: string)` callback on successful decode. Shows camera preview. Close button.

**Decision:** Use `html5-qrcode` — mature, handles camera permissions, multiple formats. Requires `npm install html5-qrcode`.

### 4.3 Check-in Action Panel — `src/components/domain/checkin-actions.tsx`

Displays booking status + passenger/vehicle summary at top. "Belgeler Dogrulandi" checkbox (required for approval). Two action buttons: "Onayla" (green, requires document_verified=true) and "Reddet" (red, opens denial reason textarea). Loading state during API call. Result display after action (success badge or error).

### 4.4 Check-in Result Card — `src/components/domain/checkin-result.tsx`

Shows outcome after check-in attempt: green card for APPROVED ("Boarding izni verildi"), red card for DENIED ("Boarding reddedildi — [reason]"). Includes booking_id, operator, timestamp. "Yeni Tarama" button → back to `/checkin`.

### 4.5 Check-in History Table — `src/components/domain/checkin-history-table.tsx`

DataTable wrapper for check-in records. Columns: booking_id (truncated), outcome (StatusBadge: APPROVED=green, DENIED=red), operator, timestamp, denial_reason. Row click → `/checkin/[bookingId]`.

---

## 5. Implementation Order

### Wave 1 — Infrastructure (blocker)

| ID | Task | File | Depends |
|----|------|------|---------|
| I0 | Check-in DB wrapper | `src/lib/db/checkin.ts` | — |
| I1 | Install html5-qrcode | `package.json` | — |
| I2 | QR scanner component | `src/components/domain/qr-scanner.tsx` | I1 |
| I3 | Booking lookup form | `src/components/domain/checkin-lookup.tsx` | I2 |
| I4 | Check-in action panel | `src/components/domain/checkin-actions.tsx` | — |
| I5 | Check-in result card | `src/components/domain/checkin-result.tsx` | — |
| I6 | Check-in history table | `src/components/domain/checkin-history-table.tsx` | — |

I0, I1 parallel. I2 depends on I1. I3 depends on I2. I4–I6 parallel with everything.

### Wave 2 — API Routes (parallel)

| ID | Task | File | Depends |
|----|------|------|---------|
| A0 | Check-in lookup API | `src/app/api/checkin/lookup/route.ts` | I0 |
| A1 | Check-in record API | `src/app/api/checkin/record/route.ts` | I0 |
| A2 | Check-in history API | `src/app/api/checkin/history/route.ts` | — |

All parallel after I0. **3 new route files.**

### Wave 3 — Pages (mostly parallel)

| ID | Task | File | Depends |
|----|------|------|---------|
| P0 | Check-in dashboard page | `src/app/(checkin)/checkin/page.tsx` | I3, A0 |
| P1 | Approve/deny page | `src/app/(checkin)/checkin/[bookingId]/page.tsx` | I4, I5, A0, A1 |
| P2 | Audit history page | `src/app/(checkin)/checkin/history/page.tsx` | I6, A2 |

P0 and P2 parallel. P1 depends on more components.

### Wave 4 — Verify

| ID | Task |
|----|------|
| V0 | Build check. No stubs in check-in routes or pages. |

### Dependency Graph

```
I0 (DB wrapper) ──► A0, A1 (parallel APIs)
I1 (npm) ──► I2 (scanner) ──► I3 (lookup form) ──► P0 (dashboard)
I4, I5, I6 (parallel components)
                                                    A0, A1 ──► P1 (approve/deny)
                                                    A2 ──► P2 (history)
                                                    P0, P1, P2 ──► V0
```

**Total tasks: 14**
**Total files: 7 new components + 1 DB wrapper + 3 API routes + 3 page updates = 14 file operations + 1 npm install**
**Critical path: I1 → I2 → I3 → P0 → V0 = 5 tasks**

---

## 6. Definition of Done — Phase 5

### Page Checks

| # | Check |
|---|-------|
| 1 | Check-in dashboard renders booking ID input + QR scan button |
| 2 | Manual booking ID entry → lookup → redirect to approve/deny page |
| 3 | QR scan decodes booking_id → same lookup → redirect |
| 4 | Approve/deny page shows booking summary + passenger/vehicle list |
| 5 | "Onayla" button disabled until "Belgeler Dogrulandi" is checked |
| 6 | Approval calls API → shows green result card → booking becomes CHECKED_IN |
| 7 | Denial requires reason text → calls API → shows red result card |
| 8 | Already CHECKED_IN booking shows info message with option to re-audit |
| 9 | CANCELLED booking shows blocked state, no action buttons |
| 10 | History page shows last 24h of check-in records with outcome filter |

### API Integration Checks

| # | Check |
|---|-------|
| 11 | `GET /api/checkin/lookup?bookingId=valid-uuid` returns booking + passengers + vehicles + history |
| 12 | `GET /api/checkin/lookup?bookingId=invalid` returns 404 |
| 13 | `POST /api/checkin/record` with APPROVED + documentVerified=true creates record + transitions booking |
| 14 | `POST /api/checkin/record` with DENIED + denialReason creates record, booking stays CONFIRMED |
| 15 | `POST /api/checkin/record` on CANCELLED booking returns 422 |
| 16 | `GET /api/checkin/history` returns records with pagination + outcome filter |

### Auth/Role Checks

| # | Check |
|---|-------|
| 17 | All `/api/checkin/*` routes return 401 without auth |
| 18 | All `/api/checkin/*` routes return 403 for non-operator/non-admin role |
| 19 | Check-in layout redirects to login for unauthenticated users |
| 20 | Operator role can access all check-in pages |
| 21 | Admin role can also access check-in pages |

### Operator Workflow Checks

| # | Check |
|---|-------|
| 22 | Full workflow: scan QR → view passenger → check docs → approve → boarding pass |
| 23 | Denial workflow: scan → view → deny with reason → denial recorded |
| 24 | Re-scan of checked-in booking shows info, allows re-audit if configured |
| 25 | History shows all attempts including denials with reasons |
