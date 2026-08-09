"use server";

import { requireProfile } from "@/lib/auth";
import { mintFreshLinkCode, botDeepLink } from "@/lib/telegram-link";

// "Send me that link again", without a mail round-trip.
//
// The emailed deep link is the only route back to the group today, which makes
// a spam folder or a burned code a support ticket. A signed-in member has
// already proven who they are, so there is nothing left to verify — the link
// can simply be handed over.
//
// Nothing else lives in this file on purpose: every export here is a callable
// endpoint, so the read-only lookup for "which account is connected" sits in
// lib/telegram-account instead.

export type LinkState = { link?: string; error?: string } | null;

export async function issueTelegramLink(): Promise<LinkState> {
  const profile = await requireProfile();

  if (profile.tier !== "member" || !profile.stripe_subscription_id) {
    return { error: "This is for active memberships. Check your plan first." };
  }

  const code = await mintFreshLinkCode({
    subscriptionId: profile.stripe_subscription_id,
    customerId: profile.stripe_customer_id,
    email: profile.email,
    plan: profile.plan,
    currentPeriodEnd: profile.current_period_end,
  });
  if (!code) return { error: "Could not generate a link just now. Try again shortly." };

  const link = botDeepLink(code);
  if (!link)
    return { error: "The bot is not configured yet — reply to your receipt and we'll add you." };

  return { link };
}
