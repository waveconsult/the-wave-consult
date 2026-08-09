import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Buying in the bot and buying on the website are different problems.
//
// In the bot, the checkout carries the buyer's telegram id and the Stripe
// webhook can invite them directly. On the website, Stripe only ever sees an
// email and a card — nothing that identifies a Telegram account. So we mint a
// one-time code against the Stripe session and hand it over as a deep link;
// whichever account opens it gets attached to the subscription.
//
// Two places need to produce that code: the thank-you page (immediately, while
// the buyer is still looking at the screen) and the Stripe webhook (which mails
// it, so closing the tab is not the end of the road). Hence this module rather
// than a copy in each.

export type LinkCodeInput = {
  sessionId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  email?: string | null;
  plan?: string | null;
  currentPeriodEnd?: string | null;
};

/**
 * Idempotent per Stripe session: whoever asks first creates the code, everyone
 * after gets the same one. That matters because the webhook and the thank-you
 * page race each other, and two codes for one payment would mean the emailed
 * one silently stops working the moment the other is redeemed.
 */
export async function mintLinkCode(input: LinkCodeInput): Promise<string | null> {
  try {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("telegram_link_codes")
      .select("code")
      .eq("stripe_session_id", input.sessionId)
      .maybeSingle();
    if (existing?.code) return existing.code;

    const code = randomUUID().replace(/-/g, ""); // 32 chars, valid /start payload
    const { error } = await admin.from("telegram_link_codes").insert({
      code,
      stripe_session_id: input.sessionId,
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: input.subscriptionId ?? null,
      email: input.email?.toLowerCase() ?? null,
      plan: input.plan ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
    });

    if (error) {
      // Lost the race on the unique index — read back what the winner wrote.
      const { data: won } = await admin
        .from("telegram_link_codes")
        .select("code")
        .eq("stripe_session_id", input.sessionId)
        .maybeSingle();
      return won?.code ?? null;
    }
    return code;
  } catch {
    return null;
  }
}

/**
 * A brand-new code for a subscription, for the "send me the link again" button
 * in the member area.
 *
 * Deliberately not idempotent, unlike mintLinkCode: the usual reason someone
 * asks is that the previous code was burned by the wrong Telegram account or
 * lost, and handing back the same dead code would be the exact opposite of
 * help. The synthetic session id keeps the unique index satisfied without
 * pretending a checkout happened.
 */
export async function mintFreshLinkCode(input: {
  subscriptionId: string;
  customerId?: string | null;
  email?: string | null;
  plan?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<string | null> {
  try {
    const admin = createAdminClient();

    // Retire anything still outstanding for this subscription so only the code
    // in the member's hand right now can be redeemed.
    await admin
      .from("telegram_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("stripe_subscription_id", input.subscriptionId)
      .is("used_at", null);

    const code = randomUUID().replace(/-/g, "");
    const { error } = await admin.from("telegram_link_codes").insert({
      code,
      stripe_session_id: `sub_${input.subscriptionId}_${Date.now()}`,
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: input.subscriptionId,
      email: input.email?.toLowerCase() ?? null,
      plan: input.plan ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
    });
    return error ? null : code;
  } catch {
    return null;
  }
}

/** t.me link that carries the code as the bot's /start payload. */
export function botDeepLink(code: string): string | null {
  const bot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  return bot ? `https://t.me/${bot}?start=${code}` : null;
}

/**
 * The "you paid, here's your way in" email. Two doors, in the order they
 * matter: Telegram is where the calls go out, the website account is where the
 * archive and the tools live. The account is created with THIS email address —
 * that is what links it back to the payment, so it is stated explicitly rather
 * than left to be guessed.
 */
export function accessEmail(link: string, planName: string | null, email: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";
  return `<!doctype html><html><body style="margin:0;background:#f6f6f5;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b70">WaveHub</p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#111">Your membership is active.</h1>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#3f3f45">
      ${planName ? `Thanks for joining — ${planName}. ` : "Thanks for joining. "}
      Two things to set up, and both take under a minute.
    </p>

    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111">1 &middot; The members group</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f45">
      Open the WaveHub bot. It links this payment to your Telegram account and
      sends your invite straight away.
    </p>
    <a href="${link}" style="display:inline-block;background:#0075de;color:#fff;text-decoration:none;font-size:16px;font-weight:500;padding:13px 22px;border-radius:8px">Open the Telegram bot →</a>
    <p style="margin:10px 0 30px;font-size:13px;line-height:1.6;color:#6b6b70">
      Open it on the Telegram account you want inside the group. This link works once.<br>
      If the button does nothing, paste this into your browser:<br>
      <span style="color:#3f3f45;word-break:break-all">${link}</span>
    </p>

    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111">2 &middot; Your website account</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f45">
      Create it with <b>${email}</b> — the same address you paid with. That is
      how your membership is recognised. Any other address will come out as a
      free account.
    </p>
    <a href="${site}/signup?welcome=1" style="display:inline-block;background:#fff;color:#0075de;text-decoration:none;font-size:16px;font-weight:500;padding:13px 22px;border-radius:8px;border:1px solid rgba(0,0,0,.12)">Create your account →</a>

    <p style="margin:30px 0 0;font-size:13px;line-height:1.6;color:#6b6b70">
      Already have an account on that address? Just log in — it upgrades itself.
    </p>
  </div>
</body></html>`;
}
