import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/token-store";
import { cacheRecord } from "@/lib/record-cache";
import { BillingRecord } from "@/lib/types";

const TTL_OPTIONS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export async function POST(req: NextRequest) {
  const { record, ttl }: { record: BillingRecord; ttl: string } = await req.json();

  if (!record?.id || !ttl) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const ttlMs = TTL_OPTIONS[ttl];
  if (!ttlMs) {
    return NextResponse.json({ error: "ระยะเวลาไม่ถูกต้อง" }, { status: 400 });
  }

  // cache record ไว้ให้หน้า /pay เรียกใช้
  cacheRecord(record);

  const entry = createToken(record.id, ttlMs);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/pay?token=${entry.token}`;

  return NextResponse.json({
    token: entry.token,
    url,
    expiresAt: new Date(entry.expiresAt).toISOString(),
  });
}
