"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { APP_CONFIG, logoGradient } from "@/config/app";

const Logo = APP_CONFIG.logo.icon;

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const j = await res.json();
        setError(j.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center"
      style={{ padding: "clamp(1.5rem, 5vw, 3rem)" }}>
      <div className="w-full" style={{ maxWidth: "26rem" }}>

        {/* ── Brand top ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center"
          style={{ marginBottom: "clamp(2.25rem, 5vw, 3rem)" }}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 280 }}
            className="relative"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="rounded-3xl flex items-center justify-center"
              style={{
                width: "clamp(4.5rem, 12vw, 5.5rem)",
                height: "clamp(4.5rem, 12vw, 5.5rem)",
                background: logoGradient(),
                boxShadow: "0 20px 56px rgba(91,141,238,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}>
              <Logo size={36} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="absolute inset-0 rounded-3xl -z-10 blur-3xl opacity-60"
              style={{ background: logoGradient() }} />
          </motion.div>

          <h1 className="font-bold text-white tracking-tight text-center"
            style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)", lineHeight: 1.2 }}>
            {APP_CONFIG.name}
          </h1>
          <p className="text-center" style={{
            color: "var(--t2)",
            fontSize: "clamp(0.85rem, 2vw, 0.95rem)",
            marginTop: "0.625rem",
          }}>
            {APP_CONFIG.tagline}
          </p>
        </motion.div>

        {/* ── Login card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          className="glass-pop"
          style={{ padding: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          {/* card header */}
          <div className="flex items-center"
            style={{
              gap: "0.875rem",
              marginBottom: "1.75rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--b1)",
            }}>
            <div className="rounded-xl flex items-center justify-center shrink-0"
              style={{
                width: "2.75rem",
                height: "2.75rem",
                background: "rgba(91,141,238,0.15)",
              }}>
              <Shield size={19} style={{ color: "var(--accent-hi)" }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white"
                style={{ fontSize: "0.95rem", lineHeight: 1.3 }}>
                {APP_CONFIG.login.heading}
              </p>
              <p style={{
                color: "var(--t3)",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
              }}>
                {APP_CONFIG.login.subheading}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Password input */}
            <div>
              <label className="block font-semibold uppercase"
                style={{
                  color: "var(--t2)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  marginBottom: "0.625rem",
                }}>
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--t3)" }} />
                <input
                  type={show ? "text" : "password"}
                  className="input-dark w-full"
                  style={{
                    paddingTop: "0.95rem",
                    paddingBottom: "0.95rem",
                    paddingLeft: "2.75rem",
                    paddingRight: "3rem",
                    fontSize: "15px",
                    letterSpacing: show ? "normal" : "0.15em",
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md transition-all"
                  style={{ color: "var(--t3)", padding: "0.4rem" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.background = "var(--b1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.background = "transparent"; }}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center"
                style={{
                  gap: "0.625rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--err)",
                }}>
                <span className="rounded-full shrink-0"
                  style={{ width: "0.4rem", height: "0.4rem", background: "var(--err)" }} />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full"
              style={{
                padding: "1rem 1.25rem",
                fontSize: "15px",
                marginTop: "0.25rem",
              }}>
              {loading ? (
                <>
                  <span className="rounded-full border-2 border-t-transparent spin-smooth"
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderColor: "rgba(255,255,255,0.5)",
                      borderTopColor: "transparent",
                    }} />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
          style={{
            color: "var(--t3)",
            fontSize: "0.75rem",
            marginTop: "clamp(2rem, 4vw, 2.5rem)",
            lineHeight: 1.6,
          }}>
          {APP_CONFIG.name} {APP_CONFIG.version}
          <br />
          <span style={{ opacity: 0.7 }}>{APP_CONFIG.login.footer}</span>
        </motion.p>
      </div>
    </div>
  );
}
