# ANTSO DENİZCİLİK — MASTER SYSTEM CONTEXT

> **Purpose:** Complete engineering reference for the antso_denizcilik ferry ticketing and reservation system. A new development session must be able to continue from this document alone with zero additional explanation.

---

## ARTIFACT STATUS REGISTRY

> This registry governs what a new session may treat as authoritative truth.
> **Only APPROVED sections are safe to carry forward as default truth.**
> DRAFT sections are continuation candidates. REJECTED sections exist for audit only.

---

### Step 1–3 — System Principles

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | _(design document — no file; content embedded in this document §2)_ |
| **Last reviewed decision** | All 17 non-negotiable principles accepted without modification. Includes: single NOWAIT serialisation gate, absolute lock order, ledger-before-counters, VEHICLE×quantity rule, overbooking delta ≥ 0, all money as BIGINT kuruş. |
| **Open risks** | None. |
| **Next required action** | None. Carry as-is. |

---

### Step 4 — Domain Model

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | _(design document — no file; content embedded in this document §4)_ |
| **Last reviewed decision** | Aggregate roots, child entities, value objects, and all four state machines accepted. `Vessel` is a base-capacity template only. `Cancellation` is not an aggregate root. `Booking` does not carry a full ordered chain of ledger event IDs. |
| **Open risks** | None. |
| **Next required action** | None. Carry as-is. |

---

### Step 5 — Database Design

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | _(design document — no file; content embedded in this document §5–6)_ |
| **Last reviewed decision** | Table responsibilities, source-of-truth vs derived classification, and all critical constraints accepted. `voyage_capacity_counters` is explicitly derived. Ledger replay ordering is by `ledger_seq ASC`, not ULID. |
| **Open risks** | None. |
| **Next required action** | None. Carry as-is. |

---

### Step 6 — DDL Migration (Initial Schema)

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/001_initial_schema.sql` |
| **Last reviewed decision** | Full DDL audit (Step 7) completed. All 10 audit fixes applied (Step 8) and incorporated into the file. Fixes include: TRUNCATE protection for append-only tables, missing FK `payments.booking_id`, missing FKs on CHAR(26) event-ref columns, `UNIQUE(vessel_id, label)` on `vessel_cabin_types`, 4 FK-support indexes, auto-creation trigger for `voyage_capacity_counters`, `refund_records(payment_id)` index, vessel base capacity immutability trigger, polymorphic `partial_target_id` existence trigger, narrowed `total_count` immutability to non-CANCELLED bookings. |
| **Open risks** | None identified post-audit. |
| **Next required action** | None. File is ready for deployment. |

---

### Step 7 — DDL Audit

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | _(audit output — no separate file; fixes merged into `001_initial_schema.sql`)_ |
| **Last reviewed decision** | 10 defects identified and all resolved. Audit is complete. |
| **Open risks** | None. |
| **Next required action** | None. |

---

### Step 8 — DDL Audit Fixes Applied

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/001_initial_schema.sql` (tail section — AUDIT FIXES block) |
| **Last reviewed decision** | All 10 fixes verified present in file. |
| **Open risks** | None. |
| **Next required action** | None. |

---

### Step 9 — Core Transaction Functions

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/002_core_functions.sql` |
| **Last reviewed decision** | Full function audit (Step 10) completed. All 7 defects fixed (Step 11) and verified in file. Functions present: `fn_generate_ulid`, `fn_next_ledger_seq`, `fn_create_hold`, `fn_expire_hold`, `fn_start_payment`, `fn_confirm_booking_from_settled_payment`, `fn_release_hold`. Also adds `ALTER TYPE allocation_event_type ADD VALUE 'HOLD_RELEASED'`. |
| **Open risks** | None identified post-audit. |
| **Next required action** | None. File is ready for deployment. |

---

### Step 10 — Core Function Audit

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | _(audit output — no separate file; all fixes merged into `002_core_functions.sql`)_ |
| **Last reviewed decision** | 7 defects identified and all resolved. Critical defects included: VEHICLE×quantity not applied (BLOCKER), idempotency scope missing `hold_id`, cabin drift in confirmation (p_cabins trusted over hold_items). All resolved. |
| **Open risks** | None. |
| **Next required action** | None. |

---

### Step 11 — Core Function Audit Fixes Applied

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/002_core_functions.sql` |
| **Last reviewed decision** | All 7 fixes verified present via `Grep` inspection. Fix list: (1) VEHICLE×quantity in fn_create_hold + 3 restoration functions, (2) idempotency `AND hold_id = p_hold_id` in fn_start_payment, (3) cabin drift — derive from hold_items not p_cabins, (4) duplicate cabin_type_id rejection, (5) empty p_items guard, (6) split cabin existence vs availability check, (7) HOLD_RELEASED enum value + fn_release_hold correction. |
| **Open risks** | None. |
| **Next required action** | None. File is ready for deployment. |

---

