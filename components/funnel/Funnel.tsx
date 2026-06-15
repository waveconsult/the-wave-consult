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
            {step === 0 && (
              <Hook onNext={next} />
            )}
            {step === 1 && (
              <Fact
                eyebrow="Die ehrliche Wahrheit"
                title="Die meisten verlieren nicht wegen Pech."
                text="Sondern wegen fehlendem Plan, Emotionen und dem Nachjagen von Verlusten."
                chart={<DisciplineChart />}
                onNext={next}
              />
            )}
            {step === 2 && (
              <Fact
                eyebrow="Was Profis anders machen"
                title="Sie messen CLV — nicht den Gewinn."
                text="Closing Line Value zeigt, ob du besser als der Markt einkaufst. Ein Qualitäts-Signal, kein Gewinn-Versprechen."
                chart={<ClvChart />}
                onNext={next}
              />
            )}
            {step === 3 && (
              <Question
                kicker="Kurze Frage"
                q="Tippst du manchmal aus dem Bauch heraus?"
                yesLabel="Ja, kenn ich"
                noLabel="Eher nicht"
                onAnswer={answer}
              />
            )}
            {step === 4 && (
              <Question
                kicker="Und ehrlich:"
                q="Hast du schon mal Verluste nachgejagt?"
                yesLabel="Ja, leider"
                noLabel="Nein"
                onAnswer={answer}
              />
            )}
            {step === 5 && (
              <Question
                kicker="Letzte Frage"
                q="Hättest du gern klare Regeln statt Emotion?"
                yesLabel="Auf jeden Fall"
                noLabel="Vielleicht"
                onAnswer={answer}
              />
            )}
            {step === 6 && <Bridge yes={yes} onNext={next} />}
            {step === 7 && (
              <Plans billing={billing} setBilling={setBilling} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* persistent compliance + login link */}
      <footer className="mt-6 text-center text-[11px] leading-relaxed text-faint">
        <p>18+ · Glücksspiel kann süchtig machen · Analyse, kein Wettanbieter</p>
        <p className="mt-1.5">
          Schon dabei?{" "}
          <Link href="/login" className="text-primary-bright hover:underline">
            Einloggen
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
        Schluss mit Bauchgefühl.
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
        Tennis-Wetten mit System statt Emotion. In 30 Sekunden findest du heraus,
        ob WaveHub zu dir passt.
      </p>
      <button onClick={onNext} className={`${primaryBtn} mt-8`}>
        Los geht&apos;s →
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
        Weiter
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
    "Klare Picks — mit ruhiger, analytischer Begründung",
    "Staking-Rechner & Bankroll-Schutz — sagt auch mal: No bet",
    "CLV-Tracking statt Hype und Gewinn-Versprechen",
  ];
  return (
    <div className="text-center">
      <p className="mono mb-2 text-[10px] uppercase tracking-[1.5px] text-primary-bright">
        {yes >= 2 ? "Klingt nach dir" : "Genau dafür"}
      </p>
      <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-text">
        Genau dafür gibt&apos;s WaveHub.
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
        Pläne ansehen →
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
    tagline: "Das System & der Feed.",
    features: ["Daily Bet-Feed (ATP & WTA)", "Match-Insights & Stats", "Staking-Rechner", "CLV-Tracking"],
    emphasis: false,
  },
  {
    tier: "private",
    name: "Private",
    monthly: "€149",
    yearly: "€1.390",
    tagline: "Das System — auf dich zugeschnitten.",
    features: ["Alles aus Core", "1-zu-1 Analyst, direkte Leitung", "Individueller Staking-Plan", "Priorisierte Begründungen"],
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
        Wähle deinen Start
      </h2>
      <p className="mt-1 text-center text-[13px] text-muted">
        Direkt beitreten — kein Geld wird in der App bewegt.
      </p>

      <div className="mx-auto mt-4 flex w-fit gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["monthly", "yearly"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            className={`rounded-[10px] px-4 py-2 text-[13px] font-semibold transition ${
              billing === b
                ? "bg-gradient-to-br from-primary-deep to-primary text-white"
                : "text-muted"
            }`}
          >
            {b === "monthly" ? "Monatlich" : "Jährlich"}
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
                Empfohlen
              </span>
            )}
            <h3 className="font-display text-xl font-bold text-text">{p.name}</h3>
            <p className="mt-1 text-xs text-muted">{p.tagline}</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="mono text-[30px] font-bold text-text">
                {billing === "monthly" ? p.monthly : p.yearly}
              </span>
              <span className="text-[13px] text-muted">
                {billing === "monthly" ? "/Monat" : "/Jahr"}
              </span>
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
              Jetzt beitreten
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
