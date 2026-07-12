"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState = { error: string } | null;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/bets");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: username ? { username } : undefined },
  });
  if (error) return { error: error.message };

  // The profile row is auto-created by the on_auth_user_created trigger.
  // Grant a tier ONLY if this email has a paid application (a Stripe checkout
  // completed for it). If they paid before signing up, we grant it here; if
  // they signed up first, the Stripe webhook grants it the moment payment lands.
  if (data.user) {
    try {
      const admin = createAdminClient();
      const { data: paid } = await admin
        .from("applications")
        .select("granted_tier, stripe_customer_id, stripe_subscription_id")
        .eq("email", email.trim().toLowerCase())
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tier = paid?.granted_tier;
      if (tier === "core" || tier === "private") {
        await admin
          .from("profiles")
          .update({
            tier,
            stripe_customer_id: paid?.stripe_customer_id ?? null,
            stripe_subscription_id: paid?.stripe_subscription_id ?? null,
            subscription_status: "active",
          })
          .eq("id", data.user.id);
      }
    } catch {
      // Service-role key not set — skip; operator can grant tier manually.
    }
  }

  revalidatePath("/", "layout");
  redirect("/bets");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
