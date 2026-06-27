"use client";

import { useActionState, useState } from "react";
import type { Profile, Strategy } from "@/lib/types";
import { updateRiskSettings, type RiskState } from "./actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base font-semibold text-text mono outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";

// Two play styles. Aggressive bets a 5.5/4 multiple of every pick — better for
// smaller bankrolls; conservative suits larger ones.
const STRATEGIES: { value: Strategy; label: string; hint: string }[] = [
  { value: "conservative", label: "Conservative", hint: "Bankrolls over €10k" },
  { value: "aggressive", label: "Aggressive", hint: "Bankrolls under €10k" },
];

export function RiskManagementForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<RiskState, FormData>(
    updateRiskSettings,
    { status: "idle" },
  );
  const [strategy, setStrategy] = useState<Strategy>(
    profile.staking_strategy === "aggressive" ? "aggressive" : "conservative",
  );

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <input type="hidden" name="staking_strategy" value={strategy} />

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">Bankroll (€)</span>
        <input
          name="bankroll"
          inputMode="decimal"
          defaultValue={profile.bankroll}
          className={field}
        />
      </label>

      <div>
        <span className="mb-1.5 block text-xs text-muted">Play style</span>
        <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
          {STRATEGIES.map((s) => {
            const on = strategy === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition ${
                  on
                    ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_4px_14px_rgba(109,40,217,0.4)]"
                    : "text-muted"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-faint">
          {STRATEGIES.find((s) => s.value === strategy)?.hint} · aggressive bets
          ×5.5/4 of every pick.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-faint">Drives every stake in the feed.</p>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {state.status === "ok" && <p className="text-xs text-pos">Saved.</p>}
      {state.status === "error" && (
        <p className="text-xs text-neg">{state.message}</p>
      )}
    </form>
  );
}
