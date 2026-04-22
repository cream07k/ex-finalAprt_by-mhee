import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rooms = await db.room.findMany({
    orderBy: { roomNumber: "asc" },
    include: {
      tenancies: {
        where: { isActive: true },
        include: { tenant: true },
        take: 1,
      },
    },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomNumber, floor, rent } = body;
  if (!roomNumber?.trim()) return NextResponse.json({ error: "ไม่มีหมายเลขห้อง" }, { status: 400 });

  const rentValue = rent ?? 0;
  if (typeof rentValue !== "number" || !Number.isFinite(rentValue) || rentValue < 0) {
    return NextResponse.json({ error: "ค่าเช่าไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await db.room.findUnique({ where: { roomNumber: roomNumber.trim() } });
  if (existing) return NextResponse.json({ error: "หมายเลขห้องนี้มีอยู่แล้ว" }, { status: 409 });

  const id   = roomNumber.trim();
  const room = await db.room.create({
    data: { id, roomNumber: id, floor: floor?.trim() || null, rent: rentValue },
  });
  return NextResponse.json(room, { status: 201 });
}
