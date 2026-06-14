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

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });
  return (data as Tournament[]) ?? [];
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
