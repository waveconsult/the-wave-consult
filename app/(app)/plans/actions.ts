"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JoinState =
  | { status: "idle" }
  | { status: "ok"; tier: string }
  | { status: "error"; message: string };

// Direct join (briefing §12: Stripe deferred). Sets the signed-in user's tier
// immediately — no payment yet. When Stripe lands, move tier-setting behind a
// successful checkout webhook and tighten RLS.
export async function joinTier(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const tier = String(formData.get("tier") ?? "");
  if (tier !== "core" && tier !== "private") {
    return { status: "error", message: "Invalid plan." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please log in first." };

  const { error } = await supabase
    .from("profiles")
    .update({ tier })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/", "layout");
  return { status: "ok", tier };
}
