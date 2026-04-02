# Phase 0 — Project Scaffold

---

## 1. Project Folders

```
antso_denizcilik/
├── migrations/                          # existing — 001–006
├── docs/                                # existing — plans
├── src/
│   ├── app/
│   │   ├── (public)/                    # public booking wizard (route group)
│   │   │   ├── page.tsx                 # voyage search — /
│   │   │   ├── voyages/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         # voyage detail
│   │   │   │       └── book/
│   │   │   │           └── page.tsx     # item selection
│   │   │   ├── holds/
│   │   │   │   └── [id]/
│   │   │   │       └── pay/
│   │   │   │           └── page.tsx     # payment initiation
│   │   │   ├── bookings/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         # booking detail + cancel
│   │   │   │       └── confirmation/
│   │   │   │           └── page.tsx     # confirmation + QR
│   │   │   └── account/
│   │   │       └── bookings/
│   │   │           └── page.tsx         # user booking list
│   │   │
│   │   ├── (admin)/                     # admin panel (route group)
│   │   │   ├── layout.tsx               # admin shell + nav
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx             # dashboard
│   │   │   │   ├── vessels/
│   │   │   │   │   ├── page.tsx         # vessel list
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx     # vessel create
│   │   │   │   ├── voyages/
│   │   │   │   │   ├── page.tsx         # voyage list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx     # voyage create
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx     # voyage detail + lifecycle
│   │   │   │   │       ├── manifest/
│   │   │   │   │       │   └── page.tsx # passenger + vehicle manifest
│   │   │   │   │       └── revenue/
│   │   │   │   │           └── page.tsx # revenue summary
│   │   │   │   ├── ops/
│   │   │   │   │   ├── page.tsx         # ops queue summary
│   │   │   │   │   └── [reviewId]/
│   │   │   │   │       └── page.tsx     # ops entry detail + resolve
│   │   │   │   └── reconciliation/
│   │   │   │       └── [voyageId]/
│   │   │   │           └── page.tsx     # integrity check + drift fix
│   │   │
│   │   ├── (checkin)/                   # check-in app (route group)
│   │   │   ├── layout.tsx               # check-in shell
│   │   │   ├── checkin/
│   │   │   │   ├── page.tsx             # QR scan + lookup
│   │   │   │   ├── [bookingId]/
│   │   │   │   │   └── page.tsx         # approve / deny
│   │   │   │   └── history/
│   │   │   │       └── page.tsx         # audit log
│   │   │
│   │   ├── api/                         # API routes
│   │   │   ├── voyages/
│   │   │   │   ├── route.ts             # GET list
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts         # GET detail
│   │   │   ├── holds/
│   │   │   │   ├── route.ts             # POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # DELETE release
│   │   │   │       └── payment/
│   │   │   │           └── route.ts     # POST start payment
│   │   │   ├── payments/
│   │   │   │   └── [id]/
│   │   │   │       └── confirm-booking/
│   │   │   │           └── route.ts     # POST confirm
│   │   │   ├── bookings/
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # GET detail
│   │   │   │       └── cancel/
│   │   │   │           └── route.ts     # POST cancel
│   │   │   ├── users/
│   │   │   │   └── me/
│   │   │   │       └── bookings/
│   │   │   │           └── route.ts     # GET my bookings
│   │   │   ├── webhooks/
│   │   │   │   ├── payment/
│   │   │   │   │   └── route.ts         # POST payment webhook
│   │   │   │   └── refund/
│   │   │   │       └── route.ts         # POST refund webhook
│   │   │   ├── admin/
│   │   │   │   ├── vessels/
│   │   │   │   │   └── route.ts         # POST create vessel
│   │   │   │   └── voyages/
│   │   │   │       ├── route.ts         # POST create voyage
│   │   │   │       └── [id]/
│   │   │   │           ├── route.ts     # PATCH update draft
│   │   │   │           ├── open/
│   │   │   │           │   └── route.ts
│   │   │   │           ├── close/
│   │   │   │           │   └── route.ts
│   │   │   │           ├── depart/
│   │   │   │           │   └── route.ts
│   │   │   │           ├── cancel/
│   │   │   │           │   └── route.ts
│   │   │   │           ├── passenger-manifest/
│   │   │   │           │   └── route.ts
│   │   │   │           ├── vehicle-manifest/
│   │   │   │           │   └── route.ts
│   │   │   │           └── revenue/
│   │   │   │               └── route.ts
│   │   │   ├── ops/
│   │   │   │   ├── queue/
│   │   │   │   │   ├── route.ts         # GET summary
│   │   │   │   │   ├── [issueType]/
│   │   │   │   │   │   └── route.ts     # GET by type
│   │   │   │   │   └── entry/
│   │   │   │   │       └── [id]/
│   │   │   │   │           ├── route.ts         # GET detail
│   │   │   │   │           └── resolve/
│   │   │   │   │               └── route.ts     # POST resolve
│   │   │   │   ├── reconcile/
│   │   │   │   │   ├── drift/
│   │   │   │   │   │   └── [voyageId]/
│   │   │   │   │   │       └── route.ts # POST reconcile drift
│   │   │   │   │   └── payment/
│   │   │   │   │       └── [paymentId]/
│   │   │   │   │           └── route.ts # POST reconcile payment
│   │   │   │   └── integrity/
│   │   │   │       └── [voyageId]/
│   │   │   │           └── route.ts     # GET assert consistency
│   │   │   └── cron/
│   │   │       ├── sweep-holds/
│   │   │       │   └── route.ts         # hold sweeper
│   │   │       ├── reconcile/
│   │   │       │   └── route.ts         # reconciliation poller
│   │   │       ├── refund-retry/
│   │   │       │   └── route.ts         # refund retry
│   │   │       └── health/
│   │   │           └── route.ts         # integrity check
│   │   │
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts             # Supabase auth callback
│   │   │
│   │   ├── layout.tsx                   # root layout
│   │   └── globals.css
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts                # createServerClient (cookies)
│   │   │   ├── client.ts                # createBrowserClient
│   │   │   ├── admin.ts                 # createClient (service_role)
│   │   │   └── middleware.ts            # Supabase auth middleware helper
│   │   ├── db/
│   │   │   ├── holds.ts                 # fn_create_hold, fn_release_hold wrappers
│   │   │   ├── payments.ts              # fn_start_payment wrappers
│   │   │   ├── bookings.ts              # fn_confirm_booking, fn_cancel_booking wrappers
│   │   │   ├── voyages.ts               # fn_open/close/depart/cancel_voyage wrappers
│   │   │   ├── sweep.ts                 # fn_sweep_expired_holds wrapper
│   │   │   ├── reconciliation.ts        # fn_reconcile_*, fn_assert_*, fn_detect_* wrappers
│   │   │   ├── ops.ts                   # fn_resolve_ops_review, fn_ops_queue_summary wrappers
│   │   │   ├── manifests.ts             # fn_passenger_manifest, fn_vehicle_manifest wrappers
│   │   │   ├── revenue.ts               # fn_revenue_summary wrapper
│   │   │   └── refunds.ts              # fn_process_refund_*, fn_mark_refund_* wrappers
│   │   ├── auth/
│   │   │   ├── guards.ts               # requireAuth, requireAdmin, requireOps
│   │   │   └── roles.ts                # role constants, claim helpers
│   │   ├── gateway/
│   │   │   ├── types.ts                # gateway interface
│   │   │   ├── webhook.ts              # signature verification
│   │   │   └── client.ts              # gateway API client (refund submission, status poll)
│   │   ├── errors/
│   │   │   └── db-errors.ts           # SQLSTATE → HTTP status mapping
│   │   ├── validation/
│   │   │   ├── holds.ts               # Zod: create hold request
│   │   │   ├── payments.ts            # Zod: start payment request
│   │   │   ├── bookings.ts           # Zod: confirm booking, cancel booking requests
│   │   │   ├── voyages.ts            # Zod: create/update voyage requests
│   │   │   └── vessels.ts            # Zod: create vessel request
│   │   └── utils/
│   │       ├── idempotency.ts         # client-side key generation
│   │       └── retry.ts              # NOWAIT retry helper (exponential backoff, max 3)
│   │
│   ├── components/
│   │   ├── ui/                        # shared primitives (button, input, table, badge, card)
│   │   ├── layout/
│   │   │   ├── public-header.tsx
│   │   │   ├── admin-sidebar.tsx
│   │   │   └── checkin-header.tsx
│   │   └── domain/
│   │       ├── voyage-card.tsx
│   │       ├── capacity-bar.tsx
│   │       ├── countdown-timer.tsx
│   │       ├── manifest-table.tsx
│   │       ├── ops-badge.tsx
│   │       └── qr-scanner.tsx
│   │
│   ├── hooks/
│   │   ├── use-countdown.ts
│   │   └── use-realtime.ts           # Supabase Realtime subscription
│   │
│   └── types/
│       ├── database.ts                # Supabase generated types (npx supabase gen types)
│       ├── api.ts                     # API request/response types
│       └── domain.ts                  # shared domain types
│
├── supabase/
│   ├── config.toml                    # Supabase project config
│   └── migrations/                    # symlink or copy from /migrations
│
├── public/
│   └── favicon.ico
│
├── .env.local                         # local dev env
├── .env.example                       # committed template
├── next.config.ts
├── tsconfig.json
├── package.json
├── vercel.json                        # cron config
├── middleware.ts                       # Next.js middleware (auth + route protection)
└── tailwind.config.ts
```

