"use client";

import { useActionState, useState } from "react";
import type { Tier } from "@/lib/types";
import { joinTier, type JoinState } from "./actions";

type Tab = "premium" | "free";

const PREMIUM = [
  {
    tier: "core" as const,
    name: "Core",
    price: "€479",
    tagline: "The system & the feed.",
    features: ["Daily bet feed (ATP)", "Match insights & stats", "CLV tracking"],
    emphasis: false,
  },
  {
    tier: "private" as const,
    name: "Private",
    price: "€779",
    tagline: "Tailored to you.",
    features: ["Everything in Core", "Premium web tools", "Private live-info chat"],
    emphasis: true,
  },
];

export function PlansView({ currentTier }: { currentTier: Tier }) {
  const [tab, setTab] = useState<Tab>("premium");

  return (
    <>
      <div className="mb-5 flex gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["premium", "free"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold capitalize transition ${
              tab === t
                ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_4px_14px_rgba(109,40,217,0.4)]"
                : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "premium" ? (
        PREMIUM.map((p) => (
          <PremiumCard key={p.tier} plan={p} currentTier={currentTier} />
        ))
      ) : (
        <div className="rounded-[20px] border border-border p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-text">Free</h3>
            {currentTier === "none" && (
              <span className="rounded-full border border-pos/30 bg-pos/10 px-2.5 py-0.5 text-[11px] font-medium text-pos">
                Current
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">No subscription needed.</p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="mono text-[30px] font-bold text-text">€0</span>
            <span className="text-[13px] text-muted">forever</span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {["Browse the bet feed", "Match insights", "Staking calculator"].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted">
                <span className="mt-0.5 text-primary-bright">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mx-2 mt-4 text-center text-[12px] leading-relaxed text-faint">
        Billed yearly. No money is processed in the app.
      </p>
    </>
  );
}

function PremiumCard({
  plan,
  currentTier,
}: {
  plan: (typeof PREMIUM)[number];
  currentTier: Tier;
}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinTier,
    { status: "idle" },
  );
  const isCurrent = currentTier === plan.tier;

  return (
    <div
      className={`relative mb-3.5 overflow-hidden rounded-[20px] border p-5 ${
        plan.emphasis
          ? "border-primary/40 bg-[linear-gradient(170deg,rgba(109,40,217,0.14),transparent_70%)]"
          : "border-border"
      }`}
    >
      {plan.emphasis && (
        <span className="mono absolute right-4 top-4 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary-bright">
          Recommended
        </span>
      )}
      <h3 className="font-display text-xl font-bold text-text">{plan.name}</h3>
      <p className="mt-1 text-xs text-muted">{plan.tagline}</p>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="mono text-[30px] font-bold text-text">{plan.price}</span>
        <span className="text-[13px] text-muted">/year</span>
      </div>
      <ul className="my-4 space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted">
            <span className="mt-0.5 text-primary-bright">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="rounded-xl border border-pos/30 bg-pos/10 py-3 text-center text-sm font-semibold text-pos">
          Your current plan
        </div>
      ) : state.status === "ok" ? (
        <div className="rounded-xl border border-pos/30 bg-pos/10 px-4 py-3 text-center text-[13px] text-pos">
          Welcome to {plan.name}! Your access is active.
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="tier" value={plan.tier} />
          <button
            type="submit"
            disabled={pending}
            className={`block w-full rounded-[13px] py-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
              plan.emphasis
                ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_6px_20px_rgba(109,40,217,0.4)]"
                : "border border-border-strong text-text"
            }`}
          >
            {pending ? "One moment…" : "Join now"}
          </button>
          {state.status === "error" && (
            <p className="mt-2 text-center text-xs text-neg">{state.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
