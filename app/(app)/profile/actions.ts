"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelSubscription } from "@/lib/fastspring-server";
import { getStripe } from "@/lib/stripe";
import { parseDecimal } from "@/lib/format";
import type { Strategy } from "@/lib/types";

export type RiskState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

const STRATEGIES: Strategy[] = ["conservative", "standard", "aggressive"];

// Simplified risk settings: just bankroll + strategy (conservative/aggressive).
// Writing bankroll updates every bet card live (briefing §3, §5.5).
export async function updateRiskSettings(
  _prev: RiskState,
  formData: FormData,
): Promise<RiskState> {
  const bankroll = parseDecimal(formData.get("bankroll"));
  const strategy = String(formData.get("staking_strategy")) as Strategy;

  if (!Number.isFinite(bankroll) || bankroll < 0)
    return { status: "error", message: "Bankroll must be 0 or more." };
  if (!STRATEGIES.includes(strategy))
    return { status: "error", message: "Invalid strategy." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ bankroll, staking_strategy: strategy })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  // Refresh feed + profile so derived stake amounts update everywhere.
  revalidatePath("/", "layout");
  return { status: "ok" };
}

// ── Account deletion ───────────────────────────────────────────────────────
// Required by GDPR (a member must be able to erase their data) and by Apple
// guideline 5.1.1(v), which refuses apps that let you create an account but
// not delete it.
//
// ORDER MATTERS: the paid subscription is cancelled FIRST. Deleting the profile
// while a subscription is live would leave the member being charged every term
// for an account that no longer exists, with no way for them to stop it — the
// worst possible outcome here. If the cancellation fails we abort and say so
// rather than deleting anyway.
export type DeleteState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function deleteAccount(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  // Typing the email is the confirmation step — a single click must not be
  // enough to destroy an account.
  const typed = String(formData.get("confirm_email") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please log in first." };

  const email = (user.email ?? "").trim().toLowerCase();
  if (!typed || typed !== email) {
    return {
      status: "error",
      message: "Please type your email address exactly to confirm.",
    };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("fastspring_subscription_id, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  // 1. Stop the money first.
  try {
    if (profile?.fastspring_subscription_id) {
      await cancelSubscription(profile.fastspring_subscription_id, {
        immediate: true,
      });
    } else if (profile?.stripe_subscription_id) {
      await getStripe().subscriptions.cancel(profile.stripe_subscription_id);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[deleteAccount] cancelling subscription failed:", e);
    return {
      status: "error",
      message:
        "We could not cancel your subscription, so we have not deleted your " +
        "account — otherwise you would keep being charged. Please contact " +
        `support and we will handle it. (${detail})`,
    };
  }

  // 2. Deleting the auth user cascades to profiles and push_subscriptions,
  //    both of which reference auth.users(id) ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[deleteAccount] deleteUser failed:", error);
    return {
      status: "error",
      message: "We could not delete your account. Please contact support.",
    };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
