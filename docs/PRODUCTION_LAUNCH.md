# Production Launch Preparation

---

## 1. Final Missing Technical Gaps

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| 1 | **Payment gateway is fully stubbed** — `getGateway()` throws on all methods, `verifyPaymentWebhook`/`verifyRefundWebhook` return `false` | BLOCKER | Stub only |
| 2 | **Payment page sends `amountKurus: 0`** — pricing logic not implemented anywhere | BLOCKER | Hardcoded zero |
| 3 | **No logout route** — `PublicHeader` links to `/auth/logout` which doesn't exist | BLOCKER | Missing file |
| 4 | **Payment webhook auto-confirm sends empty passenger/vehicle/cabin arrays** — `confirmBooking` called with `[]` passengers from webhook, but `fn_confirm_booking_from_settled_payment` may require passenger data | HIGH | May fail at DB level |
| 5 | **Hold detail not available on payment page** — payment page estimates TTL as 12min from page load instead of reading actual `expires_at` from hold | MEDIUM | Inaccurate timer |
| 6 | **Reconciliation page can't list UNKNOWN payments per voyage** — loads empty array, no API endpoint for voyage-scoped UNKNOWN payment query | MEDIUM | Missing query |
| 7 | **No CSRF protection on mutation routes** — Next.js App Router doesn't provide CSRF tokens by default | LOW | Standard for SPA+API |
| 8 | **No rate limiting on hold creation** — Phase 6 item, not implemented | LOW | Can add via Vercel WAF |

---

## 2. Payment Gateway Production Integration Plan

### Files to update:

| File | Current State | Production State |
|------|--------------|------------------|
| `src/lib/gateway/client.ts` | Returns stub that throws on all methods | Switch on `PAYMENT_GATEWAY` env var → return real gateway adapter |
| `src/lib/gateway/webhook.ts` | Returns `false` (or `true` if SKIP env set) | Real HMAC-SHA256 signature verification using gateway secret |
| `src/lib/gateway/types.ts` | Interface only | No change needed |
| `src/app/api/webhooks/payment/route.ts` | Parses `gatewayReferenceId` + `status` from generic JSON | Parse gateway-specific payload format |
| `src/app/api/webhooks/refund/route.ts` | Parses `gatewayRefundReference` + `status` from generic JSON | Parse gateway-specific refund payload |

### New file needed:

| File | Purpose |
|------|---------|
| `src/lib/gateway/iyzico.ts` (or `paytr.ts` / `stripe.ts`) | Implements `PaymentGateway` interface for chosen gateway |

### What each file must do in production:

**`src/lib/gateway/client.ts`:**
```
switch (PAYMENT_GATEWAY) {
  case "iyzico": return createIyzicoGateway();
  case "paytr": return createPayTRGateway();
  default: return createStubGateway();
}
```

**`src/lib/gateway/webhook.ts`:**
- `verifyPaymentWebhook`: compute HMAC-SHA256 of body using `PAYMENT_WEBHOOK_SECRET`, compare to signature header
- `verifyRefundWebhook`: same with `REFUND_WEBHOOK_SECRET`

**Payment webhook route:**
- Parse gateway-specific JSON format (e.g., iyzico `callbackData` or PayTR `merchant_oid`)
- Map gateway status codes to `SETTLED`/`FAILED`
- Extract `gateway_reference_id` from gateway payload

**Refund webhook route:**
- Parse gateway-specific refund notification
- Map to `CONFIRMED`/`FAILED`
- Extract `gateway_refund_reference`

---

## 3. Production Deployment Checklist

### Supabase Migration Apply Order

```
1. migrations/001_initial_schema.sql
2. migrations/002_core_functions.sql
3. migrations/003_cancellation_checkin_functions.sql
4. migrations/004_reconciliation_functions.sql
5. migrations/005_voyage_management_functions.sql
6. migrations/006_reporting_functions.sql
7. migrations/007_rls_policies.sql
```

Verify after each: `SELECT fn_generate_ulid()` after 002. `SELECT * FROM fn_ops_queue_summary()` after 006. `SELECT rowsecurity FROM pg_tables WHERE tablename='voyages'` after 007.

