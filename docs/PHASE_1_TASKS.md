# Phase 1 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group S — Shared API Infrastructure

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| S0 | Response helpers | `src/lib/api/response.ts` | — | Exports `jsonOk(data, status?)` returning `NextResponse.json(data, {status})` and `jsonError(error, status, code?)` returning `NextResponse.json({error, code, status}, {status})`. | `[CP][B]` |
| S1 | Route handler wrapper | `src/lib/api/handler.ts` | S0 | Exports `withApiHandler(fn)` that wraps route handler. Catches `AuthError` → `jsonError(msg, status)`, `ApiError` → `jsonError(msg, status, code)`, Zod errors → `jsonError(formatted, 400, "validation_error")`, unknown → `jsonError("Internal server error", 500)`. Console.error for 500s. | `[CP][B]` |
| S2 | Auth extraction helpers | `src/lib/api/auth.ts` | S0 | Exports `getAuthUser(supabase)` → returns `User` via `requireAuth`. Exports `getAuthUserId(supabase)` → returns `string`. Exports `verifyOwnership(supabase, table, idColumn, idValue, userIdColumn?)` → queries table with RLS, throws `ApiError(404)` if row not found or `user_id != auth.uid`. | `[CP][B]` |
| S3 | Idempotency header helper | `src/lib/api/idempotency.ts` | S0 | Exports `getIdempotencyKey(request)` → reads `X-Idempotency-Key` header, validates UUID regex, throws `ApiError(400, "missing_idempotency_key")` if absent or invalid. | `[B]` |
| S4 | Request body parser | `src/lib/api/body.ts` | S0 | Exports `parseBody<T>(request, schema)` → calls `request.json()`, validates with Zod schema, returns typed `T`. Throws `ApiError(400, "invalid_json")` on JSON parse failure. Lets `ZodError` propagate (caught by handler wrapper). | `[B]` |
| S5 | Update webhook verification | `src/lib/gateway/webhook.ts` (update) | — | Add `WEBHOOK_SKIP_VERIFICATION` env var check. If set to `"true"`, both `verifyPaymentWebhook` and `verifyRefundWebhook` return `true`. Otherwise keep existing stub behavior. Enables local/staging testing without real gateway. | `[P]` |

---

## Group R — Public Voyage Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| R1 | GET /api/voyages | `src/app/api/voyages/route.ts` (update) | S0, S1 | Replace stub. Queries `voyages` where `status = 'OPEN'` and `departure_utc > now()` joined with `voyage_capacity_counters`. Supports optional query params `origin`, `destination`, `from` (date), `to` (date). Returns `{ voyages: [...] }` with computed available capacity. Wrapped in `withApiHandler`. | `[P]` |
| R2 | GET /api/voyages/[id] | `src/app/api/voyages/[id]/route.ts` (update) | S0, S1 | Replace stub. Queries `voyages` by ID where `status IN ('OPEN','CLOSED','DEPARTED')`. Joins `voyage_capacity_counters` and `voyage_cabin_inventory`. Returns `{ voyage, capacityCounters, cabinInventory }`. 404 if not found or DRAFT/CANCELLED. Wrapped in `withApiHandler`. | `[P]` |

---

## Group H — Hold Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| H1 | POST /api/holds | `src/app/api/holds/route.ts` (update) | S0–S4 | Replace stub. `withApiHandler`: call `getAuthUser`, `getIdempotencyKey(request)`, `parseBody(request, createHoldSchema)`. Call `createHold(supabase, { voyageId, userId: user.id, sessionId: header or generated, idempotencyKey, items, ttlSeconds })`. Return `jsonOk({ holdId: result.o_hold_id, expiresAt: result.o_expires_at }, 201)`. | `[CP]` |
| H2 | DELETE /api/holds/[id] | `src/app/api/holds/[id]/route.ts` (update) | S0–S2 | Replace stub. `withApiHandler`: call `getAuthUser`, `verifyOwnership(supabase, 'holds', 'hold_id', params.id)`. Call `releaseHold(supabase, params.id)`. Return `jsonOk({ success: true })`. | `[CP]` |

---

## Group P — Payment Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P1 | POST /api/holds/[id]/payment | `src/app/api/holds/[id]/payment/route.ts` (update) | H1, S4 | Replace stub. `withApiHandler`: call `getAuthUser`, `verifyOwnership(supabase, 'holds', 'hold_id', params.id)`, `parseBody(request, startPaymentSchema)`. Call `startPayment(supabase, { holdId: params.id, ...body })`. Attempt `getGateway().createCheckoutUrl(result.o_payment_id, body.amountKurus, body.currency)` — catch and set `checkoutUrl = null` if gateway not configured. Return `jsonOk({ paymentId, status, isExisting, checkoutUrl }, isExisting ? 200 : 201)`. | `[CP]` |
| P2 | POST /api/payments/[id]/confirm-booking | `src/app/api/payments/[id]/confirm-booking/route.ts` (update) | P1, S4 | Replace stub. `withApiHandler`: call `getAuthUser`. Query `payments` by ID to get `hold_id`, then `verifyOwnership(supabase, 'holds', 'hold_id', holdId)`. `parseBody(request, confirmBookingSchema)`. Transform passenger/vehicle/cabin arrays to JSONB format matching `fn_confirm_booking_from_settled_payment` expectations. Call `confirmBooking(supabase, { paymentId: params.id, passengers, vehicles, cabins })`. Return `jsonOk({ bookingId, confirmationLedgerEventId }, 201)`. | `[CP]` |

