# Phase 0 — Implementation Task Breakdown

Legend: `[CP]` = critical path · `[P]` = parallel-safe · `[B]` = blocker for downstream tasks

---

## Group A — Foundation

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| A1 | Next.js project init | `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css` | — | `npm run dev` serves default page at localhost:3000 | `[CP][B]` |
| A2 | Install dependencies | `package.json` (add `@supabase/supabase-js`, `@supabase/ssr`, `zod`) | A1 | `npm ls @supabase/supabase-js @supabase/ssr zod` shows all three installed | `[CP][B]` |
| A3 | Create .env.example | `.env.example` | A1 | File committed with all 10 empty variable keys (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAYMENT_GATEWAY, PAYMENT_GATEWAY_API_KEY, PAYMENT_GATEWAY_SECRET_KEY, PAYMENT_WEBHOOK_SECRET, REFUND_WEBHOOK_SECRET, CRON_SECRET, NEXT_PUBLIC_APP_URL) | `[P]` |
| A4 | Create .env.local | `.env.local` (gitignored) | A3 | File exists with real Supabase URL + anon key + service role key populated. CRON_SECRET set to a random 32-char hex. NEXT_PUBLIC_APP_URL = http://localhost:3000 | `[CP][B]` |
| A5 | Create vercel.json | `vercel.json` | A1 | File contains `crons` array with 4 entries: sweep-holds (*/1), reconcile (*/5), refund-retry (*/2), health (*/15) | `[P]` |
| A6 | Add .gitignore entries | `.gitignore` | A1 | `.env.local` and `node_modules` confirmed present in .gitignore | `[P]` |

---

## Group B — Supabase Clients

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| B1 | Server Supabase client | `src/lib/supabase/server.ts` | A2, A4 | Exports `createServerSupabase()` that returns `SupabaseClient` using `@supabase/ssr` `createServerClient` with cookies() from next/headers | `[CP][B]` |
| B2 | Browser Supabase client | `src/lib/supabase/client.ts` | A2, A4 | Exports `createBrowserSupabase()` using `@supabase/ssr` `createBrowserClient` with NEXT_PUBLIC env vars | `[CP]` |
| B3 | Admin Supabase client | `src/lib/supabase/admin.ts` | A2, A4 | Exports `createAdminSupabase()` using `@supabase/supabase-js` `createClient` with `SUPABASE_SERVICE_ROLE_KEY`. Throws if env var missing. | `[CP][B]` |
| B4 | Supabase middleware helper | `src/lib/supabase/middleware.ts` | B1 | Exports `updateSession(request)` that refreshes Supabase auth session via `@supabase/ssr` middleware pattern. Returns `NextResponse`. | `[CP][B]` |

---

## Group C — Database & Types

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| C1 | Deploy migrations 001–006 to Supabase | — (Supabase dashboard or CLI) | — | All 6 migration files executed in order. `SELECT fn_generate_ulid()` returns a ULID. `SELECT * FROM fn_ops_queue_summary()` returns empty result set. | `[CP][B]` |
| C2 | Generate TypeScript types | `src/types/database.ts` | C1 | `npx supabase gen types typescript --project-id $REF > src/types/database.ts` succeeds. File exports `Database` type with all 19 tables + enums. | `[CP][B]` |
| C3 | Create domain types | `src/types/domain.ts` | C2 | Exports type aliases derived from `Database['public']['Tables']`: `Voyage`, `Hold`, `Booking`, `Payment`, `RefundRecord`, `BookingPassenger`, `BookingVehicle`, `BookingCabin`, `OpsReviewEntry`. Plus enum string unions: `VoyageStatus`, `HoldStatus`, `BookingStatus`, `PaymentStatus`, `RefundStatus`. | `[P]` |
| C4 | Create API types | `src/types/api.ts` | C3 | Exports request/response interfaces: `CreateHoldRequest`, `CreateHoldResponse`, `StartPaymentRequest`, `StartPaymentResponse`, `ConfirmBookingRequest`, `ConfirmBookingResponse`, `CancelBookingRequest`, `CancelBookingResponse`, `CreateVoyageRequest`, `CreateVesselRequest`. Each references domain types. | `[P]` |

