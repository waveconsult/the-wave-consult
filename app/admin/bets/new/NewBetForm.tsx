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
          <b className="text-text">Market</b> = <i>was</i> du wettest (z. B.
          Spielsieger, Über/Unter Games).{" "}
          <b className="text-text">Selection</b> = <i>worauf konkret</i> (z. B.
          „Alcaraz", „Over 22.5", „+1.5 Sätze").
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <L label="Tournament (laufende & kommende)" span>
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

        <L label="Market (was)">
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
              placeholder="z. B. Tie-break im 1. Satz"
              className={field}
            />
          </L>
        ) : null}

        {/* actual submitted market value */}
        <input type="hidden" name="market" value={marketValue} />

        <L label="Selection (worauf konkret)" span>
          <input
            name="selection"
            required
            placeholder='z. B. "Alcaraz" oder "Over 22.5"'
            className={field}
          />
        </L>

        <L label="Odds">
          <input name="odds" inputMode="decimal" required placeholder="1.85" className={num} />
        </L>
        <L label="Stake %">
          <input name="stake_pct" inputMode="decimal" required placeholder="2" className={num} />
        </L>

        <L label="Min odd (optional — Disziplin-Limit)" span>
          <input
            name="min_odd"
            inputMode="decimal"
            placeholder="leer lassen = kein Mindestkurs"
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
        <L label="CLV % (optional, nur belegt)">
          <input name="clv" inputMode="decimal" placeholder="nach Settlement" className={num} />
        </L>

        <L label="Reasoning" span>
          <textarea
            name="reasoning"
            rows={4}
            placeholder="Ruhig, analytisch. Das Warum hinter dem Pick."
            className={field}
          />
        </L>

        <L label="Bet slip screenshot (optional, Bild ≤ 5 MB)" span>
          <input
            name="screenshot"
            type="file"
            accept="image/*"
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
