import { BillingRecord } from "./types";

// cache record ฝั่ง server เฉพาะที่ต้องการแสดงในหน้า /pay
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน — สอดคล้อง token TTL สูงสุด
const cache = new Map<string, { record: BillingRecord; expiresAt: number }>();

function sweep() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}

export function cacheRecord(record: BillingRecord, ttlMs: number = TTL_MS) {
  if (cache.size > 500) sweep();
  cache.set(record.id, { record, expiresAt: Date.now() + ttlMs });
}

export function getCachedRecord(id: string): BillingRecord | undefined {
  const entry = cache.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(id);
    return undefined;
  }
  return entry.record;
}
