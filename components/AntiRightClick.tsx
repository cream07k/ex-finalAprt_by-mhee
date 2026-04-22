"use client";

import { useEffect } from "react";

/**
 * ป้องกัน:
 * - คลิกขวา (context menu)
 * - ลาก/เลือกข้อความ (drag, copy)
 * - DevTools shortcuts: F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U (view-source)
 *
 * หมายเหตุ: เป็น UX deterrent — ผู้ใช้ที่รู้ทางยังเข้าได้อยู่
 */
export default function AntiRightClick() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockDevtools    = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // F12
      if (k === "f12") { e.preventDefault(); return; }
      // Ctrl/Cmd + Shift + I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        e.preventDefault(); return;
      }
      // Ctrl/Cmd + U
      if ((e.ctrlKey || e.metaKey) && k === "u") { e.preventDefault(); return; }
      // Ctrl/Cmd + S (save page)
      if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); return; }
    };

    window.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("keydown",     blockDevtools);

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("keydown",     blockDevtools);
    };
  }, []);

  return null;
}
