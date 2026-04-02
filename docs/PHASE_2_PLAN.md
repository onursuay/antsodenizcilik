# Phase 2 — Worker Implementation Plan

---

## 1. Worker Routes to Implement

### 1.1 POST /api/cron/sweep-holds

| Field | Value |
|-------|-------|
| Trigger | Vercel Cron, every 1 minute |
| Auth | `CRON_SECRET` bearer token |
| DB calls | `sweepExpiredHolds(adminSupabase, 20)` |
| Batch policy | Single call to `fn_sweep_expired_holds(p_batch_limit := 20)`. Function handles per-hold savepoint isolation internally. No application-layer batching needed. |
| Retry policy | None. Vercel Cron fires again in 1 minute. Each invocation is independent. |
| Error handling | If `sweepExpiredHolds` throws: log error, return 200 with `status: "error"` (never block next cron). If succeeds: return sweep counters. |
| Response | `{ worker: "sweep-holds", status: "ok", result: { scanned_count, expired_count, skipped_locked_count, skipped_payment_ambiguous_count, error_count }, durationMs }` |

### 1.2 POST /api/cron/reconcile

| Field | Value |
|-------|-------|
| Trigger | Vercel Cron, every 5 minutes |
| Auth | `CRON_SECRET` bearer token |
| DB calls | Step 1: query `voyages WHERE status IN ('OPEN','CLOSED') ORDER BY departure_utc ASC LIMIT 10`. Step 2: for each voyage, `detectAndQueueCounterDrift(adminSupabase, voyageId)`. Step 3: query `payments WHERE status = 'UNKNOWN' AND created_at < now() - interval '15 minutes' LIMIT 10`. Step 4: for each payment, `gateway.pollPaymentStatus(gatewayReferenceId)` then `reconcilePaymentUnknown(adminSupabase, { paymentId, authoritativeOutcome, amountCapturedKurus })`. |
| Batch policy | 10 voyages + 10 payments per run. Per-item try/catch — failures don't block other items. |
| Retry policy | None. Next cron fires in 5 minutes. Failed items remain in the query set. |
| Error handling | Per-voyage and per-payment try/catch. Errors logged + counted. Gateway poll failure: skip item, counted in `payment_errors`. |
| Response | `{ worker: "reconcile", status: "ok", result: { voyages_checked, drift_detected, payments_checked, payments_resolved, payment_errors }, durationMs }` |

### 1.3 POST /api/cron/refund-retry

| Field | Value |
|-------|-------|
| Trigger | Vercel Cron, every 2 minutes |
| Auth | `CRON_SECRET` bearer token |
| DB calls | Step 1: query `refund_records WHERE status = 'QUEUED' ORDER BY queued_at ASC LIMIT 10`. Step 2: for each, call `gateway.submitRefund(gatewayReferenceId, amountKurus)`. On gateway success: `processRefundSubmission(adminSupabase, refundId, gatewayRef)`. On gateway failure: `markRefundFailed(adminSupabase, refundId, false)`. Step 3: query `refund_records WHERE status = 'SUBMITTED' AND queued_at < now() - interval '1 hour' LIMIT 10`. Step 4: for each stale submission, poll gateway. On CONFIRMED: `markRefundConfirmed(adminSupabase, refundId)`. On FAILED: `markRefundFailed(adminSupabase, refundId, true)` (manual review for stale). |
| Batch policy | 10 QUEUED + 10 stale SUBMITTED per run. Per-item try/catch. |
| Retry policy | None at worker level. QUEUED items remain in query until processed or failed. Stale SUBMITTED items go to MANUAL_REVIEW after 1 hour. |
| Error handling | Per-refund try/catch. Gateway errors: log + count, skip to next. DB errors: log + count, skip to next. |
| Response | `{ worker: "refund-retry", status: "ok", result: { queued_processed, queued_submitted, queued_failed, stale_checked, stale_resolved, stale_manual_review, errors }, durationMs }` |

### 1.4 POST /api/cron/health

| Field | Value |
|-------|-------|
| Trigger | Vercel Cron, every 15 minutes |
| Auth | `CRON_SECRET` bearer token |
| DB calls | Check 1: for active voyages (OPEN/CLOSED), `assertCapacityConsistency(adminSupabase, voyageId)` — catch P0001, count drift. Check 2: `SELECT COUNT(*) FROM ops_review_queue WHERE status = 'OPEN'`. Check 3: `SELECT COUNT(*) FROM holds WHERE status = 'ACTIVE' AND expires_at < now() - interval '30 minutes'`. Check 4: `SELECT COUNT(*) FROM payments WHERE status = 'UNKNOWN' AND created_at < now() - interval '1 hour'`. |
| Batch policy | Up to 10 voyages for consistency check. Single count queries for checks 2–4. |
| Retry policy | None. Advisory only — no mutations. |
| Error handling | Per-voyage try/catch for consistency checks. Count failures as drift. Other queries: catch + log. |
| Response | `{ worker: "health", status: "ok", result: { voyages_checked, drift_count, open_ops_count, stale_holds_count, stale_unknown_payments_count, alerts: string[] }, durationMs }` |

