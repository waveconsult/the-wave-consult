import { createAdminClient } from "@/lib/supabase/admin";
import { isPlan } from "@/lib/plans";

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

    // Expired subscriptions are recorded too — claiming one would hand out
    // access that has already run out.
    const end = purchase.current_period_end ? new Date(purchase.current_period_end) : null;
    if (end && end < new Date()) return false;

    await admin
      .from("profiles")
      .update({
        tier: "member",
        plan: isPlan(purchase.plan) ? purchase.plan : undefined,
        stripe_customer_id: purchase.stripe_customer_id,
        stripe_subscription_id: purchase.stripe_subscription_id,
        subscription_status: "active",
        current_period_end: purchase.current_period_end,
      })
      .eq("id", userId);

    return true;
  } catch {
    return false;
  }
}
