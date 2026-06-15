"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
