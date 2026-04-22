"use client";

import { useEffect, useRef } from "react";
import { X, QrCode, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { fmtMoney, fmtMonth, useStore, DbBillingRecord } from "@/lib/store";
import { motion } from "framer-motion";

interface Props {
  record: DbBillingRecord;
  onClose: () => void;
}

export default function QRPayModal({ record, onClose }: Props) {
  const { state } = useStore();
  const promptPayId = state.settings.promptPayId?.trim() ?? "";
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!promptPayId || !canvasRef.current) return;
    const payload = generatePayload(promptPayId, { amount: record.total });
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 260,
      margin: 2,
      color: { dark: "#0a0f1e", light: "#ffffff" },
    });
  }, [promptPayId, record.total]);

  const roomLabel = `ห้อง ${record.room?.roomNumber ?? record.roomId}${record.tenantName ? ` — ${record.tenantName}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#111827", border: "1px solid rgba(99,120,180,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(99,120,180,0.3)" }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: "1px solid rgba(99,120,180,0.12)" }}>
          <div className="flex items-center gap-2">
            <QrCode style={{ color: "#a78bfa" }} size={20} />
            <span className="font-bold text-white">QR PromptPay</span>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(99,120,180,0.12)", color: "#8896b3" }}
          >
            <X size={16} />
          </motion.button>
        </div>

        <div className="px-6 py-5 space-y-4 pb-safe">
          <div>
            <p className="font-semibold text-white">{roomLabel}</p>
            <p className="text-sm mt-0.5" style={{ color: "#8896b3" }}>{fmtMonth(record.billingMonth)}</p>
          </div>

          <div className="rounded-2xl px-4 py-3 flex justify-between items-center"
               style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <span className="text-sm font-medium" style={{ color: "#a78bfa" }}>ยอดชำระ</span>
            <span className="text-2xl font-bold" style={{ color: "#c4b5fd" }}>฿{fmtMoney(record.total)}</span>
          </div>

          {!promptPayId && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                 style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <AlertCircle style={{ color: "#fbbf24" }} className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>ยังไม่ได้ตั้งค่าพร้อมเพย์</p>
                <p className="text-xs mt-0.5" style={{ color: "#d97706" }}>ไปที่ <span className="font-medium">ตั้งค่า → พร้อมเพย์</span> แล้วใส่เบอร์โทร</p>
              </div>
            </div>
          )}

          {promptPayId && (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ background: "#ffffff", border: "3px solid rgba(167,139,250,0.3)", boxShadow: "0 0 30px rgba(167,139,250,0.15)" }}>
                <canvas ref={canvasRef} className="rounded-xl block" />
              </div>
              <p className="text-xs text-center" style={{ color: "#4a5568" }}>สแกนด้วยแอปธนาคาร KBank, ออมสิน หรือแอปอื่นๆ</p>
              <p className="text-xs" style={{ color: "#4a5568" }}>
                พร้อมเพย์: <span className="font-medium" style={{ color: "#8896b3" }}>{promptPayId}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