---

## Group D — Auth

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| D1 | Role constants | `src/lib/auth/roles.ts` | — | Exports `ROLES = { USER: 'user', ADMIN: 'admin', OPS: 'ops', OPERATOR: 'operator' } as const`. Exports `getUserRole(user): string` that reads `user.app_metadata.role` with fallback to `'user'`. | `[P]` |
| D2 | Auth guards | `src/lib/auth/guards.ts` | B1, D1 | Exports 4 async functions: `requireAuth(supabase)`, `requireAdmin(supabase)`, `requireOps(supabase)`, `requireOperator(supabase)`. Each calls `supabase.auth.getUser()`, checks role via `getUserRole`, returns `User` or throws with status 401/403. | `[CP][B]` |
| D3 | Auth callback route | `src/app/auth/callback/route.ts` | B1 | Exports `GET` handler. Exchanges auth code for session via `supabase.auth.exchangeCodeForSession`. Redirects to `/` on success, `/auth/login?error=...` on failure. | `[CP]` |
| D4 | Login page stub | `src/app/auth/login/page.tsx` | B2 | Renders email + password form. Submit calls `supabase.auth.signInWithPassword`. Redirects to `/` on success. Displays error on failure. | `[P]` |
| D5 | Register page stub | `src/app/auth/register/page.tsx` | B2 | Renders email + password + confirm form. Submit calls `supabase.auth.signUp`. Shows "check your email" message on success. | `[P]` |
| D6 | Create admin user | — (Supabase dashboard) | C1 | Admin user exists in `auth.users`. `raw_app_meta_data` contains `{"role": "admin"}`. Can sign in via login page. | `[B]` |

---

## Group E — Middleware

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| E1 | Root middleware | `middleware.ts` (project root) | B4, D2 | Exports `middleware` function + `config.matcher`. Calls `updateSession(request)`. Route matching: `/admin/**` requires admin, `/checkin/**` requires operator, `/api/admin/**` requires admin, `/api/ops/**` requires ops or admin, `/api/cron/**` checks `CRON_SECRET` header, `/api/webhooks/**` passes through, `/api/holds/**`, `/api/payments/**`, `/api/bookings/**`, `/api/users/**` require auth, `/voyages/*/book`, `/holds/**`, `/bookings/**`, `/account/**` require auth. Unauthenticated → redirect to `/auth/login`. Unauthorized → 403 JSON. | `[CP][B]` |

---

## Group F — Error Handling & Utilities

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| F1 | DB error mapper | `src/lib/errors/db-errors.ts` | A2 | Exports `mapDbError(error: PostgrestError): ApiError` that maps SQLSTATE codes: `55P03` → 409, `P0001` → 422, `P0002` → 404, `23505` → 409, others → 500. `ApiError` has `status`, `code`, `message`. | `[P]` |
| F2 | NOWAIT retry helper | `src/lib/utils/retry.ts` | F1 | Exports `withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 100): Promise<T>`. Retries only on status 409 (NOWAIT). Exponential backoff with jitter. | `[P]` |
| F3 | Idempotency key generator | `src/lib/utils/idempotency.ts` | — | Exports `generateIdempotencyKey(): string` using `crypto.randomUUID()`. | `[P]` |

---

## Group G — Validation Schemas

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| G1 | Hold validation | `src/lib/validation/holds.ts` | A2, C3 | Exports Zod schema `createHoldSchema`: `{ voyageId: z.string().uuid(), items: z.array(holdItemSchema).min(1), ttlSeconds: z.number().int().min(60).max(1800).optional() }`. `holdItemSchema` discriminated union on `item_type` (PASSENGER, VEHICLE, CABIN). | `[P]` |
| G2 | Payment validation | `src/lib/validation/payments.ts` | A2, C3 | Exports `startPaymentSchema`: `{ amountKurus: z.number().int().positive(), currency: z.string().length(3), gateway: z.string().min(1), idempotencyKey: z.string().uuid() }`. | `[P]` |
| G3 | Booking validation | `src/lib/validation/bookings.ts` | A2, C3 | Exports `confirmBookingSchema` (passengers/vehicles/cabins JSONB arrays) and `cancelBookingSchema` (scope, partialTargetType, partialTargetId, refundAmountKurus). | `[P]` |
| G4 | Voyage validation | `src/lib/validation/voyages.ts` | A2, C3 | Exports `createVoyageSchema` (vesselId, originPort, destinationPort, departureUtc, arrivalUtc, operational capacities) and `updateVoyageSchema` (partial, same fields). | `[P]` |
| G5 | Vessel validation | `src/lib/validation/vessels.ts` | A2, C3 | Exports `createVesselSchema` (name, baseLaneMeters, baseM2, basePassengerCapacity, cabinTypes array). | `[P]` |

