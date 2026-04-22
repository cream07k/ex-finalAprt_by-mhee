import { NextRequest, NextResponse } from "next/server";
import { getToken, markUsed, isExpired, isUsed } from "@/lib/token-store";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "ไม่พบ token" }, { status: 400 });

  const entry = getToken(token);
  if (!entry) return NextResponse.json({ status: "invalid" }, { status: 404 });
  if (isExpired(entry)) return NextResponse.json({ status: "expired" }, { status: 410 });
  if (isUsed(entry)) return NextResponse.json({ status: "used" }, { status: 409 });

  return NextResponse.json({ status: "valid", recordId: entry.recordId, expiresAt: entry.expiresAt });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "ไม่พบ token" }, { status: 400 });

  const entry = getToken(token);
  if (!entry) return NextResponse.json({ status: "invalid" }, { status: 404 });
  if (isExpired(entry)) return NextResponse.json({ status: "expired" }, { status: 410 });
  if (isUsed(entry)) return NextResponse.json({ status: "used" }, { status: 409 });

  markUsed(token);
  return NextResponse.json({ status: "confirmed", recordId: entry.recordId });
}
