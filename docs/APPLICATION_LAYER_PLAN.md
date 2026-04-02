# Antso Denizcilik — Application Layer Implementation Plan

> Stack: GitHub + Vercel + Supabase
> Foundation: Approved migrations 001–006

---

## 1. API Surface

### 1.1 Public Booking Endpoints

| Method | Path | DB Function | Auth |
|--------|------|-------------|------|
| `GET` | `/api/voyages` | Direct query: `voyages WHERE status = 'OPEN' AND departure_utc > now()` | Public |
| `GET` | `/api/voyages/:id` | Direct query: voyage + capacity counters + cabin inventory | Public |
| `POST` | `/api/holds` | `fn_create_hold(voyage_id, user_id, session_id, idempotency_key, items, ttl_seconds)` | Authenticated |
| `DELETE` | `/api/holds/:id` | `fn_release_hold(hold_id)` | Authenticated (owner) |
| `POST` | `/api/holds/:id/payment` | `fn_start_payment(hold_id, amount_kurus, currency, gateway, idempotency_key)` | Authenticated (owner) |
| `POST` | `/api/payments/:id/confirm-booking` | `fn_confirm_booking_from_settled_payment(payment_id, passengers, vehicles, cabins)` | Authenticated (owner) |
| `GET` | `/api/bookings/:id` | Direct query: booking + passengers + vehicles + cabins + payment + refunds | Authenticated (owner) |
| `POST` | `/api/bookings/:id/cancel` | `fn_cancel_booking(booking_id, scope, initiated_by, refund_amount_kurus, partial_target_type, partial_target_id)` | Authenticated (owner) |
| `GET` | `/api/users/me/bookings` | Direct query: `bookings WHERE user_id = $auth_uid` | Authenticated |

### 1.2 Payment Webhook Endpoints

| Method | Path | Action | Auth |
|--------|------|--------|------|
| `POST` | `/api/webhooks/payment` | Verify signature → `UPDATE payments SET status = 'SETTLED', settled_at = now() WHERE gateway_reference_id = $ref` or `SET status = 'FAILED'` → call `fn_confirm_booking_from_settled_payment` on SETTLED | Gateway signature |
| `POST` | `/api/webhooks/refund` | Verify signature → `fn_mark_refund_confirmed` or `fn_mark_refund_failed` | Gateway signature |

### 1.3 Admin Endpoints

| Method | Path | DB Function | Auth |
|--------|------|-------------|------|
| `POST` | `/api/admin/voyages` | Direct INSERT into `voyages` (DRAFT status) | Admin |
| `PATCH` | `/api/admin/voyages/:id` | Direct UPDATE on DRAFT voyages only (schedule, capacity) | Admin |
| `POST` | `/api/admin/voyages/:id/open` | `fn_open_voyage(voyage_id)` | Admin |
| `POST` | `/api/admin/voyages/:id/close` | `fn_close_voyage(voyage_id)` | Admin |
| `POST` | `/api/admin/voyages/:id/depart` | `fn_depart_voyage(voyage_id)` | Admin |
| `POST` | `/api/admin/voyages/:id/cancel` | `fn_cancel_voyage(voyage_id)` | Admin |
| `GET` | `/api/admin/voyages/:id/passenger-manifest` | `fn_passenger_manifest(voyage_id)` | Admin |
| `GET` | `/api/admin/voyages/:id/vehicle-manifest` | `fn_vehicle_manifest(voyage_id)` | Admin |
| `GET` | `/api/admin/voyages/:id/revenue` | `fn_revenue_summary(voyage_id)` | Admin |
| `POST` | `/api/admin/vessels` | Direct INSERT into `vessels` + `vessel_cabin_types` | Admin |

### 1.4 Ops Endpoints

