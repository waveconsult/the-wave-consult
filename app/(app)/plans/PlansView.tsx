"use client";

import { useActionState, useState } from "react";
import type { Tier } from "@/lib/types";
import { joinTier, type JoinState } from "./actions";

type Billing = "monthly" | "yearly";

type Feature = { text: string; off?: boolean };

const PLANS: {
  tier: "core" | "private";
  name: string;
  monthly: string;
  yearly: string;
  desc: React.ReactNode;
  features: Feature[];
  recommended?: boolean;
}[] = [
  {
    tier: "core",
    name: "Wave Core",
    monthly: "€99",
    yearly: "€890",
    desc: "The system and the bet feed. For everyone who wants to leave gut feeling behind and move into a repeatable process.",
    features: [
      { text: "Daily bet feed (ATP & WTA)" },
      { text: "Match insights & stats" },
      { text: "Staking & bankroll calculator" },
      { text: "CLV tracking" },
      { text: "1-on-1 analyst", off: true },
      { text: "Personal bankroll plan", off: true },
    ],
  },
  {
    tier: "private",
    name: "Wave Private",
    monthly: "€149",
    yearly: "€1,390",
    recommended: true,
    desc: (
      <>
        The system — applied to <b className="text-text">you</b>. A personal
        analyst, individually calibrated. More depth, not more bets.
      </>
    ),
    features: [
      { text: "Everything in Core" },
      { text: "1-on-1 analyst, direct line" },
      { text: "Individually calibrated staking plan" },
      { text: "Bankroll & portfolio review" },
      { text: "Prioritised bet reasoning" },
    ],
  },
];

export function PlansView({ currentTier }: { currentTier: Tier }) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <div className="mb-4 flex gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["monthly", "yearly"] as Billing[]).map((b) => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold capitalize transition ${
              billing === b
                ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_4px_14px_rgba(109,40,217,0.4)]"
                : "text-muted hover:text-text"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {PLANS.map((plan) => (
        <PlanCard
          key={plan.tier}
          plan={plan}
          billing={billing}
          currentTier={currentTier}
        />
      ))}

      <p className="mx-2 mt-1 text-center text-[13px] leading-relaxed text-faint">
        Private differentiates through personalization — not through more betting
        volume. No money is processed in the app.
      </p>
    </>
  );
}

function Check({ off }: { off?: boolean }) {
  const stroke = off ? "#6b6580" : "#a855f7";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.6" />
      <path
        d="M8 12.5l2.5 2.5L16 9"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCard({
  plan,
  billing,
  currentTier,
}: {
  plan: (typeof PLANS)[number];
  billing: Billing;
  currentTier: Tier;
}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinTier,
    { status: "idle" },
  );
  const price = billing === "monthly" ? plan.monthly : plan.yearly;
  const per = billing === "monthly" ? "/month" : "/year";
  const isCurrent = currentTier === plan.tier;

  return (
    <div
      className={`relative mb-3.5 overflow-hidden rounded-[20px] border p-5 ${
        plan.recommended
          ? "border-primary/40 bg-[linear-gradient(170deg,rgba(109,40,217,0.14),transparent_70%)]"
          : "border-border"
      }`}
    >
      {plan.recommended ? (
        <span className="mono absolute right-4 top-4 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary-bright">
          Recommended
        </span>
      ) : null}

      <h3 className="font-display text-xl font-bold text-text">{plan.name}</h3>
      <p className="mb-3.5 mt-1.5 text-xs leading-relaxed text-muted">
        {plan.desc}
      </p>

      <div className="flex items-baseline gap-1.5">
        <span className="mono text-[32px] font-bold text-text">{price}</span>
        <span className="text-[13px] text-muted">{per}</span>
      </div>

      <ul className="my-3.5 space-y-1">
        {plan.features.map((f) => (
          <li
            key={f.text}
            className={`flex items-start gap-2.5 py-1 text-[13px] ${
              f.off ? "text-faint line-through decoration-white/20" : "text-text"
            }`}
          >
            <Check off={f.off} />
            {f.text}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="rounded-xl border border-pos/30 bg-pos/10 py-3 text-center text-sm font-semibold text-pos">
          Your current plan
        </div>
      ) : state.status === "ok" ? (
        <div className="rounded-xl border border-pos/30 bg-pos/10 px-4 py-3 text-center text-[13px] text-pos">
          Welcome to {plan.name}! Your access is active — no payment in the app.
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="tier" value={plan.tier} />
          <button
            type="submit"
            disabled={pending}
            className={`block w-full rounded-[13px] py-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
              plan.recommended
                ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_6px_20px_rgba(109,40,217,0.4)]"
                : "border border-border-strong text-text"
            }`}
          >
            {pending ? "One moment…" : "Join now"}
          </button>
          {state.status === "error" ? (
            <p className="mt-2 text-center text-xs text-neg">{state.message}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