---

## 2. Shared Worker Infrastructure

### 2.1 Cron Auth Helper — `src/lib/api/cron.ts`

```
verifyCronSecret(request: Request): boolean
  → reads Authorization header, compares to Bearer ${CRON_SECRET}
  → returns false if missing or mismatch
```

Replaces inline auth check in all 4 cron routes.

### 2.2 Worker Response Helper — `src/lib/api/worker.ts`

```
workerOk(worker: string, result: Record<string, unknown>, startTime: number)
  → returns jsonOk({ worker, status: "ok", result, durationMs: Date.now() - startTime })

workerError(worker: string, error: string, startTime: number)
  → returns jsonOk({ worker, status: "error", error, durationMs: Date.now() - startTime })
  → NOTE: returns 200, not 500. Cron must never get 5xx or it may halt retries.
```

### 2.3 Safe Per-Item Executor — `src/lib/api/batch.ts`

```
forEachSafe<T>(items: T[], fn: (item: T) => Promise<void>): Promise<{ succeeded: number, failed: number }>
  → try/catch per item, console.error on failure, count successes/failures
  → never throws — always returns counts
```

Used by reconcile and refund-retry workers for per-voyage/per-payment/per-refund loops.

---

## 3. Implementation Order

### Wave 1 — Shared Infrastructure (blocker)

| ID | Task | File | Depends |
|----|------|------|---------|
| W0 | Cron auth helper | `src/lib/api/cron.ts` | — |
| W1 | Worker response helper | `src/lib/api/worker.ts` | S0 (response.ts, exists) |
| W2 | Safe per-item executor | `src/lib/api/batch.ts` | — |

Tag: `[BLOCKER]`

### Wave 2 — All Workers (parallel)

| ID | Task | File | Depends |
|----|------|------|---------|
| W3 | Sweep holds worker | `src/app/api/cron/sweep-holds/route.ts` | W0, W1 |
| W4 | Reconciliation poller | `src/app/api/cron/reconcile/route.ts` | W0, W1, W2 |
| W5 | Refund retry worker | `src/app/api/cron/refund-retry/route.ts` | W0, W1, W2 |
| W6 | Health/integrity worker | `src/app/api/cron/health/route.ts` | W0, W1, W2 |

Tag: `[PARALLEL]` — all 4 are independent

### Wave 3 — Verify

| ID | Task | File | Depends |
|----|------|------|---------|
| W7 | Build check | — | All above |

### Dependency Graph

```
W0, W1, W2  (parallel infrastructure)
    │
    └──► W3, W4, W5, W6  (parallel workers)
              │
              └──► W7  (verify)
```

**Total tasks: 8**
**Total files: 3 new + 4 updated = 7 file operations**
**Critical path: W0 → W3 → W7 = 3 tasks**

---

## 4. Definition of Done — Phase 2

### Worker Checks

| # | Check |
|---|-------|
| 1 | All 4 cron routes return 401 without `CRON_SECRET` |
| 2 | All 4 cron routes return 200 with valid `CRON_SECRET` |
| 3 | All 4 cron routes return `{ worker, status, result, durationMs }` shape |
| 4 | No cron route ever returns 5xx — errors return 200 with `status: "error"` |
| 5 | `sweep-holds` calls `sweepExpiredHolds` with batch limit 20 |
| 6 | `reconcile` queries active voyages + UNKNOWN payments, processes per-item |
| 7 | `refund-retry` processes QUEUED refunds + stale SUBMITTED refunds |
| 8 | `health` runs capacity consistency on active voyages + 3 count queries |

### DB Integration Checks

| # | Check |
|---|-------|
| 9 | Sweep worker: expired holds get processed (scanned_count > 0 when expired holds exist) |
| 10 | Reconcile worker: counter drift detected and queued to ops_review_queue |
| 11 | Reconcile worker: UNKNOWN payments polled via gateway and resolved |
| 12 | Refund worker: QUEUED refunds submitted to gateway |
| 13 | Refund worker: stale SUBMITTED refunds escalated to MANUAL_REVIEW |
| 14 | Health worker: capacity inconsistency counted as drift |

### Failure Path Checks

| # | Check |
|---|-------|
| 15 | Sweep: DB error → logged, 200 returned with `status: "error"` |
| 16 | Reconcile: single voyage failure → other voyages still processed |
| 17 | Reconcile: gateway poll failure → payment skipped, counted in errors |
| 18 | Refund: gateway submit failure → refund skipped, counted in errors |
| 19 | Refund: DB error on markRefundFailed → logged, other refunds still processed |
| 20 | Health: single voyage consistency check failure → counted, others still checked |
| 21 | All workers: missing `CRON_SECRET` env var → 401 on every request |
