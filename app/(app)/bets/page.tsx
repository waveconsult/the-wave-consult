import Link from "next/link";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getBets, getInsights, getTournamentById } from "@/lib/data";
import { BetCard } from "@/components/BetCard";
import { InsightCard } from "@/components/InsightCard";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedToggle } from "./SegmentedToggle";

export const metadata: Metadata = { title: "Bets" };

// searchParams is async in Next.js 16.
export default async function BetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tournament?: string }>;
}) {
  const profile = await requireProfile();
  const { view, tournament } = await searchParams;
  const isInsights = view === "insights";

  const activeTournament = tournament
    ? await getTournamentById(tournament)
    : null;

  return (
    <>
      <PageHeader title={isInsights ? "Insights" : "Bets"} />

      <SegmentedToggle view={isInsights ? "insights" : "bets"} />

      {activeTournament ? (
        <div className="mb-3.5">
          <Link
            href={isInsights ? "/bets?view=insights" : "/bets"}
            className="inline-flex items-center gap-2 rounded-[10px] border border-primary/30 bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary-bright"
          >
            {activeTournament.country_flag} {activeTournament.name} ✕
          </Link>
        </div>
      ) : null}

      {isInsights ? (
        <InsightsList />
      ) : (
        <BetsList
          bankroll={profile.bankroll}
          tournamentId={tournament}
          isAdmin={profile.role === "admin"}
        />
      )}
    </>
  );
}

async function BetsList({
  bankroll,
  tournamentId,
  isAdmin,
}: {
  bankroll: number;
  tournamentId?: string;
  isAdmin: boolean;
}) {
  const bets = await getBets(tournamentId);

  if (bets.length === 0) {
    return (
      <EmptyState
        title="No bets published yet"
        body="When the analyst publishes a pick, it appears here with stake %, your stake amount, and the discipline floor."
      />
    );
  }

  return (
    <div className="space-y-4">
      {bets.map((bet) => (
        <BetCard key={bet.id} bet={bet} bankroll={bankroll} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

async function InsightsList() {
  const insights = await getInsights();

  if (insights.length === 0) {
    return (
      <EmptyState
        title="No insights yet"
        body="Match analysis — the reasoning behind the calls — will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-text">{title}</p>
      <p className="max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}
