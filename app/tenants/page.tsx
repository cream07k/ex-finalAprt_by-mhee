"use client";

import { useStore, DbTenant, fmtMonth } from "@/lib/store";
import { useState, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, X, Check, Phone, CreditCard, MessageCircle, Home, ChevronDown, ChevronUp, Eye, EyeOff, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fu(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, delay: i * 0.05, ease: "easeOut" },
  } as const;
}

function maskId(id: string) {
  if (id.length < 4) return "x".repeat(id.length);
  return "x-xxxx-xxxxx-xx-" + id.slice(-1);
}

const emptyForm = { name: "", phone: "", idCard: "", lineId: "", note: "" };
type SortKey = "name" | "room" | "status";
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

export default function TenantsPage() {
  const { state, dispatch, reload } = useStore();
  const { tenants, rooms } = state;

  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [revealedIds, setRevealedIds]   = useState<Set<string>>(new Set());
  const [assignRoom, setAssignRoom]     = useState<DbTenant | null>(null);
  const [assignRoomId, setAssignRoomId] = useState("");
  const [assignDate, setAssignDate]     = useState(new Date().toISOString().slice(0, 10));
  const [assigning, setAssigning]       = useState(false);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortKey,      setSortKey]      = useState<SortKey>("name");
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = [...tenants];
    if (search) list = list.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.phone ?? "").includes(search) ||
      (t.lineId ?? "").toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus === "active")   list = list.filter(t => t.tenancies?.some(x => x.isActive));
    if (filterStatus === "inactive") list = list.filter(t => !t.tenancies?.some(x => x.isActive));
    list.sort((a, b) => {
      if (sortKey === "name") {
        return sortDir === "asc"
          ? a.name.localeCompare(b.name, "th")
          : b.name.localeCompare(a.name, "th");
      }
      if (sortKey === "status") {
        const as = a.tenancies?.some(x => x.isActive) ? 1 : 0;
        const bs = b.tenancies?.some(x => x.isActive) ? 1 : 0;
        return sortDir === "asc" ? bs - as : as - bs;
      }
      if (sortKey === "room") {
        const ar = a.tenancies?.find(x => x.isActive)?.room?.roomNumber ?? "";
        const br = b.tenancies?.find(x => x.isActive)?.room?.roomNumber ?? "";
        return sortDir === "asc" ? ar.localeCompare(br, "th") : br.localeCompare(ar, "th");
      }
      return 0;
    });
    return list;
  }, [tenants, search, filterStatus, sortKey, sortDir]);

  function toggleReveal(id: string) {
    setRevealedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function openAdd()  { setForm(emptyForm); setEditId(null); setError(""); setShowForm(true); }
  function openEdit(t: DbTenant) {
    setForm({ name: t.name, phone: t.phone ?? "", idCard: t.idCard ?? "", lineId: t.lineId ?? "", note: t.note ?? "" });
    setEditId(t.id); setError(""); setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { setError("กรุณาระบุชื่อผู้เช่า"); return; }
    setSaving(true);
    try {
      const res = await fetch(editId ? `/api/tenants/${editId}` : "/api/tenants", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone, idCard: form.idCard, lineId: form.lineId, note: form.note }),
      });
      if (!res.ok) { const j = await res.json(); setError(j.error ?? "เกิดข้อผิดพลาด"); return; }
      dispatch({ type: "UPSERT_TENANT", payload: await res.json() });
      setShowForm(false);
    } finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`ลบผู้เช่า "${name}"?`)) return;
    await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    dispatch({ type: "REMOVE_TENANT", id });
  }

  async function doAssign() {
    if (!assignRoom || !assignRoomId) return;
    setAssigning(true);
    try {
      await fetch("/api/tenancies", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: assignRoomId, tenantId: assignRoom.id, startDate: assignDate }) });
      await reload(); setAssignRoom(null);
    } finally { setAssigning(false); }
  }

  const activeCount = tenants.filter(t => t.tenancies?.some(x => x.isActive)).length;

  return (
    <div className="page-container" style={{ maxWidth: "64rem" }}>

      {/* Header */}
      <motion.div {...fu(0)} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Users size={20} style={{ color: "var(--accent-hi)" }} />
            ลูกบ้าน
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--t2)" }}>
            {tenants.length} คน · เช่าอยู่ {activeCount} · ไม่ได้เช่า {tenants.length - activeCount}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd}
          className="btn-primary text-sm px-4 py-2.5 shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">เพิ่มลูกบ้าน</span><span className="sm:hidden">เพิ่ม</span>
        </motion.button>
      </motion.div>

      {/* Filter bar */}
      {tenants.length > 0 && (
        <motion.div {...fu(1)} className="glass p-3 sm:p-4 space-y-3">
          <input className="input-dark text-sm" placeholder="ค้นหาชื่อ, เบอร์, LINE..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--b1)" }}>
              {(["all", "active", "inactive"] as const).map((s, i) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="text-xs font-semibold px-3 py-1.5 transition-all"
                  style={{
                    background: filterStatus === s ? "rgba(91,141,238,0.22)" : "transparent",
                    color: filterStatus === s ? "var(--accent-hi)" : "var(--t3)",
                    borderLeft: i > 0 ? "1px solid var(--b1)" : "none",
                  }}>
                  {s === "all" ? "ทั้งหมด" : s === "active" ? "เช่าอยู่" : "ไม่ได้เช่า"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs" style={{ color: "var(--t3)" }}>เรียง:</span>
              <SortBtn k="name"   label="ชื่อ" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortBtn k="room"   label="ห้อง" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <SortBtn k="status" label="สถานะ" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
            </div>
          </div>
        </motion.div>
      )}

      {state.loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent spin-smooth"
               style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div {...fu(2)} className="glass p-16 text-center">
          <div className="animate-float inline-block mb-4">
            <Users style={{ color: "var(--t3)" }} size={44} className="mx-auto" />
          </div>
          <p className="font-semibold text-white">{tenants.length === 0 ? "ยังไม่มีข้อมูลลูกบ้าน" : "ไม่พบที่ค้นหา"}</p>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>
            {tenants.length === 0 ? `กดปุ่ม "เพิ่มลูกบ้าน" เพื่อเริ่มต้น` : "ลองเปลี่ยนตัวกรอง"}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs px-1" style={{ color: "var(--t3)" }}>แสดง {filtered.length} จาก {tenants.length} คน</p>
          <AnimatePresence>
            {filtered.map((tenant, i) => {
              const room    = tenant.tenancies?.find(t => t.isActive)?.room ?? null;
              const isOpen  = expandedId === tenant.id;
              const history = tenant.tenancies ?? [];
              return (
                <motion.div key={tenant.id} {...fu(i)} exit={{ opacity: 0, scale: 0.97 }} layout
                  className="glass overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold"
                           style={{ background: "rgba(91,141,238,0.15)", color: "var(--accent-hi)" }}>
                        {tenant.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{tenant.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {tenant.phone && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--t2)" }}>
                              <Phone size={10} /> {tenant.phone}
                            </span>
                          )}
                          {room ? (
                            <span className="badge-green flex items-center gap-1">
                              <Home size={9} /> {room.roomNumber}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--t3)" }}>ไม่ได้เช่าอยู่</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <motion.button whileTap={{ scale: 0.88 }}
                        onClick={() => { setAssignRoom(tenant); setAssignRoomId(""); }}
                        className="flex items-center justify-center gap-1 text-xs font-semibold rounded-xl w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2"
                        style={{ background: "rgba(91,141,238,0.12)", color: "var(--accent-hi)", border: "1px solid rgba(91,141,238,0.22)" }}
                        aria-label="ผูกห้อง" title="ผูกห้อง">
                        <Home size={14} />
                        <span className="hidden sm:inline">ผูกห้อง</span>
                      </motion.button>
                      {[
                        { icon: Pencil, fn: () => openEdit(tenant), label: "แก้ไข", hb: "rgba(91,141,238,0.12)", hc: "var(--accent-hi)" },
                        { icon: Trash2, fn: () => del(tenant.id, tenant.name), label: "ลบ", hb: "rgba(248,113,113,0.12)", hc: "var(--err)" },
                      ].map(({ icon: Icon, fn, label, hb, hc }, idx) => (
                        <motion.button key={idx} whileTap={{ scale: 0.85 }} onClick={fn}
                          aria-label={label} title={label}
                          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all"
                          style={{ color: "var(--t3)", background: "rgba(255,255,255,0.03)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = hb; e.currentTarget.style.color = hc; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "var(--t3)"; }}>
                          <Icon size={15} />
                        </motion.button>
                      ))}
                      {history.length > 0 && (
                        <motion.button whileTap={{ scale: 0.85 }}
                          onClick={() => setExpandedId(isOpen ? null : tenant.id)}
                          aria-label={isOpen ? "ย่อ" : "ขยาย"}
                          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all"
                          style={{ color: "var(--t3)", background: "rgba(255,255,255,0.03)" }}>
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {(tenant.idCard || tenant.lineId || tenant.note) && (
                    <div className="px-5 sm:px-6 pb-4 pt-3 flex flex-wrap gap-4" style={{ borderTop: "1px solid var(--b1)" }}>
                      {tenant.idCard && (
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--t2)" }}>
                          <CreditCard size={11} style={{ color: "var(--t3)" }} />
                          <span className="font-mono">{revealedIds.has(tenant.id) ? tenant.idCard : maskId(tenant.idCard)}</span>
                          <button onClick={() => toggleReveal(tenant.id)} style={{ color: "var(--t3)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--t3)")}>
                            {revealedIds.has(tenant.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </span>
                      )}
                      {tenant.lineId && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--t2)" }}>
                          <MessageCircle size={11} style={{ color: "var(--t3)" }} /> {tenant.lineId}
                        </span>
                      )}
                      {tenant.note && (
                        <span className="text-xs italic" style={{ color: "var(--t3)" }}>{tenant.note}</span>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden" style={{ borderTop: "1px solid var(--b1)" }}>
                        <div className="px-5 sm:px-6 py-4">
                          <p className="text-xs font-semibold mb-2" style={{ color: "var(--t3)" }}>ประวัติการเช่า</p>
                          <div className="space-y-1.5">
                            {history.sort((a, b) => b.startDate.localeCompare(a.startDate)).map(t => (
                              <div key={t.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Home size={10} style={{ color: "var(--t3)" }} />
                                  <span className="font-medium text-white">{t.room?.roomNumber ?? t.roomId}</span>
                                  <span style={{ color: "var(--t3)" }}>
                                    {new Date(t.startDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                                    {" → "}
                                    {t.endDate ? new Date(t.endDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "ปัจจุบัน"}
                                  </span>
                                </div>
                                {t.isActive && <span className="badge-green">ปัจจุบัน</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-pop w-full sm:max-w-md overflow-y-auto max-h-[92vh]"
              style={{ borderRadius: "var(--r3) var(--r3) 0 0" }}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.27, ease: "easeOut" }}>
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--b2)" }} />
              </div>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--b1)" }}>
                <h2 className="font-bold text-white">{editId ? "แก้ไขข้อมูลลูกบ้าน" : "เพิ่มลูกบ้านใหม่"}</h2>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--b2)", color: "var(--t2)" }}><X size={15} /></motion.button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm"
                       style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "var(--err)" }}>
                    {error}
                  </div>
                )}
                {[
                  { label: "ชื่อ-นามสกุล *", key: "name",   placeholder: "ชื่อ นามสกุล" },
                  { label: "เบอร์โทรศัพท์",  key: "phone",  placeholder: "08x-xxx-xxxx" },
                  { label: "LINE ID",          key: "lineId", placeholder: "@lineid"      },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{label}</label>
                    <input type="text" className="input-dark" value={form[key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>เลขบัตรประชาชน</label>
                  <input className="input-dark" value={form.idCard} maxLength={13} inputMode="numeric"
                    onChange={e => setForm({ ...form, idCard: e.target.value })} placeholder="1-xxxx-xxxxx-xx-x" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>หมายเหตุ</label>
                  <textarea className="input-dark resize-none" rows={2} value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })} placeholder="บันทึกเพิ่มเติม..." />
                </div>
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

      {/* Assign Room Modal */}
      <AnimatePresence>
        {assignRoom && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-pop w-full sm:max-w-sm p-6"
              style={{ borderRadius: "var(--r3) var(--r3) 0 0" }}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.27, ease: "easeOut" }}>
              <div className="sm:hidden flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--b2)" }} />
              </div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-white text-sm">ผูกห้องให้ {assignRoom.name}</h2>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setAssignRoom(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--b2)", color: "var(--t2)" }}><X size={15} /></motion.button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>ห้อง</label>
                  <select className="input-dark" value={assignRoomId} onChange={e => setAssignRoomId(e.target.value)}>
                    <option value="">-- เลือกห้อง --</option>
                    {rooms.map(r => {
                      const cur = r.tenancies?.find(t => t.isActive)?.tenant;
                      return <option key={r.id} value={r.id}>{r.roomNumber}{cur ? ` (${cur.name})` : " (ว่าง)"}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>วันที่เริ่มเช่า</label>
                  <input type="date" className="input-dark" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={doAssign} disabled={!assignRoomId || assigning}
                  className="btn-primary flex-1 py-2.5 text-sm">
                  {assigning ? "กำลังบันทึก..." : "ยืนยัน"}
                </motion.button>
                <button onClick={() => setAssignRoom(null)} className="btn-ghost flex-1 py-2.5 text-sm">ยกเลิก</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

void fmtMonth;
