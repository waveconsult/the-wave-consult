import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getTournaments, getBets } from "@/lib/data";
import { TournamentCard } from "@/components/TournamentCard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  await requireProfile();
  const [tournaments, bets] = await Promise.all([getTournaments(), getBets()]);

  const counts = new Map<string, number>();
  for (const b of bets) {
    if (b.tournament_id)
      counts.set(b.tournament_id, (counts.get(b.tournament_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Tournaments"
        subtitle="ATP & WTA. Tap a tournament to filter the bets."
      />

      {tournaments.length === 0 ? (
        <div className="card flex flex-col items-center gap-1 px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-text">
            No tournaments yet
          </p>
          <p className="max-w-xs text-sm text-muted">
            Events are added by the analyst from the admin panel.
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