---

## Group H — Gateway Interface

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| H1 | Gateway type interface | `src/lib/gateway/types.ts` | — | Exports `PaymentGateway` interface with 4 methods: `createCheckoutUrl`, `verifyWebhookSignature`, `pollPaymentStatus`, `submitRefund`. Plus `GatewayWebhookPayload` type. | `[P]` |
| H2 | Webhook signature verifier | `src/lib/gateway/webhook.ts` | H1, A4 | Exports `verifyPaymentWebhook(body, signature): boolean` and `verifyRefundWebhook(body, signature): boolean`. Reads secrets from env. Stub implementation returns `false` (gateway-specific impl in Phase 1). | `[P]` |
| H3 | Gateway client stub | `src/lib/gateway/client.ts` | H1, A4 | Exports `getGateway(): PaymentGateway`. Reads `PAYMENT_GATEWAY` env var. Returns stub that throws "gateway not configured" for all methods. Real implementation in Phase 1. | `[P]` |

---

## Group I — DB Function Wrappers

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| I1 | Hold wrappers | `src/lib/db/holds.ts` | B1, C2, F1 | Exports `createHold(supabase, params)` and `releaseHold(supabase, holdId)`. Each calls `supabase.rpc()` with correct parameter names, maps errors via `mapDbError`. | `[P]` |
| I2 | Payment wrappers | `src/lib/db/payments.ts` | B1, C2, F1 | Exports `startPayment(supabase, params)`. | `[P]` |
| I3 | Booking wrappers | `src/lib/db/bookings.ts` | B1, C2, F1 | Exports `confirmBooking(supabase, params)` and `cancelBooking(supabase, params)`. | `[P]` |
| I4 | Voyage wrappers | `src/lib/db/voyages.ts` | B1, C2, F1 | Exports `openVoyage`, `closeVoyage`, `departVoyage`, `cancelVoyage`. Each calls corresponding `fn_*_voyage` via `supabase.rpc()`. | `[P]` |
| I5 | Sweep wrapper | `src/lib/db/sweep.ts` | B3, C2, F1 | Exports `sweepExpiredHolds(supabase, batchLimit = 20)`. Uses admin client. | `[P]` |
| I6 | Reconciliation wrappers | `src/lib/db/reconciliation.ts` | B1, C2, F1 | Exports `assertCapacityConsistency`, `detectAndQueueCounterDrift`, `reconcileCounterDrift`, `reconcilePaymentUnknown`. | `[P]` |
| I7 | Ops wrappers | `src/lib/db/ops.ts` | B1, C2, F1 | Exports `resolveOpsReview(supabase, params)` and `opsQueueSummary(supabase)`. | `[P]` |
| I8 | Manifest wrappers | `src/lib/db/manifests.ts` | B1, C2, F1 | Exports `passengerManifest(supabase, voyageId)` and `vehicleManifest(supabase, voyageId)`. | `[P]` |
| I9 | Revenue wrapper | `src/lib/db/revenue.ts` | B1, C2, F1 | Exports `revenueSummary(supabase, voyageId)`. | `[P]` |
| I10 | Refund wrappers | `src/lib/db/refunds.ts` | B1, C2, F1 | Exports `processRefundSubmission`, `markRefundConfirmed`, `markRefundFailed`. | `[P]` |

---

