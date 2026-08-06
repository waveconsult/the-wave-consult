import type { Plan } from "./types";

// THE single source of truth for what a membership costs.
//
// These values must stay in lockstep with two other places:
//   1. the Stripe dashboard (one yearly price per tier)
//   2. wavehub-landing/index.html (the public pricing section)
// Change a price here and you must change it in both.
//
// Pricing model: yearly only, two tiers, both plain recurring subscriptions.
//
//   Silver   €399 / year
//   Gold     €599 / year
//
// Gold costs more every year, not once: the models, the courses and the
// insights keep being produced, so they keep being paid for. There is no
// setup fee and no discounted first period — one price, every year, for as
// long as you stay.
//
// Prices are EUR because that is what the public site quotes, and the Stripe
// prices must match exactly — same amount, same interval, same currency.
export const PLANS: {
  plan: Plan;
  name: string;
  /** Charged today and on every renewal. */
  yearlyEur: number;
  /** Billing interval in months — must equal the Stripe price interval. */
  intervalMonths: number;
  label: string;
  /** What the tier includes, in the order it should be listed. */
  features: string[];
}[] = [
  {
    plan: "silver",
    name: "Silver",
    yearlyEur: 399,
    intervalMonths: 12,
    label: "year",
    features: [
      "Every pick, with the reasoning behind it",
      "Live in-play calls as matches turn",
      "Tournament previews, draw by draw",
    ],
  },
  {
    plan: "gold",
    name: "Gold",
    yearlyEur: 599,
    intervalMonths: 12,
    label: "year",
    features: [
      "Everything in Silver",
      "The models the calls are built on",
      "The full course library",
      "Insights as they're written",
    ],
  },
];

export function planDetails(plan: Plan) {
  const found = PLANS.find((p) => p.plan === plan);
  if (!found) throw new Error(`Unknown plan "${plan}".`);
  return found;
}

export function isPlan(value: unknown): value is Plan {
  return value === "silver" || value === "gold";
}

/** The price, formatted — e.g. "€399". */
export function priceLabel(plan: Plan): string {
  return `€${planDetails(plan).yearlyEur}`;
}

/** What it works out at per month. Derived, never stored. */
export function perMonth(plan: Plan): number {
  const { yearlyEur, intervalMonths } = planDetails(plan);
  return Math.round(yearlyEur / intervalMonths);
}

/** The auto-renewal disclosure that must sit next to every buy button. */
export function renewalNotice(plan: Plan): string {
  const { label } = planDetails(plan);
  return `Renews at ${priceLabel(plan)} every ${label}. Cancel anytime.`;
}