| Method | Path | DB Function | Auth |
|--------|------|-------------|------|
| `GET` | `/api/ops/queue` | `fn_ops_queue_summary()` | Ops |
| `GET` | `/api/ops/queue/:issue_type` | Direct query: `ops_review_queue WHERE status = 'OPEN' AND issue_type = $type` | Ops |
| `GET` | `/api/ops/queue/entry/:id` | Direct query: full ops entry with related hold/booking/payment/refund | Ops |
| `POST` | `/api/ops/queue/entry/:id/resolve` | `fn_resolve_ops_review(review_id, resolution_action, resolved_by)` | Ops |
| `POST` | `/api/ops/reconcile/drift/:voyage_id` | `fn_reconcile_counter_drift(voyage_id)` | Ops |
| `POST` | `/api/ops/reconcile/payment/:payment_id` | `fn_reconcile_payment_unknown(payment_id, authoritative_status)` | Ops |
| `GET` | `/api/ops/integrity/:voyage_id` | `fn_assert_capacity_consistency(voyage_id)` | Ops |

---

## 2. Worker Surface

### 2.1 Hold Sweeper

| Field | Value |
|-------|-------|
| Schedule | Every 30 seconds |
| Implementation | Vercel Cron → Edge Function |
| DB call | `fn_sweep_expired_holds(p_batch_limit := 20)` |
| Batch size | 20 (hard cap 50 in function; recommended ≤ 20 for VCC lock accumulation) |
| Idempotency | Built into function (per-hold savepoint isolation) |
| Error handling | Log `scanned_count`, `expired_count`, `skipped_locked_count`, `skipped_payment_ambiguous_count`, `error_count`. Alert if `error_count > 0`. |
| Concurrency guard | Vercel Cron deduplication (single instance). No application-level lock needed — fn_expire_hold uses NOWAIT internally. |

### 2.2 Reconciliation Poller

| Field | Value |
|-------|-------|
| Schedule | Every 5 minutes |
| Implementation | Vercel Cron → Edge Function |
| Step 1 | `SELECT voyage_id FROM voyages WHERE status IN ('OPEN', 'CLOSED') ORDER BY departure_utc ASC LIMIT 10` |
| Step 2 | For each voyage: `fn_detect_and_queue_counter_drift(voyage_id)` |
| Step 3 | `SELECT payment_id FROM payments WHERE status = 'UNKNOWN' AND created_at < now() - interval '15 minutes' LIMIT 10` |
| Step 4 | For each payment: poll gateway API → `fn_reconcile_payment_unknown(payment_id, authoritative_status)` |
| Error handling | Per-voyage/payment try-catch. Continue on failure. Log all exceptions. |

### 2.3 Refund Retry Worker

| Field | Value |
|-------|-------|
| Schedule | Every 2 minutes |
| Implementation | Vercel Cron → Edge Function |
| Step 1 | `SELECT refund_id, payment_id, amount_kurus, currency FROM refund_records WHERE status = 'QUEUED' ORDER BY queued_at ASC LIMIT 10` |
| Step 2 | For each: call gateway refund API |
| Step 3 | On gateway success: `fn_mark_refund_confirmed(refund_id, gateway_ref)` |
| Step 4 | On gateway failure: `fn_mark_refund_failed(refund_id, FALSE)` or `fn_mark_refund_failed(refund_id, TRUE)` if retries exhausted |
| Step 5 | `SELECT refund_id FROM refund_records WHERE status = 'SUBMITTED' AND queued_at < now() - interval '1 hour' LIMIT 10` → poll gateway → confirm or fail |

### 2.4 Health / Integrity Worker

| Field | Value |
|-------|-------|
| Schedule | Every 15 minutes |
| Implementation | Vercel Cron → Edge Function |
| Step 1 | For active voyages: `fn_assert_capacity_consistency(voyage_id)` — catch P0001, log drift |
| Step 2 | `SELECT COUNT(*) FROM ops_review_queue WHERE status = 'OPEN'` → alert threshold (> 10) |
| Step 3 | `SELECT COUNT(*) FROM holds WHERE status = 'ACTIVE' AND expires_at < now() - interval '30 minutes'` → alert threshold (> 0 = sweeper stall) |
| Step 4 | `SELECT COUNT(*) FROM payments WHERE status = 'UNKNOWN' AND created_at < now() - interval '1 hour'` → alert threshold (> 5) |

---

## 3. Admin Panel Modules

### 3.1 Voyage Management

