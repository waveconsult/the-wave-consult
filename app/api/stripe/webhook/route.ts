import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planForPrice } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvite, removeMember, sendMessage } from "@/lib/telegram";
import { mintLinkCode, botDeepLink, accessEmail } from "@/lib/telegram-link";
import { planDetails } from "@/lib/plans";
import { grantsAccess } from "@/lib/subscription";

/** "tg_12345" (client_reference_id) or metadata.telegram_id -> 12345 */
function telegramIdFrom(
  ref: string | null | undefined,
  meta: Record<string, string> | undefined | null,
): number | null {
  const raw = meta?.telegram_id ?? (ref?.startsWith("tg_") ? ref.slice(3) : null);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Stripe calls this endpoint after subscription events. It's public (Stripe is
// not a logged-in user) but authenticated by the webhook signature. This is the
// ONLY place membership access (profiles.tier) is granted or revoked, so
// Supabase always reflects who currently has access.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof createAdminClient>;

// "Active" is defined once, in lib/subscription, because the bot asks the same
// question and the two answers used to differ — see the note in that file.

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

/**
 * Best-effort — a failed email must never fail the webhook, or Stripe retries
 * a payment we already granted access for.
 */
async function sendAccessEmail(to: string, link: string, plan: Plan | null) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const { Resend } = await import("resend");
    await new Resend(key).emails.send({
      from: process.env.RESEND_FROM ?? "WaveHub <onboarding@resend.dev>",
      to,
      subject: "Your WaveHub access — one step left",
      html: accessEmail(link, plan ? planDetails(plan).name : null, to),
    });
  } catch {
    // The thank-you page still shows the same link.
  }
}

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

      // Record the purchase against the email, always — not only when the buyer
      // came from the website. It is what a later signup claims to turn a
      // free account into a paid one, and someone who bought in the bot may
      // still want the website afterwards.
      const purchaseCode = email
        ? await mintLinkCode({
            sessionId: session.id,
            customerId,
            subscriptionId: subId,
            email,
            plan,
            currentPeriodEnd: sub ? periodEndIso(sub) : null,
          })
        : null;

      // ── Telegram: bought through the bot (or a link carrying the tg id) ──
      const tgId = telegramIdFrom(session.client_reference_id, meta);
      if (tgId) {
        await admin.from("telegram_members").upsert(
          {
            telegram_id: tgId,
            email: email || null,
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            plan: plan ?? undefined,
            status: "active",
            current_period_end: sub ? periodEndIso(sub) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "telegram_id" },
        );

        // The link only opens a join request; the bot approves it after
        // re-checking this table, so passing it on gets nobody in.
        const invite = await createInvite();
        await sendMessage(
          tgId,
          invite
            ? `Payment received — you're a member. 🎾\n\nTap to join the group:\n${invite}\n\nYou'll be let in within a second or two. The link expires in 48 hours.`
            : `Payment received — you're a member. 🎾\n\nI could not generate your invite link automatically. Reply here and we'll sort it out.`,
        );
      } else if (email && purchaseCode) {
        // Bought on the website, so nothing here knows their Telegram account.
        // The thank-you page hands them a deep link, but only while that tab is
        // open — close it and the payment has no way back to a person. So the
        // same code goes out by email, which they keep.
        const link = botDeepLink(purchaseCode);
        if (link) await sendAccessEmail(email, link, plan);
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
        // Same rule the bot applies, so a bounced card cannot leave someone
        // with the group but without the courses.
        const active = !canceled && grantsAccess(sub.status, periodEndIso(sub));
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

      // ── Telegram: mirror the subscription state onto group access ────────
      const canceled = event.type === "customer.subscription.deleted";
      const active = !canceled && grantsAccess(sub.status, periodEndIso(sub));
      const { data: tgRow } = await admin
        .from("telegram_members")
        .select("telegram_id, in_group")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();

      if (tgRow?.telegram_id) {
        await admin
          .from("telegram_members")
          .update({
            plan: plan ?? undefined,
            status: canceled ? "canceled" : sub.status,
            current_period_end: periodEndIso(sub),
            updated_at: new Date().toISOString(),
          })
          .eq("telegram_id", tgRow.telegram_id);

        // Stripe reports the cancellation immediately, but the member has paid
        // through current_period_end — only remove once that has actually
        // passed. The nightly sweep handles the ones that expire later.
        const stillPaid =
          !!periodEndIso(sub) && new Date(periodEndIso(sub) as string) > new Date();
        if (!active && !stillPaid && tgRow.in_group) {
          await removeMember(tgRow.telegram_id);
          await admin
            .from("telegram_members")
            .update({ in_group: false, removed_at: new Date().toISOString() })
            .eq("telegram_id", tgRow.telegram_id);
          await sendMessage(
            tgRow.telegram_id,
            "Your membership has ended, so you've been removed from the group. Tap /start any time to come back.",
          );
        }
      }
    }
  } catch {
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
