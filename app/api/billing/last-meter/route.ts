import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ดึงค่ามิเตอร์ล่าสุดของห้อง เพื่อ autofill ในฟอร์มบันทึกเดือนถัดไป
export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "ไม่มี roomId" }, { status: 400 });

  const last = await db.billingRecord.findFirst({
    where: { roomId },
    orderBy: { billingMonth: "desc" },
    select: { currElectric: true, currWater: true, billingMonth: true },
  });

  return NextResponse.json(last ?? { currElectric: 0, currWater: 0, billingMonth: null });
}
