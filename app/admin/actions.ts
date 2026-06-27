"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/push";
import { parseDecimal } from "@/lib/format";
import type { InsightStatRow } from "@/lib/types";

// One private bucket holds everything: bet slips, insight attachments and
// tool/resource PDFs. Uploads run on the user's (admin) session so they never
// depend on the service-role key — the storage RLS policies gate them.
const BUCKET = "bet-shots";
// Vercel serverless functions cap the request body at ~4.5MB, and uploads go
// through a server action, so keep both caps at 4MB.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (images)
const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB (PDFs)

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

  const selection = str(formData.get("selection"));
  const stakePct = num(formData.get("stake_pct"));

  // Everything is written into the pick (selection), price included. Match,
  // market, round, odds, status and CLV are no longer separate inputs.
  if (!selection) return { error: "The pick is required." };
  if (!Number.isFinite(stakePct) || stakePct < 0)
    return { error: "Stake % must be 0 or more." };

  // Validate the optional attachment before inserting (image OR PDF).
  const file = formData.get("screenshot");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file instanceof File) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf)
      return { error: "Attachment must be an image or a PDF." };
    const cap = isPdf ? MAX_PDF_BYTES : MAX_BYTES;
    if (file.size > cap)
      return {
        error: isPdf
          ? "PDF must be 4 MB or smaller."
          : "Image must be 4 MB or smaller.",
      };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("bets")
    .insert({
      tournament_id: null,
      tournament_name: nullable(str(formData.get("tournament_name"))),
      match: selection,
      round: null,
      selection,
      market: "",
      odds: null,
      stake_pct: stakePct,
      min_odd: null,
      status: "open",
      reasoning: nullable(str(formData.get("reasoning"))),
      clv: null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) return { error: insertErr?.message ?? "Insert failed." };

  // Upload screenshot, then store its path on the bet.
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

  // Optionally fire a push notification to all subscribers.
  if (str(formData.get("notify")) === "on") {
    const ntitle = str(formData.get("notify_title"));
    const nbody = str(formData.get("notify_body"));
    if (ntitle && nbody) {
      try {
        await broadcast({ title: ntitle, body: nbody, url: "/bets" });
      } catch {
        // A push failure must never block publishing the bet.
      }
    }
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

  // Validate the optional attachment before inserting (image OR PDF).
  const file = formData.get("screenshot");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file instanceof File) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf)
      return { error: "Attachment must be an image or a PDF." };
    const cap = isPdf ? MAX_PDF_BYTES : MAX_BYTES;
    if (file.size > cap)
      return {
        error: isPdf
          ? "PDF must be 4 MB or smaller."
          : "Image must be 4 MB or smaller.",
      };
  }

  const { data: inserted, error } = await supabase
    .from("insights")
    .insert({
      tournament_id: null,
      tournament_name: nullable(str(formData.get("tournament_name"))),
      title,
      body,
      stats,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Insert failed." };

  // Upload the attachment, then store its path on the insight.
  if (hasFile && file instanceof File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `insights/${inserted.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadErr)
      return { error: `Insight saved, but upload failed: ${uploadErr.message}` };

    await supabase
      .from("insights")
      .update({ screenshot_path: path })
      .eq("id", inserted.id);
  }

  revalidatePath("/", "layout");
  redirect("/bets");
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

// ---- Delete an insight (admin, from the feed) ----
export async function deleteInsight(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const admin = await requireAdminUser(supabase);
  if (!admin) return;

  const id = str(formData.get("id"));
  if (!id) return;

  // Best-effort: remove the attachment from storage too.
  const { data: insight } = await supabase
    .from("insights")
    .select("screenshot_path")
    .eq("id", id)
    .single();
  if (insight?.screenshot_path) {
    await supabase.storage.from(BUCKET).remove([insight.screenshot_path]);
  }

  await supabase.from("insights").delete().eq("id", id);
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
    return { error: "PDF must be 4 MB or smaller." };

  const path = `resources/${crypto.randomUUID()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
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
