# Phase 1 — Core API Implementation Plan

---

## 1. API Routes to Implement

### 1.1 POST /api/voyages (public listing — GET already exists as stub)

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/voyages` |
| Auth | None |
| Request | Query params: `?origin=`, `?destination=`, `?from=`, `?to=` (all optional) |
| Response | `{ voyages: Array<{ voyage_id, vessel_id, origin_port, destination_port, departure_utc, arrival_utc, status, capacity: { lane_meters_available, m2_available, passengers_available } }> }` |
| DB wrapper | Direct Supabase query: `voyages WHERE status = 'OPEN' AND departure_utc > now()` + join `voyage_capacity_counters` |
| Idempotency | Not required (read-only) |
| Errors | 500 → internal error |

### 1.2 GET /api/voyages/[id]

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/voyages/[id]` |
| Auth | None |
| Request | URL param `id` (UUID) |
| Response | `{ voyage, capacity_counters, cabin_inventory[] }` |
| DB wrapper | Direct Supabase query: `voyages`, `voyage_capacity_counters`, `voyage_cabin_inventory` |
| Idempotency | Not required (read-only) |
| Errors | 404 → voyage not found or not public |

### 1.3 POST /api/holds

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/holds` |
| Auth | `requireAuth` |
| Request | `createHoldSchema`: `{ voyageId, items[], ttlSeconds? }` |
| Response | `{ holdId, expiresAt }` |
| DB wrapper | `createHold(supabase, { voyageId, userId, sessionId, idempotencyKey, items, ttlSeconds })` |
| Idempotency | Required. Client sends `X-Idempotency-Key` header (UUID). Server passes to `fn_create_hold`. DB enforces via `UNIQUE(idempotency_key)` on holds. |
| Errors | 409/lock_contention → retry, 409/duplicate → return existing, 422 → capacity/business rule, 404 → voyage not found |

### 1.4 DELETE /api/holds/[id]

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| Path | `/api/holds/[id]` |
| Auth | `requireAuth` + verify `hold.user_id = auth.uid` |
| Request | URL param `id` (UUID) |
| Response | `{ success: true }` |
| DB wrapper | `releaseHold(supabase, holdId)` |
| Idempotency | Built into `fn_release_hold` (exits cleanly if already RELEASED) |
| Errors | 409/lock_contention → retry, 422 → hold has non-failed payment, 404 → not found |

### 1.5 POST /api/holds/[id]/payment

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/holds/[id]/payment` |
| Auth | `requireAuth` + verify hold ownership |
| Request | `startPaymentSchema`: `{ amountKurus, currency, gateway, idempotencyKey }` |
| Response | `{ paymentId, status, isExisting, checkoutUrl? }` |
| DB wrapper | `startPayment(supabase, { holdId, amountKurus, currency, gateway, idempotencyKey })` then `gateway.createCheckoutUrl(paymentId, amountKurus, currency)` |
| Idempotency | Required. `idempotencyKey` in body. DB enforces via `UNIQUE(idempotency_key)` on payments. |
| Errors | 409/lock_contention → retry, 409/duplicate → return existing, 422 → hold expired/not active, 404 → not found |

### 1.6 POST /api/payments/[id]/confirm-booking

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/payments/[id]/confirm-booking` |
| Auth | `requireAuth` + verify payment ownership (through hold.user_id) |
| Request | `confirmBookingSchema`: `{ passengers[], vehicles[], cabins[] }` |
| Response | `{ bookingId, confirmationLedgerEventId }` |
| DB wrapper | `confirmBooking(supabase, { paymentId, passengers, vehicles, cabins })` |
| Idempotency | Built into `fn_confirm_booking_from_settled_payment` (returns existing booking if hold already confirmed) |
| Errors | 409/lock_contention → retry, 422 → payment not settled / hold expired with capacity released, 404 → not found |

### 1.7 GET /api/bookings/[id]

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/bookings/[id]` |
| Auth | `requireAuth` + verify `booking.user_id = auth.uid` |
| Request | URL param `id` (UUID) |
| Response | `{ booking, passengers[], vehicles[], cabins[], payment, refunds[], cancellations[] }` |
| DB wrapper | Direct Supabase queries with RLS (user sees own data) |
| Idempotency | Not required (read-only) |
| Errors | 404 → not found or not owned |