---

## 2. App Routes

### Public

| Route | Page | Auth |
|-------|------|------|
| `/` | Voyage search | Public |
| `/voyages/[id]` | Voyage detail | Public |
| `/voyages/[id]/book` | Item selection | Authenticated |
| `/holds/[id]/pay` | Payment initiation | Authenticated (owner) |
| `/bookings/[id]` | Booking detail + cancel | Authenticated (owner) |
| `/bookings/[id]/confirmation` | Confirmation + QR | Authenticated (owner) |
| `/account/bookings` | My bookings | Authenticated |
| `/auth/login` | Login | Public |
| `/auth/register` | Register | Public |

### Admin

| Route | Page | Auth |
|-------|------|------|
| `/admin` | Dashboard | Admin |
| `/admin/vessels` | Vessel list | Admin |
| `/admin/vessels/new` | Create vessel | Admin |
| `/admin/voyages` | Voyage list | Admin |
| `/admin/voyages/new` | Create voyage | Admin |
| `/admin/voyages/[id]` | Voyage detail + lifecycle | Admin |
| `/admin/voyages/[id]/manifest` | Passenger + vehicle manifest | Admin |
| `/admin/voyages/[id]/revenue` | Revenue summary | Admin |
| `/admin/ops` | Ops queue summary | Admin/Ops |
| `/admin/ops/[reviewId]` | Ops entry detail + resolve | Admin/Ops |
| `/admin/reconciliation/[voyageId]` | Integrity + drift correction | Admin/Ops |

