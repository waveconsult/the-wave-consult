import { getStripe, priceForTier } from "./stripe";
import { sendAcceptanceEmail, sendUrgencyEmail } from "./email";
import { createAdminClient } from "./supabase/admin";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

// Shared "accept an applicant" flow, used by both the manual admin Accept and
// the automatic 1-hour auto-accept cron. Creates a personalised Stripe
// checkout, marks the application accepted, and emails the activation link
// (a calmer note for manual accepts, an urgency variant for the auto flow).
export async function inviteApplicant(opts: {
  applicationId: string;
  email: string;
  tier: "core" | "private";
  urgency?: boolean;
}): Promise<{ ok: boolean; url?: string }> {
  const { applicationId, email, tier, urgency = false } = opts;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceForTier(tier), quantity: 1 }],
    customer_email: email,
    metadata: { application_id: applicationId, tier, email },
    subscription_data: { metadata: { application_id: applicationId, tier, email } },
    allow_promotion_codes: true,
    success_url: `${SITE}/signup?welcome=1`,
    cancel_url: `${SITE}/apply`,
    // Stripe checkout sessions already expire after 24h — the urgency email
    // leans on that honest deadline.
  });

  const db = createAdminClient();
  await db
    .from("applications")
    .update({
      status: "accepted",
      granted_tier: tier,
      stripe_session_id: session.id,
    })
    .eq("id", applicationId);

  if (session.url) {
    if (urgency) {
      await sendUrgencyEmail({ to: email, tier, checkoutUrl: session.url });
    } else {
      await sendAcceptanceEmail({ to: email, tier, checkoutUrl: session.url });
    }
  }

  return { ok: true, url: session.url ?? undefined };
}
