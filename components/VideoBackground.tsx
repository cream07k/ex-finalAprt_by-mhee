"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_CONFIG } from "@/config/app";

const cfg = APP_CONFIG.videoBackground;

type YTPlayer = {
  setVolume: (v: number) => void;
  seekTo: (s: number, allow: boolean) => void;
  playVideo: () => void;
  unMute: () => void;
  mute: () => void;
};
type YTPlayerEvent = { target: YTPlayer; data: number };
type YTConstructor = new (id: string, opts: unknown) => YTPlayer;

declare global {
  interface Window {
    YT: { Player: YTConstructor; PlayerState: { ENDED: number } };
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoBackground() {
  const playerRef = useRef<YTPlayer | null>(null);
  const [muted, setMuted]   = useState(true);
  const [ready, setReady]   = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    if (!cfg.enabled) return;

    // โหลด YouTube IFrame API ครั้งเดียว
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const init = () => {
      playerRef.current = new window.YT.Player("yt-bg-player", {
        videoId: cfg.youtubeId,
        playerVars: {
          autoplay:       1,
          mute:           1,                          // ต้อง mute ตอน autoplay
          controls:       0,
          loop:           1,
          playlist:       cfg.youtubeId,              // loop ต้อง set playlist = id เดิม
          start:          cfg.startAt,                // เริ่มเล่นที่วินาทีนี้
          modestbranding: 1,
          showinfo:       0,
          rel:            0,
          iv_load_policy: 3,
          disablekb:      1,
          fs:             0,
          playsinline:    1,
        },
        events: {
          onReady: (e: YTPlayerEvent) => {
            e.target.setVolume(50);
            e.target.seekTo(cfg.startAt, true);
            e.target.playVideo();
            setReady(true);
          },
          onStateChange: (e: YTPlayerEvent) => {
            // เมื่อจบ → seek กลับไปจุดเริ่มแล้วเล่นใหม่
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.seekTo(cfg.startAt, true);
              e.target.playVideo();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) init();
    else                                window.onYouTubeIframeAPIReady = init;
  }, []);

  // เปิดเสียงตอน user interact ครั้งแรก
  useEffect(() => {
    if (!cfg.enabled) return;
    if (!muted) return;          // unmute แล้ว — ไม่ต้องเฝ้า
    if (!ready) return;          // player ยังไม่พร้อม

    const cleanup = () => {
      window.removeEventListener("pointerdown", unmute);
      window.removeEventListener("keydown",     unmute);
      window.removeEventListener("touchstart",  unmute);
    };

    const unmute = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        p.unMute();
        p.setVolume(60);
        // บางทีต้องสั่ง play ซ้ำหลัง unmute (โดยเฉพาะ Safari)
        p.playVideo();
        setMuted(false);
        setShowHint(false);
        cleanup();
      } catch (err) {
        console.error("[VideoBg] unmute failed:", err);
      }
    };

    window.addEventListener("pointerdown", unmute);
    window.addEventListener("keydown",     unmute);
    window.addEventListener("touchstart",  unmute);
    return cleanup;
  }, [muted, ready]);

  function toggleMute() {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(50);
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
    setShowHint(false);
  }

  if (!cfg.enabled) return null;

  return (
    <>
      {/* ── Fixed background video ── */}
      <div
        aria-hidden
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: -1 }}
      >
        <div
          style={{
            position:  "absolute",
            top:       "50%",
            left:      "50%",
            width:     "max(177.78vh, 100vw)",   // 16:9 cover
            height:    "max(56.25vw, 100vh)",
            transform: "translate(-50%, -50%)",
            opacity:   ready ? cfg.opacity : 0,
            filter:    `blur(${cfg.blur}px) saturate(120%)`,
            transition: "opacity 1.2s ease",
          }}
        >
          <div id="yt-bg-player" style={{ width: "100%", height: "100%" }} />
        </div>
        {/* Dark overlay เพื่อให้ UI อ่านได้ */}
        <div className="absolute inset-0"
             style={{
               background: "linear-gradient(180deg, rgba(10,14,26,0.5) 0%, rgba(10,14,26,0.7) 100%)",
             }} />
      </div>

      {/* ── Mute toggle (มุมซ้ายล่าง) ── */}
      <div className="fixed z-30"
           style={{
             bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
             left:   "1.25rem",
           }}>
        <AnimatePresence>
          {showHint && muted && ready && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: -8 }}
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg"
              style={{
                padding:    "0.5rem 0.875rem",
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(12px)",
                fontSize:   "0.75rem",
                color:      "#fff",
                border:     "1px solid var(--b2)",
              }}>
              คลิกเพื่อเปิดเสียง 🔊
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleMute}
          className="rounded-full flex items-center justify-center transition-all"
          style={{
            width:  "2.75rem",
            height: "2.75rem",
            minWidth: "44px", minHeight: "44px",
            background: muted ? "var(--s2)" : "rgba(167,139,250,0.2)",
            border: `1px solid ${muted ? "var(--b2)" : "rgba(167,139,250,0.4)"}`,
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            color: muted ? "var(--t2)" : "#c4b5fd",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </motion.button>
      </div>
    </>
  );
}
