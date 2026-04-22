"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_CONFIG } from "@/config/app";

const { music } = APP_CONFIG;

export default function MusicPlayer() {
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume,  setVolume]  = useState<number>(() => {
    if (typeof window === "undefined") return music.defaultVolume;
    const saved = localStorage.getItem("music_volume");
    return saved ? parseFloat(saved) : music.defaultVolume;
  });
  const [muted,   setMuted]   = useState(false);
  const [open,    setOpen]    = useState(false);

  // autoplay: ลองเล่นทันที ถ้าโดน browser block → รอ user interact ครั้งแรก
  useEffect(() => {
    if (!music.autoplay) return;
    const a = audioRef.current;
    if (!a) return;

    // ลองเล่นเลย (อาจสำเร็จในบางกรณี)
    a.play().catch(() => {
      // โดน browser block → รอ click/keydown ครั้งแรกแล้วเล่น
      const startOnInteract = () => {
        a.play().catch(() => {});
        window.removeEventListener("click",   startOnInteract);
        window.removeEventListener("keydown", startOnInteract);
        window.removeEventListener("touchstart", startOnInteract);
      };
      window.addEventListener("click",      startOnInteract, { once: true });
      window.addEventListener("keydown",    startOnInteract, { once: true });
      window.addEventListener("touchstart", startOnInteract, { once: true });
    });
  }, []);

  // sync volume → audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
    localStorage.setItem("music_volume", String(volume));
  }, [volume, muted]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      localStorage.setItem("music_playing", "0");
    } else {
      // ตอนกด play: ปลด mute + set volume สด ๆ ก่อนเล่น
      a.muted  = false;
      a.volume = volume > 0 ? volume : 0.4;
      setMuted(false);
      if (volume === 0) setVolume(0.4);

      a.play().then(() => {
        setPlaying(true);
        localStorage.setItem("music_playing", "1");
      }).catch(err => {
        console.error("[MusicPlayer] play() failed:", err);
        alert(`เล่นเพลงไม่ได้: ${err.message}\nลองเช็คว่าไฟล์อยู่ที่ /public/music/bangkokboy.mp3`);
      });
    }
  }

  if (!music.enabled) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={music.src}
        loop={music.loop}
        preload="auto"
        onPlay={()  => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={e => {
          const a = e.currentTarget;
          console.error("[MusicPlayer] audio error:", a.error?.code, a.error?.message, "src=", a.currentSrc);
        }}
        onCanPlay={() => console.log("[MusicPlayer] ready to play:", music.src)}
      />

      <div className="fixed z-30"
           style={{
             bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
             right:  "1.25rem",
           }}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: 10, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="glass-pop absolute bottom-full mb-3 right-0"
              style={{
                padding: "1rem 1.125rem",
                minWidth: "16rem",
                borderRadius: "var(--r3)",
              }}
            >
              {/* ── Title ── */}
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: "rgba(167,139,250,0.18)" }}>
                  <Music size={14} style={{ color: "#c4b5fd" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{music.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{music.artist}</p>
                </div>
                {playing && (
                  <div className="flex items-end gap-0.5 shrink-0" style={{ height: "12px" }}>
                    {[0, 0.15, 0.3].map(d => (
                      <motion.span key={d}
                        animate={{ height: ["3px", "10px", "3px"] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: d, ease: "easeInOut" }}
                        style={{ width: "2px", background: "#c4b5fd", borderRadius: "1px" }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Volume slider ── */}
              <div className="flex items-center gap-2.5">
                <button onClick={() => setMuted(m => !m)}
                  className="shrink-0 transition-colors"
                  style={{ color: "var(--t3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t3)")}>
                  {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                  className="flex-1"
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    height: "4px",
                    borderRadius: "999px",
                    background: `linear-gradient(to right, #a78bfa 0%, #a78bfa ${(muted ? 0 : volume) * 100}%, var(--b2) ${(muted ? 0 : volume) * 100}%, var(--b2) 100%)`,
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
                <span className="text-[10px] font-mono shrink-0 w-7 text-right"
                      style={{ color: "var(--t3)" }}>
                  {Math.round((muted ? 0 : volume) * 100)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating button ── */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(o => !o)}
            className="rounded-full flex items-center justify-center transition-all"
            style={{
              width:  "2.75rem",
              height: "2.75rem",
              minWidth: "44px", minHeight: "44px",
              background: open ? "rgba(167,139,250,0.2)" : "var(--s2)",
              border: `1px solid ${open ? "rgba(167,139,250,0.4)" : "var(--b2)"}`,
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              color: open ? "#c4b5fd" : "var(--t2)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <Music size={15} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            className="rounded-full flex items-center justify-center"
            style={{
              width:  "3rem",
              height: "3rem",
              background: playing
                ? "linear-gradient(135deg, #a78bfa, #7c6df0)"
                : "linear-gradient(135deg, #5b8dee, #7c6df0)",
              boxShadow: playing
                ? "0 8px 28px rgba(167,139,250,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"
                : "0 8px 28px rgba(91,141,238,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
              color: "#fff",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={playing ? "pause" : "play"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: "flex" }}>
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </>
  );
}
