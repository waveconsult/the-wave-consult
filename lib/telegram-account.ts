import { createAdminClient } from "@/lib/supabase/admin";

// Deliberately NOT in the profile's "use server" file.
//
// Every exported function in a "use server" module becomes a callable endpoint,
// so a lookup that takes a subscription id and returns the Telegram handle
// attached to it would let anyone holding an id read a member's username. It is
// a read for rendering, not an action, so it lives here and stays server-only
// by virtue of who imports it.

/** Which Telegram account currently holds this membership, for display. */
export async function connectedTelegramAccount(
  subscriptionId: string | null | undefined,
): Promise<string | null> {
  if (!subscriptionId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("telegram_members")
      .select("username, first_name, telegram_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (!data) return null;
    if (data.username) return `@${data.username}`;
    return data.first_name ?? `ID ${data.telegram_id}`;
  } catch {
    return null;
  }
}
