/**
 * ═══════════════════════════════════════════════════════════
 *  ⚙️  APP CONFIG
 *  แก้ที่นี่ที่เดียว ทุกหน้าจะเปลี่ยนตาม
 * ═══════════════════════════════════════════════════════════
 */

import { Building2, type LucideIcon } from "lucide-react";

export const APP_CONFIG = {
  // ── ชื่อแอป ──
  name: "Mhee Developer",
  tagline: "",
  description: "คำนวณค่าน้ำค่าไฟอพาร์ตเมนต์",
  version: "v2.0",

  // ── โลโก้ ──
  logo: {
    icon: Building2 as LucideIcon,   // เปลี่ยน icon ได้จาก lucide-react
    gradientFrom: "#5b8dee",
    gradientVia: "#7c6df0",
    gradientTo: "#a78bfa",
  },

  // ── ธีมสี (โทนหลัก) ──
  theme: {
    accent: "#5b8dee",
    accentHi: "#93c5fd",
    ok: "#22c55e",
    warn: "#f59e0b",
    err: "#f87171",
  },

  // ── ข้อความ Login ──
  login: {
    heading: "เข้าสู่ระบบผู้ดูแล",
    subheading: "เฉพาะแอดมินเท่านั้น",
    footer: "ใช้งานสำหรับเจ้าของอพาร์ตเมนต์เท่านั้น",
  },

  // ── ติดต่อ / ลิขสิทธิ์ ──
  copyright: "© 2026 Mhee Developer",

  // ── เพลงพื้นหลัง ──
  music: {
    enabled: true,                          // เปิด/ปิด player
    src: "/music/bangkokboy.mp3",       // path ไฟล์เพลง
    title: "Bangkok Boy",                 // ชื่อเพลง
    artist: "BGM",                         // ศิลปิน
    defaultVolume: 0.4,                          // 0.0 - 1.0
    autoplay: true,                          // เล่นอัตโนมัติเมื่อ user interact ครั้งแรก
    loop: true,
  },

  // ── วิดีโอพื้นหลัง YouTube ──
  videoBackground: {
    enabled: true,
    youtubeId: "CSJgGw0kFbo",                   // https://youtu.be/CSJgGw0kFbo
    startAt: 12,                              // วินาทีที่เริ่มเล่น
    opacity: 0.35,                            // 0-1 ความเข้มของวิดีโอ
    blur: 6,                               // px ความเบลอ
    startMuted: true,                            // เริ่มแบบ mute (browser ต้องการ)
  },
};

// ── helper ── สร้าง gradient string จาก config
export const logoGradient = () =>
  `linear-gradient(135deg, ${APP_CONFIG.logo.gradientFrom} 0%, ${APP_CONFIG.logo.gradientVia} 50%, ${APP_CONFIG.logo.gradientTo} 100%)`;
