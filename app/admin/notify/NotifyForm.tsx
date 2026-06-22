"use client";

import { useActionState } from "react";
import { sendPushToAll, type PushResult } from "@/app/notifications/actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

export function NotifyForm() {
  const [state, formAction, pending] = useActionState<PushResult, FormData>(
    sendPushToAll,
    null,
  );

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Title (keep it short)</span>
        <input
          name="title"
          required
          maxLength={50}
          placeholder="New ATP pick"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Message</span>
        <textarea
          name="body"
          required
          rows={3}
          maxLength={140}
          placeholder="A fresh value pick is live. Tap to read the call."
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          Opens this page on tap (optional)
        </span>
        <input name="url" defaultValue="/bets" placeholder="/bets" className={field} />
      </label>

      {state?.error ? (
        <p className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-xs text-neg">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-lg border border-pos/30 bg-pos/10 px-3 py-2 text-xs text-pos">
          {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send to all members"}
      </button>
    </form>
  );
}