| View | Data Source | Actions |
|------|------------|---------|
| Voyage List | `voyages` + `vessels` | Filter by status, date range. Sort by departure_utc. |
| Voyage Create | Form → INSERT `voyages` (DRAFT) | Select vessel, set schedule, operational capacities. |
| Voyage Detail | `voyages` + `voyage_capacity_counters` + `voyage_cabin_inventory` | Real-time capacity utilization bars. |
| Voyage Lifecycle | Detail view action buttons | Open → Close → Depart → Cancel. Each calls the corresponding `fn_*` endpoint. Disable invalid transitions. |
| Cabin Inventory Setup | `voyage_cabin_inventory` | Admin sets `total_count` per cabin type before opening. INSERT/UPDATE rows while DRAFT. |

### 3.2 Manifests

| View | Data Source | Features |
|------|------------|----------|
| Passenger Manifest | `fn_passenger_manifest(voyage_id)` | Table with active/cancelled toggle filter. Export CSV. Search by name/document. Cancelled rows dimmed but visible. Count badges: total active, total checked-in. |
| Vehicle Manifest | `fn_vehicle_manifest(voyage_id)` | Table with active/cancelled toggle. Export CSV. Search by plate. Total lane meters / m² used. |

### 3.3 Ops Review Queue

| View | Data Source | Features |
|------|------------|----------|
| Queue Dashboard | `fn_ops_queue_summary()` | Issue type cards with count badges and age indicators. |
| Issue List | `ops_review_queue WHERE status = 'OPEN' AND issue_type = $type` | Paginated list. Click to expand detail. |
| Issue Detail | Full join: ops entry + related hold/booking/payment/refund | Context panel with all related entities. Resolve button → `fn_resolve_ops_review`. |

### 3.4 Reconciliation Actions

| View | Data Source | Features |
|------|------------|----------|
| Capacity Integrity | `fn_assert_capacity_consistency(voyage_id)` | Per-voyage check. Green/red status. |
| Drift Correction | `fn_reconcile_counter_drift(voyage_id)` | Manual trigger with confirmation dialog. Shows before/after counters. |
| Payment Resolution | `fn_reconcile_payment_unknown(payment_id, status)` | Manual gateway status input. Shows payment history + hold state. |

### 3.5 Revenue Reporting

| View | Data Source | Features |
|------|------------|----------|
| Voyage Revenue | `fn_revenue_summary(voyage_id)` | Single-voyage card: gross, refunded, net, liability, payment status counts. |
| Fleet Revenue | `fn_revenue_summary` called per voyage in date range | Aggregated table. Export CSV. Date range filter. |

---

## 4. Public Wizard Modules

### 4.1 Voyage Search

| Component | Behavior |
|-----------|----------|
| Route | `/` or `/voyages` |
| Query | `voyages WHERE status = 'OPEN' AND departure_utc > now() ORDER BY departure_utc ASC` |
| Display | Origin → Destination, date/time, available capacity indicators |
| Filters | Date range, origin, destination |

### 4.2 Item Selection

| Component | Behavior |
|-----------|----------|
| Route | `/voyages/:id/book` |
| Data | Voyage detail + cabin inventory (available counts) |
| Form | Passenger count selector, vehicle form (type, dimensions), cabin type selector |
| Validation | Client-side: quantities > 0, required fields. No capacity check (server-side at hold creation). |
| Output | `p_items` JSONB array matching fn_create_hold schema |

### 4.3 Hold Creation

| Component | Behavior |
|-----------|----------|
| Trigger | Submit item selection form |
| API call | `POST /api/holds` with items JSONB |
| Success | Redirect to payment page. Show countdown timer (TTL = expires_at - now). |
| Failure (55P03) | "Voyage is busy, please try again" — client retry with backoff |
| Failure (capacity) | "Not enough availability" — return to selection |
| Idempotency | Client generates `idempotency_key` (UUIDv4). Retry-safe. |

### 4.4 Payment Initiation

| Component | Behavior |
|-----------|----------|
| Route | `/holds/:id/pay` |
| Display | Hold summary, countdown timer, total amount |
| API call | `POST /api/holds/:id/payment` → receives `payment_id` |
| Gateway redirect | Redirect to payment gateway with `payment_id` as reference |
| Return URL | `/payments/:id/status` — polls until SETTLED or FAILED |
| TTL guard | If hold expired before payment completes, show "Hold expired" and offer restart |

