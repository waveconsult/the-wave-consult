"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Strategy } from "@/lib/types";

export type RiskState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

const STRATEGIES: Strategy[] = ["conservative", "standard", "aggressive"];

// Writing bankroll updates every bet card live (briefing §3, §5.5).
export async function updateRiskSettings(
  _prev: RiskState,
  formData: FormData,
): Promise<RiskState> {
  const bankroll = Number(formData.get("bankroll"));
  const strategy = String(formData.get("staking_strategy")) as Strategy;
  const maxStake = Number(formData.get("max_stake_pct"));
  const unit = Number(formData.get("unit_size"));

  if (!Number.isFinite(bankroll) || bankroll < 0)
    return { status: "error", message: "Bankroll must be 0 or more." };
  if (!STRATEGIES.includes(strategy))
    return { status: "error", message: "Invalid strategy." };
  if (!Number.isFinite(maxStake) || maxStake < 0 || maxStake > 100)
    return { status: "error", message: "Max stake must be between 0 and 100%." };
  if (!Number.isFinite(unit) || unit < 0)
    return { status: "error", message: "Unit size must be 0 or more." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      bankroll,
      staking_strategy: strategy,
      max_stake_pct: maxStake,
      unit_size: unit,
    })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  // Refresh feed + profile so derived stake amounts update everywhere.
  revalidatePath("/", "layout");
  return { status: "ok" };
}
