"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDecimal } from "@/lib/format";
import type { BetStatus, InsightStatRow } from "@/lib/types";

const BUCKET = "bet-shots";
const RESOURCES_BUCKET = "resources";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap (briefing §6)
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB cap for resource PDFs
const VALID_STATUS: BetStatus[] = ["open", "won", "lost", "void"];

export type AdminState = { error: string } | null;

// Re-check admin from a server action (these are POST-reachable directly).
async function requireAdminUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return me?.role === "admin" ? user : null;
}

function num(v: FormDataEntryValue | null): number {
  return parseDecimal(v); // accepts "1,75" and "1.75"
}
function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function nullable(s: string): string | null {
  return s.length ? s : null;
}

// ---- New Bet (with optional screenshot upload, briefing §5.6, §6) ----
export async function createBet(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const supabase = await createClient();

  // Authorization: this action is POST-reachable directly, so re-check admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: "Admins only." };

  const match = str(formData.get("match"));
  const selection = str(formData.get("selection"));
  const market = str(formData.get("market"));
  const odds = num(formData.get("odds"));
  const stakePct = num(formData.get("stake_pct"));
  const minOddRaw = str(formData.get("min_odd"));
  const status = str(formData.get("status")) as BetStatus;
  const clvRaw = str(formData.get("clv"));

  if (!match || !selection || !market)
    return { error: "Match, selection and market are required." };
  if (!Number.isFinite(odds) || odds <= 1)
    return { error: "Odds must be greater than 1." };
  if (!Number.isFinite(stakePct) || stakePct < 0)
    return { error: "Stake % must be 0 or more." };

  // Min odd is optional (discipline floor). Validate only when provided.
  let minOdd: number | null = null;
  if (minOddRaw) {
    minOdd = num(formData.get("min_odd"));
    if (!Number.isFinite(minOdd) || minOdd <= 1)
      return { error: "Min odd must be greater than 1 (or leave it empty)." };
  }
  if (!VALID_STATUS.includes(status)) return { error: "Invalid status." };

  // Validate the optional screenshot before inserting.
  const file = formData.get("screenshot");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    if (!file.type.startsWith("image/"))
      return { error: "Screenshot must be an image." };
    if (file.size > MAX_BYTES)
      return { error: "Screenshot must be 5 MB or smaller." };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("bets")
    .insert({
      tournament_id: nullable(str(formData.get("tournament_id"))),
      match,
      round: nullable(str(formData.get("round"))),
      selection,
      market,
      odds,
      stake_pct: stakePct,
      min_odd: minOdd,
      status,
      reasoning: nullable(str(formData.get("reasoning"))),
      clv: clvRaw ? num(formData.get("clv")) : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) return { error: insertErr?.message ?? "Insert failed." };

  // Upload screenshot → storage, then store its path on the bet.
  if (hasFile && file instanceof File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `bets/${inserted.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadErr) return { error: `Bet saved, but upload failed: ${uploadErr.message}` };

    await supabase
      .from("bets")
      .update({ screenshot_path: path })
      .eq("id", inserted.id);
  }

  revalidatePath("/", "layout");
  redirect("/bets");
}

// ---- New Insight (briefing §5.6) ----
export async function createInsight(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: "Admins only." };

  const title = str(formData.get("title"));
  const body = str(formData.get("body"));
  if (!title || !body) return { error: "Title and body are required." };

  // Optional stats — accept pasted JSON array; reject malformed input.
  let stats: InsightStatRow[] | null = null;
  const statsRaw = str(formData.get("stats"));
  if (statsRaw) {
    try {
      const parsed = JSON.parse(statsRaw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      stats = parsed as InsightStatRow[];
    } catch {
      return {
        error:
          'Stats must be a JSON array, e.g. [{"player":"X","w":20,"ue":12}]',
      };
    }
  }

  const { error } = await supabase.from("insights").insert({
    tournament_id: nullable(str(formData.get("tournament_id"))),
    title,
    body,
    stats,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/bets?view=insights");
}

// ---- Delete a bet (admin, from the feed) ----
export async function deleteBet(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const admin = await requireAdminUser(supabase);
  if (!admin) return;

  const id = str(formData.get("id"));
  if (!id) return;

  // Best-effort: remove the screenshot from storage too.
  const { data: bet } = await supabase
    .from("bets")
    .select("screenshot_path")
    .eq("id", id)
    .single();
  if (bet?.screenshot_path) {
    await supabase.storage.from(BUCKET).remove([bet.screenshot_path]);
  }

  await supabase.from("bets").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ---- New Resource (admin uploads a PDF/tool — same pattern as bets) ----
export async function createResource(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const supabase = await createClient();
  const admin = await requireAdminUser(supabase);
  if (!admin) return { error: "Admins only." };

  const title = str(formData.get("title"));
  if (!title) return { error: "Title is required." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Please choose a PDF." };
  if (file.type !== "application/pdf")
    return { error: "File must be a PDF." };
  if (file.size > MAX_PDF_BYTES)
    return { error: "PDF must be 20 MB or smaller." };

  const path = `${crypto.randomUUID()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadErr) return { error: uploadErr.message };

  const { error } = await supabase.from("resources").insert({
    title,
    file_path: path,
    created_by: admin.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/tools");
}
