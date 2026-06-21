"use client";

import { useActionState, useState } from "react";
import { createBet, type AdminState } from "@/app/admin/actions";
import type { Tournament } from "@/lib/types";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";
const num = `${field} mono`;

// Common tennis markets for the dropdown; "__other__" reveals a free-text field.
const MARKETS = [
  "Match Winner",
  "Set Handicap",
  "Game Handicap",
  "Total Games (Over/Under)",
  "Total Sets (Over/Under)",
  "Correct Score",
];

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

export function NewBetForm({ tournaments }: { tournaments: Tournament[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createBet,
    null,
  );
  const [market, setMarket] = useState(MARKETS[0]);
  const [customMarket, setCustomMarket] = useState("");
  const isOther = market === "__other__";
  const marketValue = isOther ? customMarket : market;

  return (
    <form action={formAction} className="card space-y-4 p-4">
      {/* Explainer: Market vs Selection */}
      <div className="rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
        <p>
          <b className="text-text">Market</b> = <i>what</i> you bet on (e.g.
          match winner, over/under games).{" "}
          <b className="text-text">Selection</b> = <i>the specific pick</i>{" "}
          (e.g. Alcaraz, Over 22.5, +1.5 sets).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <L label="Tournament (current & upcoming)" span>
          <select name="tournament_id" defaultValue="" className={field}>
            <option value="">— none —</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.country_flag ? `${t.country_flag} ` : ""}
                {t.name}
              </option>
            ))}
          </select>
        </L>

        <L label="Match" span>
          <input name="match" required placeholder="Alcaraz — Sinner" className={field} />
        </L>
        <L label="Round">
          <input name="round" placeholder="R16" className={field} />
        </L>

        <L label="Market (what you bet on)">
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className={field}
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="__other__">Other…</option>
          </select>
        </L>

        {isOther ? (
          <L label="Custom market" span>
            <input
              value={customMarket}
              onChange={(e) => setCustomMarket(e.target.value)}
              placeholder="e.g. Tie-break in set 1"
              className={field}
            />
          </L>
        ) : null}

        {/* actual submitted market value */}
        <input type="hidden" name="market" value={marketValue} />

        <L label="Selection (the specific pick)" span>
          <input
            name="selection"
            required
            placeholder='e.g. "Alcaraz" or "Over 22.5"'
            className={field}
          />
        </L>

        <L label="Odds">
          <input name="odds" inputMode="decimal" required placeholder="1.85" className={num} />
        </L>
        <L label="Stake %">
          <input name="stake_pct" inputMode="decimal" required placeholder="2" className={num} />
        </L>

        <L label="Min odd (optional — discipline floor)" span>
          <input
            name="min_odd"
            inputMode="decimal"
            placeholder="leave empty = no minimum"
            className={num}
          />
        </L>

        <L label="Status">
          <select name="status" defaultValue="open" className={field}>
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
        </L>
        <L label="CLV % (optional, documented only)">
          <input name="clv" inputMode="decimal" placeholder="after settlement" className={num} />
        </L>

        <L label="Reasoning" span>
          <textarea
            name="reasoning"
            rows={4}
            placeholder="Calm, analytical. The why behind the pick."
            className={field}
          />
        </L>

        <L label="Bet slip — screenshot or PDF (optional · image ≤ 5 MB, PDF ≤ 20 MB)" span>
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
        {pending ? "Publishing…" : "Publish bet"}
      </button>
    </form>
  );
}
