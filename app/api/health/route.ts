import { NextResponse } from "next/server";
import { PAYMENTS_PROVIDER, IS_FASTSPRING } from "@/lib/payments";
import { tryProductForPlan } from "@/lib/fastspring";

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

export function GET() {
  return NextResponse.json({
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
    },
    // What the app will actually use, after trimming/lowercasing.
    paymentsProvider: PAYMENTS_PROVIDER,
    isFastSpring: IS_FASTSPRING,
    // Public storefront id — already visible in the page source.
    storefront: process.env.NEXT_PUBLIC_FASTSPRING_STOREFRONT ?? null,
    // Are the three product paths configured? Values, not secrets.
    fastSpringProducts: {
      "3m": tryProductForPlan("3m"),
      "6m": tryProductForPlan("6m"),
      "1y": tryProductForPlan("1y"),
    },
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
