import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { roomId, tenantId, startDate } = await req.json();
  if (!roomId || !tenantId || !startDate) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const endAt = new Date(startDate);

  // ปิด tenancy เก่าของห้องนี้ก่อน (กันห้องซ้ำ)
  await db.tenancy.updateMany({
    where: { roomId, isActive: true },
    data: { isActive: false, endDate: endAt },
  });

  // ปิด tenancy เก่าของผู้เช่าคนนี้ด้วย (กันผู้เช่า active 2 ห้อง)
  await db.tenancy.updateMany({
    where: { tenantId, isActive: true },
    data: { isActive: false, endDate: endAt },
  });

  // ใส่ timestamp กัน id ชนกันเวลาผูก-ยกเลิก-ผูกใหม่ในวันเดียว
  const id = `TNC-${roomId}-${tenantId}-${startDate.slice(0, 10)}-${Date.now()}`;

  const tenancy = await db.tenancy.create({
    data: { id, roomId, tenantId, startDate: new Date(startDate), isActive: true },
    include: { tenant: true, room: true },
  });
  return NextResponse.json(tenancy, { status: 201 });
}