### 1.8 POST /api/bookings/[id]/cancel

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/bookings/[id]/cancel` |
| Auth | `requireAuth` + verify `booking.user_id = auth.uid` |
| Request | `cancelBookingSchema`: `{ scope, initiatedBy, refundAmountKurus, partialTargetType?, partialTargetId? }` |
| Response | `{ cancellationRecordId, refundId }` |
| DB wrapper | `cancelBooking(supabase, { bookingId, scope, initiatedBy, refundAmountKurus, partialTargetType, partialTargetId })` |
| Idempotency | Not idempotent at DB level — client must not retry blindly. 422 on double-cancel. |
| Errors | 409/lock_contention → retry, 422 → already cancelled / post-departure / business rule, 404 → not found |

### 1.9 GET /api/users/me/bookings

| Field | Value |
|-------|-------|
| Method | `GET` |
| Path | `/api/users/me/bookings` |
| Auth | `requireAuth` |
| Request | Query params: `?status=`, `?limit=`, `?offset=` (optional) |
| Response | `{ bookings: Array<{ booking_id, voyage_id, status, confirmed_at, cancelled_at, checked_in_at }> }` |
| DB wrapper | Direct Supabase query: `bookings WHERE user_id = auth.uid` with RLS |
| Idempotency | Not required (read-only) |
| Errors | 500 → internal error |

### 1.10 POST /api/webhooks/payment

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/webhooks/payment` |
| Auth | Gateway signature verification (`verifyPaymentWebhook`) |
| Request | Raw body (gateway-specific JSON). Must contain: `gatewayReferenceId`, `status` (SETTLED/FAILED) |
| Response | `{ received: true }` (200 always, to prevent gateway retry storms on app errors) |
| DB wrapper | Admin client: `UPDATE payments SET status = $status, settled_at = now() WHERE gateway_reference_id = $ref`. On SETTLED: `confirmBooking(adminSupabase, { paymentId, passengers, vehicles, cabins })` — passengers/vehicles/cabins pulled from hold_items + payment.booking_id context |
| Idempotency | Gateway may replay. DB `payments.status` transitions are idempotent (SETTLED→SETTLED is no-op at function level). |
| Errors | 401 → invalid signature. All other errors: log + return 200 (never block gateway retries). |

### 1.11 POST /api/webhooks/refund

| Field | Value |
|-------|-------|
| Method | `POST` |
| Path | `/api/webhooks/refund` |
| Auth | Gateway signature verification (`verifyRefundWebhook`) |
| Request | Raw body. Must contain: `gatewayRefundReference`, `status` (CONFIRMED/FAILED) |
| Response | `{ received: true }` (200 always) |
| DB wrapper | Admin client: On CONFIRMED → `markRefundConfirmed(adminSupabase, refundId)`. On FAILED → `markRefundFailed(adminSupabase, refundId, false)`. |
| Idempotency | DB functions are idempotent for same-state transitions. |
| Errors | 401 → invalid signature. All other errors: log + return 200. |

---

## 2. Shared API Infrastructure

### 2.1 Response Helpers — `src/lib/api/response.ts`

```
jsonOk(data, status = 200) → NextResponse.json(data, { status })
jsonError(error: string, status: number, code?: string) → NextResponse.json({ error, code, status }, { status })
```

### 2.2 Route Handler Wrapper — `src/lib/api/handler.ts`

```
withApiHandler(fn) → async (request, context) => {
  try { return await fn(request, context) }
  catch (error) {
    if AuthError → jsonError(message, status)
    if ApiError → jsonError(message, status, code)
    if ZodError → jsonError(formatted issues, 400, "validation_error")
    else → jsonError("Internal server error", 500)
  }
}
```

All route handlers wrap their logic with this. No try/catch in individual routes.

### 2.3 Auth Extraction — `src/lib/api/auth.ts`

```
getAuthUser(supabase) → calls requireAuth, returns User
getAuthUserId(supabase) → calls requireAuth, returns user.id
verifyOwnership(supabase, table, idColumn, idValue, userIdColumn = 'user_id') →
  queries table, compares user_id to auth.uid, throws 404 if not found or not owned
```

### 2.4 Idempotency Header — `src/lib/api/idempotency.ts`

