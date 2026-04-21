import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ---------------------------------------------------------------------------
// Rate limiting — IP başına kayan pencere (instance-local, temel koruma)
// Production-grade için Vercel KV veya Upstash Redis entegre edilmeli.
// ---------------------------------------------------------------------------
const RL_WINDOW_MS = 60_000;
const RL_LIMITS: Record<string, number> = {
  "/api/akgunler/sailings": 15,
  "/api/akgunler/passengers": 20,
  "/api/akgunler/checkout": 10,
  "/api/akgunler/tickets": 15,
  "/api/akgunler/payment-callback": 5,
};

const rlStore = new Map<string, number[]>();

function isRateLimited(ip: string, path: string): boolean {
  const limit = RL_LIMITS[path];
  if (!limit) return false;

  const key = `${ip}:${path}`;
  const now = Date.now();
  const hits = (rlStore.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= limit) return true;

  hits.push(now);
  rlStore.set(key, hits);
  return false;
}

// Routes that do not require any authentication.
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/callback",
];

// Route prefixes that are fully public (GET-only browse).
const PUBLIC_PREFIXES = ["/api/voyages"];

// Route prefixes accessible only to authenticated users.
const AUTH_PREFIXES = [
  "/api/holds",
  "/api/payments",
  "/api/bookings",
  "/api/users",
  "/account",
];

// Page routes requiring auth (non-API).
// Akgünler booking flow (/voyages/[id]/book) is intentionally public so
// guests can complete a purchase without signing up.
const AUTH_PAGE_PATTERNS = [
  /^\/holds\//,
  /^\/bookings\//,
];

function getUserRole(user: { app_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  return (user.app_metadata?.role as string) ?? "user";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting: Akgünler public endpoint'leri ---
  if (pathname in RL_LIMITS) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip, pathname)) {
      return NextResponse.json(
        { error: "Cok fazla istek. Lutfen bir dakika bekleyin." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }
  }

  // --- Cron endpoints: header-based auth only ---
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Webhook endpoints: pass through (signature verified in handler) ---
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  // --- Refresh session for all other requests ---
  const { supabaseResponse, user } = await updateSession(request);
  const role = getUserRole(user);

  // --- Public routes: no auth required ---
  if (PUBLIC_ROUTES.includes(pathname)) {
    return supabaseResponse;
  }
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }
  // Voyage detail pages (public read)
  if (/^\/voyages\/[^/]+$/.test(pathname)) {
    return supabaseResponse;
  }

  // --- Admin routes ---
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin/")) {
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return supabaseResponse;
  }

  // --- Ops routes ---
  if (pathname.startsWith("/api/ops/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin" && role !== "ops") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return supabaseResponse;
  }

  // --- Check-in routes ---
  if (pathname.startsWith("/checkin") || pathname.startsWith("/api/checkin/")) {
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin" && role !== "operator") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return supabaseResponse;
  }

  // --- Authenticated API routes ---
  if (AUTH_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // --- Authenticated page routes ---
  if (AUTH_PAGE_PATTERNS.some((p) => p.test(pathname))) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // --- Default: pass through ---
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
