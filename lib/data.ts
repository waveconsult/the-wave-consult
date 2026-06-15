import { createClient } from "@/lib/supabase/server";
import type {
  BetWithMeta,
  InsightWithMeta,
  Tournament,
} from "@/lib/types";

const BUCKET = "bet-shots";
const BUCKET_PUBLIC = process.env.NEXT_PUBLIC_BET_SHOTS_PUBLIC === "true";

// Resolve a stored screenshot path to a URL the browser can load.
// Public bucket → public URL; private bucket → short-lived signed URL.
async function resolveScreenshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  if (BUCKET_PUBLIC) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60); // 1h TTL
  return data?.signedUrl ?? null;
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

  // Resolve screenshots (signed URLs when the bucket is private).
  return Promise.all(
    bets.map(async (b) => ({
      ...b,
      screenshot_url: await resolveScreenshot(supabase, b.screenshot_path),
    })),
  );
}

export async function getInsights(): Promise<InsightWithMeta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("insights")
    .select("*, tournament:tournaments(name, country_flag)")
    .order("published_at", { ascending: false });
  return (data as InsightWithMeta[]) ?? [];
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
  for (const b of (data as { status: string; odds: number; stake_pct: number }[]) ?? []) {
    const stake = Number(b.stake_pct) / 100;
    if (b.status === "won") {
      won++;
      fraction += stake * (Number(b.odds) - 1);
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
