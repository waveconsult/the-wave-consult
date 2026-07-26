import { NextResponse } from "next/server";
import { planForProduct } from "@/lib/fastspring";
import { isPlan } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { verifyFastSpringSignature } from "@/lib/fastspring-server";
import { createAdminClient } from "@/lib/supabase/admin";

// FastSpring calls this endpoint after order/subscription events. It's public
// (FastSpring is not a logged-in user) but authenticated by the HMAC signature
// in the X-FS-Signature header. This is the ONLY place membership access
// (profiles.tier) is granted or revoked for FastSpring, mirroring the Stripe
// webhook so Supabase always reflects who currently has access.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

// FastSpring subscription lifecycle states. `canceled` means the member turned
// off renewal but KEEPS access until the period ends; access only actually ends
// on `deactivated`. (This differs from Stripe, where `deleted` = revoke now.)
const ACTIVE_STATES = new Set(["active", "trial", "overdue", "canceled"]);

// FastSpring's TEST storefront (…​.test.onfastspring.com) sends events with
// `live: false`. Those must never grant real access in production — but while
// we're still testing against the test store we DO want them to land. So: honour
// test events only while the configured storefront is itself a test storefront.
// Swap NEXT_PUBLIC_FASTSPRING_STOREFRONT to the live one and test events are
// ignored automatically, with no second flag to remember.
const TEST_MODE = (process.env.NEXT_PUBLIC_FASTSPRING_STOREFRONT ?? "").includes(
  ".test.onfastspring.com",
);

// A single POST can carry MANY events — FastSpring batches them in an array.
type FsEvent = { id?: string; type?: string; live?: boolean; data?: FsData };
type FsData = {
  id?: string;
  order?: string;
  account?: string | { id?: string };
  product?: string;
  state?: string;
  next?: number; // epoch ms of the next charge = current period end
  tags?: Record<string, string> | null;
  customer?: { email?: string } | null;
  items?: Array<{ product?: string; subscription?: string }>;
};

const asString = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && "id" in v
    ? ((v as { id?: string }).id ?? null)
    : null;

const planFromTags = (tags: FsData["tags"]): Plan | null => {
  const p = tags?.plan;
  return isPlan(p) ? p : null;
};

// FastSpring `next` is epoch milliseconds; guard defensively.
const periodEndIso = (ms: number | undefined): string | null =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;

