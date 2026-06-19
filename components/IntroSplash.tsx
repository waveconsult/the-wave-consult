"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Smooth ~3s loadscreen shown once per app-open: soft radial glow, a gentle
// ripple, the logo eases up and breathes, then the wordmark + slogan fade in —
// everything floats away on exit. Respects reduced-motion.
const EASE = [0.16, 1, 0.3, 1] as const; // ease-out-expo: fluid, no snap

export function IntroSplash() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    try {
      if (sessionStorage.getItem("wavehub_intro3")) return;
      sessionStorage.setItem("wavehub_intro3", "1");
    } catch {
      // sessionStorage unavailable — just play it.
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), reduce ? 900 : 2800);
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
              "radial-gradient(120% 90% at 50% 42%, rgba(109,40,217,.26), transparent 60%), var(--bg-deep)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* soft ripple */}
          {!reduce &&
            [0, 0.35].map((d) => (
              <motion.div
                key={d}
                className="absolute h-40 w-40 rounded-full border border-primary/35"
                initial={{ scale: 0.5, opacity: 0.45 }}
                animate={{ scale: 2.7, opacity: 0 }}
                transition={{ duration: 2.2, delay: d, ease: "easeOut" }}
              />
            ))}

          {/* logo — eases in, then breathes */}
          <motion.div
            initial={reduce ? { opacity: 1, scale: 1 } : { scale: 0.82, opacity: 0 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { scale: [0.82, 1, 0.985, 1], opacity: 1 }
            }
            transition={{
              duration: 1.6,
              ease: EASE,
              times: [0, 0.5, 0.78, 1],
            }}
            style={{ filter: "drop-shadow(0 0 38px rgba(168,85,247,.5))" }}
          >
            <Image src="/logo.png" alt="WaveHub" width={146} height={146} priority />
          </motion.div>

          {/* wordmark */}
          <motion.div
            className="mt-6 font-display text-3xl font-bold tracking-wide text-text"
            initial={reduce ? { opacity: 1 } : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 0.85, ease: EASE }}
          >
            Wave<span className="text-primary-bright">Hub</span>
          </motion.div>

          {/* slogan */}
          <motion.p
            className="mono mt-3 text-[11px] uppercase text-muted"
            initial={
              reduce
                ? { opacity: 1, letterSpacing: "0.18em" }
                : { opacity: 0, letterSpacing: "0.5em" }
            }
            animate={{ opacity: 1, letterSpacing: "0.18em" }}
            transition={{ duration: 1, delay: reduce ? 0 : 1.35, ease: EASE }}
          >
            Next Generation Sportsbetting
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
