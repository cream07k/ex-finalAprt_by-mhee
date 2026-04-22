import { NextRequest, NextResponse } from "next/server";
import { getCachedRecord } from "@/lib/record-cache";

export async function GET(req: NextRequest) {
  const recordId = req.nextUrl.searchParams.get("recordId");
  if (!recordId) return NextResponse.json({ error: "ไม่พบ recordId" }, { status: 400 });

  const record = getCachedRecord(recordId);
  if (!record) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  return NextResponse.json({
    recordId: record.id,
    roomNumber: record.roomNumber,
    tenantName: record.tenantName,
    billingMonth: record.billingMonth,
    electricCost: record.electricCost,
    waterCost: record.waterCost,
    rent: record.rent,
    otherFee: record.otherFee,
    total: record.total,
  });
}
