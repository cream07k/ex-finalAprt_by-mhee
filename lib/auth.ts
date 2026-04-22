import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE  = "apt_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

function getSecret() {
  const raw = process.env.JWT_SECRET ?? "";
  if (raw.length < 32) {
    throw new Error("JWT_SECRET ต้องมีอย่างน้อย 32 ตัว — ใช้ `openssl rand -hex 32` สร้าง");
  }
  return new TextEncoder().encode(raw);
}

export async function signToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar   = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name:     COOKIE,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge:   MAX_AGE,
    path:     "/",
  };
}

export function clearCookieOptions() {
  return {
    name:    COOKIE,
    value:   "",
    maxAge:  0,
    path:    "/",
  };
}