async function findProfileId(
  admin: Admin,
  keys: { userId?: string | null; accountId?: string | null; email?: string | null },
): Promise<string | null> {
  if (keys.userId) return keys.userId;
  if (keys.accountId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("fastspring_account_id", keys.accountId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (keys.email) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", keys.email.toLowerCase())
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

// Supabase's update() resolves with an { error } object instead of throwing, so
// an unchecked write fails silently and the webhook still answers 200 — the
// payment looks handled while access was never granted. Make every write loud.
async function must<T extends { error: unknown }>(
  what: string,
  op: PromiseLike<T>,
): Promise<T> {
  const res = await op;
  if (res.error) {
    const e = res.error as { message?: string; code?: string };
    throw new Error(`${what}: ${e.code ?? ""} ${e.message ?? JSON.stringify(res.error)}`.trim());
  }
  return res;
}

// ── Initial purchase: the order carries the buyer email + our checkout tags,
// so this is where we can also resolve the member by email and record the
// admin-invite application. ────────────────────────────────────────────────
async function handleOrderCompleted(admin: Admin, data: FsData) {
  const tags = data.tags ?? {};
  const accountId = asString(data.account);
  const item = data.items?.[0];
  const subId = item?.subscription ?? null;
  const email = (data.customer?.email ?? "").trim().toLowerCase();
  // The plan is which duration they bought — best-effort metadata. Access does
  // NOT depend on resolving it: a completed order makes you a member, full stop.
  // (Previously a mis-set product env var would silently deny access to someone
  // who had already paid.)
  const plan = planFromTags(tags) ?? planForProduct(item?.product);

  const profileId = await findProfileId(admin, {
    userId: tags.user_id,
    accountId,
    email: email || null,
  });

  if (profileId) {
    await must(
      "profiles update (order.completed)",
      admin
      .from("profiles")
      .update({
        tier: "member",
        plan: plan ?? undefined,
        fastspring_account_id: accountId,
        fastspring_subscription_id: subId,
        subscription_status: "active",
      })
      .eq("id", profileId),
    );
  }

  // admin-invite flow: member paid before the account exists — keep the ids on
  // the application so they can be attached at signup.
  if (tags.application_id) {
    await must(
      "applications update (order.completed)",
      admin
      .from("applications")
      .update({
        status: "accepted",
        granted_tier: "member",
        granted_plan: plan ?? undefined,
        paid_at: new Date().toISOString(),
        fastspring_account_id: accountId,
        fastspring_subscription_id: subId,
      })
      .eq("id", tags.application_id),
    );
  }
}

// ── Subscription lifecycle: activation, renewals, cancel (renewal off), and
// deactivation (access actually ends). ─────────────────────────────────────
async function handleSubscription(admin: Admin, type: string, data: FsData) {
  const tags = data.tags ?? {};
  const accountId = asString(data.account);
  const subId = data.id ?? null;
  const plan = planFromTags(tags) ?? planForProduct(data.product);

  const profileId = await findProfileId(admin, {
    userId: tags.user_id,
    accountId,
  });
  if (!profileId) return;

  const deactivated = type === "subscription.deactivated";
  const stillActive = !deactivated && ACTIVE_STATES.has(data.state ?? "");

  await must(
    `profiles update (${type})`,
    admin
    .from("profiles")
    .update({
      // Access follows the subscription: stay a member while active (including
      // after a cancel, until the period ends), drop to 'none' on deactivation.
      tier: stillActive ? "member" : "none",
      plan: plan ?? undefined,
      subscription_status: deactivated ? "deactivated" : data.state ?? "active",
      fastspring_account_id: accountId,
      fastspring_subscription_id: subId,
      current_period_end: periodEndIso(data.next),
    })
    .eq("id", profileId),
  );
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fs-signature");

  if (!verifyFastSpringSignature(rawBody, signature)) {
    // Fails closed when the secret is unset or the digest doesn't match.
    //
    // Two very different causes produce the same 401, and telling them apart
    // otherwise costs a round trip each time:
    //   signaturePresent false -> FastSpring is not signing at all, i.e. the
    //     HMAC SHA256 Secret field on the webhook is empty. Fix it there.
    //   signaturePresent true  -> both sides have a secret but they differ.
    // Booleans only: neither the secret nor the received signature is echoed,
    // so this reveals nothing an attacker could use to forge a signature.
    return NextResponse.json(
      {
        error: "Invalid signature.",
        signaturePresent: Boolean(signature),
        secretConfigured: Boolean(process.env.FASTSPRING_WEBHOOK_SECRET),
      },
      { status: 401 },
    );
  }

  let events: FsEvent[];
  try {
    const parsed = JSON.parse(rawBody) as { events?: FsEvent[] };
    events = Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Which event we are on, so a failure can name it. FastSpring batches events,
  // and "one of them failed" is not enough to act on.
  let current = "";

  try {
    for (const event of events) {
      const data = event.data;
      if (!data) continue;
      current = event.type ?? "unknown";

      // Drop test-store events once we're pointed at the live storefront, so a
      // leftover test webhook can never hand out a real membership.
      if (event.live === false && !TEST_MODE) continue;

      switch (event.type) {
        case "order.completed":
          await handleOrderCompleted(admin, data);
          break;
        case "subscription.activated":
        case "subscription.charge.completed":
        case "subscription.updated":
        case "subscription.canceled":
        case "subscription.deactivated":
          await handleSubscription(admin, event.type, data);
          break;
        default:
          // Ignore everything else (return.created, etc.).
          break;
      }
    }
  } catch (e) {
    // This used to swallow the error and return a bare 500, which showed up in
    // FastSpring as "Failed, will be retried" with nothing to act on. Put the
    // reason in the response body: FastSpring displays it in the webhook log,
    // so the cause is visible without digging through platform logs.
    //
    // Safe to include — this point is only reachable after the HMAC signature
    // has been verified, so nobody but FastSpring can see it.
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[fastspring] ${current} failed:`, e);
    // Still a 500 so FastSpring retries the batch; handlers are idempotent.
    return NextResponse.json(
      { error: "Handler error.", event: current, detail },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
