import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteApplicant } from "@/lib/onboarding";

// Auto-accept: any application still "pending" after this long gets accepted
// automatically and sent the urgency email with its Stripe checkout link.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTO_ACCEPT_AFTER_MS = 60 * 60 * 1000; // 1 hour
const BATCH = 50;

// Protect the endpoint: the caller must present CRON_SECRET, either as
// `Authorization: Bearer <secret>` (Vercel Cron) or `?token=<secret>`
// (external cron services). Stripe/Supabase writes use the service role.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("token") === secret;
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const cutoff = new Date(Date.now() - AUTO_ACCEPT_AFTER_MS).toISOString();

  const { data: due, error } = await db
    .from("applications")
    .select("id, email, requested_tier")
    .eq("status", "pending")
    .lte("created_at", cutoff)
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  const failed: string[] = [];
  for (const a of due ?? []) {
    const tier: "core" | "private" =
      a.requested_tier === "private" ? "private" : "core";
    try {
      await inviteApplicant({
        applicationId: a.id,
        email: a.email,
        tier,
        urgency: true,
      });
      processed++;
    } catch {
      // Leave it pending so the next run retries (idempotent).
      failed.push(a.id);
    }
  }

  return NextResponse.json({
    found: (due ?? []).length,
    processed,
    failed: failed.length,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
