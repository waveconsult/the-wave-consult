import type { Metadata } from "next";
import { getStripe, planForPrice } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import { mintLinkCode } from "@/lib/telegram-link";

export const metadata: Metadata = { title: "You're in" };
export const dynamic = "force-dynamic";

// Where Stripe drops people after they buy on the marketing site.
//
// The payment exists, but nothing knows their Telegram account yet — Stripe
// only saw an email and a card. So this page mints a one-time code tied to the
// subscription and hands it over as a deep link. Whichever Telegram account
// opens that link gets attached to the subscription by the bot.
//
// It reads the session from Stripe directly rather than waiting for the
// webhook, so it works even if the buyer lands here first.

/** Session id -> a short code the bot can redeem. Idempotent per session. */
async function linkCodeFor(sessionId: string): Promise<string | null> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.payment_status === "unpaid") return null;

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
    const plan = isPlan(metaPlan)
      ? metaPlan
      : planForPrice(s?.items?.data?.[0]?.price?.id);

    return await mintLinkCode({
      sessionId,
      customerId:
        typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
      subscriptionId: sub?.id ?? null,
      email: session.customer_details?.email ?? null,
      plan,
      currentPeriodEnd:
        typeof secs === "number" ? new Date(secs * 1000).toISOString() : null,
    });
  } catch {
    return null;
  }
}

export default async function TelegramThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const bot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  const sessionId = (await searchParams).s;
  const code = bot && sessionId ? await linkCodeFor(sessionId) : null;

  const link = bot ? `https://t.me/${bot}${code ? `?start=${code}` : ""}` : null;

  return (
    <div className="public-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Payment received</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-text">
        One step left.
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
        {code
          ? "Open the WaveHub bot. It links this payment to your Telegram account and sends your invite to the members group straight away."
          : "Open the WaveHub bot on Telegram and send /start — it will get you into the members group."}
      </p>

      {link ? (
        <a className="btn-pill mt-8" href={link}>
          Open the Telegram bot →
        </a>
      ) : (
        <p className="mt-8 text-sm text-neg">
          The bot link is not configured yet — reply to your receipt email and
          we&apos;ll add you manually.
        </p>
      )}

      <p className="mt-6 max-w-xs text-xs text-faint">
        Open it on the account you want inside the group. This link works once.
      </p>
    </div>
  );
}
