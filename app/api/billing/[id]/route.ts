import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ALLOWED_PATCH_FIELDS = [
  "tenantName", "prevElectric", "currElectric", "electricRate", "electricCost",
  "prevWater", "currWater", "waterRate", "waterCost",
  "rent", "otherFee", "otherFeeNote", "total",
  "isPaid", "paidAt", "slipRef", "slipVerifiedAt",
  "paymentMethod", "paidBy",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const k of ALLOWED_PATCH_FIELDS) {
    if (k in body) data[k] = body[k];
  }
  if (body.isPaid === true && !body.paidAt) data.paidAt = new Date();
  if (body.isPaid === false) {
    data.paidAt         = null;
    data.paymentMethod  = null;
    data.paidBy         = null;
    data.slipRef        = null;
    data.slipVerifiedAt = null;
  }

  try {
    const record = await db.billingRecord.update({ where: { id }, data });
    return NextResponse.json(record);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.billingRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    }
    throw e;
  }
}
