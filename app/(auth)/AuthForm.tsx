"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "./actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-faint outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

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

  return (
    <form action={formAction} className="space-y-3.5">
      {mode === "signup" && plan ? (
        <input type="hidden" name="plan" value={plan} />
      ) : null}
      {mode === "signup" ? (
        <label className="block">
          <span className="mb-1 block text-xs text-muted">
            Username <span className="text-faint">(optional)</span>
          </span>
          <input name="username" type="text" autoComplete="username" className={field} />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          className={field}
        />
      </label>

      {state?.error ? (
        <p className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-xs text-neg">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>

      <p className="pt-1 text-center text-xs text-muted">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-primary-bright hover:underline">
              Apply / sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary-bright hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
