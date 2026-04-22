"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { Settings, Zap, Droplets, Building2, Check, RefreshCw, Smartphone, FileText, MapPin, Phone, Image as ImageIcon, X } from "lucide-react";
import { motion } from "framer-motion";

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay: i * 0.07, ease: "easeOut" },
  } as const;
}

const defaultForm = {
  electricRate: 8,
  waterRate: 18,
  apartmentName: "อพาร์ตเมนต์ของฉัน",
  promptPayId: "",
  apartmentAddress: "",
  apartmentPhone: "",
  apartmentLogo: "",
  invoiceFooter: "ขอบคุณที่ชำระตรงเวลา",
  receiptFooter: "ขอบคุณที่ชำระค่าเช่า",
};

export default function SettingsPage() {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(defaultForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!state.loading) setForm({ ...defaultForm, ...state.settings });
  }, [state.settings, state.loading]);

  async function save() {
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) return;
    dispatch({ type: "SET_SETTINGS", payload: { ...defaultForm, ...await res.json() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function reset() {
    if (!confirm("รีเซ็ตค่าตั้งต้นทั้งหมด?")) return;
    setForm(defaultForm);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defaultForm) });
    dispatch({ type: "SET_SETTINGS", payload: defaultForm });
  }

  return (
    <div className="page-container" style={{ maxWidth: "40rem" }}>
      <motion.div {...fu(0)}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings size={22} style={{ color: "var(--accent-hi)" }} />
          ตั้งค่า
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>ปรับแต่งข้อมูลอพาร์ตเมนต์และอัตราค่าน้ำ-ค่าไฟ</p>
      </motion.div>

      <div className="space-y-4">
        {/* Apartment name */}
        <motion.div {...fu(1)} className="glass p-5">
          <div className="relative bottom-3 flex items-center gap-2.5 mb-4">
            <Building2 size={16} style={{ color: "var(--accent-hi)" }} />
            <p className="font-semibold text-white text-sm">ข้อมูลอพาร์ตเมนต์</p>
          </div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}></label>
          <input className="input-dark" value={form.apartmentName}
            onChange={e => setForm({ ...form, apartmentName: e.target.value })}
            placeholder="ชื่ออพาร์ตเมนต์ของคุณ" />
        </motion.div>

        {/* PromptPay */}
        <motion.div {...fu(2)} className="glass p-5">
          <div className="relative bottom-3 flex items-center gap-2.5 mb-4">
            <Smartphone size={16} style={{ color: "var(--accent-hi)" }} />
            <p className="font-semibold text-white text-sm">พร้อมเพย์ (PromptPay)</p>
          </div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}></label>
          <input className="input-dark" value={form.promptPayId ?? ""}
            onChange={e => setForm({ ...form, promptPayId: e.target.value })}
            placeholder="0812345678 หรือ 1234567890123" maxLength={13} />
          <p className="relative top-2 text-xs mt-4" style={{ color: "var(--t3)" }}>ใช้สร้าง QR Code รับเงินในหน้าเช็คยอด</p>
        </motion.div>

        {/* Rates */}
        <motion.div {...fu(3)} className="glass p-5">
          <p className="relative bottom-3 font-semibold text-white text-sm mb-4">อัตราค่าสาธารณูปโภค</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className=" relative bottom-2.5 flex items-center gap-2 mb-3">
                <Zap size={14} style={{ color: "#f59e0b" }} />
                <label className="text-xs font-semibold" style={{ color: "#f59e0b" }}>ค่าไฟต่อหน่วย</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" className="input-dark flex-1"
                  value={form.electricRate}
                  onChange={e => setForm({ ...form, electricRate: parseFloat(e.target.value) || 0 })} />
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--t2)" }}>บาท/หน่วย</span>
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <div className="relative bottom-2.5 flex items-center gap-2 mb-3">
                <Droplets size={14} style={{ color: "#38bdf8" }} />
                <label className="text-xs font-semibold" style={{ color: "#38bdf8" }}>ค่าน้ำต่อหน่วย</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" className="input-dark flex-1 "
                  value={form.waterRate}
                  onChange={e => setForm({ ...form, waterRate: parseFloat(e.target.value) || 0 })} />
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--t2)" }}>บาท/หน่วย</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Template Editor (ใบแจ้ง/ใบเสร็จ) ── */}
        <motion.div {...fu(4)} className="glass" style={{ padding: "1.75rem 1.5rem" }}>
          <div className="flex items-center gap-2.5" style={{ marginBottom: "2.25rem" }}>
            <FileText size={16} style={{ color: "var(--accent-hi)" }} />
            <p className="font-semibold text-white text-sm">ข้อมูลในใบแจ้งหนี้ / ใบเสร็จ</p>
          </div>

          {/* Logo */}
          <div style={{ marginBottom: "2rem" }}>
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--t2)", marginBottom: "0.875rem" }}>
              <ImageIcon size={12} /> โลโก้หอพัก
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="flex justify-center sm:block">
                {form.apartmentLogo ? (
                  <div className="relative w-24 h-24 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white p-1.5 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.apartmentLogo} alt="logo" className="w-full h-full object-contain" />
                    <button onClick={() => setForm({ ...form, apartmentLogo: "" })}
                      aria-label="ลบโลโก้"
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "var(--err)", color: "white" }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(91,141,238,0.08)", border: "1.5px dashed var(--b2)" }}>
                    <ImageIcon size={28} style={{ color: "var(--t3)" }} />
                  </div>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 500 * 1024) { alert("รูปต้องไม่เกิน 500 KB"); return; }
                    const reader = new FileReader();
                    reader.onload = () => setForm({ ...form, apartmentLogo: String(reader.result) });
                    reader.readAsDataURL(f);
                  }} />
                <div className="text-center text-sm sm:text-xs font-semibold py-3.5 sm:py-4 px-4 rounded-xl transition-all"
                  style={{ background: "rgba(91,141,238,0.1)", color: "var(--accent-hi)", border: "1px solid rgba(91,141,238,0.25)" }}>
                  {form.apartmentLogo ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                  <p style={{ color: "var(--t3)", fontSize: "10.5px", marginTop: "4px" }}>JPG, PNG ไม่เกิน 500 KB</p>
                </div>
              </label>
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: "2rem" }}>
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--t2)", marginBottom: "0.875rem" }}>
              <MapPin size={12} /> ที่อยู่
            </label>
            <textarea className="input-dark resize-none" rows={2}
              value={form.apartmentAddress}
              onChange={e => setForm({ ...form, apartmentAddress: e.target.value })}
              placeholder="123/45 ถ. xxx ต. xxx อ. xxx จ. xxx 10xxx"
              maxLength={300} />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: "2rem" }}>
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--t2)", marginBottom: "0.875rem" }}>
              <Phone size={12} /> เบอร์ติดต่อ
            </label>
            <input className="input-dark" value={form.apartmentPhone}
              onChange={e => setForm({ ...form, apartmentPhone: e.target.value })}
              placeholder="08x-xxx-xxxx"
              maxLength={50} />
          </div>

          {/* Footers — 2 col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "2rem" }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: "var(--t2)", marginBottom: "0.875rem" }}>
                ข้อความท้ายใบแจ้งหนี้
              </label>
              <input className="input-dark" value={form.invoiceFooter}
                onChange={e => setForm({ ...form, invoiceFooter: e.target.value })}
                placeholder="ขอบคุณที่ชำระตรงเวลา"
                maxLength={200} />
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: "var(--t2)", marginBottom: "0.875rem" }}>
                ข้อความท้ายใบเสร็จ
              </label>
              <input className="input-dark" value={form.receiptFooter}
                onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
                placeholder="ขอบคุณที่ชำระค่าเช่า"
                maxLength={200} />
            </div>
          </div>
        </motion.div>

        {/* Preview */}
        <motion.div {...fu(5)} className="glass p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--t3)" }}>ตัวอย่างการคำนวณ</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--t2)" }}>ไฟ 100 หน่วย</span>
              <span className="font-bold" style={{ color: "#f59e0b" }}>= ฿{(form.electricRate * 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--t2)" }}>น้ำ 10 หน่วย</span>
              <span className="font-bold" style={{ color: "#38bdf8" }}>= ฿{(form.waterRate * 10).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        <motion.div {...fu(5)} className="flex gap-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={save}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={saved
              ? { background: "var(--ok)", boxShadow: "0 4px 16px rgba(47,179,122,0.35)" }
              : { background: "var(--accent)", boxShadow: "0 4px 16px rgba(91,141,238,0.35)" }
            }>
            <Check size={15} /> {saved ? "บันทึกแล้ว!" : "บันทึกการตั้งค่า"}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
            className="btn-ghost flex items-center gap-2 px-5 py-3 text-sm">
            <RefreshCw size={13} /> รีเซ็ต
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
