import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BetWithMeta } from "@/lib/types";
import { EditBetForm } from "./EditBetForm";

export const metadata: Metadata = { title: "Edit Bet" };

// params is a Promise in this Next version and must be awaited.
export default async function EditBetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Throws/redirects for non-admins — the pencil is only rendered for admins,
  // but the URL is guessable, so the page checks for itself.
  await requireAdmin();

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bets")
    .select("*, tournament:tournaments(name, country_flag, category, surface)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const bet = data as BetWithMeta;
  // Attachments are served through our own route, so the preview URL here does
  // not expire either (see app/api/attachment/route.ts).
  const withUrl: BetWithMeta = {
    ...bet,
    screenshot_url: bet.screenshot_path
      ? `/api/attachment?path=${encodeURIComponent(bet.screenshot_path)}`
      : null,
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href="/bets" className="text-xs text-faint hover:text-muted">
          ← Feed
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
          Edit Bet
        </h1>
      </div>
      <EditBetForm bet={withUrl} />
    </div>
  );
}
