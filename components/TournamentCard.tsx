import Link from "next/link";
import type { Tournament } from "@/lib/types";
import { relativeDate } from "@/lib/format";

// Tapping a tournament filters the Bets feed by tournament_id (briefing §5.2).
// Layout mirrors the prototype: flag · info (name/meta/surface) · bet count.
export function TournamentCard({
  tournament,
  betCount,
}: {
  tournament: Tournament;
  betCount?: number;
}) {
  const dates =
    tournament.start_date && tournament.end_date
      ? `${relativeDate(tournament.start_date)}–${relativeDate(tournament.end_date)}`
      : null;
  const meta = [tournament.location, tournament.category, dates]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/bets?tournament=${tournament.id}`}
      className="card mb-3.5 flex items-center gap-3.5 p-4 transition active:scale-[0.985] active:border-border-strong"
    >
      <div className="shrink-0 text-[26px]">{tournament.country_flag ?? "🎾"}</div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-text">
          {tournament.name}
        </p>
        {meta ? <p className="mt-0.5 text-[11px] text-muted">{meta}</p> : null}
        <span className="mono mt-1.5 inline-block rounded-md border border-pos/20 bg-pos/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9ee6b4]">
          {tournament.surface}
        </span>
      </div>

      {typeof betCount === "number" ? (
        <div className="shrink-0 text-right">
          <p className="mono text-lg font-bold text-primary-bright">{betCount}</p>
          <p className="text-[9px] uppercase tracking-wide text-faint">Bets</p>
        </div>
      ) : null}
    </Link>
  );
}
