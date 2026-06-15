"use client";

import { useMemo, useState } from "react";
import { recommendStake } from "@/lib/staking";
import { parseDecimal } from "@/lib/format";
import type { Strategy } from "@/lib/types";

const field =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base font-semibold text-text mono outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20";
const label = "mb-1.5 mt-3.5 block text-xs font-medium text-muted";

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "conservative", label: "Conservative" },
  { value: "aggressive", label: "Aggressive" },
];

export function StakingCalculator({
  initialBankroll,
  initialStrategy,
}: {
  initialBankroll: number;
  initialStrategy: Strategy;
}) {
  const [bankroll, setBankroll] = useState(String(initialBankroll || ""));
  const [odds, setOdds] = useState("1.95");
  const [winProb, setWinProb] = useState("55");
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);

  const result = useMemo(() => {
    const b = parseDecimal(bankroll);
    const o = parseDecimal(odds);
    const p = parseDecimal(winProb) / 100;
    if (!Number.isFinite(b) || !Number.isFinite(o) || !Number.isFinite(p)) {
      return null;
    }
    return recommendStake({ bankroll: b, odds: o, winProb: p, strategy });
  }, [bankroll, odds, winProb, strategy]);

  return (
    <>
      <div className="card p-4">
        <label className={label}>Bankroll (€)</label>
        <input
          inputMode="decimal"
          value={bankroll}
          onChange={(e) => setBankroll(e.target.value)}
          className={field}
        />

        <label className={label}>Odds (decimal)</label>
        <input
          inputMode="decimal"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
          className={field}
        />

        <label className={label}>Your estimated win probability (%)</label>
        <input
          inputMode="decimal"
          value={winProb}
          onChange={(e) => setWinProb(e.target.value)}
          className={field}
        />

        <label className={label}>Staking strategy</label>
        <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
          {STRATEGIES.map((s) => {
            const on = strategy === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`flex-1 rounded-[10px] py-2 text-xs font-semibold transition ${
                  on
                    ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_4px_14px_rgba(109,40,217,0.4)]"
                    : "text-muted hover:text-text"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <ResultPanel result={result} />
      </div>

      <p className="mx-1 mt-1 text-[12px] leading-relaxed text-faint">
        Capped at 3% of bankroll. Estimates only — not a profit promise.
      </p>
    </>
  );
}

function ResultPanel({
  result,
}: {
  result: ReturnType<typeof recommendStake> | null;
}) {
  if (!result) {
    return (
      <div className="mt-[18px] rounded-2xl border border-border p-4 text-center text-sm text-faint">
        Enter bankroll, odds and your win probability.
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="mt-[18px] rounded-2xl border border-neg/30 bg-neg/[0.08] p-4">
        <p className="font-display text-lg font-bold text-neg">Check input</p>
        <p className="mt-1 text-[13px] text-muted">
          Odds &gt; 1.00, probability 1–99%, bankroll &gt; 0.
        </p>
      </div>
    );
  }

  if (result.bet === false) {
    return (
      <div className="mt-[18px] rounded-2xl border border-neg/30 bg-neg/[0.08] p-4">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-neg">
          🚫 No bet
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          At these odds and your estimate there is <b className="text-text">no value</b>{" "}
          (edge {(result.edge * 100).toFixed(1)}%). Discipline means: you don't
          bet here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[18px] rounded-2xl border border-primary/35 bg-gradient-to-br from-primary-deep/[0.22] to-primary/[0.08] p-4">
      <p className="mb-2.5 flex items-center gap-2 font-display text-lg font-bold text-primary-bright">
        ✓ Value found
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Edge" value={`+${(result.edge * 100).toFixed(1)}`} unit="%" accent />
        <Cell label="Stake" value={(result.stakePct * 100).toFixed(2)} unit="%" />
        <Cell
          label="Amount"
          value={result.stakeAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          unit="€"
        />
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
        {result.capped ? (
          <>
            <b className="text-text">Capped at 3%</b> (bankroll protection).{" "}
          </>
        ) : null}
        Never stake more than the plan says — not even after a loss.
      </p>
    </div>
  );
}

function Cell({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface-2 px-2.5 py-2">
      <p className="mono text-[9px] uppercase tracking-wide text-faint">{label}</p>
      <p className={`mono mt-1 text-[15px] font-bold ${accent ? "text-pos" : "text-text"}`}>
        {value}
        <span className="text-[10px] font-medium text-muted"> {unit}</span>
      </p>
    </div>
  );
}
