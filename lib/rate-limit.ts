/**
 * Simple in-memory rate limiter (per IP)
 * - ใช้สำหรับ low-traffic single-server
 * - กรณี multi-instance ต้องใช้ Redis แทน
 */

type Bucket = { count: number; resetAt: number; lockedUntil?: number };
const store = new Map<string, Bucket>();

// cleanup ทุก 10 นาที
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of store) {
      if ((b.lockedUntil ?? 0) < now && b.resetAt < now) store.delete(k);
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetIn:    number;        // วินาที
  lockedFor?: number;        // วินาที (ถ้าโดน lock)
}

export function rateLimit(
  key: string,
  opts: {
    max:           number;   // ครั้งสูงสุด
    windowMs:      number;   // ใน window กี่ ms
    lockoutMs?:    number;   // โดน lock กี่ ms ถ้าเกิน
  }
): RateLimitResult {
  const now = Date.now();
  const b   = store.get(key);

  // ยังโดน lock อยู่
  if (b?.lockedUntil && b.lockedUntil > now) {
    return {
      allowed: false, remaining: 0, resetIn: 0,
      lockedFor: Math.ceil((b.lockedUntil - now) / 1000),
    };
  }

  // window หมดอายุ → reset
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1, resetIn: Math.ceil(opts.windowMs / 1000) };
  }

  // เกิน limit
  if (b.count >= opts.max) {
    if (opts.lockoutMs) {
      b.lockedUntil = now + opts.lockoutMs;
      return {
        allowed: false, remaining: 0, resetIn: 0,
        lockedFor: Math.ceil(opts.lockoutMs / 1000),
      };
    }
    return { allowed: false, remaining: 0, resetIn: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count++;
  return { allowed: true, remaining: opts.max - b.count, resetIn: Math.ceil((b.resetAt - now) / 1000) };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** ปลด lock + reset count สำหรับ key นั้น (ใช้กับ secret bypass) */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
