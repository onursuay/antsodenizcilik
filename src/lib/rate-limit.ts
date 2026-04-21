// Rate limiting abstraction — şu an in-memory (instance-local).
// Production-grade için bu interface'i implemente eden bir Vercel KV / Upstash Redis
// sınıfı yazıp aşağıdaki export'u değiştir; middleware değişmez.

export interface RateLimiter {
  isLimited(ip: string, path: string): boolean;
}

const RL_WINDOW_MS = 60_000;

export const RL_LIMITS: Record<string, number> = {
  "/api/akgunler/sailings": 15,
  "/api/akgunler/passengers": 20,
  "/api/akgunler/checkout": 10,
  "/api/akgunler/tickets": 15,
  "/api/akgunler/payment-callback": 5,
};

// In-memory sliding window — serverless ortamında instance-local'dir.
// Distributed rate limit için Vercel KV tabanlı implementasyon yaz ve burada swap et.
const rlStore = new Map<string, number[]>();

class InMemoryRateLimiter implements RateLimiter {
  constructor(private readonly limits: Record<string, number>) {}

  isLimited(ip: string, path: string): boolean {
    const limit = this.limits[path];
    if (!limit) return false;

    const key = `${ip}:${path}`;
    const now = Date.now();
    const hits = (rlStore.get(key) ?? []).filter((t) => now - t < RL_WINDOW_MS);
    if (hits.length >= limit) return true;

    hits.push(now);
    rlStore.set(key, hits);
    return false;
  }
}

export const rateLimiter: RateLimiter = new InMemoryRateLimiter(RL_LIMITS);
