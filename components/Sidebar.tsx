"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BedDouble, Calculator, Settings, Menu, X, Wallet, Users, LogOut, History } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { APP_CONFIG, logoGradient } from "@/config/app";

const Logo = APP_CONFIG.logo.icon;

const navItems = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard, color: "#5b8dee", glow: "rgba(91,141,238,0.18)" },
  { href: "/rooms", label: "จัดการห้อง", icon: BedDouble, color: "#a78bfa", glow: "rgba(167,139,250,0.18)" },
  { href: "/tenants", label: "ลูกบ้าน", icon: Users, color: "#22d3ee", glow: "rgba(34,211,238,0.15)" },
  { href: "/calculate", label: "คำนวณค่าใช้จ่าย", icon: Calculator, color: "#4ade80", glow: "rgba(74,222,128,0.15)" },
  { href: "/balance", label: "เช็คยอด", icon: Wallet, color: "#fbbf24", glow: "rgba(251,191,36,0.15)" },
  { href: "/logs", label: "ประวัติชำระ", icon: History, color: "#c4b5fd", glow: "rgba(167,139,250,0.15)" },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, color: "#94a3b8", glow: "rgba(148,163,184,0.12)" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const content = (
    <div className="flex flex-col h-full py-5">
      {/* Logo */}
      <div className="px-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: logoGradient(),
                boxShadow: "0 4px 16px rgba(91,141,238,0.45)",
              }}>
              <Logo className="text-white" size={16} />
            </div>
            <span className="dot-live absolute -top-0.5 -right-0.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">
              {state.settings.apartmentName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
              {state.rooms.length} ห้อง
            </p>
          </div>
        </div>
      </div>

      <div className="divider mx-4 mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, color, glow }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                color: active ? "#fff" : "var(--t2)",
                background: active ? glow : "transparent",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {/* active accent bar */}
              {active && (
                <motion.span layoutId="nav-pill"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-full"
                  style={{ background: color }}
                  transition={{ type: "spring", stiffness: 400, damping: 36 }}
                />
              )}
              {/* icon */}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
                style={{ background: active ? `${color}22` : "transparent" }}>
                <Icon size={15} style={{ color: active ? color : "var(--t3)" }} />
              </div>
              <span style={{ color: active ? "#e8edf5" : "var(--t2)" }}>{label}</span>

              {/* hover dot */}
              {!active && (
                <span className="absolute right-3 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: color }} />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="divider mx-4 mt-4 mb-3" />

      {/* Logout */}
      <div className="px-3 pb-2">
        <motion.button whileTap={{ scale: 0.97 }} onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: "var(--t3)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.color = "var(--err)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t3)"; }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <LogOut size={15} />
          </div>
          ออกจากระบบ
        </motion.button>
      </div>

      <p className="text-xs text-center px-4 pb-3" style={{ color: "var(--t3)" }}>{APP_CONFIG.name} {APP_CONFIG.version}</p>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between"
        style={{
          height:        "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingTop:    "env(safe-area-inset-top, 0px)",
          paddingLeft:   "calc(1rem + env(safe-area-inset-left, 0px))",
          paddingRight:  "calc(1rem + env(safe-area-inset-right, 0px))",
          background:    "rgba(10,14,26,0.82)",
          backdropFilter:        "blur(24px) saturate(160%)",
          WebkitBackdropFilter:  "blur(24px) saturate(160%)",
          borderBottom:  "1px solid rgba(255,255,255,0.08)",
        }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: logoGradient(), boxShadow: "0 2px 10px rgba(91,141,238,0.4)" }}>
            <Logo className="text-white" size={14} />
          </div>
          <span className="text-sm font-bold text-white truncate">{state.settings.apartmentName}</span>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setOpen(!open)}
          className="rounded-lg flex items-center justify-center shrink-0"
          style={{
            width: 44, height: 44,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid var(--b2)",
          }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? "x" : "m"}
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.13 }}
              style={{ color: "var(--t1)", display: "flex" }}>
              {open ? <X size={15} /> : <Menu size={15} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="md:hidden fixed inset-0 z-30"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)} />
            <motion.div className="md:hidden fixed top-0 left-0 bottom-0 z-40"
              style={{
                width:        "min(17rem, 84vw)",
                background:   "rgba(12,17,30,0.92)",
                backdropFilter:        "blur(28px) saturate(160%)",
                WebkitBackdropFilter:  "blur(28px) saturate(160%)",
                borderRight:  "1px solid rgba(255,255,255,0.09)",
                paddingLeft:  "env(safe-area-inset-left, 0px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}>
              <div style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
                {content}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col fixed top-0 left-0 z-20"
        style={{
          height:        "100vh",
          paddingLeft:   "env(safe-area-inset-left, 0px)",
          paddingTop:    "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background:    "rgba(10,14,26,0.78)",
          backdropFilter:        "blur(28px) saturate(160%)",
          WebkitBackdropFilter:  "blur(28px) saturate(160%)",
          borderRight:   "1px solid rgba(255,255,255,0.08)",
        }}>
        {content}
      </aside>
    </>
  );
}
