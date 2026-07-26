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

// Map a membership plan to its Stripe Price id. Create three recurring prices
// in the Stripe dashboard — €149 every 3 months, €299 every 6 months, €599
// every 12 months (see lib/plans.ts) — and paste their ids here via env.
// The recurring interval on each Stripe price must match PLANS[].intervalMonths.
export function priceForPlan(plan: Plan): string {
  const id =
    plan === "3m"
      ? process.env.STRIPE_PRICE_3M
      : plan === "6m"
        ? process.env.STRIPE_PRICE_6M
        : process.env.STRIPE_PRICE_1Y;
  if (!id) {
    throw new Error(
      `Missing Stripe price for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()} in .env.local.`,
    );
  }
  return id;
}

// Reverse of priceForPlan — used by the webhook as a fallback when a
// subscription event doesn't carry the plan in metadata.
export function planForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_3M) return "3m";
  if (priceId === process.env.STRIPE_PRICE_6M) return "6m";
  if (priceId === process.env.STRIPE_PRICE_1Y) return "1y";
  return null;
}
