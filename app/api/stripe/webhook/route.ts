import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this endpoint after a payment. It's public (Stripe is not a
// logged-in user) but authenticated by the webhook signature. On a completed
// checkout we mark the application paid and, if the member already has an
// account, grant their tier immediately. Otherwise the tier is granted when
// they sign up with the same email (see app/(auth)/actions.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const applicationId = meta.application_id;
    const tier = meta.tier === "private" ? "private" : meta.tier === "core" ? "core" : null;
    const email = (session.customer_details?.email ?? meta.email ?? "")
      .toString()
      .trim()
      .toLowerCase();

    if (tier) {
      const admin = createAdminClient();

      // Mark the application as paid.
      if (applicationId) {
        await admin
          .from("applications")
          .update({
            status: "accepted",
            granted_tier: tier,
            paid_at: new Date().toISOString(),
            stripe_session_id: session.id,
          })
          .eq("id", applicationId);
      }

      // If a profile already exists for this email, grant access now. If not,
      // the grant happens at signup (which looks up the paid application).
      if (email) {
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (profile?.id) {
          await admin.from("profiles").update({ tier }).eq("id", profile.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
