"use client";

import { useActionState } from "react";
import type { Profile, Strategy } from "@/lib/types";
import { updateRiskSettings, type RiskState } from "./actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text mono outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "conservative", label: "Conservative (¼ Kelly)" },
  { value: "standard", label: "Standard (½ Kelly)" },
  { value: "aggressive", label: "Aggressive (Full Kelly)" },
];

export function RiskManagementForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<RiskState, FormData>(
    updateRiskSettings,
    { status: "idle" },
  );

  return (
    <form action={formAction} className="card p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Bankroll (€)</span>
          <input
            name="bankroll"
            inputMode="decimal"
            defaultValue={profile.bankroll}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Unit size (€)</span>
          <input
            name="unit_size"
            inputMode="decimal"
            defaultValue={profile.unit_size}
            className={field}
          />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs text-muted">Strategy</span>
          <select
            name="staking_strategy"
            defaultValue={profile.staking_strategy}
            className={field}
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs text-muted">
            Max stake (% of bankroll)
          </span>
          <input
            name="max_stake_pct"
            inputMode="decimal"
            defaultValue={profile.max_stake_pct}
            className={field}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-faint">
          Changing bankroll updates every stake amount in the feed.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {state.status === "ok" ? (
        <p className="mt-2 text-xs text-pos">Saved.</p>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-2 text-xs text-neg">{state.message}</p>
      ) : null}
    </form>
  );
}
