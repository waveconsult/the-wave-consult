"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Animated intro shown when the app is opened. Plays once per browser session
// (so in-app navigation doesn't replay it): logo pops + glows in, wordmark
// fades up, then the overlay fades out into the app.
export function IntroSplash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("wavehub_intro")) return;
      sessionStorage.setItem("wavehub_intro", "1");
    } catch {
      // sessionStorage unavailable — just play it.
    }
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => setShow(false), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-deep transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(120% 90% at 50% 40%, rgba(109,40,217,.22), transparent 60%), var(--bg-deep)",
      }}
    >
      <div
        className="wh-pop"
        style={{
          animation:
            "wh-pop .7s cubic-bezier(.2,.8,.2,1) both, wh-glow 2.2s ease-in-out infinite",
        }}
      >
        <Image src="/logo.png" alt="WaveHub" width={132} height={132} priority />
      </div>
      <div
        className="wh-word mt-6 font-display text-2xl font-bold tracking-wide text-text"
        style={{ animation: "wh-word .6s ease .4s both" }}
      >
        Wave<span className="text-primary-bright">Hub</span>
      </div>
    </div>
  );
}
