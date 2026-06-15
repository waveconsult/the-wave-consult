// Domain types — mirror supabase/schema.sql (briefing §3, §4).

export type Role = "user" | "admin";
export type Tier = "none" | "core" | "private";
export type Strategy = "conservative" | "standard" | "aggressive";
export type BetStatus = "open" | "won" | "lost" | "void";
export type ApplicationStatus = "pending" | "accepted" | "declined";

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  role: Role;
  tier: Tier;
  bankroll: number;
  staking_strategy: Strategy;
  max_stake_pct: number;
  unit_size: number;
  created_at: string;
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
  match: string;
  round: string | null;
  selection: string;
  market: string;
  odds: number;
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
  title: string;
  body: string;
  stats: InsightStatRow[] | null;
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

export interface Application {
  id: string;
  email: string;
  requested_tier: Exclude<Tier, "none"> | null;
  note: string | null;
  status: ApplicationStatus;
  created_at: string;
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
}