### Check-in

| Route | Page | Auth |
|-------|------|------|
| `/checkin` | QR scan + booking lookup | Operator |
| `/checkin/[bookingId]` | Approve / deny | Operator |
| `/checkin/history` | Audit log | Operator |

---

## 3. Lib/Services Structure

### `lib/supabase/` — Client Creation

| File | Export | Usage |
|------|--------|-------|
| `server.ts` | `createServerSupabase()` | Server Components, Route Handlers (uses `cookies()`) |
| `client.ts` | `createBrowserSupabase()` | Client Components (uses `createBrowserClient`) |
| `admin.ts` | `createAdminSupabase()` | Service-role client for workers/webhooks (bypasses RLS) |
| `middleware.ts` | `updateSession()` | Called from `middleware.ts` to refresh auth tokens |

### `lib/db/` — Database Function Wrappers

Each file exports typed async functions that call `supabase.rpc()`:

```typescript
// lib/db/holds.ts
export async function createHold(supabase: SupabaseClient, params: CreateHoldParams) {
  const { data, error } = await supabase.rpc('fn_create_hold', {
    p_voyage_id: params.voyageId,
    p_user_id: params.userId,
    p_session_id: params.sessionId,
    p_idempotency_key: params.idempotencyKey,
    p_items: params.items,
    p_ttl_seconds: params.ttlSeconds ?? 720,
  });
  if (error) throw mapDbError(error);
  return data;
}
```

Pattern: thin typed wrapper → `supabase.rpc()` → `mapDbError()` on failure.

### `lib/errors/db-errors.ts` — SQLSTATE Mapping

