"use client";

import { useStore, calcBilling, fmtMoney, fmtMonth, DbBillingRecord } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { Calculator, Plus, Pencil, Trash2, X, Check, CheckCircle2, AlertCircle, Printer, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const ReceiptPrintModal = dynamic(() => import("@/components/ReceiptPrintModal"), { ssr: false });

const emptyForm = {
  roomId: "", billingMonth: new Date().toISOString().slice(0, 7),
  prevElectric: 0, currElectric: 0, prevWater: 0, currWater: 0,
  otherFee: 0, otherFeeNote: "",
};

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: i * 0.05, ease: "easeOut" },
  } as const;
}

export default function CalculatePage() {
  const { state, dispatch } = useStore();
  const { rooms, records, settings } = state;

  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch]         = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [printRec, setPrintRec]       = useState<DbBillingRecord | null>(null);

  const filtered = useMemo(() =>
    records.filter(r => {
      const matchMonth  = !filterMonth || r.billingMonth === filterMonth;
      const matchSearch = !search ||
        (r.room?.roomNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.tenantName ?? "").toLowerCase().includes(search.toLowerCase());
      return matchMonth && matchSearch;
    }).sort((a, b) => (a.room?.roomNumber ?? "").localeCompare(b.room?.roomNumber ?? "", "th")),
  [records, filterMonth, search]);

  const summary = useMemo(() => ({
    totalElectric: filtered.reduce((s, r) => s + r.electricCost, 0),
    totalWater:    filtered.reduce((s, r) => s + r.waterCost,    0),
    totalRent:     filtered.reduce((s, r) => s + r.rent,         0),
    grandTotal:    filtered.reduce((s, r) => s + r.total,        0),
  }), [filtered]);

  useEffect(() => {
    if (!form.roomId || editId) return;
    setAutofilling(true);
    fetch(`/api/billing/last-meter?roomId=${form.roomId}`)
      .then(r => r.json())
      .then(data => setForm(f => ({
        ...f,
        prevElectric: data.currElectric ?? 0, currElectric: data.currElectric ?? 0,
        prevWater:    data.currWater    ?? 0, currWater:    data.currWater    ?? 0,
      })))
      .finally(() => setAutofilling(false));
  }, [form.roomId, editId]);

  function openAdd() { setForm({ ...emptyForm, billingMonth: filterMonth }); setEditId(null); setError(""); setShowForm(true); }
  function openEdit(rec: DbBillingRecord) {
    setForm({ roomId: rec.roomId, billingMonth: rec.billingMonth, prevElectric: rec.prevElectric, currElectric: rec.currElectric, prevWater: rec.prevWater, currWater: rec.currWater, otherFee: rec.otherFee, otherFeeNote: rec.otherFeeNote });
    setEditId(rec.id); setError(""); setShowForm(true);
  }

  async function save() {
    if (!form.roomId)           { setError("กรุณาเลือกห้อง"); return; }
    if (!form.billingMonth)     { setError("กรุณาเลือกเดือน"); return; }
    if (form.currElectric < form.prevElectric) { setError("มิเตอร์ไฟเดือนนี้ต้องไม่น้อยกว่าเดือนที่แล้ว"); return; }
    if (form.currWater    < form.prevWater)    { setError("มิเตอร์น้ำเดือนนี้ต้องไม่น้อยกว่าเดือนที่แล้ว"); return; }
    const room   = rooms.find(r => r.id === form.roomId)!;
    const calc   = calcBilling(form.prevElectric, form.currElectric, form.prevWater, form.currWater, room.rent, form.otherFee, settings);
    const tenant = room.tenancies?.find(t => t.isActive)?.tenant;
    const body   = { tenantName: tenant?.name ?? "", prevElectric: form.prevElectric, currElectric: form.currElectric, prevWater: form.prevWater, currWater: form.currWater, electricRate: settings.electricRate, waterRate: settings.waterRate, electricCost: calc.electricCost, waterCost: calc.waterCost, rent: room.rent, otherFee: form.otherFee, otherFeeNote: form.otherFeeNote, total: calc.total };
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/billing/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { setError("บันทึกไม่สำเร็จ"); return; }
        dispatch({ type: "UPSERT_RECORD", payload: { ...await res.json(), room } });
      } else {
        const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: form.roomId, billingMonth: form.billingMonth, ...body }) });
        if (!res.ok) { setError("บันทึกไม่สำเร็จ (อาจมีรายการเดือนนี้แล้ว)"); return; }
        dispatch({ type: "UPSERT_RECORD", payload: { ...await res.json(), room } });
      }
      setShowForm(false);
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    await fetch(`/api/billing/${id}`, { method: "DELETE" });
    dispatch({ type: "REMOVE_RECORD", id });
  }

  async function togglePaid(id: string, cur: boolean) {
    const res = await fetch(`/api/billing/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPaid: !cur }) });
    if (res.ok) dispatch({ type: "PATCH_RECORD", id, patch: await res.json() });
  }

  function exportCSV() {
    const headers = ["ห้อง","ผู้เช่า","เดือน","หน่วยไฟ","ค่าไฟ","หน่วยน้ำ","ค่าน้ำ","ค่าเช่า","ค่าอื่นๆ","รวม","สถานะ"];
    const rows = filtered.map(r => [r.room?.roomNumber ?? r.roomId, r.tenantName, fmtMonth(r.billingMonth), r.currElectric - r.prevElectric, r.electricCost.toFixed(2), r.currWater - r.prevWater, r.waterCost.toFixed(2), r.rent, r.otherFee.toFixed(2), r.total.toFixed(2), r.isPaid ? "ชำระแล้ว" : "ค้างชำระ"]);
    const csv = "﻿" + [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `บิล_${filterMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  }


  const selectedRoom = rooms.find(r => r.id === form.roomId);
  const preview = form.roomId ? calcBilling(form.prevElectric, form.currElectric, form.prevWater, form.currWater, selectedRoom?.rent ?? 0, form.otherFee, settings) : null;

  const summaryCards = [
    { label: "ค่าไฟรวม",      value: summary.totalElectric, color: "#fbbf24", border: "rgba(251,191,36,0.22)",    icon: "⚡" },
    { label: "ค่าน้ำรวม",      value: summary.totalWater,    color: "#38bdf8", border: "rgba(56,189,248,0.22)",    icon: "💧" },
    { label: "ค่าเช่ารวม",     value: summary.totalRent,     color: "#a78bfa", border: "rgba(167,139,250,0.22)",   icon: "🏠" },
    { label: "ยอดรวมทั้งหมด", value: summary.grandTotal,    color: "#4ade80", border: "rgba(74,222,128,0.22)",    icon: "💰" },
  ];

  return (
    <div className="page-container" style={{ maxWidth: "80rem" }}>
      {/* Header */}
      <motion.div {...fu(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Calculator size={22} style={{ color: "#4ade80" }} />
            คำนวณค่าใช้จ่าย
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>{filtered.length} รายการ</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd} disabled={rooms.length === 0}
          className="btn-primary text-sm px-4 py-2.5 shrink-0">
          <Plus size={15} />
          <span className="hidden sm:inline">บันทึกรายการ</span>
          <span className="sm:hidden">บันทึก</span>
        </motion.button>
      </motion.div>

      {rooms.length === 0 && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
             style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", color: "#fbbf24" }}>
          กรุณาเพิ่มห้องก่อนในหน้า &ldquo;จัดการห้อง&rdquo;
        </div>
      )}

      {/* Filter bar */}
      <motion.div {...fu(1)} className="glass p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>ค้นหาห้อง / ผู้เช่า</label>
          <input type="text" className="input-dark" placeholder="พิมพ์เพื่อค้นหา..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>เดือน</label>
            <input type="month" className="input-dark" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={exportCSV} disabled={filtered.length === 0}
            className="btn-ghost flex items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-40 whitespace-nowrap">
            <Download size={13} /> CSV
          </motion.button>
        </div>
      </motion.div>

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map(({ label, value, color, border, icon }, i) => (
            <motion.div key={label} {...fu(i + 2)}
              className="glass-xs p-4"
              style={{ borderColor: border }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{icon}</span>
                <p className="text-xs font-semibold" style={{ color: color }}>{label}</p>
              </div>
              <p className="text-lg font-bold" style={{ color: "#eef2ff" }}>฿{fmtMoney(value)}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Records */}
      {state.loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent spin-smooth"
               style={{ borderColor: "#4ade80", borderTopColor: "transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...fu(2)} className="glass p-14 text-center">
          <div className="animate-float inline-block mb-4">
            <Calculator style={{ color: "var(--t3)" }} size={40} className="mx-auto" />
          </div>
          <p className="font-semibold text-white">ไม่พบรายการ</p>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>กดปุ่ม &ldquo;บันทึก&rdquo; เพื่อเพิ่มข้อมูล</p>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div {...fu(6)} className="hidden lg:block glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--b2)" }}>
                  {["ห้อง","ผู้เช่า","ค่าไฟ","ค่าน้ำ","ค่าเช่า","อื่นๆ","รวม","สถานะ",""].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-bold ${i >= 2 && i <= 6 ? "text-right" : i === 7 ? "text-center" : "text-left"}`}
                        style={{ color: "var(--t2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <motion.tr key={r.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="tbl-row"
                    style={{ borderBottom: "1px solid var(--b1)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(91,141,238,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: "rgba(91,141,238,0.15)", color: "#93c5fd" }}>
                        {r.room?.roomNumber ?? r.roomId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--t2)" }}>{r.tenantName || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "#fbbf24" }}>฿{fmtMoney(r.electricCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "#38bdf8" }}>฿{fmtMoney(r.waterCost)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--t2)" }}>฿{fmtMoney(r.rent)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--t3)" }}>{r.otherFee > 0 ? `฿${fmtMoney(r.otherFee)}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">฿{fmtMoney(r.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePaid(r.id, r.isPaid)}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold transition-all ${r.isPaid ? "badge-green" : "badge-red"}`}>
                        {r.isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        {r.isPaid ? "ชำระแล้ว" : "ค้างชำระ"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {[
                          { icon: Printer, fn: () => setPrintRec(r), hc: "#4ade80", hb: "rgba(74,222,128,0.12)" },
                          { icon: Pencil,  fn: () => openEdit(r),    hc: "#93c5fd", hb: "rgba(91,141,238,0.14)" },
                          { icon: Trash2,  fn: () => del(r.id),      hc: "#fca5a5", hb: "rgba(248,113,113,0.12)" },
                        ].map(({ icon: Icon, fn, hc, hb }, i2) => (
                          <button key={i2} onClick={fn}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: "var(--t3)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = hb; e.currentTarget.style.color = hc; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t3)"; }}>
                            <Icon size={13} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile + Tablet cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((r, i) => (
              <motion.div key={r.id} {...fu(i)} className="glass p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(91,141,238,0.15)", color: "#93c5fd" }}>
                      {r.room?.roomNumber ?? r.roomId}
                    </span>
                    {r.tenantName && <span className="text-sm" style={{ color: "var(--t2)" }}>{r.tenantName}</span>}
                  </div>
                  <button onClick={() => togglePaid(r.id, r.isPaid)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-bold ${r.isPaid ? "badge-green" : "badge-red"}`}>
                    {r.isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                    {r.isPaid ? "ชำระแล้ว" : "ค้างชำระ"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  {[
                    { label: "ค่าไฟ", value: r.electricCost, color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
                    { label: "ค่าน้ำ", value: r.waterCost,   color: "#38bdf8", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.15)" },
                    { label: "ค่าเช่า", value: r.rent,       color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.15)" },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className="rounded-xl px-2 py-2 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                      <p style={{ color: color + "bb" }}>{label}</p>
                      <p className="font-bold mt-0.5" style={{ color }}>฿{fmtMoney(value)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">รวม ฿{fmtMoney(r.total)}</span>
                  <div className="flex gap-2">
                    {[
                      { icon: Printer, fn: () => setPrintRec(r), label: "พิมพ์", c: "#4ade80", bg: "rgba(74,222,128,0.10)" },
                      { icon: Pencil,  fn: () => openEdit(r),    label: "แก้ไข", c: "#93c5fd", bg: "rgba(91,141,238,0.10)" },
                      { icon: Trash2,  fn: () => del(r.id),      label: "ลบ",   c: "#fca5a5", bg: "rgba(248,113,113,0.10)" },
                    ].map(({ icon: Icon, fn, label, c, bg }, i2) => (
                      <button key={i2} onClick={fn}
                        aria-label={label} title={label}
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: c, background: bg }}>
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-pop w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
              style={{ borderRadius: "22px 22px 0 0" }}
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}>
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--b2)" }} />
              </div>
              {/* Sticky header */}
              <div className="sticky top-0 px-6 py-4 flex items-center justify-between z-10"
                   style={{ background: "var(--s3)", borderBottom: "1px solid var(--b2)" }}>
                <h2 className="font-bold text-white">{editId ? "แก้ไขรายการ" : "บันทึกรายการใหม่"}</h2>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--b2)", color: "var(--t2)" }}><X size={15} /></motion.button>
              </div>

              <div className="p-6 space-y-5">
                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                       style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}>
                    {error}
                  </div>
                )}

                {/* Room + Month */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>ห้อง *</label>
                    <select className="input-dark" value={form.roomId}
                      onChange={e => setForm({ ...emptyForm, billingMonth: form.billingMonth, roomId: e.target.value })}
                      disabled={!!editId}>
                      <option value="">-- เลือกห้อง --</option>
                      {rooms.map(r => {
                        const t = r.tenancies?.find(t => t.isActive)?.tenant;
                        return <option key={r.id} value={r.id}>{r.roomNumber}{t ? ` - ${t.name}` : ""}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>เดือน *</label>
                    <input type="month" className="input-dark" value={form.billingMonth}
                      onChange={e => setForm({ ...form, billingMonth: e.target.value })} disabled={!!editId} />
                  </div>
                </div>

                {autofilling && (
                  <p className="text-xs text-center" style={{ color: "#93c5fd" }}>⚡ กำลังดึงมิเตอร์เดือนล่าสุด...</p>
                )}

                {/* Electric */}
                <div className="p-4 rounded-2xl" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "#fbbf24" }}>⚡ มิเตอร์ไฟ — {settings.electricRate} บาท/หน่วย</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="เดือนที่แล้ว" value={form.prevElectric} onChange={v => setForm({ ...form, prevElectric: v })} />
                    <NumField label="เดือนนี้"     value={form.currElectric} onChange={v => setForm({ ...form, currElectric: v })} />
                  </div>
                  {form.currElectric >= form.prevElectric && (
                    <p className="text-xs mt-2" style={{ color: "rgba(251,191,36,0.7)" }}>
                      ใช้ไป {form.currElectric - form.prevElectric} หน่วย = ฿{fmtMoney((form.currElectric - form.prevElectric) * settings.electricRate)}
                    </p>
                  )}
                </div>

                {/* Water */}
                <div className="p-4 rounded-2xl" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)" }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "#38bdf8" }}>💧 มิเตอร์น้ำ — {settings.waterRate} บาท/หน่วย</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="เดือนที่แล้ว" value={form.prevWater} onChange={v => setForm({ ...form, prevWater: v })} />
                    <NumField label="เดือนนี้"     value={form.currWater} onChange={v => setForm({ ...form, currWater: v })} />
                  </div>
                  {form.currWater >= form.prevWater && (
                    <p className="text-xs mt-2" style={{ color: "rgba(56,189,248,0.7)" }}>
                      ใช้ไป {form.currWater - form.prevWater} หน่วย = ฿{fmtMoney((form.currWater - form.prevWater) * settings.waterRate)}
                    </p>
                  )}
                </div>

                {/* Other fee */}
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="ค่าใช้จ่ายอื่นๆ (บาท)" value={form.otherFee} onChange={v => setForm({ ...form, otherFee: v })} />
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>หมายเหตุ</label>
                    <input type="text" className="input-dark" value={form.otherFeeNote}
                      onChange={e => setForm({ ...form, otherFeeNote: e.target.value })} placeholder="เช่น ค่าอินเทอร์เน็ต" />
                  </div>
                </div>

                {/* Preview */}
                {preview && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl"
                    style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)" }}>
                    <p className="text-xs font-bold mb-3" style={{ color: "#4ade80" }}>📊 สรุปค่าใช้จ่าย</p>
                    <div className="space-y-1.5 text-sm">
                      {[
                        { label: `ค่าไฟ (${preview.electricUsed} หน่วย)`, value: preview.electricCost, color: "#fbbf24" },
                        { label: `ค่าน้ำ (${preview.waterUsed} หน่วย)`,   value: preview.waterCost,   color: "#38bdf8" },
                        { label: "ค่าเช่า",                               value: selectedRoom?.rent ?? 0, color: "#a78bfa" },
                        ...(form.otherFee > 0 ? [{ label: "ค่าอื่นๆ", value: form.otherFee, color: "var(--t2)" }] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between">
                          <span style={{ color: "var(--t2)" }}>{label}</span>
                          <span className="font-semibold" style={{ color }}>฿{fmtMoney(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-2 text-base"
                           style={{ borderTop: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                        <span>รวมทั้งสิ้น</span><span>฿{fmtMoney(preview.total)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
                  className="btn-primary flex-1 py-2.5 text-sm">
                  <Check size={15} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </motion.button>
                <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 text-sm">ยกเลิก</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {printRec && <ReceiptPrintModal record={printRec} mode="invoice" onClose={() => setPrintRec(null)} />}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{label}</label>
      <input type="number" min="0" className="input-dark" value={value || ""}
        onChange={e => onChange(parseFloat(e.target.value) || 0)} placeholder="0" />
    </div>
  );
}
