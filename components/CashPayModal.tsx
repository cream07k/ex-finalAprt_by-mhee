"use client";

import { useState } from "react";
import { Banknote, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { fmtMoney, fmtMonth, useStore, type DbBillingRecord } from "@/lib/store";

interface Props {
  record: DbBillingRecord;
  onClose: () => void;
}

export default function CashPayModal({ record, onClose }: Props) {
  const { dispatch, reload } = useStore();
  const [payerName, setPayerName] = useState(record.tenantName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!payerName.trim()) { setError("กรุณาใส่ชื่อผู้จ่าย"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/billing/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPaid:        true,
          paidAt:        new Date().toISOString(),
          paymentMethod: "cash",
          paidBy:        payerName.trim(),
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          await reload();
          setError("ไม่พบบิลในระบบ — อาจถูกลบไปแล้ว กำลังอัปเดตข้อมูล...");
          setTimeout(onClose, 1500);
          return;
        }
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      const updated = await res.json();
      dispatch({ type: "PATCH_RECORD", id: record.id, patch: updated });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#111827", border: "1px solid rgba(99,120,180,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}>

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(99,120,180,0.3)" }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: "1px solid rgba(99,120,180,0.12)" }}>
          <div className="flex items-center gap-2">
            <Banknote size={20} style={{ color: "#4ade80" }} />
            <span className="font-bold text-white">ชำระเงินสด</span>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,120,180,0.12)", color: "#8896b3" }}>
            <X size={16} />
          </motion.button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="font-semibold text-white">
              ห้อง {record.room?.roomNumber ?? record.roomId}
              {record.tenantName && <span className="text-sm font-normal" style={{ color: "var(--t2)" }}> — {record.tenantName}</span>}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>{fmtMonth(record.billingMonth)}</p>
          </div>

          <div className="rounded-2xl px-4 py-3 flex justify-between items-center"
               style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <span className="text-sm font-medium" style={{ color: "#4ade80" }}>ยอดที่รับ</span>
            <span className="text-2xl font-bold" style={{ color: "#86efac" }}>฿{fmtMoney(record.total)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>
              ชื่อผู้จ่าย *
            </label>
            <input className="input-dark" value={payerName} autoFocus
              onChange={e => setPayerName(e.target.value)}
              placeholder="ใส่ชื่อผู้จ่ายเงิน"
              maxLength={100} />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl text-sm"
                 style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <motion.button whileTap={{ scale: 0.97 }} onClick={confirm} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 16px rgba(16,185,129,0.35)" }}>
              <Check size={16} /> {saving ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}
            </motion.button>
            <button onClick={onClose} className="btn-ghost flex-1 py-3 text-sm">ยกเลิก</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