## Group J — RLS Policies

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| J1 | Create RLS migration file | `migrations/007_rls_policies.sql` | C1 | File contains: ALTER TABLE ... ENABLE ROW LEVEL SECURITY for all 19 tables. Public read on voyages (OPEN/CLOSED/DEPARTED), vessels, vessel_cabin_types, voyage_cabin_inventory, voyage_capacity_counters. User-scoped SELECT on holds, bookings, booking_passengers, booking_vehicles, booking_cabins, payments, refund_records, cancellation_records (using `auth.uid() = user_id` or subquery). No write policies (all writes via SECURITY DEFINER RPCs). | `[B]` |
| J2 | Deploy RLS migration | — (Supabase dashboard or CLI) | J1 | `007_rls_policies.sql` executed. Anon client can SELECT open voyages. Anon client CANNOT select holds. Authenticated user can SELECT only own bookings. | `[CP][B]` |

---

## Group K — Layouts & UI Shells

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| K1 | Root layout | `src/app/layout.tsx`, `src/app/globals.css` | A1 | Root layout renders `<html lang="tr">`, imports globals.css, wraps children. Tailwind base styles applied. | `[CP][B]` |
| K2 | Public header component | `src/components/layout/public-header.tsx` | B2, K1 | Renders logo, "Seferler" nav link, conditional Login/Register or My Bookings/Logout based on auth state. | `[P]` |
| K3 | Admin sidebar component | `src/components/layout/admin-sidebar.tsx` | K1 | Renders sidebar with nav links: Dashboard, Vessels, Voyages, Ops Queue, Reconciliation. Active route highlighted. | `[P]` |
| K4 | Check-in header component | `src/components/layout/checkin-header.tsx` | K1 | Renders "Check-in Terminal" badge, operator name, History link. | `[P]` |
| K5 | Admin layout | `src/app/(admin)/layout.tsx` | D2, K3 | Server component. Calls `requireAdmin`. Renders AdminSidebar + main content area. | `[CP]` |
| K6 | Check-in layout | `src/app/(checkin)/layout.tsx` | D2, K4 | Server component. Calls `requireOperator`. Renders CheckinHeader + centered content area. | `[P]` |

---

## Group L — Page Stubs (Public)

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| L1 | Voyage search page | `src/app/(public)/page.tsx` | K1, K2 | Renders `<h1>Seferler</h1>` + "Coming soon" placeholder. | `[P]` |
| L2 | Voyage detail page | `src/app/(public)/voyages/[id]/page.tsx` | K1 | Renders `<h1>Sefer Detayı</h1>` + params.id. | `[P]` |
| L3 | Item selection page | `src/app/(public)/voyages/[id]/book/page.tsx` | K1 | Renders `<h1>Rezervasyon</h1>` placeholder. | `[P]` |
| L4 | Payment page | `src/app/(public)/holds/[id]/pay/page.tsx` | K1 | Renders `<h1>Ödeme</h1>` placeholder. | `[P]` |
| L5 | Booking detail page | `src/app/(public)/bookings/[id]/page.tsx` | K1 | Renders `<h1>Rezervasyon Detayı</h1>` placeholder. | `[P]` |
| L6 | Confirmation page | `src/app/(public)/bookings/[id]/confirmation/page.tsx` | K1 | Renders `<h1>Onay</h1>` placeholder. | `[P]` |
| L7 | My bookings page | `src/app/(public)/account/bookings/page.tsx` | K1 | Renders `<h1>Rezervasyonlarım</h1>` placeholder. | `[P]` |

---