### 4.5 Confirmation Page

| Component | Behavior |
|-----------|----------|
| Route | `/bookings/:id/confirmation` |
| Trigger | Payment webhook fires → `fn_confirm_booking_from_settled_payment` → booking created |
| Display | Booking reference, passenger list, vehicle list, cabin assignments, QR code for check-in |
| Data | `booking` + `booking_passengers` + `booking_vehicles` + `booking_cabins` |

### 4.6 Cancellation / Refund Tracking

| Component | Behavior |
|-----------|----------|
| Route | `/bookings/:id` (authenticated) |
| Actions | Cancel full booking, cancel individual passenger/vehicle/cabin |
| Cancel flow | Confirmation dialog → `POST /api/bookings/:id/cancel` with scope + target |
| Refund display | Refund status badge (QUEUED → SUBMITTED → CONFIRMED / FAILED / MANUAL_REVIEW) |
| Real-time | Poll or Supabase Realtime subscription on `refund_records.status` |

---

## 5. Check-in App Modules

### 5.1 Booking Lookup

| Component | Behavior |
|-----------|----------|
| Route | `/checkin` |
| Input | Booking ID text field, QR scanner |
| Query | `bookings WHERE booking_id = $id` + passengers + vehicles |
| Display | Booking summary, passenger list, vehicle list, current status |

### 5.2 QR / Code Entry

| Component | Behavior |
|-----------|----------|
| QR content | `booking_id` UUID encoded as QR |
| Scanner | Device camera via Web API (`getUserMedia`) |
| Fallback | Manual booking_id text input |
| Validation | UUID format check → API lookup |

### 5.3 Approval / Denial Flow

| Component | Behavior |
|-----------|----------|
| Pre-check display | Booking status, passenger identity details, document info |
| Document verification | Operator checkbox: "Documents verified" |
| Approve | `fn_record_check_in_attempt(booking_id, 'APPROVED', operator_id, TRUE, NULL)` |
| Deny | `fn_record_check_in_attempt(booking_id, 'DENIED', operator_id, FALSE, denial_reason)` |
| Post-action | Success screen with boarding pass view, or denial screen with reason |
| Guards | Already CHECKED_IN → show "Already checked in" (idempotent). CANCELLED → show "Booking cancelled". |

### 5.4 Audit History

| Component | Behavior |
|-----------|----------|
| Route | `/checkin/history` |
| Query | `check_in_records WHERE attempted_at > now() - interval '24 hours' ORDER BY attempted_at DESC` |
| Display | Table: booking_id, outcome, operator, timestamp, denial_reason |
| Filters | Outcome filter (APPROVED / DENIED), date range |

---

## 6. Exact Implementation Order

