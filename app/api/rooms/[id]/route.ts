import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { roomNumber, floor, rent } = body;

  // ห้ามเปลี่ยนหมายเลขห้อง เพราะ id = roomNumber (ถ้าเปลี่ยน จะทำให้ Tenancy/BillingRecord อ้างถึงห้องเก่าทั้งหมด)
  // ถ้าต้องการเปลี่ยนเลขห้อง ให้ลบแล้วสร้างใหม่
  if (roomNumber && roomNumber.trim() !== id) {
    return NextResponse.json(
      { error: "ไม่สามารถเปลี่ยนหมายเลขห้องได้ กรุณาลบห้องแล้วสร้างใหม่" },
      { status: 400 }
    );
  }

  if (rent !== undefined && (typeof rent !== "number" || !Number.isFinite(rent) || rent < 0)) {
    return NextResponse.json({ error: "ค่าเช่าไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const room = await db.room.update({
      where: { id },
      data: {
        ...(floor !== undefined && { floor: floor?.trim() || null }),
        ...(rent !== undefined && { rent }),
      },
    });
    return NextResponse.json(room);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.room.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });
    }
    throw e;
  }
}