| SQLSTATE | HTTP | Meaning |
|----------|------|---------|
| `55P03` | 409 Conflict | Lock contention (NOWAIT) — client should retry |
| `P0001` | 422 Unprocessable | Business rule violation |
| `P0002` | 404 Not Found | Entity not found |
| `23505` | 409 Conflict | Unique constraint (idempotency hit) |
| Other | 500 | Unexpected |

### `lib/auth/guards.ts` — Auth Middleware

```typescript
export async function requireAuth(supabase: SupabaseClient): Promise<User>
export async function requireAdmin(supabase: SupabaseClient): Promise<User>
export async function requireOps(supabase: SupabaseClient): Promise<User>
export async function requireOperator(supabase: SupabaseClient): Promise<User>
```

Each reads `supabase.auth.getUser()`, checks `app_metadata.role`, throws 401/403.

### `lib/gateway/` — Payment Gateway Abstraction

```typescript
// types.ts
interface PaymentGateway {
  createCheckoutUrl(paymentId: string, amount: number, currency: string): Promise<string>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  pollPaymentStatus(gatewayRef: string): Promise<'SETTLED' | 'FAILED' | 'PENDING'>;
  submitRefund(gatewayRef: string, amount: number): Promise<string>;
}
```

Single implementation file per gateway. Selected via `PAYMENT_GATEWAY` env var.

---

## 4. Environment Variables

### `.env.local` / Vercel Environment

| Variable | Source | Used By |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard | Browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard | Browser + server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard | Admin client (workers, webhooks) |
| `PAYMENT_GATEWAY` | Config | Gateway selection (`iyzico` / `paytr` / `stripe`) |
| `PAYMENT_GATEWAY_API_KEY` | Gateway dashboard | Gateway client |
| `PAYMENT_GATEWAY_SECRET_KEY` | Gateway dashboard | Gateway client |
| `PAYMENT_WEBHOOK_SECRET` | Gateway dashboard | Webhook signature verification |
| `REFUND_WEBHOOK_SECRET` | Gateway dashboard | Refund webhook verification |
| `CRON_SECRET` | Generated | Vercel cron auth header |
| `NEXT_PUBLIC_APP_URL` | Vercel | Payment return URLs |

### `.env.example` (committed)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_GATEWAY=
PAYMENT_GATEWAY_API_KEY=
PAYMENT_GATEWAY_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
REFUND_WEBHOOK_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Auth Structure

### Supabase Auth Config

| Setting | Value |
|---------|-------|
| Provider | Email/password (primary) |
| Optional providers | Google OAuth (later) |
| Email confirmation | Required |
| Session duration | 7 days |
| Refresh token rotation | Enabled |

### Roles (stored in `auth.users.raw_app_meta_data`)

| Role | Value | Access |
|------|-------|--------|
| `user` | `{"role": "user"}` | Public booking endpoints |
| `admin` | `{"role": "admin"}` | Admin + ops + all public |
| `ops` | `{"role": "ops"}` | Ops endpoints only |
| `operator` | `{"role": "operator"}` | Check-in endpoints only |

### Role Assignment

