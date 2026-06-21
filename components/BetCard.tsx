import type { BetWithMeta, BetStatus } from "@/lib/types";
import { betStakeAmount } from "@/lib/staking";
import { odds } from "@/lib/format";
import { deleteBet } from "@/app/admin/actions";
import { Attachment } from "./Attachment";

// Bet card: a betting-slip look — a purple header carrying the line
// ("{selection} @{odds}") on top, and a clean white body with the analysis.
const HEADER_STATUS: Record<BetStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-white/15 text-white border-white/25" },
  won: { label: "Won", cls: "bg-pos text-[#0b2e16] border-transparent" },
  lost: { label: "Lost", cls: "bg-neg text-[#3b0a14] border-transparent" },
  void: { label: "Void", cls: "bg-white/10 text-white/70 border-white/20" },
};

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
  const tournamentLabel =
    bet.tournament?.name ?? bet.tournament_name ?? "Tournament";
  const meta = bet.round ? `${tournamentLabel} · ${bet.round}` : tournamentLabel;
  const status = HEADER_STATUS[bet.status] ?? HEADER_STATUS.open;

  return (
    <article className="mb-3.5 overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_14px_36px_-16px_rgba(0,0,0,0.6)]">
      {/* purple header — the line */}
      <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-primary-deep to-primary px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold leading-tight text-white">
            {bet.selection}{" "}
            <span className="mono font-bold text-white/95">@{odds(bet.odds)}</span>
          </p>
          <p className="text-[11px] font-medium text-white/70">{bet.market}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`mono rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${status.cls}`}
          >
            {status.label}
          </span>
          {isAdmin ? (
            <form action={deleteBet}>
              <input type="hidden" name="id" value={bet.id} />
              <button
                type="submit"
                aria-label="Delete bet"
                className="rounded-md border border-white/25 px-1.5 py-1 text-white/80 transition hover:border-white/60 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </form>
          ) : null}
        </div>
      </header>

      {/* white body */}
      <div className="p-4">
        <p className="mono text-[10px] uppercase tracking-wide text-[#8b8794]">
          {bet.tournament?.country_flag ? `${bet.tournament.country_flag} ` : ""}
          {meta}
        </p>
        <h3 className="mt-0.5 font-display text-base font-semibold leading-snug text-[#15131f]">
          {bet.match}
        </h3>

        <div
          className={`mt-3 grid gap-2 ${
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
          <p className="mt-3 text-[13px] leading-relaxed text-[#5b5766]">
            {bet.reasoning}
          </p>
        ) : null}

        {bet.clv !== null && bet.clv !== undefined ? (
          <div className="mt-2.5">
            <span
              className={`mono inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                bet.clv >= 0 ? "bg-pos/15 text-[#178045]" : "bg-neg/15 text-[#b3344f]"
              }`}
            >
              CLV {bet.clv >= 0 ? "+" : ""}
              {bet.clv}%
            </span>
          </div>
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
    <div className="rounded-[10px] border border-[#ece9f4] bg-[#f5f3fa] px-2.5 py-2">
      <p className="mono text-[9px] uppercase tracking-wide text-[#8b8794]">
        {label}
      </p>
      <p className="mono mt-1 text-[15px] font-bold text-[#1a1722]">
        {value}
        {unit ? (
          <span className="text-[10px] font-medium text-[#8b8794]"> {unit}</span>
        ) : null}
      </p>
    </div>
  );
}
