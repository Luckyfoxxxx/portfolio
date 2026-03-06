// In-memory rate limiter for login attempts.
// Keyed by IP. 5 attempts per 15 minutes.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let bucket = store.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, bucket);
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export function resetRateLimit(ip: string): void {
  store.delete(ip);
}
