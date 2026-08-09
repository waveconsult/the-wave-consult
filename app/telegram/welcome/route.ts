import { NextResponse } from "next/server";
import { getStripe, planForPrice } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import { mintLinkCode } from "@/lib/telegram-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claimMembership } from "@/lib/entitlements";

// Where Stripe drops a buyer, before they see anything.
//
// The old flow asked them to do two more things after paying: open the bot,
// and separately go and create a website account with the right address. The
// second one is pure friction — Stripe has already verified an email, so the
// account can simply exist by the time they land.
//
// So this route provisions the account and signs them in, then hands off to the
// thank-you page. What is left for them to do is the one thing only they can
// decide: which Telegram account should sit in the group.
//
// It is a Route Handler and not a page because setting session cookies during
// a render is not allowed — cookies can only be written from a Route Handler
// or a Server Action.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("s");
  const done = (id?: string | null) =>
    NextResponse.redirect(`${SITE}/telegram/thanks${id ? `?s=${encodeURIComponent(id)}` : ""}`, 303);

  if (!sessionId) return done(null);

  let email: string | null = null;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.payment_status === "unpaid") return done(sessionId);

    const sub =
      typeof session.subscription === "object" && session.subscription
        ? session.subscription
        : null;
    const s = sub as unknown as {
      current_period_end?: number;
      items?: { data?: Array<{ current_period_end?: number; price?: { id?: string } }> };
      metadata?: Record<string, string>;
    } | null;
    const secs = s?.current_period_end ?? s?.items?.data?.[0]?.current_period_end;
    const metaPlan = session.metadata?.plan ?? s?.metadata?.plan;
    const plan = isPlan(metaPlan) ? metaPlan : planForPrice(s?.items?.data?.[0]?.price?.id);

    email = session.customer_details?.email?.trim().toLowerCase() ?? null;

    // Record the purchase first. Everything else here is a convenience; this
    // is the row the bot and a later sign-in both depend on.
    await mintLinkCode({
      sessionId,
      customerId:
        typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
      subscriptionId: sub?.id ?? null,
      email,
      plan,
      currentPeriodEnd: typeof secs === "number" ? new Date(secs * 1000).toISOString() : null,
    });
  } catch {
    return done(sessionId);
  }

  if (!email) return done(sessionId);

  // Sign them in. Failing here is not fatal — the thank-you page and the email
  // both still work, they just have to log in themselves later.
  try {
    await signInByEmail(email);
  } catch {
    // fall through
  }

  return done(sessionId);
}

/**
 * Create the account if it does not exist, then establish a session — without
 * a password and without a mail round-trip, because Stripe has already proven
 * this address belongs to the person who just paid.
 *
 * generateLink mints a magic-link token server-side without sending anything;
 * verifyOtp then exchanges it for cookies on this response.
 */
async function signInByEmail(email: string): Promise<void> {
  const admin = createAdminClient();

  // createUser is the idempotency check as well: an existing address simply
  // errors, which is the signal that there is nothing to create.
  await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { source: "checkout" },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return;

  const supabase = await createClient();
  const { data: verified } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });

  // The profile row comes from the on_auth_user_created trigger; the tier only
  // ever comes from a payment, matched by the address Stripe verified.
  if (verified?.user) await claimMembership(verified.user.id, email);
}
