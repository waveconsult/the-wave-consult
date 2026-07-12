"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceForTier } from "@/lib/stripe";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string };

// Start a yearly subscription checkout for the signed-in user. Access (tier)
// is NOT granted here — it is granted only by the Stripe webhook once payment
// succeeds. On success Stripe redirects to /bets?welcome=1.
export async function startCheckout(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const tier = String(formData.get("tier") ?? "");
  if (tier !== "core" && tier !== "private") {
    return { status: "error", message: "Invalid plan." };
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
      line_items: [{ price: priceForTier(tier), quantity: 1 }],
      metadata: { user_id: user.id, tier },
      subscription_data: { metadata: { user_id: user.id, tier } },
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

// Open the Stripe billing portal so the member can update card / cancel.
export async function manageSubscription(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) redirect("/plans");

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${SITE}/profile`,
  });
  redirect(portal.url);
}
