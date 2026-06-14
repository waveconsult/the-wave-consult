// Staking logic — ported from the prototype (briefing §7).
//
// This is real logic and a brand differentiator: it must be able to return
// "No bet." Fractional Kelly, hard-capped at 3% of bankroll.

import type { Strategy } from "./types";

const KELLY_FRACTION: Record<Strategy, number> = {
  conservative: 0.25,
  standard: 0.5,
  aggressive: 1,
};

export const MAX_STAKE = 0.03; // 3% hard cap

export type StakeResult =
  | { ok: false; reason: "invalid-input" }
  | { ok: true; bet: false; edge: number }
  | {
      ok: true;
      bet: true;
      edge: number;
      stakePct: number; // fraction of bankroll (0–0.03)
      stakeAmount: number;
      capped: boolean;
    };

export function recommendStake(opts: {
  bankroll: number;
  odds: number;
  winProb: number;
  strategy: Strategy;
}): StakeResult {
  const { bankroll, odds, winProb: p, strategy } = opts;

  if (odds <= 1 || p <= 0 || p >= 1 || bankroll <= 0) {
    return { ok: false, reason: "invalid-input" };
  }

  const b = odds - 1;
  const q = 1 - p;
  const ev = p * odds - 1; // value edge per unit
  const kellyFull = (b * p - q) / b; // full Kelly fraction

  if (kellyFull <= 0 || ev <= 0) {
    return { ok: true, bet: false, edge: ev };
  }

  let f = kellyFull * KELLY_FRACTION[strategy];
  const capped = f > MAX_STAKE;
  if (capped) f = MAX_STAKE;

  return {
    ok: true,
    bet: true,
    edge: ev,
    stakePct: f,
    stakeAmount: bankroll * f,
    capped,
  };
}

// Stake amount shown on a published bet card: stake_pct is stored as a percent
// (e.g. 2 = 2% of bankroll), so divide by 100. Amount is never stored — it is
// derived from bankroll at render time, so changing bankroll updates every card.
export const betStakeAmount = (bankroll: number, stakePct: number) =>
  bankroll * (stakePct / 100);
