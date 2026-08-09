"use client";

import { useActionState } from "react";
import {
  requestLoginCode,
  submitLoginCode,
  type CodeState,
} from "./actions";

const field =
  "w-full rounded-xl border border-white/15 bg-[#111110] px-4 py-3.5 text-[16px] text-[#ededee] placeholder:text-[#605f58] outline-none transition focus:border-[#cdd2d8]";
const label =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[2px] text-[#94928a] mono";

/**
 * Two steps in one component, because they are one thought: name the address,
 * prove you own it. The second form carries the address in a hidden field so a
 * reload or a slow email never strands someone on a screen that has forgotten
 * who they are.
 */
export function CodeSignIn({ onUsePassword }: { onUsePassword: () => void }) {
  const [state, formAction, pending] = useActionState<CodeState, FormData>(
    (prev, data) =>
      data.get("code") ? submitLoginCode(prev, data) : requestLoginCode(prev, data),
    { stage: "email" },
  );

  const onCodeStep = state.stage === "code";

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={label}>Email</label>
        <input
          name="email"
          type="email"
          required
          readOnly={onCodeStep}
          defaultValue={onCodeStep ? state.email : undefined}
          autoComplete="email"
          placeholder="you@example.com"
          className={`${field} ${onCodeStep ? "opacity-70" : ""}`}
        />
      </div>

      {onCodeStep ? (
        <div>
          <label className={label}>Six-digit code</label>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="000000"
            autoFocus
            className={`${field} tracking-[0.4em]`}
          />
        </div>
      ) : null}

      {onCodeStep && state.notice && !state.error ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-[#94928a]">
          {state.notice}
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-[#d98f8f]/40 bg-[#d98f8f]/10 px-4 py-3 text-[13px] font-medium text-[#e7b7b7]">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-pill w-full disabled:opacity-60">
        {pending ? "Please wait…" : onCodeStep ? "Log in" : "Email me a code"}
      </button>

      <p className="pt-1 text-center text-[13px] text-[#94928a]">
        <button
          type="button"
          onClick={onUsePassword}
          className="-my-2.5 inline-block border-b border-[#cdd2d8]/50 py-2.5 font-semibold text-[#ededee] transition hover:border-[#cdd2d8]"
        >
          Use a password instead
        </button>
      </p>
    </form>
  );
}
