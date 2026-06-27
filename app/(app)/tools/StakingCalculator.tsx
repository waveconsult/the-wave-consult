"use client";

import { useState } from "react";
import { parseDecimal } from "@/lib/format";
import { AGGRESSIVE_RATIO, BANKROLL_THRESHOLD } from "@/lib/staking";

const field =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-base font-semibold text-text mono outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20";
const label = "mb-1.5 mt-3.5 block text-xs font-medium text-muted";

export function StakingCalculator({
  initialBankroll,
}: {
  initialBankroll: number;
}) {
  const [bankroll, setBankroll] = useState(String(initialBankroll || ""));
  const [stake, setStake] = useState("4"); // the conservative stake %

  const b = parseDecimal(bankroll);
  const p = parseDecimal(stake);
  const valid = Number.isFinite(b) && b > 0 && Number.isFinite(p) && p >= 0;

  const cons = valid ? b * (p / 100) : 0;
  const aggr = cons * AGGRESSIVE_RATIO;
  const aggrPct = p * AGGRESSIVE_RATIO;
  const small = valid && b < BANKROLL_THRESHOLD; // recommend aggressive

  const euro = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

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

        <label className={label}>Conservative stake %</label>
        <input
          inputMode="decimal"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className={field}
        />

        <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Result
            title="Conservative"
            note="Bankrolls over €10k"
            amount={valid ? `€${euro(cons)}` : "—"}
            sub={valid ? `${pct(p)}% of bankroll` : ""}
            recommended={valid && !small}
          />
          <Result
            title="Aggressive"
            note="Bankrolls under €10k"
            amount={valid ? `€${euro(aggr)}` : "—"}
            sub={valid ? `${pct(aggrPct)}% of bankroll` : ""}
            recommended={small}
          />
        </div>
      </div>

      <p className="mx-1 mt-1 text-[12px] leading-relaxed text-faint">
        The analyst always sets the conservative stake. Aggressive players bet
        ×5.5/4 (= 1.375×) of it. The highlighted box matches your bankroll size.
      </p>
    </>
  );
}

function Result({
  title,
  note,
  amount,
  sub,
  recommended,
}: {
  title: string;
  note: string;
  amount: string;
  sub: string;
  recommended: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        recommended
          ? "border-primary/40 bg-gradient-to-br from-primary-deep/[0.18] to-primary/[0.06]"
          : "border-border bg-surface-2"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-base font-bold text-text">{title}</p>
        {recommended ? (
          <span className="mono rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-bright">
            For you
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] text-muted">{note}</p>
      <p className="mono mt-3 text-[26px] font-bold text-text">{amount}</p>
      {sub ? <p className="mono mt-0.5 text-[11px] text-faint">{sub}</p> : null}
    </div>
  );
}