### Vercel Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase dashboard |
| `CRON_SECRET` | Yes | Self-generated 32-char hex |
| `NEXT_PUBLIC_APP_URL` | Yes | Vercel production URL |
| `PAYMENT_GATEWAY` | Yes | `iyzico` / `paytr` / `stripe` |
| `PAYMENT_GATEWAY_API_KEY` | Yes | Gateway dashboard |
| `PAYMENT_GATEWAY_SECRET_KEY` | Yes | Gateway dashboard |
| `PAYMENT_WEBHOOK_SECRET` | Yes | Gateway dashboard |
| `REFUND_WEBHOOK_SECRET` | Yes | Gateway dashboard |
| `WEBHOOK_SKIP_VERIFICATION` | No | Must be unset or `false` in production |

### Cron Verification

- [ ] Vercel dashboard shows 4 cron jobs
- [ ] Each cron returns 401 without `CRON_SECRET`
- [ ] Each cron returns 200 with valid `CRON_SECRET`
- [ ] `sweep-holds` runs every 1 minute
- [ ] `reconcile` runs every 5 minutes
- [ ] `refund-retry` runs every 2 minutes
- [ ] `health` runs every 15 minutes

### RLS Verification

- [ ] Anon client can SELECT open voyages
- [ ] Anon client CANNOT select from holds, bookings, payments
- [ ] Authenticated user sees only own bookings/holds
- [ ] Service role bypasses all RLS

### Auth/Role Verification

- [ ] Admin user has `raw_app_meta_data.role = "admin"`
- [ ] Operator user has `raw_app_meta_data.role = "operator"`
- [ ] `/admin` redirects non-admin to login
- [ ] `/checkin` redirects non-operator to login
- [ ] `/api/admin/*` returns 403 for non-admin
- [ ] `/api/ops/*` accepts admin + ops roles
- [ ] `/api/checkin/*` accepts operator + admin roles

### Build Verification

- [ ] `npm run build` succeeds with 0 errors
- [ ] `vercel --prod` deploys successfully
- [ ] Production URL loads root page

---

## 4. Smoke Test Checklist

### Public Booking Flow

- [ ] Visit `/` — open voyages load with capacity
- [ ] Apply origin/destination/date filters — results update
- [ ] Click voyage → `/voyages/[id]` shows capacity + cabin inventory
- [ ] Click "Rezervasyon Yap" → redirects to login (if not authenticated)
- [ ] After login → `/voyages/[id]/book` shows item builder
- [ ] Add passengers + vehicles + cabins → submit
- [ ] Hold created → redirect to `/holds/[id]/pay`
- [ ] Countdown timer visible and decrementing
- [ ] Click "Odeme Yap" → payment initiated (gateway redirect or "not configured")

### Hold & Payment

- [ ] Hold appears in `voyage_capacity_counters` (reserved increased)
- [ ] Payment record exists in `payments` table
- [ ] Idempotent hold creation (same key) returns same hold
- [ ] Hold release (`DELETE /api/holds/[id]`) restores capacity

### Booking Confirmation

- [ ] After payment settles → booking created
- [ ] `/bookings/[id]/confirmation` shows QR code + summary
- [ ] Booking visible in `/account/bookings`

### Cancellation & Refund

- [ ] Full cancel → booking status CANCELLED, refund record created
- [ ] Partial cancel (single passenger) → passenger `cancelled_at` set, refund queued
- [ ] Refund status visible on booking detail page

### Admin Flows

- [ ] Admin login → `/admin` dashboard shows active voyages + ops count
- [ ] Create vessel with cabin types
- [ ] Create DRAFT voyage → open → close → depart lifecycle
- [ ] Manifest page shows passenger + vehicle lists
- [ ] Revenue page shows all 10 fields
- [ ] Ops queue shows summary cards
- [ ] Resolve ops entry with action text

### Check-in Flow

- [ ] Operator login → `/checkin` dashboard
- [ ] Enter booking ID → lookup succeeds → approve/deny page
- [ ] Check "Belgeler Dogrulandi" → click "Onayla" → green result card
- [ ] Booking status changes to CHECKED_IN
- [ ] Deny with reason → red result card, booking stays CONFIRMED
- [ ] History page shows recent attempts with outcome filter

