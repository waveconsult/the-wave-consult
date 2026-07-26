import { getStripe, priceForPlan } from "./stripe";
import { createCheckoutSession } from "./fastspring-server";
import { sendAcceptanceEmail, sendUrgencyEmail } from "./email";
import { createAdminClient } from "./supabase/admin";
import type { Plan } from "./types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

// Which processor is live — mirrors NEXT_PUBLIC_PAYMENTS_PROVIDER in the UI.
const PROVIDER = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER ?? "stripe";

// Shared "accept an applicant" flow, used by both the manual admin Accept and
// the automatic 1-hour auto-accept cron. Creates a personalised checkout on the
// live processor, marks the application accepted, and emails the activation
// link (a calmer note for manual accepts, an urgency variant for the auto flow).
// The applicant has NO account yet — the checkout carries the application id so
// the webhook can mark it paid, and signup then attaches it to the new profile.
export async function inviteApplicant(opts: {
  applicationId: string;
  email: string;
  plan: Plan;
  urgency?: boolean;
}): Promise<{ ok: boolean; url?: string }> {
  const { applicationId, email, plan, urgency = false } = opts;

  const db = createAdminClient();
  let checkoutUrl: string | null = null;

  if (PROVIDER === "fastspring") {
    // Tags are FastSpring's metadata — they come back on the webhook.
    const session = await createCheckoutSession({
      plan,
      email,
      tags: { application_id: applicationId, plan, email },
    });
    checkoutUrl = session.url;

    await db
      .from("applications")
      .update({
        status: "accepted",
        granted_plan: plan,
        fastspring_session_id: session.id,
      })
      .eq("id", applicationId);
  } else {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceForPlan(plan), quantity: 1 }],
      customer_email: email,
      metadata: { application_id: applicationId, plan, email },
      subscription_data: { metadata: { application_id: applicationId, plan, email } },
      allow_promotion_codes: true,
      success_url: `${SITE}/signup?welcome=1`,
      cancel_url: `${SITE}/apply`,
      // Stripe checkout sessions already expire after 24h — the urgency email
      // leans on that honest deadline.
    });
    checkoutUrl = session.url;

    await db
      .from("applications")
      .update({
        status: "accepted",
        granted_plan: plan,
        stripe_session_id: session.id,
      })
      .eq("id", applicationId);
  }

  if (checkoutUrl) {
    if (urgency) {
      await sendUrgencyEmail({ to: email, plan, checkoutUrl });
    } else {
      await sendAcceptanceEmail({ to: email, plan, checkoutUrl });
    }
  }

  return { ok: true, url: checkoutUrl ?? undefined };
}
