"use client";

import { useStore, fmtMoney, fmtMonth, DbBillingRecord } from "@/lib/store";
import { useMemo, useState } from "react";
import { Wallet, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Check, Upload, QrCode, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const SlipVerifyModal = dynamic(() => import("@/components/SlipVerifyModal"), { ssr: false });
const QRPayModal      = dynamic(() => import("@/components/QRPayModal"),      { ssr: false });
const CashPayModal    = dynamic(() => import("@/components/CashPayModal"),    { ssr: false });

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay: i * 0.06, ease: "easeOut" },
  } as const;
}

type RoomBalance = {
  roomId: string; roomNumber: string; tenantName: string;
  unpaidRecords: DbBillingRecord[]; unpaidTotal: number; paidRecords: DbBillingRecord[];
};

type SortKey = "amount" | "room" | "count";
type SortDir = "asc" | "desc";

function SortBtn({ k, label, sortKey, sortDir, onClick }: { k: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <button onClick={() => onClick(k)}
      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
      style={{
        background: active ? "rgba(248,113,113,0.15)" : "transparent",
        color: active ? "#fca5a5" : "var(--t3)",
        border: `1px solid ${active ? "rgba(248,113,113,0.3)" : "transparent"}`,
      }}>
      {label}
      {active ? (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} />}
    </button>
  );
}

