"use client";

import { useActionState } from "react";
import { createResource, type AdminState } from "@/app/admin/actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

export function NewResourceForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createResource,
    null,
  );

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">Title</span>
        <input
          name="title"
          required
          placeholder="e.g. Wimbledon — draw analysis"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">PDF (≤ 4 MB)</span>
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-text"
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
        {pending ? "Uploading…" : "Upload resource"}
      </button>
    </form>
  );
}