Admin sets roles via Supabase dashboard or:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id = '<user_id>';
```

### middleware.ts (Next.js)

```
Route matching:
  /admin/**        → requireAdmin
  /checkin/**       → requireOperator
  /api/admin/**     → requireAdmin
  /api/ops/**       → requireOps or requireAdmin
  /api/cron/**      → verify CRON_SECRET header
  /api/webhooks/**  → skip auth (gateway signature verified in handler)
  /api/holds/**     → requireAuth
  /api/payments/**  → requireAuth
  /api/bookings/**  → requireAuth
  /api/users/**     → requireAuth
  /api/voyages/**   → public (GET only)
  /voyages/*/book   → requireAuth
  /holds/**         → requireAuth
  /bookings/**      → requireAuth
  /account/**       → requireAuth
```

---

## 6. RLS Rollout Order

### Execution Sequence (migration 007_rls_policies.sql)

```sql
-- 1. Enable RLS on all tables
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_cabin_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyage_capacity_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyage_cabin_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_allocation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_cabin_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hold_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_review_queue ENABLE ROW LEVEL SECURITY;

-- 2. Public read policies (no auth required)
CREATE POLICY voyages_public_read ON voyages
  FOR SELECT USING (status IN ('OPEN', 'CLOSED', 'DEPARTED'));

CREATE POLICY vessels_public_read ON vessels
  FOR SELECT USING (true);

CREATE POLICY vessel_cabin_types_public_read ON vessel_cabin_types
  FOR SELECT USING (true);

CREATE POLICY vci_public_read ON voyage_cabin_inventory
  FOR SELECT USING (true);

CREATE POLICY vcc_public_read ON voyage_capacity_counters
  FOR SELECT USING (true);

-- 3. Authenticated user policies (own data only)
CREATE POLICY holds_user_select ON holds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bookings_user_select ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY booking_passengers_user_select ON booking_passengers
  FOR SELECT USING (
    booking_id IN (SELECT booking_id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY booking_vehicles_user_select ON booking_vehicles
  FOR SELECT USING (
    booking_id IN (SELECT booking_id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY booking_cabins_user_select ON booking_cabins
  FOR SELECT USING (
    booking_id IN (SELECT booking_id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY payments_user_select ON payments
  FOR SELECT USING (
    hold_id IN (SELECT hold_id FROM holds WHERE user_id = auth.uid())
  );

CREATE POLICY refund_records_user_select ON refund_records
  FOR SELECT USING (
    booking_id IN (SELECT booking_id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY cancellation_records_user_select ON cancellation_records
  FOR SELECT USING (
    booking_id IN (SELECT booking_id FROM bookings WHERE user_id = auth.uid())
  );

-- 4. RPC functions bypass RLS (SECURITY DEFINER)
-- All fn_* functions are SECURITY DEFINER by default in Supabase.
-- No INSERT/UPDATE/DELETE policies needed for anon/authenticated roles —
-- all mutations go through RPC functions which run as the function owner.

-- 5. Service role (workers, webhooks) bypasses RLS entirely.
-- No additional policies needed.
```

### Policy Order Rationale

1. Enable RLS first on ALL tables — nothing leaks
2. Public read policies second — voyages/vessels are browsable
3. User-scoped read policies third — users can see their own data
4. No write policies for browser clients — all writes go through `supabase.rpc()` which runs as SECURITY DEFINER

---

## 7. API Route Grouping

| Group | Prefix | Auth | Client |
|-------|--------|------|--------|
| Public queries | `/api/voyages` | None | `createServerSupabase()` |
| Booking flow | `/api/holds`, `/api/payments`, `/api/bookings`, `/api/users/me` | `requireAuth` | `createServerSupabase()` |
| Webhooks | `/api/webhooks/*` | Gateway signature | `createAdminSupabase()` |
| Admin | `/api/admin/*` | `requireAdmin` | `createServerSupabase()` |
| Ops | `/api/ops/*` | `requireOps` or `requireAdmin` | `createServerSupabase()` |
| Cron | `/api/cron/*` | `CRON_SECRET` header | `createAdminSupabase()` |

---

## 8. Worker Route Grouping

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sweep-holds",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/refund-retry",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/health",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

> Note: Vercel Cron minimum interval is 1 minute. Hold sweeper runs every 1 minute (not 30s as in the application plan). For sub-minute sweeping, use Supabase `pg_cron` or an external scheduler.

### Cron Auth Pattern

```typescript
// Every cron route.ts:
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... worker logic with createAdminSupabase()
}
```

---

## 9. Admin App Shell Structure

```
(admin)/layout.tsx
├── Sidebar
│   ├── Dashboard        → /admin
│   ├── Vessels           → /admin/vessels
│   ├── Voyages           → /admin/voyages
│   ├── Ops Queue         → /admin/ops
│   └── Reconciliation    → /admin/reconciliation
├── Header
│   ├── User badge (admin name + role)
│   └── Logout button
└── Main content area (children)
```

### Admin Layout Component Skeleton

```typescript
// src/app/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = await createServerSupabase();
  const user = await requireAdmin(supabase);
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

---

## 10. Public App Shell Structure

```
(public)/ — no layout.tsx (uses root layout)
root layout.tsx
├── PublicHeader
│   ├── Logo → /
│   ├── Nav: Voyages
│   ├── Auth: Login / Register (unauthenticated)
│   └── Auth: My Bookings / Logout (authenticated)
├── Main content area (children)
└── Footer (company info, links)
```

### Root Layout Component Skeleton

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <PublicHeader />
        {children}
      </body>
    </html>
  );
}
```

---

## 11. Check-in App Shell Structure

```
(checkin)/layout.tsx
├── CheckinHeader
│   ├── Logo
│   ├── "Check-in Terminal" badge
│   ├── Operator name
│   └── History link → /checkin/history
└── Main content area (children)
```

### Checkin Layout Component Skeleton

```typescript
// src/app/(checkin)/layout.tsx
export default async function CheckinLayout({ children }) {
  const supabase = await createServerSupabase();
  const user = await requireOperator(supabase);
  return (
    <div className="min-h-screen bg-slate-50">
      <CheckinHeader operator={user} />
      <main className="max-w-lg mx-auto p-4">{children}</main>
    </div>
  );
}
```

---

## 12. Exact Build Order for Phase 0

| # | Task | Depends On | Deliverable |
|---|------|-----------|-------------|
| 0.1 | `npx create-next-app@latest` with App Router, TypeScript, Tailwind, ESLint | — | `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts` |
| 0.2 | Install deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod` | 0.1 | Updated `package.json` |
| 0.3 | Create `.env.local` + `.env.example` with all 10 env vars | 0.1 | Env files |
| 0.4 | Create `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `middleware.ts` | 0.2, 0.3 | Supabase client layer |
| 0.5 | Create `middleware.ts` (root) with route matching + auth refresh | 0.4 | Auth middleware |
| 0.6 | Deploy migrations 001–006 to Supabase (`supabase db push` or dashboard SQL editor) | — | Production DB ready |
| 0.7 | Run `npx supabase gen types typescript --project-id $REF > src/types/database.ts` | 0.6 | Generated TypeScript types |
| 0.8 | Create `src/lib/auth/roles.ts` + `guards.ts` | 0.4 | Role system |
| 0.9 | Create `src/lib/errors/db-errors.ts` (SQLSTATE → HTTP mapping) | 0.2 | Error handling |
| 0.10 | Create `src/types/api.ts` + `src/types/domain.ts` (shared type stubs) | 0.7 | Type foundation |
| 0.11 | Deploy RLS migration (007_rls_policies.sql) to Supabase | 0.6 | RLS enforced |
| 0.12 | Create admin user in Supabase Auth + set `raw_app_meta_data.role = 'admin'` | 0.11 | First admin account |
| 0.13 | Create root `layout.tsx` + `globals.css` + `PublicHeader` stub | 0.1 | Root shell |
| 0.14 | Create `(admin)/layout.tsx` + `AdminSidebar` stub | 0.8, 0.13 | Admin shell |
| 0.15 | Create `(checkin)/layout.tsx` + `CheckinHeader` stub | 0.8, 0.13 | Check-in shell |
| 0.16 | Create `vercel.json` with cron config | 0.1 | Worker schedule |
| 0.17 | Create placeholder `route.ts` for `/api/cron/*` (4 files, auth guard only, no logic) | 0.5, 0.16 | Worker route stubs |
| 0.18 | Create `src/lib/gateway/types.ts` (interface only) | 0.1 | Gateway contract |
| 0.19 | Create Zod validation stubs in `src/lib/validation/` | 0.10 | Input validation foundation |
| 0.20 | Create `src/lib/utils/retry.ts` (NOWAIT retry helper) | 0.9 | Retry mechanism |
| 0.21 | Push to GitHub + connect Vercel | 0.1–0.20 | CI/CD live |
| 0.22 | Verify Vercel deploy succeeds + cron routes return 401 without secret | 0.21 | Deployment verified |

### Critical Path

```
0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.8 → 0.14/0.15
                              ↓
0.6 → 0.7 → 0.10 → 0.19
  ↓
0.11 → 0.12
```

### Phase 0 Exit Criteria

- [ ] Next.js app builds and deploys on Vercel
- [ ] Supabase DB has all 6 migrations + RLS policies
- [ ] Admin user can log in
- [ ] Generated TypeScript types match DB schema
- [ ] All 4 cron route stubs exist and reject unauthorized requests
- [ ] `middleware.ts` correctly redirects unauthenticated users from protected routes
- [ ] `.env.example` committed, `.env.local` gitignored
