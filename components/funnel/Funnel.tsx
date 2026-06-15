"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { DisciplineChart, DeclineChart } from "./Infographics";

// Public quiz-funnel for logged-out visitors (after the intro): hook → two
// problem-agitation facts w/ infographics → honest yes-ladder → branded bridge
// → plans (Free / Premium). Compliance: process framing, no profit promises.

const STEPS = 8;

const slide = {
  enter: { opacity: 0, x: 32 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
};

export function Funnel() {
  const [step, setStep] = useState(0);
  const [yes, setYes] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1));
  const answer = (isYes: boolean) => {
    if (isYes) setYes((y) => y + 1);
    next();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-5">
      <div className="mb-7">
        <div className="mb-3 flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={24} height={24} priority />
          <span className="font-display text-base font-bold tracking-wide text-text">
            Wave<span className="text-primary-bright">Hub</span>
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-deep to-primary-bright"
            animate={{ width: `${((step + 1) / STEPS) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            {step === 0 && <Hook onNext={next} />}
            {step === 1 && (
              <Fact
                eyebrow="The truth"
                title="Most people don't lose to bad luck — they lose to systemless chaos."
                chart={<DisciplineChart />}
                onNext={next}
              />
            )}
            {step === 2 && (
              <Fact
                eyebrow="The consequence"
                title="Without a system, there's only one way to go — down."
                chart={<DeclineChart />}
                onNext={next}
              />
            )}
            {step === 3 && (
              <Question kicker="Quick one" q="Do you sometimes bet on gut feeling?" yesLabel="Yes, I know it" noLabel="Not really" onAnswer={answer} />
            )}
            {step === 4 && (
              <Question kicker="Honestly:" q="Have you ever chased your losses?" yesLabel="Yes, sadly" noLabel="No" onAnswer={answer} />
            )}
            {step === 5 && (
              <Question kicker="Last one" q="Want clear rules instead of emotion?" yesLabel="Absolutely" noLabel="Maybe" onAnswer={answer} />
            )}
            {step === 6 && <Bridge yes={yes} onNext={next} />}
            {step === 7 && <Plans />}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-7 text-center text-[11px] leading-relaxed text-faint">
        <p>18+ · Gambling can be addictive · Analysis, not a bookmaker</p>
        <p className="mt-1.5">
          Already a member?{" "}
          <Link href="/login" className="text-primary-bright hover:underline">
            Log in
          </Link>
        </p>
      </footer>
    </div>
  );
}

const primaryBtn =
  "w-full rounded-xl bg-gradient-to-br from-primary-deep to-primary py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(109,40,217,0.4)] transition active:scale-[0.98]";
const ghostBtn =
  "w-full rounded-xl border border-border-strong py-3.5 text-sm font-medium text-muted transition hover:text-text active:scale-[0.98]";

function Hook({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-7 w-fit">
        <Image src="/logo.png" alt="WaveHub" width={104} height={104} priority />
      </div>
      <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-tight text-text">
        Turn bad habits
        <br />
        into a lasting edge.
      </h1>
      <p className="mx-auto mt-4 max-w-[15rem] text-[15px] leading-relaxed text-muted">
        Tennis, with a system — not emotion.
      </p>
      <button onClick={onNext} className={`${primaryBtn} mt-9`}>
        Start
      </button>
    </div>
  );
}

function Fact({
  eyebrow,
  title,
  chart,
  onNext,
}: {
  eyebrow: string;
  title: string;
  chart: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="mono mb-2 text-[10px] uppercase tracking-[2px] text-primary-bright">
        {eyebrow}
      </p>
      <h2 className="font-display text-[26px] font-bold leading-[1.15] tracking-tight text-text">
        {title}
      </h2>
      <div className="mt-6">{chart}</div>
      <button onClick={onNext} className={`${primaryBtn} mt-6`}>
        Continue
      </button>
    </div>
  );
}

function Question({
  kicker,
  q,
  yesLabel,
  noLabel,
  onAnswer,
}: {
  kicker: string;
  q: string;
  yesLabel: string;
  noLabel: string;
  onAnswer: (yes: boolean) => void;
}) {
  return (
    <div className="text-center">
      <p className="mono mb-3 text-[10px] uppercase tracking-[2px] text-faint">
        {kicker}
      </p>
      <h2 className="mx-auto max-w-sm font-display text-[26px] font-bold leading-[1.2] tracking-tight text-text">
        {q}
      </h2>
      <div className="mt-9 space-y-3">
        <button onClick={() => onAnswer(true)} className={primaryBtn}>
          {yesLabel}
        </button>
        <button onClick={() => onAnswer(false)} className={ghostBtn}>
          {noLabel}
        </button>
      </div>
    </div>
  );
}

const ICONS = {
  target: (
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 12h.01" />
  ),
  shield: <path d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" />,
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
};

function Bridge({ yes, onNext }: { yes: number; onNext: () => void }) {
  const items = [
    { icon: ICONS.target, title: "Clear picks", text: "Calm, analytical reasoning — no hype." },
    { icon: ICONS.shield, title: "Bankroll discipline", text: "A staking system that even says: No bet." },
    { icon: ICONS.pulse, title: "CLV tracking", text: "A quality signal — proof over promises." },
  ];
  return (
    <div className="text-center">
      <p className="mono mb-2 text-[10px] uppercase tracking-[2px] text-primary-bright">
        {yes >= 2 ? "Sounds like you" : "The fix"}
      </p>
      <h2 className="font-display text-[26px] font-bold leading-[1.2] tracking-tight text-text">
        This is WaveHub.
      </h2>
      <div className="mt-6 space-y-3 text-left">
        {items.map((it) => (
          <div
            key={it.title}
            className="card flex items-center gap-3.5 p-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary-deep/40 to-primary/10 text-primary-bright">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {it.icon}
              </svg>
            </span>
            <div>
              <p className="text-[14px] font-semibold text-text">{it.title}</p>
              <p className="text-[12px] text-muted">{it.text}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} className={`${primaryBtn} mt-7`}>
        See plans →
      </button>
    </div>
  );
}

const FREE = {
  name: "Free",
  price: "€0",
  features: ["Browse the bet feed", "Match insights", "Staking calculator"],
};
const PREMIUM = [
  {
    tier: "core",
    name: "Core",
    price: "€890",
    tagline: "The system & the feed.",
    features: ["Daily bet feed (ATP & WTA)", "Match insights & stats", "CLV tracking"],
    emphasis: false,
  },
  {
    tier: "private",
    name: "Private",
    price: "€1,390",
    tagline: "Tailored to you.",
    features: ["Everything in Core", "1-on-1 analyst", "Calibrated staking plan"],
    emphasis: true,
  },
] as const;

function Plans() {
  const [tab, setTab] = useState<"premium" | "free">("premium");

  return (
    <div>
      <h2 className="text-center font-display text-[26px] font-bold tracking-tight text-text">
        Choose your start
      </h2>

      <div className="mx-auto mt-5 flex w-full gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["premium", "free"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold capitalize transition ${
              tab === t
                ? "bg-gradient-to-br from-primary-deep to-primary text-white"
                : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "premium" ? (
        <div className="mt-4 space-y-3.5">
          {PREMIUM.map((p) => (
            <div
              key={p.tier}
              className={`relative overflow-hidden rounded-[20px] border p-5 ${
                p.emphasis
                  ? "border-primary/40 bg-[linear-gradient(170deg,rgba(109,40,217,0.14),transparent_70%)]"
                  : "border-border"
              }`}
            >
              {p.emphasis && (
                <span className="mono absolute right-4 top-4 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary-bright">
                  Recommended
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-text">{p.name}</h3>
              <p className="mt-1 text-xs text-muted">{p.tagline}</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="mono text-[30px] font-bold text-text">{p.price}</span>
                <span className="text-[13px] text-muted">/year</span>
              </div>
              <ul className="my-4 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted">
                    <span className="mt-0.5 text-primary-bright">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${p.tier}`}
                className={`block text-center ${
                  p.emphasis
                    ? primaryBtn
                    : "w-full rounded-xl border border-border-strong py-3.5 text-sm font-semibold text-text transition active:scale-[0.98]"
                }`}
              >
                Join now
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <div className="rounded-[20px] border border-border p-5">
            <h3 className="font-display text-xl font-bold text-text">{FREE.name}</h3>
            <p className="mt-1 text-xs text-muted">Start without a subscription.</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="mono text-[30px] font-bold text-text">{FREE.price}</span>
              <span className="text-[13px] text-muted">forever</span>
            </div>
            <ul className="my-4 space-y-1.5">
              {FREE.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted">
                  <span className="mt-0.5 text-primary-bright">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={primaryBtn + " block text-center"}>
              Join free
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <Link href="/signup" className="text-[12px] text-faint underline-offset-2 hover:text-muted hover:underline">
          Continue without a subscription
        </Link>
      </div>
    </div>
  );
}
