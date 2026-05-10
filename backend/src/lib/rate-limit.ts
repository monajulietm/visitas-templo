type Bucket = { count: number; resetAt: number };
const stores = new Map<string, Map<string, Bucket>>();

function bucketsFor(name: string) {
  let s = stores.get(name);
  if (!s) {
    s = new Map();
    stores.set(name, s);
  }
  return s;
}

export function rateLimit(
  name: string,
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const buckets = bucketsFor(name);
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (b.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { allowed: true, remaining: max - b.count, retryAfterMs: 0 };
}
