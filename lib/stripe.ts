import Stripe from "stripe";

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

// Map a membership tier to its Stripe Price id. Create two one-time yearly
// prices in the Stripe dashboard (Core €479, Private €779) and paste their
// ids here via env.
export function priceForTier(tier: "core" | "private"): string {
  const id =
    tier === "core"
      ? process.env.STRIPE_PRICE_CORE
      : process.env.STRIPE_PRICE_PRIVATE;
  if (!id) {
    throw new Error(
      `Missing Stripe price for "${tier}". Set STRIPE_PRICE_${tier.toUpperCase()} in .env.local.`,
    );
  }
  return id;
}
