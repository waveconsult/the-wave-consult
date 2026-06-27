import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getTournaments, getBets } from "@/lib/data";
import { TournamentCard } from "@/components/TournamentCard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  await requireProfile();
  const [all, bets] = await Promise.all([getTournaments(), getBets()]);

  // Show only what's relevant right now: this week + next week (a 14-day window).
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const tournaments = all.filter(
    (t) =>
      t.end_date &&
      t.start_date &&
      t.end_date >= todayStr &&
      t.start_date <= horizonStr,
  );

  const counts = new Map<string, number>();
  for (const b of bets) {
    if (b.tournament_id)
      counts.set(b.tournament_id, (counts.get(b.tournament_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Tournaments" subtitle="ATP · this week & next" />

      {tournaments.length === 0 ? (
        <div className="card flex flex-col items-center gap-1 px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-text">
            Nothing on this week
          </p>
          <p className="max-w-xs text-sm text-muted">
            Only events from this week and next are shown here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              betCount={counts.get(t.id) ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}
