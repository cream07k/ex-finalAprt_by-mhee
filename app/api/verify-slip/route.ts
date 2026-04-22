import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const MAX_FILE_BYTES = 5 * 1024 * 1024;          // 5 MB
const ALLOWED_MIME   = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
]);
const MAX_SLIP_AGE_DAYS = 30;

// normalize เลขบัญชี/พร้อมเพย์: ตัด -, ช่องว่าง, X (mask) ออก แล้วเอาแต่ตัวเลข
function normalize(s: string): string {
  return (s || "").replace(/[\s\-]/g, "").replace(/x/gi, "").replace(/\D/g, "");
}

// เช็คว่า account จาก slip ตรงกับ promptPayId หรือไม่
// EasySlip จะ mask เป็น xxx-x-x1234 → เทียบ suffix อย่างน้อย 4 หลัก
function accountMatches(slipAccount: string, expected: string): boolean {
  const a = normalize(slipAccount);
  const b = normalize(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  // เทียบ suffix (กรณี mask) 4 หลักท้าย
  if (a.length >= 4 && b.length >= 4 && a.slice(-4) === b.slice(-4)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`slip:${ip}`, { max: 20, windowMs: 5 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "ตรวจสลิปบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  }

  const apiKey = process.env.SLIP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ไม่พบ API key" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const recordId = formData.get("recordId") as string | null;

    if (!file)     return NextResponse.json({ error: "ไม่พบไฟล์สลิป" }, { status: 400 });
    if (!recordId) return NextResponse.json({ error: "ไม่พบรหัสบิล" }, { status: 400 });

    if (file.size > MAX_FILE_BYTES)    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5 MB" }, { status: 413 });
    if (!ALLOWED_MIME.has(file.type))  return NextResponse.json({ error: "รองรับเฉพาะรูปภาพ JPG/PNG/WebP" }, { status: 415 });

    // ── ดึง record + settings มาเทียบ (ไม่ trust client) ──
    const [record, settings] = await Promise.all([
      db.billingRecord.findUnique({ where: { id: recordId } }),
      db.settings.findUnique({ where: { id: 1 } }),
    ]);
    if (!record)   return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
    if (record.isPaid) return NextResponse.json({ error: "บิลนี้ชำระแล้ว" }, { status: 409 });

    const expectedPromptPay = settings?.promptPayId?.trim() ?? "";
    if (!expectedPromptPay) {
      return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาติดต่อผู้ดูแล" }, { status: 500 });
    }

    // ── เรียก EasySlip ──
    const upstream = new FormData();
    upstream.append("file", file);

    const res = await fetch("https://developer.easyslip.com/api/v1/verify", {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body:    upstream,
    });

    const json = await res.json();

    if (!res.ok) {
      const msg = json?.message ?? "";
      if (msg === "duplicate_slip" || res.status === 409) {
        return NextResponse.json({ error: "สลิปนี้ถูกใช้งานแล้ว", code: 1005 }, { status: 409 });
      }
      return NextResponse.json({ error: msg || "ตรวจสลิปไม่สำเร็จ" }, { status: res.status });
    }

    // ── Validate สลิป (อยู่ภายใต้ data หรือ root) ──
    const data    = json?.data ?? json ?? {};
    const transRef: string  = data.transRef ?? "";
    const slipAmt: number   = Number(data?.amount?.amount ?? data?.amount?.local?.amount ?? data?.amount ?? 0);

    // รวมทุก field ที่อาจมีเลขบัญชี/PromptPay ของผู้รับ (EasySlip คืน structure ต่างกันตาม bank)
    const receiverCandidates: string[] = [
      data?.receiver?.account?.value,
      data?.receiver?.account?.bank?.account,
      data?.receiver?.proxy?.value,
      data?.receiver?.proxy?.account,
      data?.receiver?.bank?.account,
      data?.receiver?.account?.name?.th,
      data?.receiver?.account?.name?.en,
      data?.receiver?.displayName,
      data?.receiver?.name,
    ].filter((v): v is string => typeof v === "string" && v.length > 0);

    const dateStr: string   = data?.date ?? data?.transactionDate ?? "";
    const slipDate          = dateStr ? new Date(dateStr) : null;

    // 1) ยอดเงิน — สลิปต้อง ≥ ยอดบิล
    if (!slipAmt || slipAmt + 0.01 < record.total) {
      return NextResponse.json({
        error: `ยอดเงินไม่ถูกต้อง: สลิป ฿${slipAmt.toLocaleString()} แต่ต้องชำระ ฿${record.total.toLocaleString()}`,
        code:  "AMOUNT_MISMATCH",
      }, { status: 400 });
    }

    // 2) ผู้รับเงิน — ตรวจเฉพาะถ้าสลิปมีเลขบัญชี/PromptPay มา
    //    (บาง bank/tier ของ EasySlip ส่งมาแค่ชื่อ → ข้าม check นี้ เพราะ amount + duplicate ก็เพียงพอ)
    const numericCandidates = receiverCandidates.filter(c => /\d/.test(c));
    if (numericCandidates.length > 0) {
      const matched = numericCandidates.some(c => accountMatches(c, expectedPromptPay));
      if (!matched) {
        const debug = numericCandidates.map(c => c.replace(/\d(?=\d{4})/g, "x")).join(", ");
        return NextResponse.json({
          error: `ผู้รับเงินไม่ตรงกับบัญชีของหอพัก (สลิป: ${debug}) กรุณาตรวจสอบและโอนใหม่`,
          code:  "RECEIVER_MISMATCH",
        }, { status: 400 });
      }
    } else {
      console.warn("[verify-slip] EasySlip ไม่ส่งเลขบัญชีผู้รับ — ข้าม receiver check (slip:", receiverCandidates.join("|"), ")");
    }

    // 3) วันที่ — สลิปต้องไม่เก่าเกิน MAX_SLIP_AGE_DAYS
    if (slipDate && !isNaN(slipDate.getTime())) {
      const ageDays = (Date.now() - slipDate.getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays > MAX_SLIP_AGE_DAYS) {
        return NextResponse.json({
          error: `สลิปเก่าเกินไป (${Math.floor(ageDays)} วัน) — รับเฉพาะสลิปอายุไม่เกิน ${MAX_SLIP_AGE_DAYS} วัน`,
          code:  "SLIP_TOO_OLD",
        }, { status: 400 });
      }
      if (slipDate.getTime() > Date.now() + 60 * 60 * 1000) {
        return NextResponse.json({ error: "วันที่ในสลิปไม่ถูกต้อง", code: "FUTURE_DATE" }, { status: 400 });
      }
    }

    // 4) Duplicate — เช็คใน DB (ไม่ใช่ client)
    if (transRef) {
      const dup = await db.billingRecord.findFirst({
        where: { slipRef: transRef, NOT: { id: recordId } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({
          error: "สลิปนี้ถูกใช้ยืนยันบิลอื่นแล้ว",
          code:  "DUPLICATE",
        }, { status: 409 });
      }
    }

    // ── ผ่านทุกเกณฑ์ → mark paid ฝั่ง server (ไม่ trust client) ──
    const senderName: string =
      data?.sender?.account?.name?.th ??
      data?.sender?.account?.name?.en ??
      data?.sender?.displayName ?? "";

    const updated = await db.billingRecord.update({
      where: { id: recordId },
      data: {
        isPaid:         true,
        paidAt:         new Date(),
        slipRef:        transRef || `verified-${Date.now()}`,
        slipVerifiedAt: new Date(),
        paymentMethod:  "slip",
        paidBy:         senderName.slice(0, 100) || record.tenantName || null,
      },
    });

    return NextResponse.json({
      ok: true,
      record: updated,
      slip: { amount: slipAmt, transRef, date: dateStr, receiver: receiverCandidates[0] ?? "" },
    });
  } catch (e) {
    console.error("[verify-slip] exception:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อ EasySlip" }, { status: 500 });
  }
}
