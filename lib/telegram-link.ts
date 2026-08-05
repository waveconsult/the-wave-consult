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

/** t.me link that carries the code as the bot's /start payload. */
export function botDeepLink(code: string): string | null {
  const bot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  return bot ? `https://t.me/${bot}?start=${code}` : null;
}

/** The "you paid, here's your way in" email. Plain, one action. */
export function accessEmail(link: string, planName: string | null): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f5;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b70">WaveHub</p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#111">Your membership is active.</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f3f45">
      ${planName ? `Thanks for joining — ${planName}. ` : "Thanks for joining. "}
      One step left: open the WaveHub bot on Telegram. It links this payment to
      your Telegram account and sends your invite to the members group.
    </p>
    <a href="${link}" style="display:inline-block;background:#0075de;color:#fff;text-decoration:none;font-size:16px;font-weight:500;padding:13px 22px;border-radius:8px">Open the Telegram bot →</a>
    <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6b6b70">
      Open it on the Telegram account you want inside the group. This link works once.<br>
      If the button does nothing, paste this into your browser:<br>
      <span style="color:#3f3f45;word-break:break-all">${link}</span>
    </p>
  </div>
</body></html>`;
}
