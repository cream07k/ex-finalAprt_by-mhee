import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_RAW = process.env.JWT_SECRET ?? "";
const SECRET     = new TextEncoder().encode(SECRET_RAW || "INVALID-NOT-SET-PLEASE-CONFIG");
const COOKIE     = "apt_session";

const PUBLIC  = ["/login", "/api/auth/login"];

// public asset extensions (image, audio, font ฯลฯ)
const PUBLIC_FILE = /\.(mp3|mp4|wav|ogg|webm|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|otf|css|js|map)$/i;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ยกเว้น routes สาธารณะ + static files
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  // ตรวจ JWT
  const token = req.cookies.get(COOKIE)?.value;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {}
  }

  // ไม่มี session
  // → API: ส่ง 401 JSON (ไม่ redirect เพราะ fetch ไม่ตาม redirect ไปหน้า HTML ได้)
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // → Page: redirect ไป login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
