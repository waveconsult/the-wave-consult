"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { claimMembership } from "@/lib/entitlements";

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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Someone can buy on the website today and only create an account next week.
  // The webhook had no profile to mark back then, so the purchase is claimed
  // here instead — every sign-in, because it is cheap and self-healing.
  if (data.user) await claimMembership(data.user.id, email);

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
  // Membership is never granted from the form — only ever from a payment that
  // Stripe already confirmed, matched here by email.
  if (data.user) await claimMembership(data.user.id, email);

  revalidatePath("/", "layout");
  redirect("/bets");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
