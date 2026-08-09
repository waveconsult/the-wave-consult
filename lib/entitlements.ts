import { createAdminClient } from "@/lib/supabase/admin";
import { isPlan } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { grantsAccess } from "@/lib/subscription";

// Buying and having an account are two separate events, in either order.
//
// Someone who buys on the marketing site has no account yet — Stripe saw an
// email and a card, nothing more — so the webhook has no profile to mark as a
// member. They create the account afterwards, and by then the webhook has long
// since run. Without this, they would pay and still see a free account.
//
// So the purchase is recorded against the email at checkout time, and claimed
// the first time someone signs in with that email. Runs on both signup and
// login, because the two orders are equally common: buy-then-register, and
// register-then-buy from inside the app.
//
// Uses the service-role client deliberately: a member must not be able to
// grant themselves a tier, so the check never runs under the user's own
// credentials.

/**
 * Attach any paid subscription bought under this email to this account.
 * Returns true if something was granted. Never throws — a failure here must
 * not stop someone logging in, and the next sign-in tries again.
 */
export async function claimMembership(userId: string, email: string): Promise<boolean> {
  const address = email.trim().toLowerCase();
  if (!userId || !address) return false;

  try {
    const admin = createAdminClient();

    const { data: purchase } = await admin
      .from("telegram_link_codes")
      .select("stripe_customer_id, stripe_subscription_id, plan, current_period_end")
      .eq("email", address)
      .not("stripe_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!purchase?.stripe_subscription_id) return false;

    // The purchase row's current_period_end is written once, at checkout, and
    // nothing updates it on renewal. Trusting it meant a member who bought a
    // year ago, renewed, and only then created a website account was measured
    // against a date twelve months stale and quietly handed a free account.
    // So the row tells us WHICH subscription to look at; Stripe tells us
    // whether it is live.
    const live = await liveSubscription(purchase.stripe_subscription_id);
    const status = live?.status ?? null;
    const periodEnd = live?.periodEnd ?? purchase.current_period_end ?? null;

    // If Stripe could not be reached, fall back to the recorded period rather
    // than locking out a paying member over an API blip.
    const allowed = live
      ? grantsAccess(status, periodEnd)
      : grantsAccess("active", purchase.current_period_end);
    if (!allowed) return false;

    await admin
      .from("profiles")
      .update({
        tier: "member",
        plan: isPlan(purchase.plan) ? purchase.plan : undefined,
        stripe_customer_id: purchase.stripe_customer_id,
        stripe_subscription_id: purchase.stripe_subscription_id,
        subscription_status: status ?? "active",
        current_period_end: periodEnd,
      })
      .eq("id", userId);

    return true;
  } catch {
    return false;
  }
}

/** Current status straight from Stripe. Null when it cannot be reached. */
async function liveSubscription(
  subscriptionId: string,
): Promise<{ status: string; periodEnd: string | null } | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    const raw = sub as unknown as {
      status: string;
      current_period_end?: number;
      items?: { data?: Array<{ current_period_end?: number }> };
    };
    const seconds = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
    return {
      status: raw.status,
      periodEnd: seconds ? new Date(seconds * 1000).toISOString() : null,
    };
  } catch {
    return null;
  }
}