### Step 12 — Cancellation, Refund & Check-in Functions

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/003_cancellation_checkin_functions.sql` |
| **Last reviewed decision** | Full audit completed (Step 12 audit). One defect found and fixed: post-lock FULL idempotency fall-through produced a misleading "cannot be cancelled from state: CANCELLED" exception instead of the correct "data integrity violation" raise when booking is CANCELLED but no FULL cancellation_record exists. Fix applied: added explicit `RAISE EXCEPTION ... data integrity violation` at end of post-lock idempotency block, mirroring the pre-lock path. All five documented open risks resolved: ① partial cancellation pre-lock serialisation — CONFIRMED SAFE (capacity_counters NOWAIT serialises all concurrent capacity writes for the voyage); ② v_all_cancelled EXISTS logic — CONFIRMED CORRECT (De Morgan's law; zero-item booking unreachable from fn_confirm_booking); ③ FULL idempotency correctness — FIXED (see above); ④ caller-supplied refund amount — ACCEPTED DESIGN RISK (no DB-layer enforcement; API layer is responsible for computing correct amount); ⑤ check-in departure boundary `<` vs `<=` — CONFIRMED INTENTIONAL (`fn_cancel_booking` uses `<=`, `fn_record_check_in_attempt` uses `<`; correct asymmetry: cancel blocked at departure, check-in permitted at departure instant). |
| **Open risks** | Refund amount validation is the sole remaining design risk: the DB layer does not enforce `p_refund_amount_kurus ≤ payment.amount_kurus`. The API layer must enforce this. |
| **Next required action** | None. File is ready for deployment after Step 14 audit completes and 004 is approved (migration order dependency). |

---

### Step 13 — Master Context Document (this file)

| Field | Value |
|-------|-------|
| **Status** | ⚠️ DRAFT |
| **Artifact** | `SYSTEM_CONTEXT.md` |
| **Last reviewed decision** | Updated after Step 20 (application layer plan). All migration files (001–006) are production-ready. Application layer plan generated at `docs/APPLICATION_LAYER_PLAN.md`. Current Safe Continuation Point = Step 19 (database complete). |
| **Open risks** | §7 transaction flows for Step 17 functions are not yet in this document. fn_sweep_expired_holds VCC lock accumulation is a documented production constraint (batches <= 20 recommended). |
| **Next required action** | Begin Wave 1 implementation from Phase 0 task breakdown (Step 22). |

---

### Step 22 — Phase 0 Implementation Task Breakdown

| Field | Value |
|-------|-------|
| **Status** | ⚠️ DRAFT |
| **Artifact** | `docs/PHASE_0_TASKS.md` |
| **Last reviewed decision** | Generated 93-task breakdown across 17 groups (A–Q) and 6 execution waves. Groups: Foundation (6), Supabase Clients (4), Database & Types (4), Auth (6), Middleware (1), Error Handling (3), Validation (5), Gateway Interface (3), DB Wrappers (10), RLS (2), Layouts (6), Public Page Stubs (7), Admin Page Stubs (11), Check-in Page Stubs (3), API Route Stubs (10), Worker Route Stubs (4), Deploy & Verify (4). Critical path: 11 tasks. Maximum parallelism: 35 tasks in Wave 5. |
| **Open risks** | None. This is a task plan only — no code generated yet. |
| **Next required action** | Begin Wave 1 implementation (A1–A6, B1–B4). |

---

### Step 21 — Phase 0 Scaffold Plan

| Field | Value |
|-------|-------|
| **Status** | ⚠️ DRAFT |
| **Artifact** | `docs/PHASE_0_SCAFFOLD.md` |
| **Last reviewed decision** | Generated Phase 0 scaffold plan: 12 sections covering project folders (full tree), app routes (22 pages), lib/services (10 db wrappers, auth guards, gateway interface, error mapping, validation, retry), 10 env vars, auth structure (4 roles via raw_app_meta_data), RLS rollout (19 tables enabled, public read + user-scoped read + SECURITY DEFINER RPC pattern), API grouping (6 groups), worker grouping (4 Vercel crons), 3 app shells (admin/public/checkin), and 22-step build order with dependency graph and exit criteria. New migration 007_rls_policies.sql specified inline. |
| **Open risks** | RLS policies use subqueries for user-scoped child table access (e.g., `booking_id IN (SELECT ...)`) — may need performance tuning with indexes. Vercel Cron minimum 1-minute interval limits hold sweeper frequency. Payment gateway selection not yet decided. |
| **Next required action** | Review plan. Then execute build order steps 0.1–0.22. |

---

### Step 20 — Application Layer Plan

| Field | Value |
|-------|-------|
| **Status** | ⚠️ DRAFT |
| **Artifact** | `docs/APPLICATION_LAYER_PLAN.md` |
| **Last reviewed decision** | Generated complete application-layer implementation plan covering: 4 API surface groups (27 endpoints), 4 workers (sweeper, reconciliation, refund, health), 5 admin panel modules, 6 public wizard modules, 4 check-in app modules, and 6-phase implementation order with dependency graph. Stack: Next.js App Router + Vercel + Supabase. Built strictly on approved migrations 001–006 with no schema changes. |
| **Open risks** | Plan is not yet reviewed. RLS policy design is listed as Phase 0.5 but not specified in detail — must be designed before any API endpoint is deployed. Payment gateway integration details (which gateway, API shape, webhook format) are not specified. Pricing engine is out of scope (caller-supplied amounts) — the application layer must implement pricing logic somewhere. |
| **Next required action** | Review plan. Then begin Phase 0 (project scaffold) or refine specific sections as needed. |

---

### Step 19 — Reporting & Manifest Functions

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED — Step 19B post-approval fixes applied; file is production-ready |
| **Artifact** | `migrations/006_reporting_functions.sql` |
| **Last reviewed decision** | Step 19B applied all Step 19A fixes. **Fix MEDIUM — fn_passenger_manifest + fn_vehicle_manifest:** removed LEFT JOIN to `cancellation_records`; `is_line_cancelled` now uses `bp.cancelled_at IS NOT NULL` / `bv.cancelled_at IS NOT NULL` (authoritative per-line marker from migration 003). Eliminates duplicate-row risk entirely. ORDER BY updated to match. **Fix LOW — fn_passenger_manifest + fn_vehicle_manifest:** appended `bp.booking_passenger_id ASC` / `bv.booking_vehicle_id ASC` as final ORDER BY tiebreaker for fully deterministic ordering within bookings. |
| **Open risks** | fn_revenue_summary joins payments through holds (not bookings) — this captures all voyage payments including those for expired/never-confirmed holds; gross_captured may include payments with no corresponding booking row. This is correct for revenue reporting (money in = money in, regardless of booking outcome). |
| **Next required action** | None. File is production-ready (after 001–005 in migration order). |

---

### Step 17 — Voyage Management & Ops Functions

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED — Step 18D post-approval MEDIUM fixes applied; file is production-ready |
| **Artifact** | `migrations/005_voyage_management_functions.sql` |
| **Last reviewed decision** | Step 18D applied 2 MEDIUM fixes to fn_sweep_expired_holds identified in Step 18C re-audit. **Fix MEDIUM-1 (payments UPDATE blocking):** added `PERFORM 1 FROM payments WHERE hold_id = v_hold_id AND status = 'PENDING' FOR UPDATE NOWAIT;` inside the savepoint block immediately before `UPDATE payments SET status = 'UNKNOWN'`. On lock_not_available the savepoint rolls back (including the ops entry from fn_expire_hold), v_locked is incremented, and the hold is re-processed on the next sweep run. Indefinite blocking on concurrent webhook/payment transactions is eliminated. **Fix MEDIUM-2 (UNKNOWN livelock):** added `AND (p.status IS NULL OR p.status != 'UNKNOWN')` to the cursor WHERE clause. UNKNOWN-payment holds are excluded from the candidate set entirely — they no longer consume batch slots and livelock under reconciliation worker failure is eliminated. The now-dead `IF v_payment_status = 'UNKNOWN' THEN v_ambiguous := v_ambiguous + 1; CONTINUE; END IF` branch was removed from the loop body. Function header comment updated to reflect UNKNOWN exclusion. All prior Step 18B fixes (1 HIGH + 3 MEDIUM + 3 LOW) remain correctly applied. |
| **Open risks** | fn_sweep_expired_holds VCC lock accumulation: unfixable in PostgreSQL without autonomous transactions — caller must use batches <= 20 in high-concurrency production (hard cap of 50 enforced by function). §7 transaction flows for Step 17 functions not yet documented in this file. |
| **Next required action** | Generate `migrations/006_reporting_functions.sql` (passenger manifest, vehicle manifest, revenue summary). |

---

### Step 14 — Reconciliation & Integrity Functions

| Field | Value |
|-------|-------|
| **Status** | ✅ APPROVED |
| **Artifact** | `migrations/004_reconciliation_functions.sql` |
| **Last reviewed decision** | Step 15 audit: 1 HIGH + 3 MEDIUM + 2 LOW issues found. Step 15B applied all fixes. HIGH: fn_reconcile_counter_drift now pre-validates all ledger-derived scalar values (>= 0) and cabin values (>= 0, sum <= total_count) before any corrective UPDATE; raises SQLSTATE P0001 with full diagnostic on failure. MEDIUM-1: fn_reconcile_counter_drift auto-resolves OPEN COUNTER_DRIFT ops entries after correction and inserts a RESOLVED audit record. MEDIUM-2: fn_detect_and_queue_counter_drift uses INSERT ... ON CONFLICT (voyage_id, issue_type) WHERE status='OPEN' AND issue_type='COUNTER_DRIFT' DO NOTHING backed by uq_orq_open_counter_drift partial unique index. MEDIUM-3: fn_reconcile_payment_unknown UNKNOWN branch exits before Lock 1 using payment-lock-only path with INSERT ... ON CONFLICT DO NOTHING backed by uq_orq_open_payment_unknown. LOW-1: cabin_agg AS MATERIALIZED in fn_replay_ledger_and_compute_state. LOW-2: fn_assert_capacity_consistency takes pre/post snapshot of last_ledger_seq and raises P0001 if a concurrent write changed it during replay. Three schema patches added: uq_orq_open_counter_drift, uq_orq_open_recon_failure, uq_orq_open_payment_unknown. |
| **Open risks** | RECONCILIATION_FAILURE ops entry cannot be persisted atomically with RAISE in PL/pgSQL. Caller must catch SQLSTATE P0001 from fn_reconcile_counter_drift and insert the ops entry in a new transaction: `INSERT INTO ops_review_queue (...) ON CONFLICT (voyage_id, issue_type) WHERE status='OPEN' AND issue_type='RECONCILIATION_FAILURE' DO NOTHING`. This is a documented caller contract. |
| **Next required action** | None. File is ready for deployment (after 001, 002, 003 in migration order). |

---

## Current Safe Continuation Point

> **Latest APPROVED step safe to continue from: Step 19 — Reporting & Manifest Functions (Step 19B post-approval fixes applied; file is production-ready)**
>
> Files safe to deploy in migration order:
> - `migrations/001_initial_schema.sql` ✅ APPROVED
> - `migrations/002_core_functions.sql` ✅ APPROVED
> - `migrations/003_cancellation_checkin_functions.sql` ✅ APPROVED
> - `migrations/004_reconciliation_functions.sql` ✅ APPROVED
> - `migrations/005_voyage_management_functions.sql` ✅ APPROVED
> - `migrations/006_reporting_functions.sql` ✅ APPROVED
>
> **All 6 migration files are APPROVED and production-ready.**
>
> **Next action in a new session:**
> Execute Phase 0 Wave 1 (`docs/PHASE_0_TASKS.md`): A1 (Next.js init) → A2 (deps) → A4 (env) → B1–B4 (Supabase clients). Then Wave 2–6 per task breakdown.
>
> **Remaining known production constraint (not fixable in-function):**
> — `fn_sweep_expired_holds`: VCC row locks from fn_expire_hold savepoint blocks are retained by the outer transaction for the full batch duration. No in-PostgreSQL fix without autonomous transactions. Caller must use batches <= 20 in high-concurrency production (hard cap of 50 enforced by function).

---

## 1. System Overview

### What the system is

A production-grade **ferry ticketing and seat/vehicle/cabin reservation platform** built on PostgreSQL / Supabase. It manages the full lifecycle of a passenger ferry reservation: hold → payment → confirmation → check-in → cancellation → refund.

The system enforces **multi-dimensional capacity constraints** (lane metres, square metres, passenger count, cabin count) atomically at the database layer. All capacity authority lives inside the database; no application-layer orchestration may bypass it.

### What it is NOT

- Not an event-sourcing system. The ledger is an **append-only audit and replay log**, not an event bus.
- Not a queue-based system. There are no in-process or out-of-process queues for serialising capacity writes. Serialisation is achieved exclusively via `SELECT FOR UPDATE NOWAIT` on `voyage_capacity_counters`.
- Not an eventually-consistent system. Every capacity mutation is ACID-transactional.
- Not a pricing engine. Money amounts (`amount_kurus`) are always supplied by the caller; the database stores and validates them but does not compute them.
- Not a notification system. No webhooks, emails, or push messages are generated inside the database.
- Not an API layer. No HTTP handlers, RLS policies, or views are defined in the migration files.

---

## 2. Non-Negotiable System Principles

> **Status: APPROVED**

1. **Single serialisation gate.** All capacity writes for a voyage are serialised by acquiring `voyage_capacity_counters` `FOR UPDATE NOWAIT`. No other mechanism (advisory locks, application-level mutexes, queues) is used or permitted.

2. **NOWAIT everywhere.** Every `SELECT FOR UPDATE` in every function uses `NOWAIT`. Blocking waits are forbidden. A contended write fails immediately with a lock error; the caller retries at the application layer.

3. **Lock order is absolute.** Within any function the lock acquisition sequence is always:
   `voyage_capacity_counters` → `voyage_cabin_inventory` → `payments` → `bookings`
   Violating this order creates deadlock potential and is forbidden.

4. **Ledger before counters.** Every capacity mutation writes to `capacity_allocation_ledger` (and `ledger_cabin_deltas`) before updating `voyage_capacity_counters` or `voyage_cabin_inventory`. A counter update without a preceding ledger row is a corruption.

5. **Counters are derived, never authoritative.** `voyage_capacity_counters` and `voyage_cabin_inventory` are mutable projection tables used as a concurrency gate. The source of truth for all capacity is `capacity_allocation_ledger` + `ledger_cabin_deltas`. The counters must be reconstructible by replaying the ledger in `ledger_seq` order.

6. **Monotonic `ledger_seq` per voyage.** The ledger sequence number is a per-voyage monotonically increasing integer. It is generated inside the transaction by reading `last_ledger_seq + 1` from the already-locked `voyage_capacity_counters` row. It is never derived from the ledger itself (`MAX(ledger_seq)`) — that would require a table scan and a race. `UNIQUE(voyage_id, ledger_seq)` enforces monotonicity at the database level.

7. **Replay order is `ledger_seq`, not ULID/`event_id`.** Ledger events are replayed in strict `ledger_seq ASC` order per voyage. The `event_id` ULID is a stable identifier, not an ordering key.

8. **Multi-dimensional capacity constraint precedence.** Constraints are evaluated in this order: `lane_meters` → `m2` → `passengers` → `cabin`. Lane metres are the scarcest resource and are checked first. A booking cannot proceed if any dimension is exhausted.

9. **Overbooking delta defaults to zero.** `voyages.overbooking_delta` is a non-negative integer. The effective capacity ceiling for each dimension is `operational_X + overbooking_delta`. The schema `CHECK (overbooking_delta >= 0)` and a capacity ceiling trigger enforce this. The delta is intentionally set to zero for normal operations.

10. **All money in `BIGINT` (kuruş).** No `NUMERIC`, no `FLOAT`, no `DECIMAL` for monetary values. One kuruş = 0.01 TRY. Integer arithmetic eliminates floating-point rounding.

11. **All timestamps in `TIMESTAMPTZ`.** No `TIMESTAMP WITHOUT TIME ZONE`.

12. **`ON DELETE RESTRICT` everywhere.** No cascading deletes anywhere in the schema. Orphan prevention is handled by restricting deletes, not by propagating them.

13. **Append-only tables.** `capacity_allocation_ledger`, `ledger_cabin_deltas`, `payment_attempts`, `cancellation_records`, `check_in_records` are protected by `BEFORE UPDATE OR DELETE` row-level triggers and `BEFORE TRUNCATE` statement-level triggers that raise an exception unconditionally.

14. **`user_id` is external.** `user_id` columns carry no foreign key. They reference an external authentication system (e.g. Supabase Auth). The database does not validate user existence.

15. **Capacity is never modified without a matching ledger row.** No function may update `voyage_capacity_counters` or `voyage_cabin_inventory` without first inserting a corresponding `capacity_allocation_ledger` row (and `ledger_cabin_deltas` rows where applicable) in the same transaction.

16. **Refund is never queued without a matching `cancellation_record`.** `refund_records.cancellation_record_id` is `NOT NULL` and foreign-keyed. A refund row cannot exist without the cancellation that authorised it.

17. **`VEHICLE` capacity is multiplied by quantity.** Each VEHICLE `hold_item` row stores per-unit dimensions (`lane_meters_claimed`, `m2_claimed`). The total capacity impact is `quantity × dimension`. Failing to multiply is a silent overbooking bug.

---

## 3. Architecture Summary

> **Status: APPROVED**

### Allocation engine concept

The allocation engine is entirely inside PostgreSQL. There is no application-layer capacity manager. Every hold, confirmation, cancellation, and release goes through a plpgsql function that atomically:

1. Locks the voyage's capacity gate row.
2. Validates all business rules.
3. Writes to the append-only ledger.
4. Updates mutable counter projections.

### Ledger as source of truth

`capacity_allocation_ledger` is the **permanent, append-only record** of every capacity event for every voyage. Each row records the signed delta for that event. To reconstruct current capacity for a voyage, replay all events in `ledger_seq ASC` order and sum the deltas.

`ledger_cabin_deltas` extends the ledger for per-cabin-type deltas. Each row belongs to a parent ledger event via `event_id`.

### Counters as derived concurrency layer

`voyage_capacity_counters` holds running totals (`reserved`, `confirmed`) per voyage for each capacity dimension. It exists for one reason: **to make capacity validation O(1)** — no aggregation of ledger history is required at booking time. The counters are updated atomically in the same transaction that writes to the ledger.

`voyage_cabin_inventory` holds per-voyage, per-cabin-type running counts (`reserved_count`, `confirmed_count`). It serves the same role for cabin capacity.

If the counters ever diverge from the ledger (detected by the reconciliation worker), the ledger is authoritative and the counters must be rebuilt from it.

---

## 4. Domain Model

> **Status: APPROVED**

### Aggregate Roots

| Aggregate | Key Invariant |
|-----------|--------------|
| `Voyage` | Owns all capacity state; base template is `Vessel` |
| `Hold` | One active hold per `(user_id, voyage_id)` at any time |
| `Booking` | One booking per hold; confirmed only after settled payment |
| `Payment` | One payment aggregate per hold; max two attempts |
| `RefundRecord` | One refund per `CancellationRecord`; transitions are one-way |

### Supporting Entities (child / non-root)

| Entity | Parent | Notes |
|--------|--------|-------|
| `HoldItem` | Hold | Immutable after insert; records what was reserved |
| `BookingPassenger` | Booking | Has `cancelled_at` for partial cancellation tracking |
| `BookingVehicle` | Booking | Has `cancelled_at`; stores per-unit dimensions |
| `BookingCabin` | Booking | Has `cancelled_at`; stores `count_allocated` |
| `PaymentAttempt` | Payment | Append-only; records each gateway call |
| `CancellationRecord` | Booking | Append-only; one row per cancellation action |
| `CheckInRecord` | Booking | Append-only; one row per check-in attempt |
| `LedgerCabinDelta` | AllocationLedgerEvent | Append-only; extends the ledger for cabin dimensions |

### Value Objects (schema-level)

- `ULID` — `CHAR(26)` Crockford base32; used as `event_id` on ledger rows. Generated by `fn_generate_ulid()`.
- `ledger_seq` — `BIGINT`; per-voyage monotonic counter, not a global sequence.
- `amount_kurus` — `BIGINT`; all monetary values.

### State Machines

#### Hold (`hold_status`)
```
ACTIVE ──► CONFIRMED   (fn_confirm_booking_from_settled_payment)
ACTIVE ──► EXPIRED     (fn_expire_hold — called by TTL sweeper)
ACTIVE ──► RELEASED    (fn_release_hold — user-initiated pre-payment)
```
Terminal states: `CONFIRMED`, `EXPIRED`, `RELEASED`

#### Booking (`booking_status`)
```
CONFIRMED ──► CHECKED_IN   (fn_record_check_in_attempt, outcome=APPROVED)
CONFIRMED ──► CANCELLED    (fn_cancel_booking)
CHECKED_IN ──► CANCELLED   (fn_cancel_booking)
```
Terminal state: `CANCELLED`

#### Payment (`payment_status`)
```
PENDING ──► SETTLED    (external webhook / gateway callback)
PENDING ──► FAILED     (external webhook / gateway callback)
PENDING ──► UNKNOWN    (TTL sweeper detects expired hold with in-flight payment)
FAILED  ──► PENDING    (fn_start_payment retry — max 2 total attempts)
```
Terminal states: `SETTLED`, `FAILED` (after retry exhausted), `UNKNOWN` (ops review)

#### Refund (`refund_status`)
```
QUEUED ──► SUBMITTED        (fn_process_refund_submission)
QUEUED ──► CONFIRMED        (fn_mark_refund_confirmed — gateway authoritative result)
QUEUED ──► FAILED           (fn_mark_refund_failed, p_manual_review=FALSE)
QUEUED ──► MANUAL_REVIEW    (fn_mark_refund_failed, p_manual_review=TRUE)
SUBMITTED ──► CONFIRMED     (fn_mark_refund_confirmed)
SUBMITTED ──► FAILED        (fn_mark_refund_failed)
SUBMITTED ──► MANUAL_REVIEW (fn_mark_refund_failed, p_manual_review=TRUE)
```
Terminal states: `CONFIRMED`, `FAILED`, `MANUAL_REVIEW`

#### Voyage (`voyage_status`)
```
DRAFT ──► OPEN ──► CLOSED ──► DEPARTED ──► CANCELLED
```
Holds and bookings are only accepted when status = `OPEN`.

---

## 5. Database Design

> **Status: APPROVED**

### Table responsibilities

| Table | Role |
|-------|------|
| `vessels` | Base capacity template; immutable after commissioning |
| `vessel_cabin_types` | Cabin type definitions per vessel |
| `voyages` | Per-sailing operational snapshot; inherits from vessel |
| `voyage_capacity_counters` | Mutable concurrency gate; one row per voyage |
| `voyage_cabin_inventory` | Mutable per-cabin concurrency gate; one row per (voyage, cabin_type) |
| `capacity_allocation_ledger` | Append-only authoritative capacity event log |
| `ledger_cabin_deltas` | Append-only cabin dimension extension of the ledger |
| `holds` | Temporary capacity reservations with TTL |
| `hold_items` | Immutable items within a hold |
| `bookings` | Confirmed reservations |
| `booking_passengers` | Passenger records per booking; individually cancellable (`cancelled_at`) |
| `booking_vehicles` | Vehicle records per booking; individually cancellable (`cancelled_at`) |
| `booking_cabins` | Cabin allocations per booking; individually cancellable (`cancelled_at`) |
| `payments` | One payment aggregate per hold |
| `payment_attempts` | Append-only gateway call log |
| `cancellation_records` | Append-only cancellation audit |
| `refund_records` | One refund per cancellation |
| `check_in_records` | Append-only check-in attempt audit |
| `ops_review_queue` | Manual intervention queue for ambiguous states |

### Source-of-truth vs derived

| Table | Classification |
|-------|---------------|
| `capacity_allocation_ledger` | **Source of truth** for all capacity |
| `ledger_cabin_deltas` | **Source of truth** for cabin capacity |
| `voyage_capacity_counters` | **Derived** — must match ledger replay |
| `voyage_cabin_inventory` | **Derived** — must match ledger replay |

### Critical constraints

- `UNIQUE(voyage_id, ledger_seq)` on `capacity_allocation_ledger` — enforces monotonic sequence
- `UNIQUE(idempotency_key)` on `capacity_allocation_ledger` — prevents duplicate events
- `UNIQUE(hold_id)` on `bookings` — one booking per hold
- `UNIQUE(hold_id)` on `payments` — one payment aggregate per hold
- `UNIQUE(cancellation_record_id)` on `refund_records` — one refund per cancellation
- `UNIQUE(payment_id, attempt_number)` on `payment_attempts` — ordered attempt log
- `PARTIAL UNIQUE INDEX ON holds(user_id, voyage_id) WHERE status = 'ACTIVE'` — one active hold per user per voyage
- `UNIQUE(vessel_id, label)` on `vessel_cabin_types` — no duplicate cabin labels per vessel
- `CHECK(reserved_count + confirmed_count <= total_count)` on `voyage_cabin_inventory` — cabin ceiling
- `CHECK(overbooking_delta >= 0)` on `voyages`
- Trigger `trg_voyage_capacity_counters_ceiling` — counter totals must not exceed `operational_X + overbooking_delta`
- Trigger `trg_bookings_allocation_immutable` — only `status`, `cancelled_at`, `checked_in_at` are mutable on `bookings`
- Trigger `trg_vessels_base_capacity_immutable` — vessel base capacity is immutable after insert
- Trigger `trg_cancellation_partial_target_exists` — validates polymorphic `partial_target_id` exists in the correct child table and belongs to the same booking
- Trigger `trg_voyage_create_counter` — auto-inserts `voyage_capacity_counters` row on voyage insert

---

## 6. Ledger Model

> **Status: APPROVED**

### Event types (`allocation_event_type`)

| Event | Direction | Triggered by |
|-------|-----------|-------------|
| `HOLD_CREATED` | + (increase reserved) | `fn_create_hold` |
| `HOLD_EXPIRED` | − (decrease reserved) | `fn_expire_hold`, `fn_reconcile_payment_unknown` (FAILED path) |
| `HOLD_RELEASED` | − (decrease reserved) | `fn_release_hold` |
| `BOOKING_CONFIRMED` | reserved→confirmed (no net change to total) | `fn_confirm_booking_from_settled_payment` |
| `BOOKING_CANCELLED` | − (decrease confirmed) | `fn_cancel_booking` |
| `PAYMENT_RECONCILED` | zero-delta audit marker | `fn_reconcile_counter_drift` |

### `ledger_seq` ordering

- `ledger_seq` is a **per-voyage** monotonic `BIGINT`.
- Generated inside the transaction as `last_ledger_seq + 1` read from the **already-locked** `voyage_capacity_counters` row.
- This is O(1) — no `MAX()` scan required.
- The `UNIQUE(voyage_id, ledger_seq)` constraint enforces uniqueness; a duplicate sequence number will raise a constraint violation.
- Replay order: always `ORDER BY ledger_seq ASC` within a voyage.

### Replay rules

1. Select all rows from `capacity_allocation_ledger WHERE voyage_id = $1 ORDER BY ledger_seq ASC`.
2. For each row, apply the signed deltas to running counters:
   - `HOLD_CREATED` → `reserved += delta_*`
   - `HOLD_EXPIRED` / `HOLD_RELEASED` → `reserved -= delta_*`
   - `BOOKING_CONFIRMED` → `reserved -= delta_*`, `confirmed += delta_*`
   - `BOOKING_CANCELLED` → `confirmed -= delta_*`
   - `PAYMENT_RECONCILED` → zero-delta; no counter change; advance `ledger_seq` only
3. For cabin dimensions, join `ledger_cabin_deltas` on `event_id` and apply the same sign convention using the parent event's type.

### Counter reconciliation logic

The counters in `voyage_capacity_counters` must satisfy at all times:

```
lane_meters_reserved  = SUM(delta_lane_meters WHERE event_type = 'HOLD_CREATED')
                       - SUM(delta_lane_meters WHERE event_type IN ('HOLD_EXPIRED','HOLD_RELEASED'))
                       (BOOKING_CONFIRMED moves reserved to confirmed, net zero on total)
