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

// ── Signing in with a code instead of a password ──────────────────────────
//
// A password is the wrong instrument here. People buy on the marketing site
// without an account, and the account is created for them from the address
// Stripe verified — so there is no password for them to know, and asking them
// to invent one is a step that exists only to satisfy the login form.
//
// A code to the mailbox also removes the failure that produced most of the
// "I paid and I have a free account" reports: you cannot sign in under an
// address you do not control, so you cannot accidentally end up with a second,
// unpaid account under a typo of your own email.
//
// Password login stays for anyone who already set one.

export type CodeState =
  | { stage: "email"; error?: string }
  | { stage: "code"; email: string; error?: string; notice?: string };

export async function requestLoginCode(
  _prev: CodeState,
  formData: FormData,
): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { stage: "email", error: "Enter your email address." };

  const supabase = await createClient();
  // shouldCreateUser is on: someone who paid may never have had an account, and
  // the tier still only ever comes from a matched payment.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { stage: "email", error: error.message };

  return {
    stage: "code",
    email,
    notice: `Code sent to ${email}. It expires in an hour.`,
  };
}

export async function submitLoginCode(
  _prev: CodeState,
  formData: FormData,
): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (!email) return { stage: "email", error: "Start again with your email address." };
  if (token.length !== 6)
    return { stage: "code", email, error: "The code is six digits." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return { stage: "code", email, error: error.message };

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
