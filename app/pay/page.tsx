"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Clock, Loader2, Building2 } from "lucide-react";

type Status = "loading" | "valid" | "expired" | "used" | "invalid" | "confirming" | "done" | "error";

interface RecordInfo {
  recordId: string;
  expiresAt: number;
  roomNumber: string;
  tenantName: string;
  billingMonth: string;
  electricCost: number;
  waterCost: number;
  rent: number;
  otherFee: number;
  total: number;
}

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(ym: string) {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "หมดอายุแล้ว";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} วัน ${h % 24} ชม.`;
  if (h > 0) return `${h} ชม. ${m % 60} นาที`;
  return `${m} นาที ${s % 60} วินาที`;
}

function PayContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<RecordInfo | null>(null);
  const [countdown, setCountdown] = useState("");

  const fetchToken = useCallback(async () => {
    if (!token) { setStatus("invalid"); return; }
    try {
      const res = await fetch(`/api/qr-confirm?token=${token}`);
      const json = await res.json();

      if (res.status === 410) { setStatus("expired"); return; }
      if (res.status === 409) { setStatus("used"); return; }
      if (!res.ok) { setStatus("invalid"); return; }

      const infoRes = await fetch(`/api/record-info?recordId=${json.recordId}`);
      if (!infoRes.ok) { setStatus("invalid"); return; }
      const recordInfo = await infoRes.json();

      setInfo({ ...recordInfo, expiresAt: json.expiresAt });
      setStatus("valid");
    } catch {
      setStatus("error");
    }
  }, [token]);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  useEffect(() => {
    if (status !== "valid" || !info) return;
    const tick = () => setCountdown(fmtCountdown(info.expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, info]);

  async function confirm() {
    setStatus("confirming");
    try {
      const res = await fetch("/api/qr-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.status === 410) { setStatus("expired"); return; }
      if (res.status === 409) { setStatus("used"); return; }
      if (!res.ok || json.status !== "confirmed") { setStatus("error"); return; }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-700 to-blue-600 px-6 py-5 flex items-center gap-3">
        <Building2 className="text-blue-200" size={22} />
        <div>
          <p className="text-white font-bold">ชำระค่าห้องพัก</p>
          <p className="text-blue-200 text-xs">Mhee Developer</p>
        </div>
      </div>

      <div className="px-6 py-8">

        {(status === "loading" || status === "confirming") && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="text-blue-500 animate-spin" size={36} />
            <p className="text-gray-500 text-sm">{status === "loading" ? "กำลังตรวจสอบ..." : "กำลังบันทึก..."}</p>
          </div>
        )}

        {status === "valid" && info && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">ห้อง</p>
              <p className="text-lg font-bold text-gray-800">
                {info.roomNumber}
                {info.tenantName && <span className="font-normal text-gray-500 ml-2 text-base">— {info.tenantName}</span>}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{fmtMonth(info.billingMonth)}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>ค่าไฟ</span><span>{fmtMoney(info.electricCost)} ฿</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ค่าน้ำ</span><span>{fmtMoney(info.waterCost)} ฿</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ค่าเช่า</span><span>{fmtMoney(info.rent)} ฿</span>
              </div>
              {info.otherFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>อื่นๆ</span><span>{fmtMoney(info.otherFee)} ฿</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>รวม</span><span className="text-blue-700">{fmtMoney(info.total)} ฿</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-xs">
              <Clock size={14} className="shrink-0" />
              QR หมดอายุใน {countdown}
            </div>

            <button
              onClick={confirm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              ยืนยันการชำระเงิน
            </button>
            <p className="text-xs text-gray-400 text-center">กดยืนยันหลังจากโอนเงินแล้ว</p>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle2 className="text-green-500" size={44} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">ชำระเงินสำเร็จ</p>
              <p className="text-sm text-gray-500 mt-1">บันทึกการชำระเรียบร้อยแล้ว</p>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="bg-orange-100 p-4 rounded-full">
              <Clock className="text-orange-500" size={44} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">QR หมดอายุแล้ว</p>
              <p className="text-sm text-gray-500 mt-1">กรุณาขอ QR Code ใหม่จากเจ้าของห้อง</p>
            </div>
          </div>
        )}

        {status === "used" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertCircle className="text-red-500" size={44} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">ใช้งานแล้ว</p>
              <p className="text-sm text-gray-500 mt-1">QR นี้ถูกใช้ยืนยันการชำระไปแล้ว</p>
            </div>
          </div>
        )}

        {(status === "invalid" || status === "error") && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertCircle className="text-red-500" size={44} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">QR ไม่ถูกต้อง</p>
              <p className="text-sm text-gray-500 mt-1">ไม่พบข้อมูลหรือ QR เสียหาย</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 flex flex-col items-center gap-3">
          <Loader2 className="text-blue-500 animate-spin" size={36} />
          <p className="text-gray-400 text-sm">กำลังโหลด...</p>
        </div>
      }>
        <PayContent />
      </Suspense>
    </div>
  );
}