### Worker Flows

- [ ] `POST /api/cron/sweep-holds` with secret → returns sweep counters
- [ ] `POST /api/cron/reconcile` with secret → returns reconciliation results
- [ ] `POST /api/cron/refund-retry` with secret → returns refund processing results
- [ ] `POST /api/cron/health` with secret → returns health checks + alerts

---

## 5. Go-Live Blocker List

### MUST FIX BEFORE GO-LIVE

| # | Blocker | Fix |
|---|---------|-----|
| 1 | Payment gateway stub | Implement one real gateway adapter (iyzico/paytr/stripe) in `src/lib/gateway/` |
| 2 | Webhook signature verification stub | Replace `return false` with real HMAC verification in `webhook.ts` |
| 3 | Payment page `amountKurus: 0` | Add pricing logic — either pass amount from voyage/hold context or compute from hold_items |
| 4 | Missing logout route | Create `src/app/auth/logout/route.ts` — call `supabase.auth.signOut()`, redirect to `/` |
| 5 | `WEBHOOK_SKIP_VERIFICATION` must be unset in production | Verify env var is not set on Vercel production |

### CAN FIX AFTER GO-LIVE

| # | Item | Reason |
|---|------|--------|
| 6 | Payment page hold TTL accuracy | Currently estimates 12min from page load — minor UX issue, not data loss |
| 7 | Reconciliation page UNKNOWN payments list | Ops can use SQL editor or ops queue entries as workaround |
| 8 | Rate limiting on hold creation | Can add via Vercel WAF or Edge Middleware later |
| 9 | Webhook auto-confirm empty arrays | If gateway settles before user submits passengers, booking will be created without passenger data — user can still submit via confirm-booking endpoint |
| 10 | Email notifications | No transactional emails (booking confirmation, cancellation, refund) — users check status in-app |

---

## 6. Exact Implementation Order from Now to Launch

### Step 1 — Create logout route (30 min)
```
Create: src/app/auth/logout/route.ts
  POST handler: createServerSupabase() → supabase.auth.signOut() → redirect to /
```

### Step 2 — Implement payment gateway adapter (2–4 hours)
```
Create: src/lib/gateway/[gateway-name].ts
  Implements PaymentGateway interface:
  - createCheckoutUrl → gateway API call → return redirect URL
  - verifyWebhookSignature → HMAC-SHA256 verification
  - pollPaymentStatus → gateway status query API
  - submitRefund → gateway refund API

Update: src/lib/gateway/client.ts
  Switch on PAYMENT_GATEWAY env var → return real adapter

Update: src/lib/gateway/webhook.ts
  Replace stub → call gateway.verifyWebhookSignature
```

### Step 3 — Fix payment page pricing (1 hour)
```
Update: src/app/(public)/holds/[id]/pay/page.tsx
  Calculate amountKurus from hold_items or accept from URL/state
  Pass real amount to POST /api/holds/[id]/payment
```

### Step 4 — Update webhook payload parsing (1 hour)
```
Update: src/app/api/webhooks/payment/route.ts
  Parse gateway-specific payload fields
  Map gateway status to SETTLED/FAILED

Update: src/app/api/webhooks/refund/route.ts
  Parse gateway-specific refund payload
```

### Step 5 — Set production environment variables (30 min)
```
Vercel dashboard: set all 10+ env vars for production
Verify WEBHOOK_SKIP_VERIFICATION is NOT set
```

### Step 6 — Deploy migrations to Supabase (30 min)
```
Execute 001–007 in order in Supabase SQL editor
Create admin user + set role
Create operator user + set role
```

### Step 7 — Deploy to Vercel (15 min)
```
git push to main → Vercel auto-deploys
Verify build succeeds
Verify production URL loads
```

### Step 8 — Run smoke tests (1–2 hours)
```
Execute Section 4 checklist end-to-end
Fix any issues found
```

### Step 9 — Go live
```
Point DNS to Vercel
Remove WEBHOOK_SKIP_VERIFICATION if accidentally set
Monitor cron worker logs for first 24 hours
```

**Total estimated effort: 6–9 hours from current state to production.**
