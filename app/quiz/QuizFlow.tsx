"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { saveProgress, finishQuiz, type QuizAnswers } from "./actions";

type Option = { v: string; label: string };
type Question = { key: string; q: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    key: "q1",
    q: "How's your betting going right now?",
    options: [
      { v: "every", label: "I bet on almost every match" },
      { v: "chase", label: "I chase my losses" },
      { v: "nosystem", label: "No real system yet" },
      { v: "edge", label: "Profitable — I just want an edge" },
    ],
  },
  {
    key: "q2",
    q: "How do you pick your bets today?",
    options: [
      { v: "gut", label: "Gut feeling" },
      { v: "tipsters", label: "Free Telegram tipsters" },
      { v: "stats", label: "My own stats" },
      { v: "none", label: "No real method" },
    ],
  },
  {
    key: "q3",
    q: "What's your monthly betting budget?",
    options: [
      { v: "100", label: "Under €100" },
      { v: "500", label: "€100 – €500" },
      { v: "2k", label: "€500 – €2,000" },
      { v: "2kplus", label: "€2,000+" },
    ],
  },
  {
    key: "q4",
    q: "How serious are you about making this a skill?",
    options: [
      { v: "curious", label: "Just curious" },
      { v: "stop", label: "I want to stop losing" },
      { v: "invest", label: "I'm ready to invest in a system" },
    ],
  },
];

const TOTAL = QUESTIONS.length + 1; // 4 questions + email

export function QuizFlow() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [stage, setStage] = useState<"q" | "email" | "result">("q");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<"membership" | "guide" | null>(null);

  const stepNumber = stage === "email" ? TOTAL : qIndex + 1;
  const progress = stage === "result" ? 100 : ((stepNumber - 1) / TOTAL) * 100;

  function choose(v: string) {
    const q = QUESTIONS[qIndex];
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    void saveProgress({ sessionId, step: qIndex + 1, answers: next });
    if (qIndex < QUESTIONS.length - 1) setQIndex(qIndex + 1);
    else setStage("email");
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    const { result } = await finishQuiz({ sessionId, email, answers });
    setResult(result);
    setStage("result");
    setSubmitting(false);
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-7 flex items-center justify-center gap-2.5">
        <Image src="/logo.png" alt="" width={26} height={26} priority />
        <span className="font-display text-lg font-bold tracking-tight">
          Wave<span className="text-primary-bright">Hub</span>
        </span>
      </div>

      {/* Progress */}
      {stage !== "result" && (
        <div className="mb-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary-bright transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-muted">
            Step {stepNumber} of {TOTAL}
          </p>
        </div>
      )}

      {/* Question */}
      {stage === "q" && (
        <div>
          <h1 className="mb-6 text-center font-display text-2xl font-bold leading-snug text-text">
            {QUESTIONS[qIndex].q}
          </h1>
          <div className="flex flex-col gap-3">
            {QUESTIONS[qIndex].options.map((o) => (
              <button
                key={o.v}
                onClick={() => choose(o.v)}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left text-[15px] font-medium text-text transition hover:border-primary/60 active:scale-[0.98]"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email capture */}
      {stage === "email" && (
        <form onSubmit={submitEmail}>
          <h1 className="mb-2 text-center font-display text-2xl font-bold leading-snug text-text">
            Where should we send your free ATP value read?
          </h1>
          <p className="mb-6 text-center text-sm text-muted">
            One sharp read, no spam. See if WaveHub is your edge.
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] text-text outline-none focus:border-primary/60"
          />
          {err && <p className="mt-2 text-center text-xs text-neg">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn-pill mt-4 w-full disabled:opacity-60"
          >
            {submitting ? "One moment…" : "Get my value read"}
          </button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            By continuing you agree to our{" "}
            <a href="https://www.wavehubtennis.com/terms.html" className="text-primary-bright">Terms</a> and{" "}
            <a href="https://www.wavehubtennis.com/privacy.html" className="text-primary-bright">Privacy Policy</a>.
          </p>
        </form>
      )}

      {/* Result */}
      {stage === "result" && result === "membership" && (
        <div className="text-center">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-primary-bright">Strong fit</p>
          <h1 className="mb-3 font-display text-2xl font-bold leading-snug text-text">
            You&apos;re exactly who WaveHub is built for.
          </h1>
          <p className="mb-7 text-sm text-muted">
            Based on your answers you&apos;re ready for a real system. Create your account and start your membership.
          </p>
          <Link href="/signup" className="btn-pill block w-full">
            Start your membership →
          </Link>
          <p className="mt-3 text-xs text-muted">
            Your free value read is on its way to <span className="text-text">{email}</span> too.
          </p>
        </div>
      )}

      {stage === "result" && result === "guide" && (
        <div className="text-center">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-primary-bright">You&apos;re on the list</p>
          <h1 className="mb-3 font-display text-2xl font-bold leading-snug text-text">
            Your free ATP value read is on its way.
          </h1>
          <p className="mb-7 text-sm text-muted">
            Check <span className="text-text">{email}</span>. When you&apos;re ready to turn this into a skill, WaveHub is here.
          </p>
          <Link href="/signup" className="btn-pill-ghost block w-full">
            Explore membership →
          </Link>
        </div>
      )}
    </div>
  );
}
