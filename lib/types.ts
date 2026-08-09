// Domain types — mirror supabase/schema.sql (briefing §3, §4).

export type Role = "user" | "admin";
// Access is binary: you are a member or you are not. The old core/private split
// never gated anything (no min_tier on content), so it collapsed into one tier.
export type Tier = "none" | "member";
// Which membership was bought. Both bill yearly; Gold adds a one-off
// charge on the first invoice for the models and the education library.
//
// Unlike the old 3m/6m/1y durations, these are NOT the same product at
// different lengths — Gold grants strictly more. Anything that gates
// content must therefore read the plan, not just the tier.
export type Plan = "silver" | "gold";
export type Strategy = "conservative" | "standard" | "aggressive";
export type BetStatus = "open" | "won" | "lost" | "void";

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  role: Role;
  tier: Tier;
  plan: Plan | null;
  bankroll: number;
  staking_strategy: Strategy;
  max_stake_pct: number;
  unit_size: number;
  created_at: string;
  // Written by the payment webhooks (migration 20260712_subscriptions).
  // requireProfile selects *, so these were always present at runtime and only
  // missing from the type.
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  country_flag: string | null;
  category: string | null;
  surface: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Bet {
  id: string;
  tournament_id: string | null;
  tournament_name: string | null;
  match: string;
  round: string | null;
  selection: string;
  market: string;
  odds: number | null;
  stake_pct: number;
  min_odd: number | null;
  status: BetStatus;
  reasoning: string | null;
  screenshot_path: string | null;
  clv: number | null;
  published_at: string;
  created_by: string | null;
}

export interface InsightStatRow {
  player: string;
  w?: number | string;
  ue?: number | string;
  tt?: number | string;
  ratio?: number | string;
}

export interface Insight {
  id: string;
  tournament_id: string | null;
  tournament_name: string | null;
  title: string;
  body: string;
  stats: InsightStatRow[] | null;
  screenshot_path: string | null;
  published_at: string;
  created_by: string | null;
}

export interface Resource {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
  created_by: string | null;
  url?: string | null;
}


// A bet joined with its tournament + a resolved screenshot URL, as rendered in the feed.
export interface BetWithMeta extends Bet {
  tournament?: Pick<
    Tournament,
    "name" | "country_flag" | "category" | "surface"
  > | null;
  screenshot_url?: string | null;
}

export interface InsightWithMeta extends Insight {
  tournament?: Pick<Tournament, "name" | "country_flag"> | null;
  screenshot_url?: string | null;
}
