import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tenants = await db.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      tenancies: {
        include: { room: true },
        orderBy: { startDate: "desc" },
      },
    },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, idCard, lineId, note } = body;
  if (!name?.trim()) return NextResponse.json({ error: "ไม่มีชื่อผู้เช่า" }, { status: 400 });

  // generate readable id: T-0001, T-0002, ... (ใช้เลขสูงสุด +1 เพื่อกันชนกันหลังลบ)
  const last = await db.tenant.findFirst({
    where: { id: { startsWith: "T-" } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const lastNum = last ? parseInt(last.id.slice(2), 10) || 0 : 0;
  const id = `T-${String(lastNum + 1).padStart(4, "0")}`;

  const tenant = await db.tenant.create({
    data: {
      id,
      name: name.trim(),
      phone: phone?.trim() || null,
      idCard: idCard?.trim() || null,
      lineId: lineId?.trim() || null,
      note: note?.trim() || null,
    },
  });
  return NextResponse.json(tenant, { status: 201 });
}
