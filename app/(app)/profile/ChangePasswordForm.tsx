"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

export function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      setMsg({ ok: false, text: "At least 8 characters." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: "Password updated." });
      setPw("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex items-end gap-2 p-4">
      <label className="block flex-1">
        <span className="mb-1.5 block text-xs text-muted">New password</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={field}
        />
        {msg && (
          <span
            className={`mt-1.5 block text-xs ${msg.ok ? "text-pos" : "text-neg"}`}
          >
            {msg.text}
          </span>
        )}
      </label>
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
      >
        {busy ? "…" : "Update"}
      </button>
    </form>
  );
}
