"use client";

import { useActionState } from "react";
import { createInsight, type AdminState } from "@/app/admin/actions";
import type { Tournament } from "@/lib/types";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

export function NewInsightForm({ tournaments }: { tournaments: Tournament[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createInsight,
    null,
  );

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Tournament</span>
        <select name="tournament_id" defaultValue="" className={field}>
          <option value="">— none —</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.country_flag ? `${t.country_flag} ` : ""}
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Title</span>
        <input
          name="title"
          required
          placeholder="Auger — Majchrzak"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Body</span>
        <textarea
          name="body"
          rows={7}
          required
          placeholder="The analysis. Calm, analytical — sharp analyst, no hype."
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          Stats table (optional JSON)
        </span>
        <textarea
          name="stats"
          rows={4}
          placeholder='[{"player":"Auger","w":24,"ue":15,"tt":9,"ratio":1.6}]'
          className={`${field} mono text-xs`}
        />
        <span className="mt-1 block text-[11px] text-faint">
          Leave empty for no table. Must be a JSON array if provided.
        </span>
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
        {pending ? "Publishing…" : "Publish insight"}
      </button>
    </form>
  );
}
