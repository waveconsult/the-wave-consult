"use client";

import { useActionState, useState } from "react";
import { correctEmail, type FixState } from "./actions";

/**
 * Shows the address everything is keyed to, and lets a typo be corrected while
 * the tab is still open — after that there is no way back to this person.
 * Collapsed by default: for the overwhelming majority the address is right and
 * a form here would only invite second-guessing.
 */
export function EmailCheck({
  sessionId,
  email,
}: {
  sessionId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FixState, FormData>(
    correctEmail,
    null,
  );

  if (state?.ok) {
    return (
      <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-muted">
        {state.ok}
      </p>
    );
  }

  return (
    <div className="mt-6 w-full max-w-sm">
      <p className="text-[13px] leading-relaxed text-muted">
        Your access is tied to <span className="text-text">{email}</span>.
      </p>

      {open ? (
        <form action={formAction} className="mt-3 space-y-3 text-left">
          <input type="hidden" name="session" value={sessionId} />
          <label className="block text-[11px] font-bold uppercase tracking-[2px] text-faint">
            Correct address
          </label>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[16px] text-text outline-none transition focus:border-primary"
          />
          {state?.error ? (
            <p className="text-[13px] text-neg">{state.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="btn-pill-ghost w-full disabled:opacity-60"
          >
            {pending ? "Saving…" : "Use this address instead"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 -my-1 py-1 text-[13px] text-muted underline underline-offset-4 transition hover:text-text"
        >
          Not your address?
        </button>
      )}
    </div>
  );
}
