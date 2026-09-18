// Best-effort fixed-window in-memory rate limiter.
//
// IMPORTANT — deployment caveat:
// This limiter lives in the memory of a single server instance. On
// serverless / multi-instance platforms (e.g. Vercel), limits are enforced
// per warm instance, not globally. It is a defense-in-depth layer, not a
// strict global quota. If exact global enforcement is required, swap this
// implementation for a shared store (e.g. Redis/Upstash) behind the same
// `rateLimit` interface — callers do not need to change.

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Cleanup runs on access to avoid timers (hostile to serverless runtimes)
// and bounds memory growth.
function evictExpired(now: number) {
  if (store.size > 5000) {
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key);
    }
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
