"use client";

import { useEffect, useRef, useState } from "react";
import { X, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { fmtMoney } from "@/lib/store";

interface Props {
  promptPayId: string;
  amount: number;
  label: string; // เช่น "ห้อง 101 — มกราคม 2568"
  onClose: () => void;
}

export default function QRModal({ promptPayId, amount, label, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = generatePayload(promptPayId, { amount });
        await QRCode.toCanvas(canvasRef.current, payload, {
          width: 260,
          margin: 2,
          color: { dark: "#1a1a2e", light: "#ffffff" },
        });
        if (!cancelled) setError("");
      } catch {
        if (!cancelled) setError("ไม่สามารถสร้าง QR Code ได้ กรุณาตรวจสอบเบอร์พร้อมเพย์");
      }
    })();
    return () => { cancelled = true; };
  }, [promptPayId, amount]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `promptpay-${label}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="text-purple-600" size={20} />
            <span className="font-bold text-gray-800">สแกนจ่ายพร้อมเพย์</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500 text-center">{label}</p>

          <div className="text-3xl font-bold text-purple-700">
            ฿{fmtMoney(amount)}
          </div>

          {error ? (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          ) : (
            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
              <canvas ref={canvasRef} className="rounded-xl" />
            </div>
          )}

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            เปิดแอปธนาคาร → สแกน QR → ตรวจสอบยอด → ยืนยันการชำระเงิน
          </p>
        </div>

        {/* Footer */}
        {!error && (
          <div className="px-6 pb-6">
            <button
              onClick={download}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              <Download size={16} />
              บันทึก QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
