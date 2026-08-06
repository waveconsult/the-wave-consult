import Stripe from "stripe";
import type { Plan } from "./types";

// Server-only Stripe client. Lazily instantiated so the app still builds and
// boots when Stripe isn't configured yet — the operator fills the keys in
// .env.local / Vercel and the accept flow starts working. Never import into a
// client component.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (server-side only).",
    );
  }
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

// The recurring price of a tier. Create one yearly price per tier in the
// Stripe dashboard — €399/year for both (see lib/plans.ts) — and paste the ids
// in via env. Two separate prices despite the identical amount: a subscription
// must still say which tier it came from, and one shared price would make
// Silver and Gold indistinguishable the moment the first invoice is paid.
// The interval on each price must match PLANS[].intervalMonths.
export function priceForPlan(plan: Plan): string {
  const id =
    plan === "silver" ? process.env.STRIPE_PRICE_SILVER : process.env.STRIPE_PRICE_GOLD;
  if (!id) {
    throw new Error(
      `Missing Stripe price for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()} in .env.local.`,
    );
  }
  return id;
}

// Gold's one-off, charged on the first invoice only. A ONE-TIME Stripe
// price, not recurring — Stripe puts it on the first invoice of a subscription
// checkout and never bills it again. Null for tiers without one.
export function setupPriceForPlan(plan: Plan): string | null {
  if (plan !== "gold") return null;
  return process.env.STRIPE_PRICE_GOLD_SETUP?.trim() || null;
}

/** Both line items for a checkout, in the order they should appear. */
export function lineItemsForPlan(plan: Plan): { price: string; quantity: number }[] {
  const items = [{ price: priceForPlan(plan), quantity: 1 }];
  const setup = setupPriceForPlan(plan);
  if (setup) items.push({ price: setup, quantity: 1 });
  return items;
}

// Reverse of priceForPlan — used by the webhook as a fallback when a
// subscription event doesn't carry the plan in metadata. Only the recurring
// prices are checked: the setup price never appears on a subscription.
export function planForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_SILVER) return "silver";
  if (priceId === process.env.STRIPE_PRICE_GOLD) return "gold";
  return null;
}
