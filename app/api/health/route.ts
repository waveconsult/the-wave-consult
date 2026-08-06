import { NextResponse } from "next/server";
import { PAYMENTS_PROVIDER, IS_FASTSPRING } from "@/lib/payments";
import { tryProductForPlan } from "@/lib/fastspring";
import { webhookSecretLength } from "@/lib/fastspring-server";

// Public configuration probe. Exists because the checkout config is only
// visible on /plans, which is behind the login — so there was no way to tell
// from outside whether a deployment had actually picked up a changed
// NEXT_PUBLIC_ variable, and every attempt cost a round trip.
//
// SAFE TO BE PUBLIC: it returns NEXT_PUBLIC_ values, which are already inlined
// into the JavaScript every visitor downloads, plus booleans saying whether the
// server-side secrets are non-empty. It never returns a secret itself.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ?stripe=1 asks Stripe what it actually thinks of our three price ids.
//
// Presence of the variables tells you nothing about whether checkout works:
// a product id instead of a price id, a one-off price instead of a recurring
// one, or live prices under a test key all look identical from outside and all
// fail the same way. This resolves each id and reports what came back.
// Errors are returned as their Stripe code — no secrets, no key material.
async function stripeReport() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const out: Record<string, unknown> = {
    keyMode: key.startsWith("sk_live") ? "live" : key.startsWith("sk_test") ? "test" : "unknown",
  };
  // Three ids, not two: Gold's one-off setup price is a separate Stripe object
  // and a separate way for the checkout to break, so it gets checked too. It
  // must be one-time — a recurring price here would bill the €200 every year.
  const prices: Record<string, unknown> = {};
  for (const [label, id] of Object.entries(configuredPrices())) {
    if (!id) {
      prices[label] = { configured: false };
      continue;
    }
    prices[label] = {
      configured: true,
      looksLikePriceId: id.startsWith("price_"),
      ...(await describePrice(id)),
    };
  }
  out.prices = prices;
  return out;
}

function configuredPrices(): Record<string, string | null> {
  const clean = (v: string | undefined) => v?.trim() || null;
  return {
    silver: clean(process.env.STRIPE_PRICE_SILVER),
    gold: clean(process.env.STRIPE_PRICE_GOLD),
    goldSetup: clean(process.env.STRIPE_PRICE_GOLD_SETUP),
  };
}

async function describePrice(id: string) {
  try {
    const { getStripe } = await import("@/lib/stripe");
    const p = await getStripe().prices.retrieve(id.trim());
    return {
      ok: true,
      livemode: p.livemode,
      active: p.active,
      currency: p.currency,
      amount: p.unit_amount,
      recurring: p.recurring
        ? `${p.recurring.interval_count} ${p.recurring.interval}`
        : null,
    };
  } catch (e: unknown) {
    const err = e as { code?: string; type?: string; message?: string };
    return {
      ok: false,
      // Stripe's own code is the useful part: resource_missing, invalid_api_key…
      error: err.code ?? err.type ?? "unknown",
      message: err.message?.slice(0, 200) ?? null,
    };
  }
}

export async function GET(req: Request) {
  const wantStripe = new URL(req.url).searchParams.get("stripe") === "1";
  return NextResponse.json({
    stripe: wantStripe ? await stripeReport() : "pass ?stripe=1 to probe",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    // Which deployment is actually answering. Vercel injects these itself, so
    // they identify the running deployment even when our own variables are
    // missing — which is the case that is hardest to diagnose from outside:
    // "is my change even live, and is this the project I edited?"
    deployment: {
      env: process.env.VERCEL_ENV ?? null, // production | preview | development
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      repo: process.env.VERCEL_GIT_REPO_SLUG ?? null,
      owner: process.env.VERCEL_GIT_REPO_OWNER ?? null,
      // The deployment hostname embeds the PROJECT slug. The git repo alone is
      // not enough: two Vercel projects can be wired to the same repository,
      // and then variables get typed into one while the domain is served by
      // the other. This is the only value that names the project itself.
      deploymentUrl: process.env.VERCEL_URL ?? null,
      productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    },
    // How many env vars this runtime can see at all, and which of the names we
    // care about exist. Names only — never values. If ourVars is empty while
    // totalEnvKeys is large, the variables are simply not on this project.
    envDebug: {
      totalEnvKeys: Object.keys(process.env).length,
      ourVars: Object.keys(process.env)
        .filter((k) => /FASTSPRING|PAYMENTS_PROVIDER|STRIPE|RESEND|SUPABASE/i.test(k))
        .sort(),
    },
    // What the app will actually use, after trimming/lowercasing.
    paymentsProvider: PAYMENTS_PROVIDER,
    isFastSpring: IS_FASTSPRING,
    // Public storefront id — already visible in the page source.
    storefront: process.env.NEXT_PUBLIC_FASTSPRING_STOREFRONT ?? null,
    // Are the product paths configured? Values, not secrets. FastSpring is not
    // the live processor — kept only so flipping the provider flag is still a
    // one-line change rather than an archaeology exercise.
    fastSpringProducts: {
      silver: tryProductForPlan("silver"),
      gold: tryProductForPlan("gold"),
    },
    // Length only, never the value. A secret generated as 32 random bytes in
    // base64url is 43 characters. Anything far longer means it was pasted more
    // than once or carries a newline — which produces a completely different
    // HMAC and makes every webhook 401, indistinguishable from a wrong secret.
    fastspringWebhookSecretLength: webhookSecretLength(),
    // Presence only — never the values.
    secretsPresent: {
      fastspringWebhookSecret: Boolean(process.env.FASTSPRING_WEBHOOK_SECRET),
      fastspringApiCredentials: Boolean(
        process.env.FASTSPRING_API_USERNAME && process.env.FASTSPRING_API_PASSWORD,
      ),
      stripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
    },
  });
}