---

## Group B — Booking Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| B1 | GET /api/bookings/[id] | `src/app/api/bookings/[id]/route.ts` (update) | S0–S2 | Replace stub. `withApiHandler`: call `getAuthUser`, `verifyOwnership(supabase, 'bookings', 'booking_id', params.id)`. Query booking + booking_passengers + booking_vehicles + booking_cabins + payment (through hold_id) + refund_records + cancellation_records. Return `jsonOk({ booking, passengers, vehicles, cabins, payment, refunds, cancellations })`. | `[P]` |
| B2 | POST /api/bookings/[id]/cancel | `src/app/api/bookings/[id]/cancel/route.ts` (update) | P2, S4 | Replace stub. `withApiHandler`: call `getAuthUser`, `verifyOwnership(supabase, 'bookings', 'booking_id', params.id)`, `parseBody(request, cancelBookingSchema)`. Call `cancelBooking(supabase, { bookingId: params.id, scope: body.scope, initiatedBy: body.initiatedBy, refundAmountKurus: body.refundAmountKurus, partialTargetType: body.partialTargetType, partialTargetId: body.partialTargetId })`. Return `jsonOk({ cancellationRecordId, refundId })`. | `[CP]` |

---

## Group U — User Booking Route

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| U1 | GET /api/users/me/bookings | `src/app/api/users/me/bookings/route.ts` (update) | S0–S2 | Replace stub. `withApiHandler`: call `getAuthUserId(supabase)`. Query `bookings WHERE user_id = userId` with optional query params `status`, `limit` (default 20, max 100), `offset` (default 0). Return `jsonOk({ bookings, total })`. RLS enforces user scoping. | `[P]` |

---

## Group W — Webhook Routes

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W1 | POST /api/webhooks/payment | `src/app/api/webhooks/payment/route.ts` (update) | S0, S5 | Replace stub. Read raw body + signature header. Verify with `verifyPaymentWebhook`. Parse body JSON to extract `gatewayReferenceId` and `status`. Use `createAdminSupabase()`. If SETTLED: query `payments WHERE gateway_reference_id = ref`, `UPDATE payments SET status = 'SETTLED', settled_at = now()`. Then query hold_items for the hold, build passengers/vehicles/cabins JSONB, call `confirmBooking(adminSupabase, { paymentId, passengers: [], vehicles: [], cabins: [] })`. If FAILED: `UPDATE payments SET status = 'FAILED'`. Always return `jsonOk({ received: true })` after signature passes — never return 5xx to gateway. Wrap DB errors in try/catch + console.error, still return 200. | `[P]` |
| W2 | POST /api/webhooks/refund | `src/app/api/webhooks/refund/route.ts` (update) | S0, S5 | Replace stub. Read raw body + signature header. Verify with `verifyRefundWebhook`. Parse body JSON to extract `gatewayRefundReference` and `status`. Use `createAdminSupabase()`. Query `refund_records WHERE gateway_refund_reference = ref` to get `refund_id`. If CONFIRMED: `markRefundConfirmed(adminSupabase, refundId)`. If FAILED: `markRefundFailed(adminSupabase, refundId, false)`. Always return `jsonOk({ received: true })`. | `[P]` |

---

## Group V — Build Verification

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| V1 | Build check | — | All above | `npm run build` succeeds with 0 errors. All routes compile. No unused imports. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Shared Infrastructure (sequential start, then parallel)
```
S0 ──► S1, S2, S3, S4 (parallel after S0)
       S5 (parallel, independent)
```
**5 files created, 1 file updated. Blocker for all routes.**

### Wave 2 — Read Routes + Webhooks (all parallel)
```
R1, R2, B1, U1, W1, W2  (6 tasks fully parallel)
```
**6 files updated.**

### Wave 3 — Hold Lifecycle (sequential)
```
H1 ──► H2
```
**2 files updated.**

### Wave 4 — Payment Flow (sequential)
```
P1 ──► P2
```
**2 files updated.**

### Wave 5 — Cancellation + Verify
```
B2, V1
```
**1 file updated, 1 verification.**

### Parallelism Map

| Wave | Tasks | Count |
|------|-------|-------|
| 1 | S0–S5 | 6 (1 serial + 5 parallel) |
| 2 | R1, R2, B1, U1, W1, W2 | 6 (all parallel) |
| 3 | H1, H2 | 2 (sequential) |
| 4 | P1, P2 | 2 (sequential) |
| 5 | B2, V1 | 2 (sequential) |

**Total tasks: 18**
**Total files: 5 new + 13 updated = 18 file operations**
**Critical path: S0 → S1 → H1 → P1 → P2 → B2 → V1 = 7 tasks**
