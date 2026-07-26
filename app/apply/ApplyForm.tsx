"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitApplication, type ApplyState } from "./actions";
import { PLANS, isPlan, introLabel } from "@/lib/plans";

const field =
  "w-full rounded-xl border border-white/15 bg-[#111110] px-4 py-3.5 text-[16px] text-[#ededee] placeholder:text-[#605f58] outline-none transition focus:border-[#cdd2d8]";
const label =
  "mb-1.5 block text-left text-[11px] font-bold uppercase tracking-[2px] text-[#94928a] mono";

// Owns the whole apply block (headline + form) so the success state can
// replace everything, not stack under the pre-submit copy.
export function ApplyForm({ plan }: { plan?: string }) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(
    submitApplication,
    null,
  );

  if (state && "ok" in state) {
    return (
      <div className="text-center">
        <p className="eyebrow">Application</p>
        <h1 className="mt-5 font-display text-[clamp(30px,8vw,44px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
          You&apos;re on the list.
        </h1>
        <p className="mx-auto mt-6 max-w-[22rem] text-[15px] leading-relaxed text-[#94928a]">
          We read every application ourselves and come back by email. No noise,
          no spam. Talk soon.
        </p>
        <Link
          href="/"
          className="-my-2.5 mt-8 inline-block border-b border-[#cdd2d8]/50 py-2.5 text-[13px] font-semibold transition hover:border-[#cdd2d8]"
        >
          ← Back
        </Link>
      </div>
    );
  }

  const defaultPlan = isPlan(plan) ? plan : "";

  return (
    <div>
      <p className="eyebrow text-center">Membership starts here</p>
      <h1 className="mt-5 text-center font-display text-[clamp(34px,9vw,52px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
        Apply.
      </h1>
      <p className="mx-auto mt-5 max-w-[21rem] text-center text-[14.5px] leading-relaxed text-[#94928a]">
        Few members, real standards. Tell us who you are — we read every
        application ourselves.
      </p>

      <form action={formAction} className="mt-10 space-y-6 text-left">
        <div>
          <label className={label} htmlFor="apply-email">
            Email
          </label>
          <input
            id="apply-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="apply-plan">
            Membership length
          </label>
          <select
            id="apply-plan"
            name="requested_plan"
            defaultValue={defaultPlan}
            className={field}
          >
            <option value="">Not sure yet</option>
            {PLANS.map((p) => (
              <option key={p.plan} value={p.plan}>
                {p.label} · {introLabel(p.plan)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="apply-note">
            Where are you right now?
          </label>
          <textarea
            id="apply-note"
            name="note"
            rows={4}
            placeholder="Your experience, your discipline, what you want to change. Two or three sentences are enough."
            className={field}
          />
        </div>

        {state && "error" in state ? (
          <p className="rounded-xl border border-[#d98f8f]/40 bg-[#d98f8f]/10 px-4 py-3 text-[13px] font-medium text-[#e7b7b7]">
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-pill w-full disabled:opacity-60">
          {pending ? "Sending…" : "Submit application"}
        </button>

        <p className="text-center text-[12px] text-[#94928a]">
          We review every application. You&apos;ll hear from us by email.
        </p>
      </form>
    </div>
  );
}
