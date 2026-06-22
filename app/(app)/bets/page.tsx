import Link from "next/link";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getBets, getInsights, getTournamentById } from "@/lib/data";
import { BetCard } from "@/components/BetCard";
import { InsightCard } from "@/components/InsightCard";
import { PageHeader } from "@/components/PageHeader";
import type { BetWithMeta, InsightWithMeta } from "@/lib/types";

export const metadata: Metadata = { title: "Bets" };

// One combined feed: bets and match insights together, newest first.
type FeedItem =
  | { kind: "bet"; at: number; bet: BetWithMeta }
  | { kind: "insight"; at: number; insight: InsightWithMeta };

// searchParams is async in Next.js 16.
export default async function BetsPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>;
}) {
  const profile = await requireProfile();
  const { tournament } = await searchParams;

  // Free members only get picks older than 3 days; newer ones are locked
  // (shown as a blurred, members-only placeholder). Admins see everything.
  const isFree = profile.role !== "admin" && profile.tier === "none";
  const lockBefore = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const isLocked = (publishedAt: string) =>
    isFree && new Date(publishedAt).getTime() > lockBefore;

  const activeTournament = tournament
    ? await getTournamentById(tournament)
    : null;

  const [bets, insights] = await Promise.all([
    getBets(tournament),
    getInsights(),
  ]);

  // When a tournament filter is active, scope the insights to it too.
  const scopedInsights = tournament
    ? insights.filter((i) => i.tournament_id === tournament)
    : insights;

  const feed: FeedItem[] = [
    ...bets.map((b) => ({
      kind: "bet" as const,
      at: new Date(b.published_at).getTime(),
      bet: b,
    })),
    ...scopedInsights.map((i) => ({
      kind: "insight" as const,
      at: new Date(i.published_at).getTime(),
      insight: i,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <>
      <PageHeader title="Bets" />

      {activeTournament ? (
        <div className="mb-3.5">
          <Link
            href="/bets"
            className="inline-flex items-center gap-2 rounded-[10px] border border-primary/30 bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary-bright"
          >
            {activeTournament.country_flag} {activeTournament.name} ✕
          </Link>
        </div>
      ) : null}

      {feed.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          body="When the analyst publishes a pick or a match read, it appears here with stake %, your stake amount, and the discipline floor."
        />
      ) : (
        <div className="space-y-4">
          {feed.map((item) =>
            item.kind === "bet" ? (
              <BetCard
                key={`b-${item.bet.id}`}
                bet={item.bet}
                bankroll={profile.bankroll}
                isAdmin={profile.role === "admin"}
                locked={isLocked(item.bet.published_at)}
              />
            ) : (
              <InsightCard
                key={`i-${item.insight.id}`}
                insight={item.insight}
                isAdmin={profile.role === "admin"}
                locked={isLocked(item.insight.published_at)}
              />
            ),
          )}
        </div>
      )}
    </>
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
