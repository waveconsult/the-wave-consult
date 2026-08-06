import type { Plan } from "./types";

// THE single source of truth for what a membership costs.
//
// These values must stay in lockstep with two other places:
//   1. the Stripe dashboard (one yearly price per tier, plus Gold's
//      one-off setup price)
//   2. wavehub-landing/index.html (the public pricing section)
// Change a price here and you must change it in both.
//
// Pricing model: yearly only, two tiers.
//
//   Silver   €399 today, €399 every year after
//   Gold     €599 today, €399 every year after
//
// Gold is NOT a more expensive subscription — it is the same €399/year
// plus a €200 one-off on the first invoice. That is deliberate and honest:
// the models and the education library are delivered once, so they are paid
// for once. Renewals cost the same as Silver because after the first year
// both tiers are receiving the same thing.
//
// In Stripe this is a subscription checkout carrying a second, one-time line
// item — it lands on the first invoice and never appears again. Each tier has
// its own yearly price even though the amounts are identical, so that a
// subscription still identifies which tier it came from.
//
// Prices are EUR because that is what the public site quotes, and the Stripe
// prices must match exactly — same amount, same interval, same currency.
export const PLANS: {
  plan: Plan;
  name: string;
  /** Charged today. Includes the one-off where a tier has one. */
  firstYearEur: number;
  /** Charged on every renewal after that. */
  renewalEur: number;
  /** The one-off part of the first payment. 0 when the tier has none. */
  setupEur: number;
  /** Billing interval in months — must equal the Stripe price interval. */
  intervalMonths: number;
  label: string;
  /** What the tier actually includes, in the order it should be listed. */
  features: string[];
}[] = [
  {
    plan: "silver",
    name: "Silver",
    firstYearEur: 399,
    renewalEur: 399,
    setupEur: 0,
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
    firstYearEur: 599,
    renewalEur: 399,
    setupEur: 200,
    intervalMonths: 12,
    label: "year",
    features: [
      "Everything in Silver",
      "The models the calls are built on",
      "The full education library",
      "Paid once — renewals cost the same as Silver",
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

/** Does this tier carry a one-off charge on the first invoice? */
export function hasSetupFee(plan: Plan): boolean {
  return planDetails(plan).setupEur > 0;
}

/** What you pay today, formatted — e.g. "€599". */
export function firstYearLabel(plan: Plan): string {
  return `€${planDetails(plan).firstYearEur}`;
}

/** What each renewal costs, formatted — e.g. "€399". */
export function renewalLabel(plan: Plan): string {
  return `€${planDetails(plan).renewalEur}`;
}

/** Real monthly cost once it renews. Derived, never stored. */
export function renewalPerMonth(plan: Plan): number {
  const { renewalEur, intervalMonths } = planDetails(plan);
  return Math.round(renewalEur / intervalMonths);
}

/** The auto-renewal disclosure that must sit next to every buy button. */
export function renewalNotice(plan: Plan): string {
  const { label, setupEur } = planDetails(plan);
  return setupEur > 0
    ? `Includes a one-off €${setupEur}. Renews at ${renewalLabel(plan)} every ${label}. Cancel anytime.`
    : `Renews at ${renewalLabel(plan)} every ${label}. Cancel anytime.`;
}
