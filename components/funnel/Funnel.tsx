"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { DisciplineChart, ClvChart } from "./Infographics";

// Public quiz-funnel shown to logged-out visitors (after the intro animation):
// hook → fact slides w/ infographics → honest "yes-ladder" → plan reveal.
// Compliance: process/discipline framing only — no profit promises, no fake
// stats. Plans let you join directly (→ sign up).

const STEPS = 8;

const slide = {
  enter: { opacity: 0, x: 32 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
};

export function Funnel() {
  const [step, setStep] = useState(0);
  const [yes, setYes] = useState(0);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1));
  const answer = (isYes: boolean) => {
    if (isYes) setYes((y) => y + 1);
    next();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-6 pt-5">
      {/* header: logo + progress */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={26} height={26} priority />
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

      {/* steps */}
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
                eyebrow="The honest truth"
                title="Most people don't lose to bad luck."
                text="They lose to no plan, emotion, and chasing their losses."
                chart={<DisciplineChart />}
                onNext={next}
              />
            )}
            {step === 2 && (
              <Fact
                eyebrow="What pros do differently"
                title="They measure CLV — not profit."
                text="Closing Line Value shows whether you beat the market price. A quality signal, not a profit promise."
                chart={<ClvChart />}
                onNext={next}
              />
            )}
            {step === 3 && (
              <Question
                kicker="Quick question"
                q="Do you sometimes bet on gut feeling?"
                yesLabel="Yes, I know it"
                noLabel="Not really"
                onAnswer={answer}
              />
            )}
            {step === 4 && (
              <Question
                kicker="And honestly:"
                q="Have you ever chased your losses?"
                yesLabel="Yes, sadly"
                noLabel="No"
                onAnswer={answer}
              />
            )}
            {step === 5 && (
              <Question
                kicker="Last one"
                q="Would you like clear rules instead of emotion?"
                yesLabel="Absolutely"
                noLabel="Maybe"
                onAnswer={answer}
              />
            )}
            {step === 6 && <Bridge yes={yes} onNext={next} />}
            {step === 7 && <Plans billing={billing} setBilling={setBilling} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* persistent compliance + login link */}
      <footer className="mt-6 text-center text-[11px] leading-relaxed text-faint">
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
      <div className="mx-auto mb-6 w-fit">
        <Image src="/logo.png" alt="WaveHub" width={96} height={96} priority />
      </div>
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-text">
        Stop betting on gut feeling.
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
        Tennis betting with a system, not emotion. In 30 seconds, find out if
        WaveHub is for you.
      </p>
      <button onClick={onNext} className={`${primaryBtn} mt-8`}>
        Let&apos;s go →
      </button>
    </div>
  );
}

function Fact({
  eyebrow,
  title,
  text,
  chart,
  onNext,
}: {
  eyebrow: string;
  title: string;
  text: string;
  chart: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="mono mb-2 text-[10px] uppercase tracking-[1.5px] text-primary-bright">
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-text">
        {title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{text}</p>
      <div className="mt-5">{chart}</div>
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
      <p className="mono mb-3 text-[10px] uppercase tracking-[1.5px] text-faint">
        {kicker}
      </p>
      <h2 className="mx-auto max-w-sm font-display text-2xl font-bold leading-snug tracking-tight text-text">
        {q}
      </h2>
      <div className="mt-8 space-y-3">
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

function Bridge({ yes, onNext }: { yes: number; onNext: () => void }) {
  const items = [
    "Clear picks — with calm, analytical reasoning",
    "Staking calculator & bankroll protection — it even says: No bet",
    "CLV tracking instead of hype and profit promises",
  ];
  return (
    <div className="text-center">
      <p className="mono mb-2 text-[10px] uppercase tracking-[1.5px] text-primary-bright">
        {yes >= 2 ? "Sounds like you" : "Exactly why"}
      </p>
      <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-text">
        That&apos;s exactly what WaveHub is for.
      </h2>
      <ul className="mt-6 space-y-3 text-left">
        {items.map((t) => (
          <li
            key={t}
            className="card flex items-start gap-3 p-3.5 text-[14px] text-muted"
          >
            <span className="mt-0.5 text-primary-bright">✓</span>
            {t}
          </li>
        ))}
      </ul>
      <button onClick={onNext} className={`${primaryBtn} mt-7`}>
        See the plans →
      </button>
    </div>
  );
}

const PLANS = [
  {
    tier: "core",
    name: "Core",
    monthly: "€99",
    yearly: "€890",
    tagline: "The system & the feed.",
    features: [
      "Daily bet feed (ATP & WTA)",
      "Match insights & stats",
      "Staking calculator",
      "CLV tracking",
    ],
    emphasis: false,
  },
  {
    tier: "private",
    name: "Private",
    monthly: "€149",
    yearly: "€1,390",
    tagline: "The system — tailored to you.",
    features: [
      "Everything in Core",
      "1-on-1 analyst, direct line",
      "Individually calibrated staking plan",
      "Prioritised reasoning",
    ],
    emphasis: true,
  },
] as const;

function Plans({
  billing,
  setBilling,
}: {
  billing: "monthly" | "yearly";
  setBilling: (b: "monthly" | "yearly") => void;
}) {
  return (
    <div>
      <h2 className="text-center font-display text-2xl font-bold tracking-tight text-text">
        Choose your start
      </h2>
      <p className="mt-1 text-center text-[13px] text-muted">
        Join directly — no money is moved in the app.
      </p>

      <div className="mx-auto mt-4 flex w-fit gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["monthly", "yearly"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold capitalize transition ${
              billing === b
                ? "bg-gradient-to-br from-primary-deep to-primary text-white"
                : "text-muted"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3.5">
        {PLANS.map((p) => (
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
              <span className="mono text-[30px] font-bold text-text">
                {billing === "monthly" ? p.monthly : p.yearly}
              </span>
              <span className="text-[13px] text-muted">
                {billing === "monthly" ? "/month" : "/year"}
              </span>
            </div>
            <ul className="my-4 space-y-1.5">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-muted"
                >
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
    </div>
  );
}