lane_meters_confirmed = SUM(delta_lane_meters WHERE event_type = 'BOOKING_CONFIRMED')
                       - SUM(delta_lane_meters WHERE event_type = 'BOOKING_CANCELLED')
```

Identical logic applies to `m2_*` and `passengers_*`.

For `voyage_cabin_inventory`:

```
reserved_count  = SUM(lcd.delta_count WHERE cal.event_type = 'HOLD_CREATED')
                - SUM(lcd.delta_count WHERE cal.event_type IN ('HOLD_EXPIRED','HOLD_RELEASED'))
confirmed_count = SUM(lcd.delta_count WHERE cal.event_type = 'BOOKING_CONFIRMED')
                - SUM(lcd.delta_count WHERE cal.event_type = 'BOOKING_CANCELLED')
```

---

## 7. Core Transaction Flows

> **Status: APPROVED for Steps 9–11 functions. DRAFT for Steps 12–14 functions.**
> Do not treat Step 12 and Step 14 function descriptions below as post-audit specifications.

### Hold creation (`fn_create_hold`) — APPROVED

**Signature:**
```sql
fn_create_hold(
    p_voyage_id        UUID,
    p_user_id          UUID,
    p_session_id       TEXT,
    p_idempotency_key  TEXT,
    p_items            JSONB,
    p_ttl_seconds      INT DEFAULT 720
) RETURNS TABLE(o_hold_id UUID, o_expires_at TIMESTAMPTZ)
```

**Steps:**
1. Guard: `p_items` must be non-null and non-empty.
2. Idempotency: if `idempotency_key` already exists in `holds`, return existing row.
3. Lock `voyage_capacity_counters` FOR UPDATE NOWAIT.
4. Read voyage status and departure; reject if not OPEN or already departed.
5. Reject if user already has an ACTIVE hold on this voyage.
6. First pass over `p_items`:
   - `PASSENGER`: accumulate `v_req_pax += quantity`
   - `VEHICLE`: accumulate `v_req_lane += quantity × lane_meters`, `v_req_m2 += quantity × m2`
   - `CABIN`: check for duplicate `cabin_type_id` within the request; lock `voyage_cabin_inventory` FOR UPDATE NOWAIT; check existence (P0002) then availability (P0001) as two separate queries; accumulate `v_cabin_deltas`
7. Validate capacity in order: `lane_meters` → `m2` → `passengers` (cabin already validated per-item).
8. Insert `holds` row.
9. Second pass: insert `hold_items` rows.
10. Allocate `ledger_seq` via `fn_next_ledger_seq`.
11. Insert `capacity_allocation_ledger` row (`HOLD_CREATED`).
12. Insert `ledger_cabin_deltas` rows (if any CABIN items).
13. Update `voyage_cabin_inventory.reserved_count`.
14. Update `voyage_capacity_counters` (reserved counters + `last_ledger_seq`).

**`p_items` JSONB schema per item type:**
- PASSENGER: `{"item_type":"PASSENGER","quantity":N}`
- VEHICLE: `{"item_type":"VEHICLE","quantity":N,"lane_meters":X,"m2":Y,"vehicle_type":"..."}`
- CABIN: `{"item_type":"CABIN","quantity":N,"cabin_type_id":"UUID"}`

---

### Payment start (`fn_start_payment`) — APPROVED

**Signature:**
```sql
fn_start_payment(
    p_hold_id          UUID,
    p_amount_kurus     BIGINT,
    p_currency         CHAR(3),
    p_gateway          TEXT,
    p_idempotency_key  TEXT
) RETURNS TABLE(o_payment_id UUID, o_status payment_status, o_is_existing BOOLEAN)
```

**Steps:**
1. Idempotency: query `payments WHERE idempotency_key = $key AND hold_id = $hold_id`.
2. Lock `holds` FOR UPDATE NOWAIT.
3. Validate hold is ACTIVE and not expired.
4. Handle existing payment (non-FAILED: record attempt and return; FAILED: retry if count < 2).
5. No existing payment: insert `payments` + first `payment_attempts` row.

**Payment gateway flow (external):** Application directly UPDATEs `payments.status` on webhook receipt. Not wrapped in a function.

---

### Booking confirmation (`fn_confirm_booking_from_settled_payment`) — APPROVED

**Signature:**
```sql
fn_confirm_booking_from_settled_payment(
    p_payment_id  UUID,
    p_passengers  JSONB,
    p_vehicles    JSONB,
    p_cabins      JSONB
) RETURNS TABLE(o_booking_id UUID, o_confirmation_ledger_event_id CHAR(26))
```

Cabin allocations are derived from `hold_items`, not from `p_cabins`. Lock order: `voyage_capacity_counters` → `voyage_cabin_inventory` → `payments` → `holds`. Handles EXPIRED hold reconciliation via `HOLD_EXPIRED` ledger event detection.

---

### Hold expiry (`fn_expire_hold`) — APPROVED

Releases reserved capacity for holds past TTL. Blocks if associated payment is `PENDING` or `UNKNOWN` (routes to `ops_review_queue`). Lock order: `voyage_capacity_counters` → `holds`. Writes `HOLD_EXPIRED` ledger event.

---

### Hold release (`fn_release_hold`) — APPROVED

User-initiated pre-payment release. Lock order: `voyage_capacity_counters` → `holds`. Writes `HOLD_RELEASED` ledger event (distinct from `HOLD_EXPIRED`).

---

### Cancellation — full & partial (`fn_cancel_booking`) — DRAFT (not yet audited)

**Signature:**
```sql
fn_cancel_booking(
    p_booking_id           UUID,
    p_scope                cancellation_scope,
    p_initiated_by         TEXT,
    p_refund_amount_kurus  BIGINT,
    p_partial_target_type  partial_target_type DEFAULT NULL,
    p_partial_target_id    UUID                DEFAULT NULL
) RETURNS TABLE(o_cancellation_record_id UUID, o_refund_id UUID)
```

Lock order: `voyage_capacity_counters` → `voyage_cabin_inventory` → `payments` → `bookings`. Capacity deltas derived from stored child rows only. Writes `BOOKING_CANCELLED` ledger event and queues refund.

---

### Refund lifecycle — DRAFT (not yet audited)

- `fn_process_refund_submission` — `QUEUED → SUBMITTED`
- `fn_mark_refund_confirmed` — `SUBMITTED | QUEUED → CONFIRMED`
- `fn_mark_refund_failed` — `QUEUED | SUBMITTED → FAILED | MANUAL_REVIEW`

---

### Check-in (`fn_record_check_in_attempt`) — DRAFT (not yet audited)

Locks `bookings` only. Writes immutable `check_in_records` row per attempt. Transitions `CONFIRMED → CHECKED_IN` on first APPROVED outcome. Capacity never changes.

---

### Reconciliation functions — DRAFT (not yet audited)

- `fn_replay_ledger_and_compute_state` — pure read; CTE-based ledger replay; returns scalar counters + JSONB cabin maps
- `fn_assert_capacity_consistency` — raises exception on mismatch; no mutations
- `fn_detect_and_queue_counter_drift` — lightweight snapshot detection; inserts `ops_review_queue` if drift found
- `fn_reconcile_counter_drift` — locks counters + cabin inventory; corrects both; writes `PAYMENT_RECONCILED` marker
- `fn_reconcile_payment_unknown` — resolves UNKNOWN payments; routes SETTLED to ops; releases capacity for FAILED

---

## 8. Critical Invariants

> **Status: APPROVED**

### Capacity rules

1. At all times: `lane_meters_reserved + lane_meters_confirmed ≤ operational_lane_meters + overbooking_delta`. Same for m2 and passengers. Enforced by `trg_voyage_capacity_counters_ceiling`.
2. At all times: `reserved_count + confirmed_count ≤ total_count` for each `(voyage_id, cabin_type_id)`. Enforced by `CHECK` constraint.
3. No capacity column in counters may go negative. Enforced by `CHECK(column >= 0)`.
4. `total_count` in `voyage_cabin_inventory` is immutable while any non-CANCELLED booking exists for the voyage.
5. The vector (lane, m2, pax, cabin) stored in a ledger event must exactly match the delta applied to the counters in the same transaction.

### Payment rules

1. A booking can only be confirmed from a `SETTLED` payment.
2. A hold can have at most one payment aggregate (`UNIQUE(hold_id)` on `payments`).
3. A payment may have at most two gateway attempts. The second attempt is only allowed if the first `FAILED`.
4. A payment in `PENDING` or `UNKNOWN` state blocks hold expiry (capacity is not released).

### Cancellation/refund rules

1. Cancellation is only permitted before `departure_utc`. Post-departure cancellation must go through ops.
2. A booking in `CANCELLED` state cannot be re-cancelled.
3. A partially cancelled child row (`cancelled_at IS NOT NULL`) cannot be partially cancelled again; attempt raises `P0001`.
4. Every `cancellation_records` row must have exactly one `refund_records` row (`UNIQUE(cancellation_record_id)`).
5. Capacity released by cancellation is computed from stored booking child rows only. The caller must not supply capacity values.
6. The refund amount is caller-supplied (`p_refund_amount_kurus`). The database stores and validates it but does not compute it.

### Data integrity rules

1. Every `capacity_allocation_ledger` row must have a valid `UNIQUE(voyage_id, ledger_seq)`.
2. `ledger_cabin_deltas.cabin_type_id` must belong to the vessel of the parent event's voyage. Enforced by `trg_ledger_cabin_deltas_vessel_check`.
3. `cancellation_records.partial_target_id` must exist in the correct child table and belong to the same booking. Enforced by `trg_cancellation_partial_target_exists`.
4. `bookings.voyage_id`, `hold_id`, `user_id`, `confirmation_ledger_event_id`, `confirmed_at`, `created_at` are immutable after insert. Enforced by `trg_bookings_allocation_immutable`.
5. Vessel base capacity fields (`base_lane_meters`, `base_m2`, `base_passenger_capacity`) are immutable after insert. Enforced by `trg_vessels_base_capacity_immutable`.

---

## 9. Concurrency & Locking Strategy

> **Status: APPROVED**

### Lock order (absolute; must never be violated)

```
voyage_capacity_counters   (row lock, FOR UPDATE NOWAIT)
  │
  └─► voyage_cabin_inventory  (row lock(s), FOR UPDATE NOWAIT)
        │
        └─► payments            (row lock, FOR UPDATE NOWAIT)
              │
              └─► holds / bookings  (row lock, FOR UPDATE NOWAIT)