```
getIdempotencyKey(request: Request) → reads X-Idempotency-Key header, validates UUID format, throws 400 if missing/invalid for routes that require it
```

### 2.5 Request Body Parser — `src/lib/api/body.ts`

```
parseBody<T>(request: Request, schema: ZodSchema<T>) → parses JSON, validates with Zod, returns typed result. Throws ApiError(400) on parse failure, ZodError on validation failure.
```

### 2.6 Webhook Verification — already exists in `src/lib/gateway/webhook.ts`

Phase 1 modifies: make `verifyPaymentWebhook` / `verifyRefundWebhook` return `true` when `PAYMENT_WEBHOOK_SECRET` is set and signature matches. For development/testing: add `WEBHOOK_SKIP_VERIFICATION=true` env var to bypass.

---

## 3. Implementation Order

### Slice 0 — Shared Infrastructure (blocker)

| ID | Task | File | Depends |
|----|------|------|---------|
| S0 | Response helpers | `src/lib/api/response.ts` | — |
| S1 | Route handler wrapper | `src/lib/api/handler.ts` | S0 |
| S2 | Auth extraction helpers | `src/lib/api/auth.ts` | S0 |
| S3 | Idempotency header helper | `src/lib/api/idempotency.ts` | S0 |
| S4 | Request body parser | `src/lib/api/body.ts` | S0 |

Tag: `[BLOCKER]` — all routes depend on these.

### Slice 1 — Read-Only Routes (parallel-safe)

| ID | Task | File | Depends |
|----|------|------|---------|
| R1 | GET /api/voyages | `src/app/api/voyages/route.ts` | S0–S1 |
| R2 | GET /api/voyages/[id] | `src/app/api/voyages/[id]/route.ts` | S0–S1 |
| R3 | GET /api/bookings/[id] | `src/app/api/bookings/[id]/route.ts` | S0–S2 |
| R4 | GET /api/users/me/bookings | `src/app/api/users/me/bookings/route.ts` | S0–S2 |

Tag: `[PARALLEL]` — all 4 can be built simultaneously after Slice 0.

### Slice 2 — Hold Lifecycle (sequential)

| ID | Task | File | Depends |
|----|------|------|---------|
| H1 | POST /api/holds | `src/app/api/holds/route.ts` | S0–S4 |
| H2 | DELETE /api/holds/[id] | `src/app/api/holds/[id]/route.ts` | S0–S2 |

Tag: `[SEQUENTIAL]` — H1 first (creates holds), H2 second (releases them).

### Slice 3 — Payment Flow (sequential, depends on Slice 2)

| ID | Task | File | Depends |
|----|------|------|---------|
| P1 | POST /api/holds/[id]/payment | `src/app/api/holds/[id]/payment/route.ts` | H1 |
| P2 | POST /api/payments/[id]/confirm-booking | `src/app/api/payments/[id]/confirm-booking/route.ts` | P1 |

Tag: `[SEQUENTIAL]` — P1 creates payment, P2 confirms booking from it.

### Slice 4 — Cancellation (depends on Slice 3)

| ID | Task | File | Depends |
|----|------|------|---------|
| C1 | POST /api/bookings/[id]/cancel | `src/app/api/bookings/[id]/cancel/route.ts` | P2 |

### Slice 5 — Webhooks (parallel, depends on Slice 0 only)

| ID | Task | File | Depends |
|----|------|------|---------|
| W1 | POST /api/webhooks/payment | `src/app/api/webhooks/payment/route.ts` | S0–S1 |
| W2 | POST /api/webhooks/refund | `src/app/api/webhooks/refund/route.ts` | S0–S1 |

Tag: `[PARALLEL]` — independent of user-facing routes. Uses admin Supabase client.

### Dependency Graph

```
S0 ──► S1, S2, S3, S4
  │
  ├──► R1, R2, R3, R4  (parallel)
  │
  ├──► H1 ──► H2
  │     │
  │     └──► P1 ──► P2 ──► C1
  │
  └──► W1, W2  (parallel)
```

### Execution Waves

