"use client";

import { useStore, fmtMoney, fmtMonth } from "@/lib/store";
import { useMemo, useState } from "react";
import { History, Banknote, QrCode, FileText, Printer } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { DbBillingRecord } from "@/lib/store";

const ReceiptPrintModal = dynamic(() => import("@/components/ReceiptPrintModal"), { ssr: false });

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: i * 0.04, ease: "easeOut" },
  } as const;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LogsPage() {
  const { state } = useStore();
  const { records } = state;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "slip" | "cash">("all");
  const [printRec, setPrintRec] = useState<DbBillingRecord | null>(null);

  const paid = useMemo(() => {
    let list = records
      .filter(r => r.isPaid && r.paidAt)
      .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());
    if (filter !== "all") list = list.filter(r => r.paymentMethod === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.room?.roomNumber ?? "").toLowerCase().includes(q) ||
        (r.tenantName ?? "").toLowerCase().includes(q) ||
        (r.paidBy ?? "").toLowerCase().includes(q) ||
        (r.slipRef ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, search, filter]);

  const totalAmt   = paid.reduce((s, r) => s + r.total, 0);
  const slipCount  = records.filter(r => r.isPaid && r.paymentMethod === "slip").length;
  const cashCount  = records.filter(r => r.isPaid && r.paymentMethod === "cash").length;

  return (
    <div className="page-container" style={{ maxWidth: "64rem" }}>
      {/* Header */}
      <motion.div {...fu(0)}>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <History size={20} style={{ color: "#a78bfa" }} />
          ประวัติการชำระเงิน
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>
          {paid.length} รายการ · รวม ฿{fmtMoney(totalAmt)}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div {...fu(1)} className="glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: "#a78bfa" }} />
            <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>ทั้งหมด</p>
          </div>
          <p className="text-xl font-bold text-white">{records.filter(r => r.isPaid).length}</p>
        </motion.div>
        <motion.div {...fu(2)} className="glass p-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode size={14} style={{ color: "#93c5fd" }} />
            <p className="text-xs font-semibold" style={{ color: "#93c5fd" }}>โอน (สลิป)</p>
          </div>
          <p className="text-xl font-bold text-white">{slipCount}</p>
        </motion.div>
        <motion.div {...fu(3)} className="glass p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={14} style={{ color: "#4ade80" }} />
            <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>เงินสด</p>
          </div>
          <p className="text-xl font-bold text-white">{cashCount}</p>
        </motion.div>
      </div>

      {/* Filter */}
      <motion.div {...fu(4)} className="glass p-3 space-y-2.5">
        <input className="input-dark text-sm" placeholder="ค้นหา ห้อง / ผู้เช่า / ผู้จ่าย / slipRef..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          {([
            { k: "all",  label: "ทั้งหมด" },
            { k: "slip", label: "โอน" },
            { k: "cash", label: "เงินสด" },
          ] as const).map(({ k, label }) => (
            <button key={k} onClick={() => setFilter(k)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filter === k ? "rgba(167,139,250,0.18)" : "transparent",
                color:      filter === k ? "#c4b5fd" : "var(--t3)",
                border:    `1px solid ${filter === k ? "rgba(167,139,250,0.3)" : "var(--b1)"}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      {paid.length === 0 ? (
        <motion.div {...fu(5)} className="glass p-12 text-center">
          <History size={36} style={{ color: "var(--t3)" }} className="mx-auto mb-3" />
          <p className="font-semibold text-white">ยังไม่มีประวัติการชำระ</p>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>เมื่อมีการชำระบิลจะแสดงที่นี่</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {paid.map((r, i) => (
            <motion.div key={r.id} {...fu(i + 5)}
              className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-3">

              {/* Method icon */}
              <div className="flex items-center gap-3 sm:contents">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: r.paymentMethod === "cash" ? "rgba(74,222,128,0.12)" : "rgba(91,141,238,0.12)",
                    color:      r.paymentMethod === "cash" ? "#4ade80" : "#93c5fd",
                  }}>
                  {r.paymentMethod === "cash" ? <Banknote size={18} /> : <QrCode size={18} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(91,141,238,0.15)", color: "#93c5fd" }}>
                      {r.room?.roomNumber ?? r.roomId}
                    </span>
                    <span className="text-sm font-semibold text-white truncate">
                      {r.tenantName || "—"}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>
                    {fmtMonth(r.billingMonth)} · จ่ายเมื่อ {fmtDateTime(r.paidAt)}
                  </p>
                  {r.paidBy && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>
                      โดย <span className="font-medium text-white">{r.paidBy}</span>
                    </p>
                  )}
                  {r.slipRef && r.paymentMethod === "slip" && (
                    <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--t3)" }}>
                      Ref: {r.slipRef}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:contents">
                <div className="ml-auto sm:ml-0 text-right">
                  <p className="text-xs" style={{ color: "var(--t3)" }}>ยอดชำระ</p>
                  <p className="text-base font-bold text-white">฿{fmtMoney(r.total)}</p>
                </div>

                <button onClick={() => setPrintRec(r)}
                  aria-label="พิมพ์ใบเสร็จ" title="พิมพ์ใบเสร็จ"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ color: "#4ade80", background: "rgba(74,222,128,0.10)" }}>
                  <Printer size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {printRec && <ReceiptPrintModal record={printRec} onClose={() => setPrintRec(null)} />}
    </div>
  );
}