export default function BalancePage() {
  const { state, dispatch } = useStore();
  const { rooms, records } = state;
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const [slipRecord, setSlipRecord] = useState<DbBillingRecord | null>(null);
  const [qrRecord, setQrRecord] = useState<DbBillingRecord | null>(null);
  const [cashRecord, setCashRecord] = useState<DbBillingRecord | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "amount" ? "desc" : "asc"); }
  }

  const roomBalances = useMemo<RoomBalance[]>(() =>
    rooms.map(room => {
      const recs = records.filter(r => r.roomId === room.id);
      const unpaidRecords = recs.filter(r => !r.isPaid).sort((a, b) => a.billingMonth.localeCompare(b.billingMonth));
      const paidRecords = recs.filter(r => r.isPaid).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
      const tenant = room.tenancies?.find(t => t.isActive)?.tenant;
      return { roomId: room.id, roomNumber: room.roomNumber, tenantName: tenant?.name ?? "", unpaidRecords, unpaidTotal: unpaidRecords.reduce((s, r) => s + r.total, 0), paidRecords };
    }),
    [rooms, records]);

  const unpaidRooms = useMemo(() => {
    let list = roomBalances.filter(r => r.unpaidTotal > 0);
    if (search) list = list.filter(r =>
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.tenantName.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      if (sortKey === "amount") return sortDir === "asc" ? a.unpaidTotal - b.unpaidTotal : b.unpaidTotal - a.unpaidTotal;
      if (sortKey === "count") return sortDir === "asc" ? a.unpaidRecords.length - b.unpaidRecords.length : b.unpaidRecords.length - a.unpaidRecords.length;
      return sortDir === "asc"
        ? a.roomNumber.localeCompare(b.roomNumber, "th")
        : b.roomNumber.localeCompare(a.roomNumber, "th");
    });
    return list;
  }, [roomBalances, search, sortKey, sortDir]);

  const paidRooms = roomBalances.filter(r => r.unpaidTotal === 0 && r.paidRecords.length > 0);
  const allUnpaid = roomBalances.filter(r => r.unpaidTotal > 0);
  const grandUnpaid = allUnpaid.reduce((s, r) => s + r.unpaidTotal, 0);

  async function markAllPaid(rb: RoomBalance) {
    const results = await Promise.allSettled(
      rb.unpaidRecords.map(rec =>
        fetch(`/api/billing/${rec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPaid: true }),
        }).then(async res => {
          if (!res.ok) throw new Error(`failed ${rec.id}`);
          return { id: rec.id, patch: await res.json() };
        })
      )
    );
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled") dispatch({ type: "PATCH_RECORD", id: r.value.id, patch: r.value.patch });
      else failed++;
    }
    if (failed > 0) alert(`บันทึกไม่สำเร็จ ${failed} รายการ กรุณาลองใหม่`);
  }

  if (state.loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent spin-smooth"
        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: "56rem" }}>

      {/* Header */}
      <motion.div {...fu(0)}>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Wallet size={20} style={{ color: "var(--warn)" }} />
          เช็คยอด
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>ยอดค้างชำระทั้งหมด</p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div {...fu(1)} className="glass p-4 sm:p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--t2)" }}>ยอดค้างชำระรวม</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: "var(--err)" }}>฿{fmtMoney(grandUnpaid)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>{allUnpaid.length} ห้อง</p>
        </motion.div>
        <motion.div {...fu(2)} className="glass p-4 sm:p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--t2)" }}>ชำระครบแล้ว</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: "var(--ok)" }}>{paidRooms.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>จาก {rooms.length} ห้อง</p>
        </motion.div>
      </div>

      {/* Unpaid */}
      {allUnpaid.length === 0 ? (
        <motion.div {...fu(3)} className="glass p-12 text-center">
          <div className="animate-float inline-block mb-4">
            <CheckCircle2 size={40} style={{ color: "var(--ok)" }} className="mx-auto" />
          </div>
          <p className="font-semibold text-white">ไม่มียอดค้างชำระ</p>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>ทุกห้องชำระเรียบร้อยแล้ว</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Filter bar */}
          <motion.div {...fu(3)} className="glass p-3 space-y-2.5">
            <input className="input-dark text-sm" placeholder="ค้นหาห้อง, ผู้เช่า..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--t3)" }}>เรียง:</span>
              <SortBtn k="amount" label="ยอดเงิน" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortBtn k="count" label="จำนวนบิล" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortBtn k="room" label="ห้อง" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              {search && (
                <span className="ml-auto text-xs" style={{ color: "var(--t3)" }}>
                  พบ {unpaidRooms.length}/{allUnpaid.length} ห้อง
                </span>
              )}
            </div>
          </motion.div>

          <p className="text-xs font-semibold px-1" style={{ color: "var(--t3)" }}>ห้องที่ยังค้างชำระ</p>
          {unpaidRooms.map((rb, i) => {
            const isOpen = expandedRoom === rb.roomId;
            return (
              <motion.div key={rb.roomId} {...fu(i + 4)} className="glass overflow-hidden"
                style={{ borderColor: isOpen ? "rgba(248,113,113,0.3)" : "var(--b1)" }}>

                <button onClick={() => setExpandedRoom(isOpen ? null : rb.roomId)}
                  className="w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 text-left transition-colors"
                  style={{ background: isOpen ? "rgba(248,113,113,0.05)" : "transparent" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertCircle size={15} style={{ color: "var(--err)" }} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {rb.roomNumber}
                        {rb.tenantName && <span className="font-normal ml-2 text-xs" style={{ color: "var(--t2)" }}>— {rb.tenantName}</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{rb.unpaidRecords.length} รายการ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-bold text-sm" style={{ color: "var(--err)" }}>฿{fmtMoney(rb.unpaidTotal)}</span>
                    <span style={{ color: "var(--t3)" }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                      className="overflow-hidden" style={{ borderTop: "1px solid var(--b1)" }}>
                      <div className="px-5 sm:px-6 pb-5 pt-3 space-y-2">
                        {rb.unpaidRecords.map(rec => (
                          <div key={rec.id} className="flex items-center gap-3 py-3.5"
                            style={{ borderBottom: "1px solid var(--b1)" }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{fmtMonth(rec.billingMonth)}</p>
                              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "var(--t3)" }}>
                                ไฟ ฿{fmtMoney(rec.electricCost)} · น้ำ ฿{fmtMoney(rec.waterCost)} · เช่า ฿{fmtMoney(rec.rent)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-white shrink-0">฿{fmtMoney(rec.total)}</span>
                            <div className="flex items-center gap-1.5 sm:gap-1 shrink-0">
                              {[
                                { icon: QrCode, label: "QR", fn: () => setQrRecord(rec), c: "#c4b5fd", b: "rgba(167,139,250,0.12)", bc: "rgba(167,139,250,0.25)" },
                                { icon: Upload, label: "สลิป", fn: () => setSlipRecord(rec), c: "var(--accent-hi)", b: "rgba(91,141,238,0.12)", bc: "rgba(91,141,238,0.25)" },
                                { icon: Check, label: "เงินสด", fn: () => setCashRecord(rec), c: "#4ade80", b: "rgba(34,197,94,0.1)", bc: "rgba(34,197,94,0.25)" },
                              ].map(({ icon: Icon, label, fn, c, b, bc }) => (
                                <motion.button key={label} whileTap={{ scale: 0.88 }} onClick={fn}
                                  aria-label={label} title={label}
                                  className="flex items-center justify-center gap-1 text-xs font-semibold rounded-lg w-10 h-10 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5"
                                  style={{ background: b, color: c, border: `1px solid ${bc}` }}>
                                  <Icon size={14} />
                                  <span className="hidden sm:inline">{label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {rb.unpaidRecords.length > 1 && (
                          <motion.button whileTap={{ scale: 0.98 }} onClick={() => markAllPaid(rb)}
                            className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                            style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.22)" }}>
                            ชำระทั้งหมด ฿{fmtMoney(rb.unpaidTotal)}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Paid rooms toggle */}
      {paidRooms.length > 0 && (
        <div>
          <button onClick={() => setShowPaid(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold mb-3 transition-colors"
            style={{ color: "var(--t3)" }}>
            {showPaid ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            ห้องที่ชำระครบแล้ว ({paidRooms.length} ห้อง)
          </button>
          <AnimatePresence>
            {showPaid && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                {paidRooms.map(rb => (
                  <div key={rb.roomId} className="glass px-4 sm:px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={15} style={{ color: "var(--ok)" }} />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {rb.roomNumber}
                          {rb.tenantName && <span className="font-normal ml-2 text-xs" style={{ color: "var(--t2)" }}>— {rb.tenantName}</span>}
                        </p>
                        <p className="text-xs" style={{ color: "var(--t3)" }}>ชำระครบ {rb.paidRecords.length} รายการ</p>
                      </div>
                    </div>
                    <span className="badge-green">ชำระแล้ว</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {slipRecord && <SlipVerifyModal record={slipRecord} onClose={() => setSlipRecord(null)} />}
      {qrRecord   && <QRPayModal      record={qrRecord}   onClose={() => setQrRecord(null)} />}
      {cashRecord && <CashPayModal    record={cashRecord} onClose={() => setCashRecord(null)} />}
    </div>
  );
}
