import { QrTokenEntry } from "./types";

// เก็บ token ใน memory ฝั่ง server (ไม่หาย ตราบที่ process ยังรัน)
const tokens = new Map<string, QrTokenEntry>();

export function createToken(recordId: string, ttlMs: number): QrTokenEntry {
  // ลบ token เก่าของ record นี้ก่อน
  for (const [k, v] of tokens) {
    if (v.recordId === recordId) tokens.delete(k);
  }

  const token = crypto.randomUUID();
  const entry: QrTokenEntry = {
    token,
    recordId,
    expiresAt: Date.now() + ttlMs,
  };
  tokens.set(token, entry);
  return entry;
}

export function getToken(token: string): QrTokenEntry | undefined {
  return tokens.get(token);
}

export function markUsed(token: string) {
  const entry = tokens.get(token);
  if (entry) entry.usedAt = Date.now();
}

export function isExpired(entry: QrTokenEntry): boolean {
  return Date.now() > entry.expiresAt;
}

export function isUsed(entry: QrTokenEntry): boolean {
  return !!entry.usedAt;
}
