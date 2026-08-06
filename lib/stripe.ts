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
// Stripe dashboard — €399 for Silver, €599 for Gold (see lib/plans.ts) — and
// paste the ids in via env. The interval on each price must match
// PLANS[].intervalMonths, or a "yearly" plan will bill on some other rhythm.
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

/**
 * What a checkout for this plan is made of. One recurring item today — the
 * seam exists so that composing a checkout stays in one place rather than
 * being spelled out at each of the three call sites.
 */
export function lineItemsForPlan(plan: Plan): { price: string; quantity: number }[] {
  return [{ price: priceForPlan(plan), quantity: 1 }];
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
