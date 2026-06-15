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
  const plan = String(formData.get("plan") ?? "");

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
  // Direct join: if the visitor chose a plan in the funnel, set it now.
  // NOTE: no payment yet (Stripe deferred) — this grants access immediately.
  if ((plan === "core" || plan === "private") && data.user) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").update({ tier: plan }).eq("id", data.user.id);
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
