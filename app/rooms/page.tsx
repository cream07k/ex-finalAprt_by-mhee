"use client";

import { useStore, DbRoom } from "@/lib/store";
import { useState, useMemo } from "react";
import { BedDouble, Plus, Pencil, Trash2, X, Check, User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay: i * 0.05, ease: "easeOut" },
  } as const;
}

const emptyForm = { roomNumber: "", floor: "", rent: 0 };
type SortKey = "roomNumber" | "rent" | "floor";
type SortDir = "asc" | "desc";

function SortBtn({ k, label, sortKey, sortDir, onClick }: { k: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <button onClick={() => onClick(k)}
      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: active ? "rgba(91,141,238,0.18)" : "transparent",
        color: active ? "var(--accent-hi)" : "var(--t3)",
        border: `1px solid ${active ? "rgba(91,141,238,0.3)" : "transparent"}`,
      }}>
      {label}
      {active ? (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
    </button>
  );
}

export default function RoomsPage() {
  const { state, dispatch } = useStore();
  const { rooms } = state;
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState(emptyForm);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("roomNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterStatus, setFilterStatus] = useState<"all" | "occupied" | "vacant">("all");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = [...rooms];
    if (search) list = list.filter(r =>
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.floor ?? "").toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus === "occupied") list = list.filter(r => r.tenancies?.some(t => t.isActive));
    if (filterStatus === "vacant")   list = list.filter(r => !r.tenancies?.some(t => t.isActive));
    list.sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (sortKey === "roomNumber") { av = a.roomNumber; bv = b.roomNumber; }
      if (sortKey === "rent")       { av = a.rent;       bv = b.rent; }
      if (sortKey === "floor")      { av = a.floor ?? ""; bv = b.floor ?? ""; }
      if (typeof av === "number") return sortDir === "asc" ? av - (bv as number) : (bv as number) - av;
      return sortDir === "asc" ? av.localeCompare(bv as string, "th") : (bv as string).localeCompare(av, "th");
    });
    return list;
  }, [rooms, search, sortKey, sortDir, filterStatus]);

  function openAdd() { setForm(emptyForm); setEditId(null); setError(""); setShowForm(true); }
  function openEdit(r: DbRoom) {
    setForm({ roomNumber: r.roomNumber, floor: r.floor ?? "", rent: r.rent });
    setEditId(r.id); setError(""); setShowForm(true);
  }

  async function save() {
    if (!form.roomNumber.trim()) { setError("กรุณาระบุหมายเลขห้อง"); return; }
    setSaving(true);
    try {
      const url    = editId ? `/api/rooms/${editId}` : "/api/rooms";
      const method = editId ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomNumber: form.roomNumber.trim(), floor: form.floor, rent: form.rent }) });
      if (!res.ok) { const j = await res.json(); setError(j.error ?? "เกิดข้อผิดพลาด"); return; }
      dispatch({ type: "UPSERT_ROOM", payload: await res.json() });
      setShowForm(false);
    } finally { setSaving(false); }
  }

  async function del(id: string, rn: string) {
    const room = rooms.find(r => r.id === id);
    const hasActiveTenant = room?.tenancies?.some(t => t.isActive);
    const recordCount = state.records.filter(r => r.roomId === id).length;
    const warn =
      `ลบห้อง ${rn}?\n\n` +
      (hasActiveTenant ? "⚠️ ห้องนี้กำลังมีผู้เช่าอยู่\n" : "") +
      (recordCount > 0 ? `⚠️ จะลบประวัติบิล ${recordCount} รายการทั้งหมด\n` : "") +
      "\nการลบไม่สามารถย้อนกลับได้";
    if (!confirm(warn)) return;
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    dispatch({ type: "REMOVE_ROOM", id });
  }

  const occupied = rooms.filter(r => r.tenancies?.some(t => t.isActive)).length;
  const vacant   = rooms.length - occupied;

  return (
    <div className="page-container" style={{ maxWidth: "72rem" }}>

      {/* Header */}
      <motion.div {...fu(0)} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BedDouble size={20} style={{ color: "var(--accent-hi)" }} />
            จัดการห้อง
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>
            {rooms.length} ห้อง · ว่าง {vacant} · มีผู้เช่า {occupied}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd} className="btn-primary text-sm px-4 py-2.5 shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">เพิ่มห้อง</span><span className="sm:hidden">เพิ่ม</span>
        </motion.button>
      </motion.div>

      {/* Filter bar */}
      <motion.div {...fu(1)} className="glass p-3 sm:p-4 space-y-3">
        {/* Search */}
        <input className="input-dark text-sm" placeholder="ค้นหาห้อง, ชั้น..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--b1)" }}>
            {(["all", "occupied", "vacant"] as const).map((s, i) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="text-xs font-semibold px-3 py-1.5 transition-all"
                style={{
                  background: filterStatus === s ? "rgba(91,141,238,0.22)" : "transparent",
                  color: filterStatus === s ? "var(--accent-hi)" : "var(--t3)",
                  borderLeft: i > 0 ? "1px solid var(--b1)" : "none",
                }}>
                {s === "all" ? "ทั้งหมด" : s === "occupied" ? "มีผู้เช่า" : "ว่าง"}
              </button>
            ))}
          </div>
          {/* Sort */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs" style={{ color: "var(--t3)" }}>เรียง:</span>
            <SortBtn k="roomNumber" label="หมายเลข" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <SortBtn k="rent"       label="ค่าเช่า" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            <SortBtn k="floor"      label="ชั้น" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {state.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent spin-smooth"
               style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...fu(2)} className="glass p-16 text-center">
          <div className="animate-float inline-block mb-4">
            <BedDouble style={{ color: "var(--t3)" }} size={44} className="mx-auto" />
          </div>
          <p className="font-semibold text-white">{rooms.length === 0 ? "ยังไม่มีห้อง" : "ไม่พบห้องที่ค้นหา"}</p>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>
            {rooms.length === 0 ? `กดปุ่ม "เพิ่มห้อง" เพื่อเริ่มต้น` : "ลองเปลี่ยนตัวกรอง"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <AnimatePresence>
            {filtered.map((room, i) => {
              const tenant = room.tenancies?.find(t => t.isActive)?.tenant ?? null;
              return (
                <motion.div key={room.id} {...fu(i)} exit={{ opacity: 0, scale: 0.94 }}
                  whileHover={{ y: -3 }} className="glass flex flex-col gap-4 card-lift" style={{ padding: "1.25rem 1.5rem" }}>

                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(91,141,238,0.15)", color: "var(--accent-hi)" }}>
                      {room.roomNumber}
                    </span>
                    <div className="flex gap-1.5">
                      {[
                        { icon: Pencil, fn: () => openEdit(room), label: "แก้ไข", hc: "var(--accent-hi)", hb: "rgba(91,141,238,0.14)" },
                        { icon: Trash2, fn: () => del(room.id, room.roomNumber), label: "ลบ", hc: "var(--err)", hb: "rgba(248,113,113,0.12)" },
                      ].map(({ icon: Icon, fn, label, hc, hb }, idx) => (
                        <motion.button key={idx} whileTap={{ scale: 0.85 }} onClick={fn}
                          aria-label={label} title={label}
                          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all"
                          style={{ color: "var(--t3)", background: "rgba(255,255,255,0.03)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = hb; e.currentTarget.style.color = hc; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--t3)"; }}>
                          <Icon size={15} />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={13} style={{ color: tenant ? "var(--accent-hi)" : "var(--t3)" }} />
                    <span className="text-sm truncate" style={{ color: tenant ? "var(--t1)" : "var(--t3)" }}>
                      {tenant ? tenant.name : "ว่าง"}
                    </span>
                    {tenant && <span className="badge-green ml-auto shrink-0">เช่าอยู่</span>}
                  </div>

                  {room.floor && (
                    <p className="text-xs" style={{ color: "var(--t3)" }}>ชั้น {room.floor}</p>
                  )}

                  <div className="divider" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--t3)" }}>ค่าเช่า/เดือน</span>
                    <span className="text-sm font-bold" style={{ color: room.rent > 0 ? "var(--t1)" : "var(--t3)" }}>
                      {room.rent > 0 ? `฿${room.rent.toLocaleString()}` : "—"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
            <motion.div className="glass-pop w-full sm:max-w-md p-6"
              style={{ borderRadius: "var(--r3) var(--r3) 0 0" }}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.27, ease: "easeOut" }}>
              <div className="sm:hidden flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--b2)" }} />
              </div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-white">{editId ? "แก้ไขห้อง" : "เพิ่มห้องใหม่"}</h2>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--b2)", color: "var(--t2)" }}>
                  <X size={15} />
                </motion.button>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                     style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "var(--err)" }}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>
                    หมายเลขห้อง *{editId && <span className="ml-1 font-normal" style={{ color: "var(--t3)" }}>(แก้ไขไม่ได้)</span>}
                  </label>
                  <input className="input-dark" value={form.roomNumber} disabled={!!editId}
                    style={editId ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                    onChange={e => setForm({ ...form, roomNumber: e.target.value })} placeholder="เช่น 101, A01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>ชั้น</label>
                  <input className="input-dark" value={form.floor}
                    onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="เช่น 1, 2, 3" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>ค่าเช่า (บาท/เดือน)</label>
                  <input type="number" className="input-dark" value={form.rent || ""} min="0"
                    onChange={e => setForm({ ...form, rent: parseFloat(e.target.value) || 0 })} placeholder="0" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
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
    </div>
  );
}