## Group M — Page Stubs (Admin)

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| M1 | Admin dashboard | `src/app/(admin)/admin/page.tsx` | K5 | Renders `<h1>Dashboard</h1>` placeholder. | `[P]` |
| M2 | Vessel list page | `src/app/(admin)/admin/vessels/page.tsx` | K5 | Renders `<h1>Gemiler</h1>` placeholder. | `[P]` |
| M3 | Vessel create page | `src/app/(admin)/admin/vessels/new/page.tsx` | K5 | Renders `<h1>Yeni Gemi</h1>` placeholder. | `[P]` |
| M4 | Voyage list page | `src/app/(admin)/admin/voyages/page.tsx` | K5 | Renders `<h1>Seferler</h1>` placeholder. | `[P]` |
| M5 | Voyage create page | `src/app/(admin)/admin/voyages/new/page.tsx` | K5 | Renders `<h1>Yeni Sefer</h1>` placeholder. | `[P]` |
| M6 | Voyage detail page | `src/app/(admin)/admin/voyages/[id]/page.tsx` | K5 | Renders `<h1>Sefer Detayı</h1>` + params.id placeholder. | `[P]` |
| M7 | Manifest page | `src/app/(admin)/admin/voyages/[id]/manifest/page.tsx` | K5 | Renders `<h1>Manifest</h1>` placeholder. | `[P]` |
| M8 | Revenue page | `src/app/(admin)/admin/voyages/[id]/revenue/page.tsx` | K5 | Renders `<h1>Gelir Özeti</h1>` placeholder. | `[P]` |
| M9 | Ops queue page | `src/app/(admin)/admin/ops/page.tsx` | K5 | Renders `<h1>Operasyon Kuyruğu</h1>` placeholder. | `[P]` |
| M10 | Ops entry detail page | `src/app/(admin)/admin/ops/[reviewId]/page.tsx` | K5 | Renders `<h1>Ops Detay</h1>` + params.reviewId placeholder. | `[P]` |
| M11 | Reconciliation page | `src/app/(admin)/admin/reconciliation/[voyageId]/page.tsx` | K5 | Renders `<h1>Mutabakat</h1>` + params.voyageId placeholder. | `[P]` |

---

## Group N — Page Stubs (Check-in)

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| N1 | Check-in scan page | `src/app/(checkin)/checkin/page.tsx` | K6 | Renders `<h1>Check-in</h1>` + text input placeholder. | `[P]` |
| N2 | Check-in approve/deny page | `src/app/(checkin)/checkin/[bookingId]/page.tsx` | K6 | Renders `<h1>Boarding</h1>` + params.bookingId placeholder. | `[P]` |
| N3 | Check-in history page | `src/app/(checkin)/checkin/history/page.tsx` | K6 | Renders `<h1>Geçmiş</h1>` placeholder. | `[P]` |

---

## Group O — API Route Stubs

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| O1 | Public voyage routes | `src/app/api/voyages/route.ts`, `src/app/api/voyages/[id]/route.ts` | B1 | Each exports GET handler that returns `{ status: 'stub' }` with 200. | `[P]` |
| O2 | Hold routes | `src/app/api/holds/route.ts`, `src/app/api/holds/[id]/route.ts`, `src/app/api/holds/[id]/payment/route.ts` | D2 | Each exports handler with auth guard call + stub 200 response. | `[P]` |
| O3 | Payment confirm route | `src/app/api/payments/[id]/confirm-booking/route.ts` | D2 | Exports POST with auth guard + stub. | `[P]` |
| O4 | Booking routes | `src/app/api/bookings/[id]/route.ts`, `src/app/api/bookings/[id]/cancel/route.ts` | D2 | GET + POST with auth guard + stub. | `[P]` |
| O5 | User bookings route | `src/app/api/users/me/bookings/route.ts` | D2 | GET with auth guard + stub. | `[P]` |
| O6 | Webhook routes | `src/app/api/webhooks/payment/route.ts`, `src/app/api/webhooks/refund/route.ts` | H2 | Each exports POST with signature verification stub + 200 response. | `[P]` |
| O7 | Admin vessel route | `src/app/api/admin/vessels/route.ts` | D2 | POST with admin guard + stub. | `[P]` |
| O8 | Admin voyage routes | `src/app/api/admin/voyages/route.ts`, `src/app/api/admin/voyages/[id]/route.ts`, plus 6 lifecycle route files (open, close, depart, cancel, passenger-manifest, vehicle-manifest, revenue) | D2 | Each exports handler with admin guard + stub. | `[P]` |
| O9 | Ops queue routes | `src/app/api/ops/queue/route.ts`, `src/app/api/ops/queue/[issueType]/route.ts`, `src/app/api/ops/queue/entry/[id]/route.ts`, `src/app/api/ops/queue/entry/[id]/resolve/route.ts` | D2 | Each with ops/admin guard + stub. | `[P]` |
| O10 | Ops reconciliation routes | `src/app/api/ops/reconcile/drift/[voyageId]/route.ts`, `src/app/api/ops/reconcile/payment/[paymentId]/route.ts`, `src/app/api/ops/integrity/[voyageId]/route.ts` | D2 | Each with ops/admin guard + stub. | `[P]` |

