import { NextRequest, NextResponse } from "next/server";
import { signToken, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit";

// secret code สำหรับปลด lockout (พิมพ์แทน password ตอนโดน lock)
const UNLOCK_CODE = "x4931";

export async function POST(req: NextRequest) {
  // ── Parse password ก่อน เพื่อตรวจ unlock code ──
  let password: string;
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "request ไม่ถูกต้อง" }, { status: 400 });
  }

  const ip      = getClientIp(req);
  const rlKey   = `login:${ip}`;

  // ── Secret unlock: ปลด lockout ทันทีและให้ลองใหม่ ──
  if (password === UNLOCK_CODE) {
    resetRateLimit(rlKey);
    return NextResponse.json({ error: "ปลดการล็อกแล้ว กรุณาใส่รหัสผ่านอีกครั้ง" }, { status: 401 });
  }

  // ── Rate limit per IP ──
  // 5 ครั้ง / 15 นาที, ผิดเกินจะ lock 15 นาที
  const rl = rateLimit(rlKey, {
    max:        5,
    windowMs:   15 * 60 * 1000,
    lockoutMs:  15 * 60 * 1000,
  });

  if (!rl.allowed) {
    const msg = rl.lockedFor
      ? `เข้าสู่ระบบถี่เกินไป กรุณาลองใหม่ใน ${Math.ceil(rl.lockedFor / 60)} นาที`
      : `กรุณาลองใหม่ใน ${rl.resetIn} วินาที`;
    return NextResponse.json({ error: msg }, {
      status: 429,
      headers: { "Retry-After": String(rl.lockedFor ?? rl.resetIn) },
    });
  }

  if (!password || password.length > 200) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  // ── Constant-time compare ป้องกัน timing attack ──
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) {
    console.error("[login] ADMIN_PASSWORD ไม่ได้ตั้งค่าใน env");
    return NextResponse.json({ error: "server config error" }, { status: 500 });
  }
  if (!safeEqual(password, expected)) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  // login สำเร็จ → reset rate limit ของ IP นี้
  resetRateLimit(rlKey);

  // ── Issue token ──
  const token = await signToken();
  const res   = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}

// ── helper: timing-safe string compare ──
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
