import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForPrice } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this endpoint after subscription events. It's public (Stripe is
// not a logged-in user) but authenticated by the webhook signature. This is the
// ONLY place membership access (profiles.tier) is granted or revoked, so
// Supabase always reflects who currently has access.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

const ACTIVE = new Set(["active", "trialing"]);

function planFromMeta(meta: Stripe.Metadata | undefined | null): Plan | null {
  const p = meta?.plan;
  return isPlan(p) ? p : null;
}

// current_period_end lives on the subscription (older API) or on its first item
// (newer API) — read both defensively.
function periodEndIso(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const secs = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return typeof secs === "number" ? new Date(secs * 1000).toISOString() : null;
}

async function findProfileId(
  admin: Admin,
  keys: { userId?: string | null; customerId?: string | null; email?: string | null },
): Promise<string | null> {
  if (keys.userId) return keys.userId;
  if (keys.customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", keys.customerId)
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

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === "string" ? v : v?.id ?? null;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // ── New subscription paid ────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        return NextResponse.json({ received: true });
      }
      const meta = session.metadata ?? {};
      const customerId = idOf(session.customer);
      const subId = idOf(session.subscription);
      const email = (session.customer_details?.email ?? meta.email ?? "")
        .toString()
        .trim()
        .toLowerCase();

      const sub = subId ? await stripe.subscriptions.retrieve(subId) : null;
      // Which duration was bought — metadata only. Access does not depend on
      // resolving it: a completed checkout makes you a member.
      const plan: Plan | null =
        planFromMeta(meta) ??
        planFromMeta(sub?.metadata) ??
        planForPrice(sub?.items.data[0]?.price.id);

      // Attach the payment to the member's profile (grant access).
      const profileId = await findProfileId(admin, {
        userId: meta.user_id,
        customerId,
        email: email || null,
      });
      if (profileId) {
        await admin
          .from("profiles")
          .update({
            tier: "member",
            plan: plan ?? undefined,
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            subscription_status: sub?.status ?? "active",
            current_period_end: sub ? periodEndIso(sub) : null,
          })
          .eq("id", profileId);
      }
    }

    // ── Renewal / cancellation / status change ───────────────────────────
    else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = idOf(sub.customer);
      const plan =
        planFromMeta(sub.metadata) ?? planForPrice(sub.items.data[0]?.price.id);
      const profileId = await findProfileId(admin, {
        userId: sub.metadata?.user_id,
        customerId,
      });

      if (profileId) {
        const canceled = event.type === "customer.subscription.deleted";
        const active = !canceled && ACTIVE.has(sub.status);
        await admin
          .from("profiles")
          .update({
            // Access follows the subscription: keep the plan while active,
            // drop to 'none' the moment it lapses or is cancelled.
            tier: active ? "member" : "none",
            plan: plan ?? undefined,
            subscription_status: canceled ? "canceled" : sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: periodEndIso(sub),
          })
          .eq("id", profileId);
      }
    }
  } catch {
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