### Phase 0 — Project Scaffold

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 0.1 | Next.js project init (App Router) | — | `/app` directory structure |
| 0.2 | Supabase client setup (server + browser) | 0.1 | `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| 0.3 | Deploy migrations 001–006 to Supabase | — | Production DB ready |
| 0.4 | Supabase Auth config (email + optional OAuth) | 0.3 | Auth provider ready |
| 0.5 | RLS policies on all tables | 0.3, 0.4 | Row-level security enforced |
| 0.6 | Vercel project + GitHub integration | 0.1 | CI/CD pipeline |
| 0.7 | Environment variables (Supabase URL, anon key, service role key, gateway secrets) | 0.6 | Vercel env config |

### Phase 1 — Core API (No UI)

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 1.1 | `POST /api/holds` (create hold) | 0.5 | Hold creation API |
| 1.2 | `DELETE /api/holds/:id` (release hold) | 1.1 | Hold release API |
| 1.3 | `POST /api/holds/:id/payment` (start payment) | 1.1 | Payment initiation API |
| 1.4 | `POST /api/webhooks/payment` (payment webhook) | 1.3 | Payment settlement/failure |
| 1.5 | `POST /api/payments/:id/confirm-booking` (booking confirmation) | 1.4 | Booking creation API |
| 1.6 | `POST /api/bookings/:id/cancel` (cancellation) | 1.5 | Cancellation + refund queue |
| 1.7 | `POST /api/webhooks/refund` (refund webhook) | 1.6 | Refund confirmation/failure |
| 1.8 | Error handling middleware (NOWAIT retry, P0001/P0002 mapping to HTTP 409/404/422) | 1.1 | Consistent error responses |

### Phase 2 — Workers

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 2.1 | Hold sweeper cron | 1.1 | Expired holds cleaned |
| 2.2 | Refund retry worker | 1.7 | QUEUED refunds processed |
| 2.3 | Reconciliation poller | 1.4 | UNKNOWN payments resolved, drift detected |
| 2.4 | Health/integrity worker | 2.3 | Alerting on stale state |

### Phase 3 — Admin API + Panel

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 3.1 | Admin auth (role-based, Supabase custom claims or RLS) | 0.4, 0.5 | Admin role enforcement |
| 3.2 | Vessel + voyage CRUD endpoints | 3.1 | Vessel/voyage management API |
| 3.3 | Voyage lifecycle endpoints (open/close/depart/cancel) | 3.2 | Voyage state transitions |
| 3.4 | Manifest endpoints | 3.2 | Passenger + vehicle manifest API |
| 3.5 | Revenue endpoint | 3.2 | Revenue summary API |
| 3.6 | Ops queue endpoints | 3.1 | Ops review API |
| 3.7 | Reconciliation action endpoints | 3.6 | Manual drift correction + payment resolution |
| 3.8 | Admin panel: voyage management UI | 3.2, 3.3 | Voyage CRUD + lifecycle UI |
| 3.9 | Admin panel: manifest views | 3.4 | Manifest tables + export |
| 3.10 | Admin panel: ops queue UI | 3.6, 3.7 | Ops dashboard + resolution flow |
| 3.11 | Admin panel: revenue views | 3.5 | Revenue cards + fleet report |

### Phase 4 — Public Booking Wizard

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 4.1 | Voyage search page | 0.5 | Public voyage listing |
| 4.2 | Item selection form | 4.1 | Booking item builder |
| 4.3 | Hold creation + countdown | 1.1, 4.2 | Hold flow with TTL timer |
| 4.4 | Payment gateway integration | 1.3, 1.4, 4.3 | Gateway redirect + return |
| 4.5 | Confirmation page + QR generation | 1.5, 4.4 | Booking confirmation view |
| 4.6 | User bookings list | 1.5 | Booking history |
| 4.7 | Cancellation flow | 1.6, 4.6 | Cancel + refund tracking |

### Phase 5 — Check-in App

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 5.1 | QR scanner component | — | Camera-based QR reader |
| 5.2 | Booking lookup + display | 1.5, 5.1 | Check-in search/scan |
| 5.3 | Approval/denial flow | 5.2 | Check-in recording |
| 5.4 | Check-in audit history | 5.3 | Operator audit log |

### Phase 6 — Production Hardening

| # | Task | Depends On | Output |
|---|------|-----------|--------|
| 6.1 | Rate limiting (hold creation: 5/min per user) | 1.1 | Abuse prevention |
| 6.2 | Webhook signature verification hardening | 1.4, 1.7 | Replay/forgery prevention |
| 6.3 | NOWAIT retry middleware (exponential backoff, max 3 retries) | 1.8 | Lock contention resilience |
| 6.4 | Monitoring dashboard (worker health, ops queue depth, payment unknown age) | 2.4 | Operational visibility |
| 6.5 | Alerting rules (PagerDuty/Slack) | 6.4 | Incident response |
| 6.6 | Load testing (concurrent hold creation per voyage) | All | Capacity validation |

### Dependency Graph Summary

```
Phase 0 (scaffold)
    │
    ├──► Phase 1 (core API) ──► Phase 2 (workers)
    │                      │
    │                      └──► Phase 4 (public wizard)
    │
    └──► Phase 3 (admin API + panel)
                           │
                           └──► Phase 5 (check-in app)

Phase 6 runs after all phases.
```

### Minimum Viable Product (MVP) Cut

For earliest usable system: **Phase 0 + Phase 1 + Phase 2.1 (sweeper) + Phase 3 (without 3.10, 3.11) + Phase 4**.

This gives: public booking flow end-to-end, voyage management, manifests, and hold expiry. Ops queue, reconciliation, revenue reporting, and check-in can follow.