```

Functions that do not touch capacity (refund state transitions, check-in) lock only their own aggregate row and do not acquire a capacity lock.

### NOWAIT usage

Every `SELECT FOR UPDATE` in every function uses `NOWAIT`. If a lock cannot be acquired immediately, the transaction aborts with `ERROR 55P03`. The caller is responsible for retry logic.

### No-queue policy

There are no application queues, Redis locks, advisory locks, or serialisable transaction isolation modes used for capacity serialisation. The `voyage_capacity_counters` row lock is the sole serialisation mechanism.

### Per-voyage isolation

Because `voyage_capacity_counters` has one row per voyage, two concurrent transactions for **different voyages** never contend with each other.

---

## 10. Failure Handling

> **Status: APPROVED for documented scenarios. DRAFT for reconciliation function behaviour.**

### Payment UNKNOWN / in-flight at hold expiry

`fn_expire_hold` detects a `PENDING`/`UNKNOWN` payment, inserts `ops_review_queue (PAYMENT_UNKNOWN)`, and returns **without releasing capacity**. The hold is NOT marked `EXPIRED`.

### Settled payment after hold expiry

- Sub-case A (`HOLD_EXPIRED` event exists): `fn_confirm_booking_from_settled_payment` routes to `ops_review_queue`. Booking NOT confirmed automatically.
- Sub-case B (no `HOLD_EXPIRED` event): capacity still reserved; confirmation proceeds normally.

### Counter drift

Detection via `fn_detect_and_queue_counter_drift` (snapshot, no lock). Correction via `fn_reconcile_counter_drift` (locked, atomic). Ledger is authoritative; counters are rebuilt from it, never the reverse.

### Reconciliation triggers

| Condition | `issue_type` |
|-----------|-------------|
| Hold expired with `PENDING`/`UNKNOWN` payment | `PAYMENT_UNKNOWN` |
| Payment settled after hold expired (capacity restored) | `PAYMENT_UNKNOWN` |
| Counter values diverge from ledger replay | `COUNTER_DRIFT` |
| Refund moved to `MANUAL_REVIEW` | `REFUND_MISMATCH` |
| Orphan booking detected (no payment) | `ORPHAN_BOOKING` |
| Late webhook received for already-resolved payment | `LATE_WEBHOOK` |
| Capacity leak detected (reserved without active hold) | `HOLD_CAPACITY_LEAK` |
| Ledger replay produces negative counter value | `RECONCILIATION_FAILURE` |

---

## 11. What Must NEVER Be Done

> **Status: APPROVED**

1. **Never use `SELECT FOR UPDATE` without `NOWAIT`.**
2. **Never acquire locks in a different order than: counters → cabin_inventory → payments → holds/bookings.**
3. **Never update `voyage_capacity_counters` or `voyage_cabin_inventory` without first inserting a matching ledger row in the same transaction.**
4. **Never use `MAX(ledger_seq)` to generate the next sequence number.**
5. **Never trust `p_cabins` in `fn_confirm_booking_from_settled_payment` as the source of cabin capacity.** Derive from `hold_items`.
6. **Never compute VEHICLE capacity without multiplying by `quantity`.**
7. **Never release capacity for an expired hold when a payment is in `PENDING` or `UNKNOWN` state.**
8. **Never confirm a booking when the hold is `EXPIRED` and a `HOLD_EXPIRED` ledger event exists.**
9. **Never DELETE or UPDATE rows in append-only tables.**
10. **Never compute refund amounts inside the database.**
11. **Never allow two active holds for the same `(user_id, voyage_id)`.**
12. **Never allow a partial cancellation of an already-cancelled child row.**
13. **Never bypass the capacity ceiling trigger with direct INSERT/UPDATE on counter tables.**
14. **Never add `CASCADE` to any foreign key.**
15. **Never scope a payment idempotency check to `idempotency_key` alone.** Must also filter by `hold_id`.

---

## 12. Migration File Index

> APPROVED files are marked. DRAFT files must not be deployed without passing audit.

| File | Status | Contents |
|------|--------|----------|
| `migrations/001_initial_schema.sql` | ✅ APPROVED | All enum types, 19 tables, PKs, FKs, UNIQUE constraints, CHECK constraints, 17+ indexes, 11 trigger functions, 13+ triggers, 10 schema audit fixes |
| `migrations/002_core_functions.sql` | ✅ APPROVED | `fn_generate_ulid`, `fn_next_ledger_seq`, `fn_create_hold`, `fn_expire_hold`, `fn_start_payment`, `fn_confirm_booking_from_settled_payment`, `fn_release_hold`; `ALTER TYPE allocation_event_type ADD VALUE 'HOLD_RELEASED'` |
| `migrations/003_cancellation_checkin_functions.sql` | ⚠️ DRAFT | Schema patches (`cancelled_at` + indexes on booking child tables); `fn_cancel_booking`, `fn_process_refund_submission`, `fn_mark_refund_confirmed`, `fn_mark_refund_failed`, `fn_record_check_in_attempt` |
| `migrations/004_reconciliation_functions.sql` | ⚠️ DRAFT | `fn_replay_ledger_and_compute_state`, `fn_assert_capacity_consistency`, `fn_detect_and_queue_counter_drift`, `fn_reconcile_counter_drift`, `fn_reconcile_payment_unknown` |

---

## 13. Enum Reference

> **Status: APPROVED**

```sql
voyage_status:         DRAFT, OPEN, CLOSED, DEPARTED, CANCELLED
hold_status:           ACTIVE, CONFIRMED, EXPIRED, RELEASED
booking_status:        CONFIRMED, CHECKED_IN, CANCELLED
payment_status:        PENDING, SETTLED, FAILED, UNKNOWN
refund_status:         QUEUED, SUBMITTED, CONFIRMED, FAILED, MANUAL_REVIEW
check_in_outcome:      APPROVED, DENIED
allocation_event_type: HOLD_CREATED, HOLD_EXPIRED, HOLD_RELEASED,
                       BOOKING_CONFIRMED, BOOKING_CANCELLED, PAYMENT_RECONCILED
