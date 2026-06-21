"use client";

import { useActionState } from "react";
import { createInsight, type AdminState } from "@/app/admin/actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

function L({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`block ${span ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

// Same look as the bet form, minus the betting fields (odds, stake, etc.).
export function NewInsightForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createInsight,
    null,
  );

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <L label="Tournament (type it in)" span>
          <input
            name="tournament_name"
            placeholder="e.g. Halle Open"
            className={field}
          />
        </L>

        <L label="Title" span>
          <input
            name="title"
            required
            placeholder="Auger vs Majchrzak"
            className={field}
          />
        </L>

        <L label="Body" span>
          <textarea
            name="body"
            rows={7}
            required
            placeholder="The analysis. Calm, analytical, sharp analyst, no hype."
            className={field}
          />
        </L>

        <L label="Stats table (optional JSON)" span>
          <textarea
            name="stats"
            rows={4}
            placeholder='[{"player":"Auger","w":24,"ue":15,"tt":9,"ratio":1.6}]'
            className={`${field} mono text-xs`}
          />
          <span className="mt-1 block text-[11px] text-faint">
            Leave empty for no table. Must be a JSON array if provided.
          </span>
        </L>

        <L label="Attachment — image or PDF (optional · image ≤ 5 MB, PDF ≤ 20 MB)" span>
          <input
            name="screenshot"
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-text"
          />
        </L>
      </div>

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
