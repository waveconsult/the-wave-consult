"use client";

import { useActionState } from "react";
import { issueTelegramLink, type LinkState } from "./telegram-actions";

/**
 * The member's own way back into the group, so losing the emailed link is not
 * a support ticket. Shows which Telegram account currently holds the
 * membership, because "am I even connected?" is the question underneath most of
 * those tickets.
 */
export function TelegramPanel({
  connectedTo,
}: {
  connectedTo: string | null;
}) {
  const [state, formAction, pending] = useActionState<LinkState, FormData>(
    issueTelegramLink,
    null,
  );

  return (
    <div className="card p-4">
      {connectedTo ? (
        <p className="text-[13px] leading-relaxed text-muted">
          Connected to <span className="text-text">{connectedTo}</span> on
          Telegram.
        </p>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          No Telegram account is connected yet — that is where the calls go out.
        </p>
      )}

      {state?.link ? (
        <>
          <a className="btn-pill mt-4 inline-flex" href={state.link}>
            Open the Telegram bot →
          </a>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            Open it on the account you want inside the group. This link works
            once, and it replaces any earlier one.
          </p>
        </>
      ) : (
        <form action={formAction} className="mt-4">
          <button
            type="submit"
            disabled={pending}
            className="btn-pill-ghost w-full disabled:opacity-60"
          >
            {pending
              ? "Generating…"
              : connectedTo
                ? "Connect a different account"
                : "Get my Telegram link"}
          </button>
        </form>
      )}

      {state?.error ? (
        <p className="mt-3 text-[13px] text-neg">{state.error}</p>
      ) : null}
    </div>
  );
}
