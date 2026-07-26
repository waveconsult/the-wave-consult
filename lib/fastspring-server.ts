import crypto from "crypto";
import { productForPlan } from "./fastspring";
import type { Plan } from "./types";

// SERVER ONLY. Holds the webhook HMAC secret, the REST API credentials and node
// `crypto`. Never import this into a client component — import ./fastspring
// instead, which is the client-safe config half.

// FastSpring signs each webhook POST with an HMAC-SHA256 digest of the RAW
// request body, keyed by the secret you set on the webhook (Dashboard →
// Integrations → Webhooks → "HMAC SHA256 Secret"). The base64 digest arrives in
// the `X-FS-Signature` header. Verifying it is what authenticates the request —
// an unset secret is a misconfiguration, so we fail closed.
export function verifyFastSpringSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.FASTSPRING_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // Length check first — timingSafeEqual throws on unequal lengths.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── FastSpring REST API ────────────────────────────────────────────────────
// Credentials from Dashboard → Integrations → API Credentials. Basic auth.
const API = "https://api.fastspring.com";

function authHeader(): string {
  const user = process.env.FASTSPRING_API_USERNAME;
  const pass = process.env.FASTSPRING_API_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "FASTSPRING_API_USERNAME / FASTSPRING_API_PASSWORD are not set (server-side only).",
    );
  }
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

async function fsFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`FastSpring ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Create a pre-filled checkout session — the FastSpring analogue of a Stripe
// Checkout Session. Used for the admin-invite flow, where we email a personal
// link to someone who does NOT have an account yet. `tags` ride along to the
// webhook, which is how the payment gets attached to the right application.
// NOTE: the REST API uses `items[].product`, while the client-side SBL popup
// uses `products[].path` — different shapes for the same thing.
export async function createCheckoutSession(opts: {
  plan: Plan;
  email: string;
  tags: Record<string, string>;
  /** Session lifetime in seconds (max 7 days). Defaults to 24h to match the
   *  deadline promised in the urgency email. */
  expiresInSeconds?: number;
}): Promise<{ id: string; url: string | null }> {
  const { plan, email, tags, expiresInSeconds = 60 * 60 * 24 } = opts;

  const json = (await fsFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      contact: { email },
      items: [{ product: productForPlan(plan), quantity: 1 }],
      tags,
      expiration: expiresInSeconds,
    }),
  })) as { id?: string; url?: string };

  if (!json.id) throw new Error("FastSpring session response had no id.");
  return { id: json.id, url: json.url ?? null };
}

// Short-lived authenticated link into FastSpring's Account Management Portal —
// the analogue of the Stripe billing portal (update card, cancel renewal).
// The token expires quickly, so generate at redirect time and never cache it.
export async function getAccountManagementUrl(
  accountId: string,
): Promise<string | null> {
  const json = (await fsFetch(`/accounts/${accountId}/authenticate`)) as {
    url?: string;
  };
  // Land the member on the Subscriptions tab rather than Orders.
  return json.url ? `${json.url}#/subscriptions` : null;
}
