"use client";

import { useActionState } from "react";
import { useState } from "react";
import type { Plan, Tier } from "@/lib/types";
import {
  PLANS,
  firstYearLabel,
  hasSetupFee,
  renewalNotice,
  renewalPerMonth,
} from "@/lib/plans";
import { tryProductForPlan } from "@/lib/fastspring";
import { IS_FASTSPRING, PROCESSOR_NAME } from "@/lib/payments";
import { FastSpringCheckout } from "@/components/FastSpringCheckout";
import { startCheckout, type JoinState } from "./actions";

type Tab = "premium" | "free";



// Gold carries the emphasis. The badge says "Most complete" rather than the old
// "Best value": the tiers no longer differ in length but in what you get, and
// both renew at the same price, so a cheapest-per-month claim would be
// meaningless. Per-tier contents live in lib/plans.ts and are rendered from
// there, so the app and the landing page cannot drift apart.
const RECOMMENDED: Plan = "gold";

export function PlansView({
  currentTier,
  currentPlan,
  userId,
  email,
}: {
  currentTier: Tier;
  currentPlan: Plan | null;
  userId: string;
  email: string | null;
}) {
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
                ? "bg-gradient-to-br from-[#9aa0a8] to-[#cdd2d8] text-[#14110a] shadow-[0_4px_14px_rgba(205,210,216,0.35)]"
                : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "premium" ? (
        <>
          <div className="mb-4 rounded-[20px] border border-border p-5">
            <h3 className="font-display text-xl font-bold text-text">
              WaveHub Membership
            </h3>
            <p className="mt-1 text-xs text-muted">
              Billed yearly. Gold adds the models and the education library for a
              one-off, then renews at the same price as Silver.
            </p>
          </div>

          {PLANS.map((p) => (
            <PlanCard
              key={p.plan}
              entry={p}
              isCurrent={currentTier === "member" && currentPlan === p.plan}
              userId={userId}
              email={email}
            />
          ))}
        </>
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
        Renews automatically · secure checkout &amp; renewals handled by{" "}
        {PROCESSOR_NAME}.
      </p>
    </>
  );
}

function PlanCard({
  entry,
  isCurrent,
  userId,
  email,
}: {
  entry: (typeof PLANS)[number];
  isCurrent: boolean;
  userId: string;
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    startCheckout,
    { status: "idle" },
  );
  const emphasis = entry.plan === RECOMMENDED;
  // null while the FastSpring product paths are not configured yet — show a
  // disabled button instead of crashing the page (see tryProductForPlan).
  const fsProduct = tryProductForPlan(entry.plan);

  const btnClass = `block w-full rounded-[13px] py-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
    emphasis
      ? "bg-gradient-to-br from-[#9aa0a8] to-[#cdd2d8] text-[#14110a] shadow-[0_6px_20px_rgba(205,210,216,0.35)]"
      : "border border-border-strong text-text"
  }`;

  return (
    <div
      className={`relative mb-3.5 overflow-hidden rounded-[20px] border p-5 ${
        emphasis
          ? "border-primary/40 bg-[linear-gradient(170deg,rgba(205,210,216,0.13),transparent_70%)]"
          : "border-border"
      }`}
    >
      {emphasis && (
        <span className="mono absolute right-4 top-4 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary-bright">
          Most complete
        </span>
      )}
      <h3 className="font-display text-xl font-bold text-text">{entry.name}</h3>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="mono text-[30px] font-bold text-text">
          {firstYearLabel(entry.plan)}
        </span>
        <span className="text-[13px] text-muted">
          {hasSetupFee(entry.plan)
            ? `for your first ${entry.label}`
            : `every ${entry.label}`}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {`€${renewalPerMonth(entry.plan)} / month on renewal`}
      </p>

      <ul className="mt-4 space-y-1.5">
        {entry.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-muted">
            <span className="mt-0.5 text-primary-bright">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {isCurrent ? (
          <div className="rounded-xl border border-pos/30 bg-pos/10 py-3 text-center text-sm font-semibold text-pos">
            Your current plan
          </div>
        ) : IS_FASTSPRING ? (
          fsProduct ? (
            <FastSpringCheckout
              plan={entry.plan}
              product={fsProduct}
              userId={userId}
              email={email}
              label={`Start — ${firstYearLabel(entry.plan)}`}
              className={btnClass}
            />
          ) : (
            <button type="button" disabled className={btnClass}>
              Temporarily unavailable
            </button>
          )
        ) : (
          <form action={formAction}>
            <input type="hidden" name="plan" value={entry.plan} />
            <button type="submit" disabled={pending} className={btnClass}>
              {pending ? "Redirecting…" : `Start — ${firstYearLabel(entry.plan)}`}
            </button>
            {state.status === "error" && (
              <p className="mt-2 text-center text-xs text-neg">{state.message}</p>
            )}
          </form>
        )}
        {/* Auto-renewal disclosure — required next to the buy button, not just
            in the terms (EU consumer law, and it prevents chargebacks). */}
        {!isCurrent && (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-faint">
            {renewalNotice(entry.plan)}
          </p>
        )}
      </div>
    </div>
  );
}
