"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Epic ~3s loadscreen shown once per app-open (logged in or not): radial glow,
// an expanding ring, the logo scales/rotates in with a glow, the WaveHub
// wordmark slides up, and the slogan fades in with a letter-spacing reveal —
// then everything fades smoothly into the app. Respects reduced-motion.
export function IntroSplash() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    try {
      if (sessionStorage.getItem("wavehub_intro2")) return;
      sessionStorage.setItem("wavehub_intro2", "1");
    } catch {
      // sessionStorage unavailable — just play it.
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), reduce ? 1000 : 2700);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 42%, rgba(109,40,217,.28), transparent 60%), var(--bg-deep)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {/* expanding ring pulse */}
          {!reduce && (
            <motion.div
              className="absolute h-44 w-44 rounded-full border border-primary/40"
              initial={{ scale: 0.4, opacity: 0.55 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          )}

          {/* logo */}
          <motion.div
            initial={
              reduce
                ? { opacity: 1 }
                : { scale: 0.55, rotate: -12, opacity: 0 }
            }
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ filter: "drop-shadow(0 0 40px rgba(168,85,247,.55))" }}
          >
            <Image src="/logo.png" alt="WaveHub" width={150} height={150} priority />
          </motion.div>

          {/* wordmark */}
          <motion.div
            className="mt-6 font-display text-3xl font-bold tracking-wide text-text"
            initial={reduce ? { opacity: 1 } : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.95, ease: "easeOut" }}
          >
            Wave<span className="text-primary-bright">Hub</span>
          </motion.div>

          {/* slogan */}
          <motion.p
            className="mono mt-3 text-[11px] uppercase text-muted"
            initial={
              reduce
                ? { opacity: 1, letterSpacing: "0.2em" }
                : { opacity: 0, letterSpacing: "0.55em" }
            }
            animate={{ opacity: 1, letterSpacing: "0.2em" }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 1.5, ease: "easeOut" }}
          >
            Next Generation Sportsbetting
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
