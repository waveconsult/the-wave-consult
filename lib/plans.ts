import type { Plan } from "./types";

// THE single source of truth for what a membership costs.
//
// FastSpring will not activate a store unless product names and unit prices
// match the public website exactly, so these values must stay in lockstep with
// three other places:
//   1. the FastSpring dashboard (Products → price, interval, trial)
//   2. wavehub-landing/index.html (the public pricing section)
//   3. the app's plans page (which reads this file)
// Change a price here and you must change it in 1 and 2 as well.
//
// Pricing model: the FIRST period is discounted (introEur), every renewal after
// that is the full price (renewalEur). In FastSpring this is a "paid trial with
// a discounted amount": trial length = one full billing period, trial price =
// introEur, then it rebills at renewalEur.
//
// This is an INTRODUCTORY DISCOUNT, not a free trial — the member is charged
// introEur immediately. Copy must never call it "x days free": they are paying
// from day one. The honest framing is "first N months €X, then €Y".
//
// Prices are EUR because that is what the public site quotes. FastSpring must
// have EUR configured as the product currency — not a USD price that it
// auto-converts for display, or the amounts will not match.
export const PLANS: {
  plan: Plan;
  name: string;
  /** Charged once, for the first period. */
  introEur: number;
  /** Charged on every renewal thereafter. */
  renewalEur: number;
  /** Billing interval in months — must equal the FastSpring product interval. */
  intervalMonths: number;
  label: string;
}[] = [
  { plan: "3m", name: "3 Month Membership", introEur: 99, renewalEur: 149, intervalMonths: 3, label: "3 months" },
  { plan: "6m", name: "6 Month Membership", introEur: 199, renewalEur: 299, intervalMonths: 6, label: "6 months" },
  { plan: "1y", name: "1 Year Membership", introEur: 349, renewalEur: 499, intervalMonths: 12, label: "1 year" },
];

export function planDetails(plan: Plan) {
  const found = PLANS.find((p) => p.plan === plan);
  if (!found) throw new Error(`Unknown plan "${plan}".`);
  return found;
}

export function isPlan(value: unknown): value is Plan {
  return value === "3m" || value === "6m" || value === "1y";
}

/** What you pay today, formatted — e.g. "€99". */
export function introLabel(plan: Plan): string {
  return `€${planDetails(plan).introEur}`;
}

/** What each renewal costs, formatted — e.g. "€149". */
export function renewalLabel(plan: Plan): string {
  return `€${planDetails(plan).renewalEur}`;
}

/** Real monthly cost of the first period. Derived, never stored. */
export function introPerMonth(plan: Plan): number {
  const { introEur, intervalMonths } = planDetails(plan);
  return Math.round(introEur / intervalMonths);
}

/** Real monthly cost once it renews at full price. */
export function renewalPerMonth(plan: Plan): number {
  const { renewalEur, intervalMonths } = planDetails(plan);
  return Math.round(renewalEur / intervalMonths);
}

/** The auto-renewal disclosure that must sit next to every buy button. */
export function renewalNotice(plan: Plan): string {
  const { label } = planDetails(plan);
  return `Then ${renewalLabel(plan)} every ${label}. Cancel anytime.`;
}
