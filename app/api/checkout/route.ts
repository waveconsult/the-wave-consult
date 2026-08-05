import { NextResponse } from "next/server";
import { getStripe, priceForPlan } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";

// Buy button target for the static marketing site.
//
//   https://app.wavehubtennis.com/api/checkout?plan=3m
//
// Creates a Stripe Checkout session and 303s the browser straight into it, so
// the landing page needs no JavaScript and no Stripe keys. After paying, the
// member lands on /telegram/thanks, which points them at the bot — the bot is
// what links their Telegram account to the subscription.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") ?? "3m";
  const tg = url.searchParams.get("tg"); // optional: already-known telegram id

  if (!isPlan(plan)) {
    return NextResponse.redirect(`${SITE}/plans`, 303);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceForPlan(plan), quantity: 1 }],
      client_reference_id: tg ? `tg_${tg}` : undefined,
      metadata: { plan, source: "landing", ...(tg ? { telegram_id: tg } : {}) },
      subscription_data: { metadata: { plan, ...(tg ? { telegram_id: tg } : {}) } },
      allow_promotion_codes: true,
      success_url: `${SITE}/telegram/thanks?s={CHECKOUT_SESSION_ID}`,
      cancel_url: "https://www.wavehubtennis.com/#pricing",
    });
    if (!session.url) throw new Error("no url");
    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(`${SITE}/plans?error=checkout`, 303);
  }
}
