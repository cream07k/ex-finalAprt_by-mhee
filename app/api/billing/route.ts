import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const roomId = searchParams.get("roomId");

  const records = await db.billingRecord.findMany({
    where: {
      ...(month && { billingMonth: month }),
      ...(roomId && { roomId }),
    },
    include: { room: true },
    orderBy: [{ billingMonth: "desc" }, { room: { roomNumber: "asc" } }],
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    roomId, billingMonth, tenantName,
    prevElectric, currElectric, prevWater, currWater,
    electricRate, waterRate, electricCost, waterCost,
    rent, otherFee, otherFeeNote, total,
  } = body;

  if (!roomId || !billingMonth) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  // กันค่าติดลบ / มิเตอร์ย้อนกลับ
  const numFields = { prevElectric, currElectric, prevWater, currWater, electricRate, waterRate, electricCost, waterCost, rent, otherFee, total };
  for (const [k, v] of Object.entries(numFields)) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: `ค่า ${k} ไม่ถูกต้อง` }, { status: 400 });
    }
  }
  if (currElectric < prevElectric) {
    return NextResponse.json({ error: "มิเตอร์ไฟเดือนนี้ต้องไม่น้อยกว่าเดือนที่แล้ว" }, { status: 400 });
  }
  if (currWater < prevWater) {
    return NextResponse.json({ error: "มิเตอร์น้ำเดือนนี้ต้องไม่น้อยกว่าเดือนที่แล้ว" }, { status: 400 });
  }

  const id = `BILL-${roomId}-${billingMonth}`;

  const record = await db.billingRecord.upsert({
    where: { roomId_billingMonth: { roomId, billingMonth } },
    create: {
      id,
      roomId, billingMonth, tenantName: tenantName ?? "",
      prevElectric, currElectric, prevWater, currWater,
      electricRate, waterRate, electricCost, waterCost,
      rent, otherFee: otherFee ?? 0, otherFeeNote: otherFeeNote ?? "",
      total,
    },
    update: {
      tenantName: tenantName ?? "",
      prevElectric, currElectric, prevWater, currWater,
      electricRate, waterRate, electricCost, waterCost,
      rent, otherFee: otherFee ?? 0, otherFeeNote: otherFeeNote ?? "",
      total,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
