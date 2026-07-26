"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceForPlan } from "@/lib/stripe";
import { isPlan } from "@/lib/plans";
import { getAccountManagementUrl } from "@/lib/fastspring-server";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

// Which processor is live — mirrors NEXT_PUBLIC_PAYMENTS_PROVIDER in the UI.
const PROVIDER = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER ?? "stripe";

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string };

// Start a membership checkout for the signed-in user on the chosen plan
// (duration). Access is NOT granted here — only by the Stripe webhook once
// payment succeeds. On success Stripe redirects to /bets?welcome=1.
export async function startCheckout(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const plan = String(formData.get("plan") ?? "");
  if (!isPlan(plan)) {
    return { status: "error", message: "Invalid plan." };
  }

  // This action is the Stripe path only; with FastSpring the client renders
  // FastSpringCheckout instead and never submits this form. Reaching it while
  // the server says "fastspring" means the two disagree — NEXT_PUBLIC_ vars are
  // inlined into the client bundle at BUILD time, so setting the variable
  // without redeploying leaves a stale bundle behind. Say that, instead of
  // letting getStripe() below fail with a misleading "STRIPE_SECRET_KEY is not
  // set" that points at the wrong problem entirely.
  if (PROVIDER === "fastspring") {
    return {
      status: "error",
      message:
        "Checkout is being updated — please reload the page. (If this persists: the deployment needs rebuilding after the payment provider change.)",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please log in first." };

  let url: string | null = null;
  try {
    const stripe = getStripe();
    const admin = createAdminClient();

    // Reuse the member's Stripe customer if we already have one, else create it
    // and store it so the billing portal + renewals stay tied to this user.
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceForPlan(plan), quantity: 1 }],
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
      success_url: `${SITE}/bets?welcome=1`,
      cancel_url: `${SITE}/plans`,
    });
    url = session.url;
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not start checkout.",
    };
  }

  if (!url) return { status: "error", message: "Could not start checkout." };
  redirect(url); // leaves the app for Stripe Checkout
}

// Open the billing portal so the member can update card / cancel. Stripe has a
// billing-portal session; FastSpring has an Account Management Portal reached
// via a short-lived authenticated URL. Both are generated at redirect time and
// never cached (the FastSpring token expires quickly).
export async function manageSubscription(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, fastspring_account_id")
    .eq("id", user.id)
    .maybeSingle();

  let url: string | null = null;

  if (PROVIDER === "fastspring") {
    if (!profile?.fastspring_account_id) redirect("/plans");
    url = await getAccountManagementUrl(profile.fastspring_account_id);
  } else {
    if (!profile?.stripe_customer_id) redirect("/plans");
    const portal = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${SITE}/profile`,
    });
    url = portal.url;
  }

  if (!url) redirect("/plans");
  redirect(url);
}
