"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "./actions";
import { CodeSignIn } from "./CodeSignIn";

const field =
  "w-full rounded-xl border border-white/15 bg-[#111110] px-4 py-3.5 text-[16px] text-[#ededee] placeholder:text-[#605f58] outline-none transition focus:border-[#cdd2d8]";
const label =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[2px] text-[#94928a] mono";

export function AuthForm({
  mode,
  plan,
}: {
  mode: "login" | "signup";
  plan?: string;
}) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );
  // Code sign-in is the default on login: most members never set a password,
  // because their account was created for them from the address they paid with.
  const [usePassword, setUsePassword] = useState(mode === "signup");

  if (mode === "login" && !usePassword) {
    return <CodeSignIn onUsePassword={() => setUsePassword(true)} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      {mode === "signup" && plan ? (
        <input type="hidden" name="plan" value={plan} />
      ) : null}
      {mode === "signup" ? (
        <div>
          <label className={label}>
            Username <span className="normal-case text-[#605f58]">(optional)</span>
          </label>
          <input name="username" type="text" autoComplete="username" className={field} />
        </div>
      ) : null}

      <div>
        <label className={label}>Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={field}
        />
      </div>

      <div>
        <label className={label}>Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          className={field}
        />
      </div>

      {state?.error ? (
        <p className="rounded-xl border border-[#d98f8f]/40 bg-[#d98f8f]/10 px-4 py-3 text-[13px] font-medium text-[#e7b7b7]">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-pill w-full disabled:opacity-60">
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>

      {mode === "login" ? (
        <p className="text-center text-[13px] text-[#94928a]">
          <button
            type="button"
            onClick={() => setUsePassword(false)}
            className="-my-2.5 inline-block border-b border-[#cdd2d8]/50 py-2.5 font-semibold text-[#ededee] transition hover:border-[#cdd2d8]"
          >
            Email me a code instead
          </button>
        </p>
      ) : null}

      <p className="pt-1 text-center text-[13px] text-[#94928a]">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link
              href="/signup"
              className="-my-2.5 inline-block border-b border-[#cdd2d8]/50 py-2.5 font-semibold text-[#ededee] transition hover:border-[#cdd2d8]"
            >
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="-my-2.5 inline-block border-b border-[#cdd2d8]/50 py-2.5 font-semibold text-[#ededee] transition hover:border-[#cdd2d8]"
            >
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
