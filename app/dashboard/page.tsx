"use client";

import { useStore, fmtMoney, fmtMonth } from "@/lib/store";
import { useMemo } from "react";
import { Zap, Droplets, Home, TrendingUp, CheckCircle2, Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.07, ease: "easeOut" },
  } as const;
}

export default function DashboardPage() {
  const { state } = useStore();
  const { rooms, records } = state;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const thisMonth = records.filter(r => r.billingMonth === currentMonth);
    return {
      thisMonth,
      totalElectric: thisMonth.reduce((s, r) => s + r.electricCost, 0),
      totalWater:    thisMonth.reduce((s, r) => s + r.waterCost, 0),
      totalRent:     thisMonth.reduce((s, r) => s + r.rent, 0),
      totalAll:      thisMonth.reduce((s, r) => s + r.total, 0),
      paid:   thisMonth.filter(r =>  r.isPaid).length,
      unpaid: thisMonth.filter(r => !r.isPaid).length,
    };
  }, [records, currentMonth]);

  const recentRecords = useMemo(
    () => [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [records]
  );

  const roomsWithNoRecord = useMemo(() => {
    const recorded = new Set(records.filter(r => r.billingMonth === currentMonth).map(r => r.roomId));
    return rooms.filter(r => !recorded.has(r.id));
  }, [rooms, records, currentMonth]);

  if (state.loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent spin-smooth"
           style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
    </div>
  );

  const paidPct = stats.thisMonth.length ? (stats.paid / stats.thisMonth.length) * 100 : 0;

  const statCards = [
    { label: "ค่าไฟรวม",       value: stats.totalElectric, icon: Zap,        color: "var(--c-elec)"  },
    { label: "ค่าน้ำรวม",       value: stats.totalWater,    icon: Droplets,   color: "var(--c-water)" },
    { label: "ค่าเช่ารวม",      value: stats.totalRent,     icon: Home,       color: "var(--c-rent)"  },
    { label: "ยอดรวมเดือนนี้",  value: stats.totalAll,      icon: TrendingUp, color: "var(--c-total)" },
  ];

  return (
    <div className="page-container" style={{ maxWidth: "72rem" }}>

      {/* ── Header ── */}
      <motion.div {...fu(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={22} style={{ color: "var(--accent-hi)" }} />
            ภาพรวม
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>
            {fmtMonth(currentMonth)} · {rooms.length} ห้องทั้งหมด
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
             style={{ background: "rgba(34,197,94,0.12)", color: "var(--ok)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <span className="dot-live" /> ออนไลน์
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((c, i) => (
          <motion.div key={c.label} {...fu(i + 1)} className="glass card-lift" style={{ padding: "1.5rem" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: `color-mix(in srgb, ${c.color} 15%, transparent)` }}>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--t2)" }}>{c.label}</p>
            <p className="text-xl font-bold" style={{ color: "var(--t1)" }}>฿{fmtMoney(c.value)}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Bottom row ── */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Payment status */}
        <motion.div {...fu(5)} className="glass flex flex-col gap-4" style={{ padding: "1.5rem" }}>
          <p className="text-sm font-semibold text-white">สถานะการชำระเงิน</p>
          {stats.thisMonth.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--t3)" }}>ยังไม่มีรายการเดือนนี้</p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--ok)" }}>✓ ชำระแล้ว</span>
                  <span className="font-bold text-white">{stats.paid} ห้อง</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--err)" }}>✗ ค้างชำระ</span>
                  <span className="font-bold text-white">{stats.unpaid} ห้อง</span>
                </div>
              </div>
              <div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--b2)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: "var(--ok)" }}
                    initial={{ width: 0 }} animate={{ width: `${paidPct}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }} />
                </div>
                <p className="text-xs mt-1.5 text-right" style={{ color: "var(--t3)" }}>
                  {stats.paid}/{stats.thisMonth.length} ห้อง ({Math.round(paidPct)}%)
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Rooms not recorded */}
        <motion.div {...fu(6)} className="glass flex flex-col gap-4" style={{ padding: "1.5rem" }}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">ยังไม่บันทึกมิเตอร์</p>
            {roomsWithNoRecord.length > 0 && (
              <span className="badge-amber">{roomsWithNoRecord.length}</span>
            )}
          </div>
          {roomsWithNoRecord.length === 0 ? (
            <div className="flex flex-col items-center py-5 gap-2">
              <CheckCircle2 size={30} style={{ color: "var(--ok)" }} />
              <p className="text-sm" style={{ color: "var(--t2)" }}>บันทึกครบทุกห้องแล้ว</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {roomsWithNoRecord.map(room => {
                  const tenant = room.tenancies?.find(t => t.isActive)?.tenant;
                  return (
                    <div key={room.id} className="flex items-center justify-between rounded-lg px-3 py-3"
                         style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}>
                      <span className="text-sm font-semibold" style={{ color: "var(--warn)" }}>{room.roomNumber}</span>
                      <span className="text-xs" style={{ color: "var(--t2)" }}>{tenant?.name || "ว่าง"}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/calculate"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors"
                style={{ background: "rgba(91,141,238,0.1)", color: "var(--accent-hi)", border: "1px solid rgba(91,141,238,0.2)" }}>
                ไปบันทึกข้อมูล <ArrowRight size={12} />
              </Link>
            </>
          )}
        </motion.div>

        {/* Recent records */}
        <motion.div {...fu(7)} className="glass flex flex-col gap-4" style={{ padding: "1.5rem" }}>
          <p className="text-sm font-semibold text-white">รายการล่าสุด</p>
          {recentRecords.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--t3)" }}>ยังไม่มีรายการ</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--b1)" }}>
              {recentRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.room?.roomNumber ?? r.roomId}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{fmtMonth(r.billingMonth)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white mb-0.5">฿{fmtMoney(r.total)}</p>
                    <span className={r.isPaid ? "badge-green" : "badge-red"}>
                      {r.isPaid ? "ชำระแล้ว" : "ค้างชำระ"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Empty state */}
      {rooms.length === 0 && (
        <motion.div {...fu(5)} className="glass p-12 text-center">
          <div className="animate-float inline-block mb-4">
            <Building2 style={{ color: "var(--t3)" }} size={40} className="mx-auto" />
          </div>
          <h3 className="font-bold text-white text-base mb-1">เริ่มต้นการใช้งาน</h3>
          <p className="text-sm mb-5" style={{ color: "var(--t2)" }}>เพิ่มห้องก่อนเพื่อเริ่มคำนวณค่าน้ำ-ค่าไฟ</p>
          <Link href="/rooms" className="btn-primary text-sm px-6 py-2.5">+ เพิ่มห้องแรก</Link>
        </motion.div>
      )}
    </div>
  );
}