cancellation_scope:    FULL, PARTIAL
partial_target_type:   PASSENGER, VEHICLE, CABIN
hold_item_type:        PASSENGER, VEHICLE, CABIN
ops_issue_type:        COUNTER_DRIFT, PAYMENT_UNKNOWN, LATE_WEBHOOK, REFUND_MISMATCH,
                       ORPHAN_BOOKING, HOLD_CAPACITY_LEAK, RECONCILIATION_FAILURE
ops_review_status:     OPEN, RESOLVED, ESCALATED
```

---

## 14. Remaining Work

| Layer | Status |
|-------|--------|
| System principles (Steps 1–3) | ✅ APPROVED |
| Domain model (Step 4) | ✅ APPROVED |
| Database design (Step 5) | ✅ APPROVED |
| DDL migration + audit + fixes (Steps 6–8) | ✅ APPROVED |
| Core functions + audit + fixes (Steps 9–11) | ✅ APPROVED |
| Cancellation / refund / check-in functions (Step 12) | ✅ APPROVED |
| Reconciliation functions (Step 14) | ✅ APPROVED |
| Voyage management + sweep + ops resolve (Step 17) | ✅ APPROVED — production-ready (`migrations/005_voyage_management_functions.sql`) |
| Reporting / manifest functions (Step 19) | ✅ APPROVED — production-ready (`migrations/006_reporting_functions.sql`) |

| Application layer plan (Step 20) | ⚠️ DRAFT — `docs/APPLICATION_LAYER_PLAN.md` |
| Phase 0 scaffold plan (Step 21) | ⚠️ DRAFT — `docs/PHASE_0_SCAFFOLD.md` |
| Phase 0 task breakdown (Step 22) | ⚠️ DRAFT — `docs/PHASE_0_TASKS.md` |
| API / RLS / UI implementation | ❌ Not yet started — Phase 0–6 defined in plan |
