import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const settings = await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.electricRate != null && (typeof body.electricRate !== "number" || body.electricRate < 0)) {
    return NextResponse.json({ error: "ค่าไฟต้องไม่ติดลบ" }, { status: 400 });
  }
  if (body.waterRate != null && (typeof body.waterRate !== "number" || body.waterRate < 0)) {
    return NextResponse.json({ error: "ค่าน้ำต้องไม่ติดลบ" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.electricRate     === "number") data.electricRate     = body.electricRate;
  if (typeof body.waterRate        === "number") data.waterRate        = body.waterRate;
  if (typeof body.apartmentName    === "string") data.apartmentName    = body.apartmentName.slice(0, 100);
  if (typeof body.promptPayId      === "string") data.promptPayId      = body.promptPayId.slice(0, 50);
  if (typeof body.apartmentAddress === "string") data.apartmentAddress = body.apartmentAddress.slice(0, 300);
  if (typeof body.apartmentPhone   === "string") data.apartmentPhone   = body.apartmentPhone.slice(0, 50);
  if (typeof body.apartmentLogo    === "string") data.apartmentLogo    = body.apartmentLogo.slice(0, 1_000_000); // ≤1MB base64
  if (typeof body.invoiceFooter    === "string") data.invoiceFooter    = body.invoiceFooter.slice(0, 200);
  if (typeof body.receiptFooter    === "string") data.receiptFooter    = body.receiptFooter.slice(0, 200);

  const settings = await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return NextResponse.json(settings);
}
