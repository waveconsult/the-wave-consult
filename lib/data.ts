import { createClient } from "@/lib/supabase/server";
import type {
  BetWithMeta,
  InsightWithMeta,
  Resource,
  Tournament,
} from "@/lib/types";


// Resolve a stored attachment path to a URL the browser can load. Always our
// own route, which signs per request — see app/api/attachment/route.ts.
//
// Two things this deliberately does NOT do:
//
// It does not sign here. A signature minted at render time is frozen into the
// HTML and dies an hour later, so any page left open, revisited, or replayed
// from the client-side cache showed broken images.
//
// It no longer branches on NEXT_PUBLIC_BET_SHOTS_PUBLIC. That branch handed out
// a public storage URL, which returns an error for a bucket that is private —
// and the bucket IS private, by design (see supabase/storage-policies.sql).
// With the flag set to "true" in the environment the feed served dead URLs
// while every other surface worked, which is a miserable thing to debug. The
// route works for a public bucket too, so the fast path bought nothing.
function resolveScreenshot(path: string | null): string | null {
  if (!path) return null;
  return `/api/attachment?path=${encodeURIComponent(path)}`;
}

export async function getTournaments(
  opts: { upcomingOnly?: boolean } = {},
): Promise<Tournament[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });
  let list = (data as Tournament[]) ?? [];

  if (opts.upcomingOnly) {
    // Keep only events that are ongoing or in the future (end_date today or
    // later). Events without an end date are always kept.
    const today = new Date().toISOString().slice(0, 10);
    list = list.filter((t) => !t.end_date || t.end_date >= today);
  }

  return list;
}

export async function getBets(
  tournamentId?: string,
): Promise<BetWithMeta[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bets")
    .select(
      "*, tournament:tournaments(name, country_flag, category, surface)",
    )
    .order("published_at", { ascending: false });

  if (tournamentId) query = query.eq("tournament_id", tournamentId);

  const { data } = await query;
  const bets = (data as BetWithMeta[]) ?? [];

  // Resolve attachments (signed URLs when the bucket is private).
  return Promise.all(
    bets.map(async (b) => ({
      ...b,
      screenshot_url: resolveScreenshot(b.screenshot_path),
    })),
  );
}

export async function getResources(): Promise<Resource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as Resource[]) ?? [];
  // Resources (PDFs/tools) go through the same route, for the same reasons.
  return rows.map((r) => ({
    ...r,
    url: resolveScreenshot(r.file_path),
  }));
}

export async function getInsights(): Promise<InsightWithMeta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("insights")
    .select("*, tournament:tournaments(name, country_flag)")
    .order("published_at", { ascending: false });
  const insights = (data as InsightWithMeta[]) ?? [];

  // Resolve attachments (signed URLs when the bucket is private), same as bets.
  return Promise.all(
    insights.map(async (i) => ({
      ...i,
      screenshot_url: resolveScreenshot(i.screenshot_path),
    })),
  );
}

// Real track record from SETTLED picks (won/lost) published since `sinceISO`.
// Profit is expressed as a fraction of bankroll (units = fraction × 100), based
// on each pick's stake_pct and odds. This is real, computed data — not
// fabricated. Frame it as "past settled results", never as a promise.
export async function getTrackRecord(sinceISO: string): Promise<{
  won: number;
  lost: number;
  total: number;
  units: number;
  fraction: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bets")
    .select("status, odds, stake_pct")
    .in("status", ["won", "lost"])
    .gte("published_at", sinceISO);

  let won = 0;
  let lost = 0;
  let fraction = 0;
  for (const b of (data as { status: string; odds: number | null; stake_pct: number }[]) ?? []) {
    const o = Number(b.odds);
    const stake = Number(b.stake_pct) / 100;
    // Profit needs numeric odds; bets saved without odds can't be scored.
    if (!Number.isFinite(o) || o <= 1 || !Number.isFinite(stake)) continue;
    if (b.status === "won") {
      won++;
      fraction += stake * (o - 1);
    } else {
      lost++;
      fraction -= stake;
    }
  }
  return { won, lost, total: won + lost, units: fraction * 100, fraction };
}

export async function getTournamentById(
  id: string,
): Promise<Tournament | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Tournament) ?? null;
}
