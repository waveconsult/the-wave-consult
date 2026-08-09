"use server";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// A typo'd address at Stripe checkout is the one failure nothing downstream can
// repair: no lookup finds them, no code reaches them, and the bot's recovery
// path is useless because the address it would ask for does not exist.
//
// The only moment it is still fixable is while this tab is open, so the
// thank-you page shows the address and lets them correct it. Scoped to the
// checkout session they are holding — you can only rewrite the address on a
// purchase you just made, not on someone else's.

export type FixState = { ok?: string; error?: string } | null;

export async function correctEmail(
  _prev: FixState,
  formData: FormData,
): Promise<FixState> {
  const sessionId = String(formData.get("session") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!sessionId) return { error: "Missing the payment reference." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { error: "That does not look like an email address." };

  // Prove the session is real and paid before letting it rewrite anything.
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "unpaid")
      return { error: "That payment is not complete yet." };
  } catch {
    return { error: "We could not verify that payment." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("telegram_link_codes")
    .update({ email })
    .eq("stripe_session_id", sessionId);

  if (error) return { error: "We could not save that. Reply to your receipt and we'll fix it." };

  return {
    ok: `Access is now tied to ${email}. Use that address in the bot and to log in.`,
  };
}
