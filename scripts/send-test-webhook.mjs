// Send a correctly signed FastSpring webhook to our own endpoint.
//
// Why this exists: completing a real test order requires an activated
// FastSpring store, so while the store is still in review there is no way to
// confirm that a payment actually grants access. This reproduces exactly what
// FastSpring sends — same body shape, same HMAC-SHA256/base64 signature in the
// same header — so the whole chain (signature check, event handling, Supabase
// write) can be verified without FastSpring being involved at all.
//
// The secret is read from the environment and never printed. Run it yourself;
// nobody else needs to see it.
//
// Usage (PowerShell):
//   $env:FASTSPRING_WEBHOOK_SECRET="..."
//   node scripts/send-test-webhook.mjs <user-id> [grant|revoke] [url]
//
// Usage (bash):
//   FASTSPRING_WEBHOOK_SECRET="..." node scripts/send-test-webhook.mjs <user-id>
//
// <user-id> is the Supabase auth user id (profiles.id) to act on. Find it with:
//   select id, email from public.profiles where email = 'you@example.com';

import crypto from "crypto";

const secret = process.env.FASTSPRING_WEBHOOK_SECRET;
const userId = process.argv[2];
const action = (process.argv[3] ?? "grant").toLowerCase();
const url =
  process.argv[4] ?? "https://app.wavehubtennis.com/api/fastspring/webhook";

if (!secret) {
  console.error("FASTSPRING_WEBHOOK_SECRET is not set in this shell.");
  process.exit(1);
}
if (!userId) {
  console.error(
    "Usage: node scripts/send-test-webhook.mjs <user-id> [grant|revoke] [url]",
  );
  process.exit(1);
}

// live:false marks these as test-store events, which our webhook honours only
// while NEXT_PUBLIC_FASTSPRING_STOREFRONT is a .test. storefront — the same
// guard that stops a stale test webhook granting access once we go live.
const body =
  action === "revoke"
    ? {
        events: [
          {
            id: "evt_local_revoke",
            type: "subscription.deactivated",
            live: false,
            data: {
              id: "sub_local_test",
              account: "acct_local_test",
              state: "deactivated",
              product: process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_1Y ?? "1-year-subscription",
              tags: { user_id: userId, plan: "1y" },
            },
          },
        ],
      }
    : {
        events: [
          {
            id: "evt_local_grant",
            type: "order.completed",
            live: false,
            data: {
              order: "ord_local_test",
              account: "acct_local_test",
              customer: { email: process.env.TEST_EMAIL ?? undefined },
              tags: { user_id: userId, plan: "1y" },
              items: [
                {
                  product:
                    process.env.NEXT_PUBLIC_FASTSPRING_PRODUCT_1Y ??
                    "1-year-subscription",
                  subscription: "sub_local_test",
                },
              ],
            },
          },
        ],
      };

const raw = JSON.stringify(body);
const signature = crypto
  .createHmac("sha256", secret)
  .update(raw, "utf8")
  .digest("base64");

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-FS-Signature": signature },
  body: raw,
});

console.log(`${action.toUpperCase()} -> ${res.status} ${res.statusText}`);
console.log(await res.text());

if (res.status === 401) {
  console.log(
    "\n401 means the secret in this shell does not match the one the deployment has.",
  );
} else if (res.ok) {
  console.log(
    `\nNow check Supabase:\n  select email, tier, plan, subscription_status, fastspring_subscription_id\n  from public.profiles where id = '${userId}';\n` +
      (action === "revoke"
        ? "  expected: tier = none"
        : "  expected: tier = member, plan = 1y"),
  );
}
