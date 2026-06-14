"use server";

import { createClient } from "@/lib/supabase/server";

export type ApplyState =
  | { status: "idle" }
  | { status: "ok"; tier: string }
  | { status: "error"; message: string };

// Apply-first intake (briefing §5.4). Inserts into `applications`. No checkout
// yet — Stripe is deferred (§12). The operator reviews and grants tier manually.
export async function applyForTier(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const tier = String(formData.get("tier") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (tier !== "core" && tier !== "private") {
    return { status: "error", message: "Invalid plan." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: "error", message: "You must be signed in to apply." };
  }

  const { error } = await supabase.from("applications").insert({
    email: user.email,
    requested_tier: tier,
    note: note || null,
  });

  if (error) return { status: "error", message: error.message };
  return { status: "ok", tier };
}
