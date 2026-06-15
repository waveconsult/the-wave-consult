import Image from "next/image";
import { StatusBadge } from "./StatusBadge";
import type { BetWithMeta } from "@/lib/types";
import { betStakeAmount } from "@/lib/staking";
import { odds } from "@/lib/format";
import { deleteBet } from "@/app/admin/actions";

// Structured pick card — matches the prototype layout: edge-head (meta + match
// + status), a pick-row (selection/market + big odds), a 3-up stat grid
// (Stake / Amount / Min odd), reasoning, optional CLV tag and bet-slip shot.
//
// Stake AMOUNT is never stored — it is derived from the viewer's bankroll, so
// changing bankroll updates every card live.
export function BetCard({
  bet,
  bankroll,
  isAdmin = false,
}: {
  bet: BetWithMeta;
  bankroll: number;
  isAdmin?: boolean;
}) {
  const amount = betStakeAmount(bankroll, bet.stake_pct);
  const tournamentLabel = bet.tournament?.name ?? "Tournament";
  const meta = bet.round ? `${tournamentLabel} · ${bet.round}` : tournamentLabel;

  return (
    <article className="card mb-3.5 p-4">
      {/* edge-head: meta + match | status */}
      <div className="mb-3 flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="mono text-[10px] uppercase tracking-wide text-faint">
            {bet.tournament?.country_flag ? `${bet.tournament.country_flag} ` : ""}
            {meta}
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold leading-snug text-text">
            {bet.match}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={bet.status} />
          {isAdmin ? (
            <form action={deleteBet}>
              <input type="hidden" name="id" value={bet.id} />
              <button
                type="submit"
                aria-label="Delete bet"
                className="rounded-md border border-border px-1.5 py-1 text-faint transition hover:border-neg/40 hover:text-neg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* pick-row: selection / market | odds */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">
            {bet.selection}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{bet.market}</p>
        </div>
        <span className="mono text-lg font-bold text-primary-bright">
          @{odds(bet.odds)}
        </span>
      </div>

      {/* stat-grid — Min odd only shown when a floor was set */}
      <div
        className={`mb-3 grid gap-2 ${
          bet.min_odd != null ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <Stat label="Stake" value={String(bet.stake_pct)} unit="%" />
        <Stat
          label="Amount"
          value={amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          unit="€"
        />
        {bet.min_odd != null ? (
          <Stat label="Min odd" value={odds(bet.min_odd)} />
        ) : null}
      </div>

      {bet.reasoning ? (
        <p className="text-[13px] leading-relaxed text-muted">{bet.reasoning}</p>
      ) : null}

      {bet.clv !== null && bet.clv !== undefined ? (
        <div className="mt-2.5">
          <span
            className={`mono inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
              bet.clv >= 0 ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"
            }`}
          >
            CLV {bet.clv >= 0 ? "+" : ""}
            {bet.clv}%
          </span>
        </div>
      ) : null}

      {bet.screenshot_url ? (
        <>
          <p className="mono mt-3 text-[9px] uppercase tracking-wide text-faint">
            Bet slip
          </p>
          <Image
            src={bet.screenshot_url}
            alt="Bet slip"
            width={800}
            height={500}
            unoptimized
            className="mt-1 w-full rounded-xl border border-border"
          />
        </>
      ) : null}
    </article>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface-2 px-2.5 py-2">
      <p className="mono text-[9px] uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="mono mt-1 text-[15px] font-bold text-text">
        {value}
        {unit ? <span className="text-[10px] font-medium text-muted"> {unit}</span> : null}
      </p>
    </div>
  );
}
