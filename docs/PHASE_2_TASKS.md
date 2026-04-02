# Phase 2 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group W0 — Shared Worker Infrastructure

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W0 | Cron auth helper | `src/lib/api/cron.ts` | — | Exports `verifyCronSecret(request: Request): boolean`. Reads `Authorization` header, compares to `Bearer ${process.env.CRON_SECRET}`. Returns `false` if missing, empty, or mismatch. | `[CP][B]` |
| W1 | Worker response helper | `src/lib/api/worker.ts` | S0 (exists) | Exports `workerOk(worker: string, result: Record<string, unknown>, startTime: number)` → `jsonOk({ worker, status: "ok", result, durationMs })`. Exports `workerError(worker: string, error: string, startTime: number)` → `jsonOk({ worker, status: "error", error, durationMs })`. Both always return HTTP 200. | `[CP][B]` |
| W2 | Safe per-item executor | `src/lib/api/batch.ts` | — | Exports `forEachSafe<T>(items: T[], fn: (item: T) => Promise<void>): Promise<{ succeeded: number; failed: number }>`. Try/catch per item. `console.error` on failure. Never throws. Returns aggregate counts. | `[B]` |

---

## Group W3 — Sweep Worker

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W3 | Sweep holds worker | `src/app/api/cron/sweep-holds/route.ts` (update) | W0, W1 | Replace stub. POST handler: `verifyCronSecret` → 401 if false. Record `startTime`. Call `createAdminSupabase()`. Call `sweepExpiredHolds(supabase, 20)`. On success: `workerOk("sweep-holds", { scanned_count, expired_count, skipped_locked_count, skipped_payment_ambiguous_count, error_count }, startTime)`. On catch: `console.error`, `workerError("sweep-holds", error.message, startTime)`. | `[CP]` |

---

## Group W4 — Reconcile Worker

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W4 | Reconciliation poller | `src/app/api/cron/reconcile/route.ts` (update) | W0, W1, W2 | Replace stub. POST handler: `verifyCronSecret` → 401. Record `startTime`. `createAdminSupabase()`. **Step 1:** Query `voyages` where `status IN ('OPEN','CLOSED')` order by `departure_utc ASC` limit 10. **Step 2:** `forEachSafe(voyages, v => detectAndQueueCounterDrift(supabase, v.voyage_id))`. Count drift_detected from successful calls returning `true`. **Step 3:** Query `payments` where `status = 'UNKNOWN'` and `created_at < now() - 15 min` limit 10. **Step 4:** For each payment: try `getGateway().pollPaymentStatus(gateway_reference_id)`. If SETTLED or FAILED: `reconcilePaymentUnknown(supabase, { paymentId, authoritativeOutcome, amountCapturedKurus: null })`. If PENDING: skip. Catch: count as `payment_errors`. Return `workerOk("reconcile", { voyages_checked, drift_detected, payments_checked, payments_resolved, payment_errors }, startTime)`. | `[P]` |

---

## Group W5 — Refund Worker

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W5 | Refund retry worker | `src/app/api/cron/refund-retry/route.ts` (update) | W0, W1, W2 | Replace stub. POST handler: `verifyCronSecret` → 401. Record `startTime`. `createAdminSupabase()`. **Step 1:** Query `refund_records` where `status = 'QUEUED'` order by `queued_at ASC` limit 10. Join `payments` to get `gateway_reference_id` and `amount_kurus`. **Step 2:** For each QUEUED refund: try `getGateway().submitRefund(gatewayRef, amountKurus)`. On gateway success (returns ref): `processRefundSubmission(supabase, refundId, gatewayRef)`, count `queued_submitted`. On gateway throw: `markRefundFailed(supabase, refundId, false)`, count `queued_failed`. **Step 3:** Query `refund_records` where `status = 'SUBMITTED'` and `queued_at < now() - 1 hour` limit 10. **Step 4:** For each stale SUBMITTED: try poll gateway. On CONFIRMED: `markRefundConfirmed(supabase, refundId)`, count `stale_resolved`. On FAILED: `markRefundFailed(supabase, refundId, true)`, count `stale_manual_review`. Catch: count `errors`. Return `workerOk("refund-retry", { queued_processed, queued_submitted, queued_failed, stale_checked, stale_resolved, stale_manual_review, errors }, startTime)`. | `[P]` |

---

## Group W6 — Health Worker

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| W6 | Health/integrity worker | `src/app/api/cron/health/route.ts` (update) | W0, W1, W2 | Replace stub. POST handler: `verifyCronSecret` → 401. Record `startTime`. `createAdminSupabase()`. **Check 1:** Query `voyages` where `status IN ('OPEN','CLOSED')` limit 10. For each: try `assertCapacityConsistency(supabase, voyageId)`. Catch P0001 → count `drift_count`. **Check 2:** `SELECT count(*) FROM ops_review_queue WHERE status = 'OPEN'` → `open_ops_count`. **Check 3:** `SELECT count(*) FROM holds WHERE status = 'ACTIVE' AND expires_at < now() - interval '30 minutes'` → `stale_holds_count`. **Check 4:** `SELECT count(*) FROM payments WHERE status = 'UNKNOWN' AND created_at < now() - interval '1 hour'` → `stale_unknown_payments_count`. Build `alerts` string array: add entry if `drift_count > 0`, if `open_ops_count > 10`, if `stale_holds_count > 0`, if `stale_unknown_payments_count > 5`. Return `workerOk("health", { voyages_checked, drift_count, open_ops_count, stale_holds_count, stale_unknown_payments_count, alerts }, startTime)`. | `[P]` |

---

## Group V — Verification

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| V1 | Build check | — | All above | `npm run build` succeeds with 0 errors. All 4 cron routes compile. No `"Not implemented"` string in any cron route file. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Shared Infrastructure (W0 parallel with W1, W2)
```
W0, W1, W2  (all parallel — no inter-dependencies)
```
**3 new files.**

### Wave 2 — All Workers (all parallel)
```
W3, W4, W5, W6  (all parallel — each depends only on infrastructure)
```
**4 files updated.**

### Wave 3 — Verify
```
V1
```

### Parallelism Map

| Wave | Tasks | Count |
|------|-------|-------|
| 1 | W0, W1, W2 | 3 (all parallel) |
| 2 | W3, W4, W5, W6 | 4 (all parallel) |
| 3 | V1 | 1 |

**Total tasks: 8**
**Total files: 3 new + 4 updated = 7 file operations**
**Critical path: W0 → W3 → V1 = 3 tasks**