---

## Group P — Worker Route Stubs

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| P1 | Sweep holds cron | `src/app/api/cron/sweep-holds/route.ts` | B3, A5 | Exports POST. Checks `Authorization: Bearer $CRON_SECRET`. Returns 401 without secret. Returns `{ status: 'ok', worker: 'sweep-holds' }` with secret. No DB call yet. | `[P]` |
| P2 | Reconcile cron | `src/app/api/cron/reconcile/route.ts` | B3, A5 | Same auth pattern. Returns `{ worker: 'reconcile' }`. | `[P]` |
| P3 | Refund retry cron | `src/app/api/cron/refund-retry/route.ts` | B3, A5 | Same auth pattern. Returns `{ worker: 'refund-retry' }`. | `[P]` |
| P4 | Health cron | `src/app/api/cron/health/route.ts` | B3, A5 | Same auth pattern. Returns `{ worker: 'health' }`. | `[P]` |

---

## Group Q — Deploy & Verify

| ID | Title | Files | Depends | Done When | Tag |
|----|-------|-------|---------|-----------|-----|
| Q1 | Push to GitHub | — | All above | Repository on GitHub with all files committed. `.env.local` NOT committed. | `[CP][B]` |
| Q2 | Connect Vercel | — | Q1 | Vercel project linked to GitHub repo. Environment variables set in Vercel dashboard. | `[CP][B]` |
| Q3 | Verify deployment | — | Q2 | Production URL loads root page. `/admin` redirects to login. `/api/cron/sweep-holds` returns 401 without header. Cron routes visible in Vercel dashboard. | `[CP]` |
| Q4 | Verify RLS | — | J2, Q3 | Anonymous Supabase client can SELECT open voyages. Anonymous client CANNOT select from holds. Authenticated user sees only own bookings. Admin sees all via service role. | `[CP]` |

---

## Execution Timeline

### Wave 1 — Foundation (sequential, critical path)
```
A1 → A2 → A4 → B1 → B2 → B3 → B4
                         ↓
              parallel: A3, A5, A6
```

### Wave 2 — Database (parallel with Wave 1 tail)
```
C1 (deploy migrations) → C2 (gen types) → C3, C4
                   ↓
                  J1 → J2
```

### Wave 3 — Auth + Errors (after B1, B4)
```
D1 → D2 → E1
parallel: D3, D4, D5
parallel: F1, F2, F3
```

### Wave 4 — All parallel groups (after D2, C2, F1)
```
parallel: G1–G5, H1–H3, I1–I10
```

### Wave 5 — Layouts + Stubs (after K1, D2)
```
K1 → K2, K3, K4 (parallel)
K5 (after K3, D2), K6 (after K4, D2)
     ↓
L1–L7, M1–M11, N1–N3 (all parallel)
O1–O10 (all parallel)
P1–P4 (all parallel)
```

### Wave 6 — Deploy
```
Q1 → Q2 → Q3, Q4 (parallel)
```

### Parallelism Map

| Wave | Tasks | Estimated Parallelism |
|------|-------|----------------------|
| 1 | A1–A6, B1–B4 | 1 serial chain + 3 parallel |
| 2 | C1–C4, J1–J2 | 1 serial chain + 2 parallel |
| 3 | D1–D6, E1, F1–F3 | 1 serial chain + 6 parallel |
| 4 | G1–G5, H1–H3, I1–I10 | 18 tasks fully parallel |
| 5 | K1–K6, L1–L7, M1–M11, N1–N3, O1–O10, P1–P4 | 1 short chain then 35 fully parallel |
| 6 | Q1–Q4 | 1 serial chain + 1 parallel |

**Total tasks: 93**
**Critical path length: A1 → A2 → A4 → B1 → B4 → E1 → K1 → K5 → Q1 → Q2 → Q3 = 11 tasks**
