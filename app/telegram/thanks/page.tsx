import type { Metadata } from "next";
import { getStripe, planForPrice } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import { mintLinkCode } from "@/lib/telegram-link";
import { createClient } from "@/lib/supabase/server";
import { EmailCheck } from "./EmailCheck";

export const metadata: Metadata = { title: "You're in" };
export const dynamic = "force-dynamic";

// Where a buyer lands, after /telegram/welcome has already created their
// account and signed them in.
//
// That leaves exactly one thing to do, and it is the one thing only they can
// decide: which Telegram account should sit in the members group. Stripe saw
// an email and a card, nothing that identifies a person on Telegram, so the
// bot is handed a one-time code and whoever opens it gets attached.
//
// The code is minted here as well as in the webhook. They race, and
// mintLinkCode is idempotent per session precisely so the race is harmless —
// two codes for one payment would mean the emailed one stops working the
// moment this page's is redeemed.

type Purchase = { code: string | null; email: string | null };

async function purchaseFor(sessionId: string): Promise<Purchase> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.payment_status === "unpaid") return { code: null, email: null };

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
    const email = session.customer_details?.email?.trim().toLowerCase() ?? null;

    const code = await mintLinkCode({
      sessionId,
      customerId:
        typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
      subscriptionId: sub?.id ?? null,
      email,
      plan,
      currentPeriodEnd: typeof secs === "number" ? new Date(secs * 1000).toISOString() : null,
    });

    return { code, email };
  } catch {
    return { code: null, email: null };
  }
}

export default async function TelegramThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const bot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  const sessionId = (await searchParams).s;
  const { code, email } = sessionId
    ? await purchaseFor(sessionId)
    : { code: null, email: null };

  // This is the page every buyer lands on, so nothing here is allowed to throw.
  // Whether they are signed in only changes which sentence is shown; it must
  // never be the reason someone sees an error screen after paying.
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    signedIn = Boolean(auth?.user);
  } catch {
    signedIn = false;
  }

  const link = bot ? `https://t.me/${bot}${code ? `?start=${code}` : ""}` : null;

  return (
    <div className="public-shell flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
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

      {sessionId && email ? (
        <EmailCheck sessionId={sessionId} email={email} />
      ) : null}

      {/* The website account. It already exists by the time anyone reads this —
          /telegram/welcome created it from the address Stripe verified — so this
          is a statement of fact, not a second task. */}
      <div className="mt-10 w-full max-w-sm border-t border-border pt-8">
        {signedIn ? (
          <>
            <p className="text-[13px] leading-relaxed text-muted">
              Your website account is ready and you are already signed in. The
              courses, the archive and the tools are open.
            </p>
            <a className="btn-pill-ghost mt-4 inline-flex" href="/bets">
              Go to the members area →
            </a>
          </>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-muted">
              Want the archive and the tools on the web too? Log in with{" "}
              {email ? (
                <span className="text-text">{email}</span>
              ) : (
                "the address you paid with"
              )}{" "}
              — we email you a code, no password needed.
            </p>
            <a className="btn-pill-ghost mt-4 inline-flex" href="/login">
              Log in →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
