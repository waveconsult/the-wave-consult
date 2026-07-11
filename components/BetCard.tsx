import type { BetWithMeta, Strategy } from "@/lib/types";
import { effectiveStakePct, memberStakeAmount } from "@/lib/staking";
import { odds } from "@/lib/format";
import { deleteBet } from "@/app/admin/actions";
import { Attachment } from "./Attachment";
import { LockedCard } from "./LockedCard";

// Bet card: a premium "ticket" — a champagne-gold header carrying the pick,
// over a dark club-surface body with the stake, amount and analysis.
export function BetCard({
  bet,
  bankroll,
  isAdmin = false,
  locked = false,
  strategy = "conservative",
}: {
  bet: BetWithMeta;
  bankroll: number;
  isAdmin?: boolean;
  locked?: boolean;
  strategy?: Strategy;
}) {
  // Free members don't get the real content of recent picks (rendered on the
  // server, so nothing sensitive reaches the client).
  if (locked) return <LockedCard />;

  // The analyst enters the conservative stake; aggressive players bet ×5.5/4.
  const isAggressive = strategy === "aggressive";
  const effectivePct = effectiveStakePct(bet.stake_pct, strategy);
  const amount = memberStakeAmount(bankroll, bet.stake_pct, strategy);
  const tournamentLabel =
    bet.tournament?.name ?? bet.tournament_name ?? "Tournament";
  const meta = bet.round ? `${tournamentLabel} · ${bet.round}` : tournamentLabel;

  return (
    <article className="mb-3.5 overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_36px_-18px_rgba(0,0,0,0.7)]">
      {/* gold header — the pick */}
      <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#9aa0a8] to-[#cdd2d8] px-4 py-3">
        <p className="min-w-0 truncate font-display text-[17px] font-bold leading-tight text-[#14110a]">
          {bet.selection}
          {bet.odds != null ? (
            <span className="mono font-bold text-[#14110a]/90"> @{odds(bet.odds)}</span>
          ) : null}
        </p>
        {isAdmin ? (
          <form action={deleteBet}>
            <input type="hidden" name="id" value={bet.id} />
            <button
              type="submit"
              aria-label="Delete bet"
              className="shrink-0 rounded-md border border-black/25 px-1.5 py-1 text-[#14110a]/70 transition hover:border-black/50 hover:text-[#14110a]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </form>
        ) : null}
      </header>

      {/* dark body */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="mono min-w-0 truncate text-[10px] uppercase tracking-wide text-muted">
            {bet.tournament?.country_flag ? `${bet.tournament.country_flag} ` : ""}
            {meta}
          </p>
          <span
            className={`mono shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              isAggressive
                ? "border border-[#cdd2d8]/40 bg-[#cdd2d8]/12 text-[#eef1f4]"
                : "border border-border bg-surface-2 text-faint"
            }`}
          >
            {isAggressive ? "Aggressive" : "Conservative"}
          </span>
        </div>

        <div
          className={`mt-2.5 grid gap-2 ${
            bet.min_odd != null ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <Stat
            label="Stake"
            value={effectivePct.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
            unit="%"
          />
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
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {bet.reasoning}
          </p>
        ) : null}

        {bet.screenshot_url ? (
          <Attachment
            url={bet.screenshot_url}
            path={bet.screenshot_path}
            label="Bet slip"
          />
        ) : null}
      </div>
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
        {unit ? (
          <span className="text-[10px] font-medium text-muted"> {unit}</span>
        ) : null}
      </p>
    </div>
  );
}