| Wave | Tasks | Parallelism |
|------|-------|-------------|
| 1 | S0, S1, S2, S3, S4 | Sequential (S0 first, then S1–S4 parallel) |
| 2 | R1, R2, R3, R4, W1, W2 | 6 tasks fully parallel |
| 3 | H1, H2 | Sequential |
| 4 | P1, P2 | Sequential |
| 5 | C1 | Single |

---

## 4. Error Mapping Rules (all routes)

| Error Source | HTTP | Response Code | Retry? |
|-------------|------|--------------|--------|
| `AuthError(401)` | 401 | `unauthorized` | No |
| `AuthError(403)` | 403 | `forbidden` | No |
| `ZodError` | 400 | `validation_error` | No (fix request) |
| `ApiError(409, lock_contention)` | 409 | `lock_contention` | Yes (with backoff) |
| `ApiError(409, duplicate)` | 409 | `duplicate` | No (return existing) |
| `ApiError(422, business_rule_violation)` | 422 | `business_rule_violation` | No |
| `ApiError(404, not_found)` | 404 | `not_found` | No |
| `ApiError(500, internal_error)` | 500 | `internal_error` | No |
| Missing `X-Idempotency-Key` | 400 | `missing_idempotency_key` | No (fix request) |
| Invalid JSON body | 400 | `invalid_json` | No (fix request) |
| Webhook signature invalid | 401 | `invalid_signature` | No |
| Unhandled exception | 500 | `internal_error` | No |

---

## 5. Definition of Done — Phase 1

### Endpoint Checks

| # | Check |
|---|-------|
| 1 | `GET /api/voyages` returns open voyages with capacity data |
| 2 | `GET /api/voyages/:id` returns voyage detail with counters + cabin inventory |
| 3 | `POST /api/holds` with valid items creates hold, returns `holdId` + `expiresAt` |
| 4 | `POST /api/holds` with `X-Idempotency-Key` returns same hold on replay |
| 5 | `POST /api/holds` without auth returns 401 |
| 6 | `POST /api/holds` with insufficient capacity returns 422 |
| 7 | `DELETE /api/holds/:id` releases hold and returns success |
| 8 | `DELETE /api/holds/:id` for another user's hold returns 404 |
| 9 | `POST /api/holds/:id/payment` creates payment, returns `paymentId` |
| 10 | `POST /api/payments/:id/confirm-booking` with SETTLED payment creates booking |
| 11 | `POST /api/payments/:id/confirm-booking` with non-SETTLED payment returns 422 |
| 12 | `GET /api/bookings/:id` returns booking with all child data |
| 13 | `GET /api/bookings/:id` for another user's booking returns 404 |
| 14 | `POST /api/bookings/:id/cancel` with FULL scope cancels + queues refund |
| 15 | `POST /api/bookings/:id/cancel` with PARTIAL scope cancels one line |
| 16 | `GET /api/users/me/bookings` returns only authenticated user's bookings |

### Webhook Checks

| # | Check |
|---|-------|
| 17 | `POST /api/webhooks/payment` with invalid signature returns 401 |
| 18 | `POST /api/webhooks/payment` with valid SETTLED payload updates payment + confirms booking |
| 19 | `POST /api/webhooks/payment` with valid FAILED payload updates payment status |
| 20 | `POST /api/webhooks/refund` with CONFIRMED payload marks refund confirmed |
| 21 | `POST /api/webhooks/refund` with FAILED payload marks refund failed |
| 22 | Webhook endpoints always return 200 after signature passes (never 5xx to gateway) |

### Auth Checks

| # | Check |
|---|-------|
| 23 | All `/api/holds/*`, `/api/payments/*`, `/api/bookings/*`, `/api/users/*` return 401 without auth |
| 24 | Ownership verification: user A cannot access user B's hold/booking/payment |
| 25 | Webhook routes skip auth (gateway signature only) |

### DB Integration Checks

| # | Check |
|---|-------|
| 26 | Hold creation decrements available capacity in `voyage_capacity_counters` |
| 27 | Hold release restores capacity |
| 28 | Booking confirmation moves reserved → confirmed in counters |
| 29 | Booking cancellation releases confirmed capacity + inserts `refund_records` row |
| 30 | All capacity operations write to `capacity_allocation_ledger` |
| 31 | Lock contention (concurrent holds on same voyage) returns 409, not 500 |
| 32 | Idempotent replay of settled payment webhook does not create duplicate booking |
