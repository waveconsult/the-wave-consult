import type { Plan } from "./types";

// FastSpring is a Merchant of Record: it hosts the checkout, collects VAT/sales
// tax worldwide, and calls our webhook after payment events. This mirrors
// lib/stripe.ts so the two processors stay symmetric.
//
// This file is CLIENT-SAFE: pure config, no secrets, no node builtins — the
// plans page imports it from a "use client" component. Anything needing the
// HMAC secret, API credentials or `crypto` lives in ./fastspring-server.

// Product "path" as configured in the FastSpring dashboard (Products → each
// product → Path). Not secret, so exposed as NEXT_PUBLIC_ for the client popup;
// the webhook (server) reads the same vars for the reverse lookup.
//
// IMPORTANT: each product's billing interval in FastSpring must match
// PLANS[].intervalMonths — a "1 year" product set to bill every 3 months will
// charge the member four times a year.
const ENV_BY_PLAN: Record<Plan, string> = {
  "3m": "NEXT_PUBLIC_FASTSPRING_PRODUCT_3M",
  "6m": "NEXT_PUBLIC_FASTSPRING_PRODUCT_6M",
  "1y": "NEXT_PUBLIC_FASTSPRING_PRODUCT_1Y",
};

// Next.js inlines process.env.NEXT_PUBLIC_* at build time only for statically
// analysable member expressions, so these must be spelled out literally rather
// than looked up via a computed key.
function rawPath(plan: Plan): string | undefined {
  switch (plan) {
    case "3m":
      return process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_3M;
    case "6m":
      return process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_6M;
    case "1y":
      return process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_1Y;
  }
}

export function productForPlan(plan: Plan): string {
  const path = rawPath(plan);
  if (!path) {
    throw new Error(
      `Missing FastSpring product path for plan "${plan}". Set ${ENV_BY_PLAN[plan]}.`,
    );
  }
  return path;
}

// Non-throwing variant for RENDER paths. The plans page runs this while the
// page is being built, so a missing env var must degrade to a disabled button
// rather than take the whole page down with a 500 — which is exactly what
// happens between flipping NEXT_PUBLIC_PAYMENTS_PROVIDER to "fastspring" and
// filling in the product paths. Server code that genuinely cannot continue
// should keep using productForPlan and fail loudly.
export function tryProductForPlan(plan: Plan): string | null {
  return rawPath(plan) ?? null;
}

// Reverse of productForPlan — used by the webhook to work out which duration
// was bought when the event doesn't carry it in its tags.
export function planForProduct(path: string | null | undefined): Plan | null {
  if (!path) return null;
  if (path === process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_3M) return "3m";
  if (path === process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_6M) return "6m";
  if (path === process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_1Y) return "1y";
  return null;
}
