"use client";

import { useRef, useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Loader2, ImageIcon } from "lucide-react";
import { fmtMoney, fmtMonth, useStore, DbBillingRecord } from "@/lib/store";
import { motion } from "framer-motion";

interface Props {
  record: DbBillingRecord;
  onClose: () => void;
}

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function SlipVerifyModal({ record, onClose }: Props) {
  const { dispatch, reload } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("idle");
    setMessage("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }

  async function verify() {
    if (!file) return;
    setStatus("loading");
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("recordId", record.id);

      const res = await fetch("/api/verify-slip", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          // record หายไปจาก DB (อาจถูกลบ) — sync state แล้วปิด modal
          await reload();
          setStatus("error");
          setMessage("ไม่พบบิลในระบบแล้ว กำลังอัปเดตข้อมูล...");
          setTimeout(onClose, 1500);
          return;
        }
        if (json?.code === 1005 || json?.code === "DUPLICATE" || res.status === 409) {
          setStatus("duplicate");
          setMessage(json?.error ?? "สลิปนี้ถูกใช้งานแล้ว");
        } else {
          setStatus("error");
          setMessage(json?.error ?? "ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่");
        }
        return;
      }

      // backend mark paid ให้แล้ว — sync state ฝั่ง client
      if (json.record) {
        dispatch({ type: "PATCH_RECORD", id: record.id, patch: json.record });
      }

      setStatus("success");
      setMessage("ยืนยันการชำระเงินสำเร็จ");
      setTimeout(() => onClose(), 1800);
    } catch {
      setStatus("error");
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    }
  }

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
          <div>
            <p className="font-bold text-white">อัปโหลดสลิปโอนเงิน</p>
            <p className="text-xs mt-0.5" style={{ color: "#8896b3" }}>{roomLabel} · {fmtMonth(record.billingMonth)}</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(99,120,180,0.12)", color: "#8896b3" }}
          >
            <X size={16} />
          </motion.button>
        </div>

        <div className="px-6 py-5 space-y-4 pb-safe">
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
               style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <span className="text-sm font-medium" style={{ color: "#60a5fa" }}>ยอดที่ต้องชำระ</span>
            <span className="text-xl font-bold" style={{ color: "#93c5fd" }}>฿{fmtMoney(record.total)}</span>
          </div>

          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-36"
            style={{
              border: `2px dashed ${dragOver ? "rgba(99,102,241,0.6)" : "rgba(99,120,180,0.2)"}`,
              background: dragOver ? "rgba(99,102,241,0.08)" : "rgba(22,29,46,0.5)",
            }}
          >
            {preview ? (
              <img src={preview} alt="slip" className="max-h-[50vh] sm:max-h-60 w-auto rounded-xl object-contain" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                     style={{ background: "rgba(99,120,180,0.12)" }}>
                  <ImageIcon style={{ color: "#4a5568" }} size={22} />
                </div>
                <p className="text-sm text-center" style={{ color: "#8896b3" }}>
                  แตะเพื่อเลือกรูปสลิป<br />
                  <span style={{ color: "#4a5568" }}>หรือลากวางไฟล์ที่นี่</span>
                </p>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {status === "success" && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                 style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
              <CheckCircle2 size={18} /> {message}
            </div>
          )}
          {status === "duplicate" && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                 style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>
              <AlertCircle size={18} /> {message}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                 style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c" }}>
              <AlertCircle size={18} /> {message}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={verify}
            disabled={!file || status === "loading" || status === "success"}
            className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm text-white"
            style={
              !file || status === "loading" || status === "success"
                ? { background: "rgba(99,120,180,0.15)", color: "#4a5568" }
                : { background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }
            }
          >
            {status === "loading" ? <><Loader2 size={17} className="animate-spin" /> กำลังตรวจสอบ...</>
              : status === "success" ? <><CheckCircle2 size={17} /> ยืนยันแล้ว</>
              : <><Upload size={17} /> ตรวจสอบสลิป</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
