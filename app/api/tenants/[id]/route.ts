import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, phone, idCard, lineId, note } = await req.json();

  if (idCard && !/^\d{13}$/.test(idCard.replace(/\s|-/g, ""))) {
    return NextResponse.json({ error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" }, { status: 400 });
  }
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) {
    return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const tenant = await db.tenant.update({
      where: { id },
      data: {
        ...(name && { name: name.trim().slice(0, 100) }),
        phone:  phone?.trim().slice(0, 20)  || null,
        idCard: idCard?.trim().slice(0, 20) || null,
        lineId: lineId?.trim().slice(0, 50) || null,
        note:   note?.trim().slice(0, 500)  || null,
      },
    });
    return NextResponse.json(tenant);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
    }
    throw e;
  }
}
