import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeMember, sendMessage } from "@/lib/telegram";

// Nightly cleanup: remove anyone from the group whose paid period has actually
// run out. The Stripe webhook already handles the immediate cases; this catches
// the ones that were cancelled earlier and only expire now, plus any webhook
// that was missed.
//
// Protected by CRON_SECRET, same as the applications cron.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // In the group, but the paid period has passed.
  const { data: expired, error } = await admin
    .from("telegram_members")
    .select("telegram_id, current_period_end, status")
    .eq("in_group", true)
    .not("current_period_end", "is", null)
    .lt("current_period_end", now)
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  let removed = 0;
  for (const m of expired ?? []) {
    const ok = await removeMember(m.telegram_id);
    if (!ok) continue;
    await admin
      .from("telegram_members")
      .update({
        in_group: false,
        removed_at: now,
        status: m.status === "active" ? "canceled" : m.status,
        updated_at: now,
      })
      .eq("telegram_id", m.telegram_id);
    await sendMessage(
      m.telegram_id,
      "Your membership has ended, so you've been removed from the group. Tap /start whenever you want back in.",
    );
    removed++;
  }

  return NextResponse.json({ checked: expired?.length ?? 0, removed });
}
