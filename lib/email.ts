import { Resend } from "resend";
import { introLabel, planDetails, renewalNotice } from "./plans";
import type { Plan } from "./types";

// Server-only transactional email via Resend. Lazily instantiated so the app
// builds without the key; the operator sets RESEND_API_KEY + RESEND_FROM.
let _resend: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set. Add it to .env.local.");
  }
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// Until a domain is verified in Resend you can send from onboarding@resend.dev.
const FROM = process.env.RESEND_FROM ?? "WaveHub <onboarding@resend.dev>";

// Derived from lib/plans.ts so the email can never quote a stale price.
const planLabel = (plan: Plan) => planDetails(plan).name;
// What they pay today, plus the renewal terms — the email must state both.
const planPrice = (plan: Plan) =>
  `${introLabel(plan)} for your first ${planDetails(plan).label} — ${renewalNotice(plan)}`;

// Acceptance email: "you're in — activate your membership" with the Stripe
// checkout link. Dark + champagne-gold, matches the brand.
export async function sendAcceptanceEmail(opts: {
  to: string;
  plan: Plan;
  checkoutUrl: string;
}): Promise<void> {
  const { to, plan, checkoutUrl } = opts;
  const label = planLabel(plan);
  const price = planPrice(plan);

  const html = `
  <div style="margin:0;padding:0;background:#0a0a0b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141413;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;">
          <tr><td style="padding:34px 36px 0;">
            <div style="font:700 17px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#ededee;">Wave<span style="color:#cdd2d8;">hub</span></div>
          </td></tr>
          <tr><td style="padding:22px 36px 0;">
            <div style="font:700 11px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#cdd2d8;">Your application</div>
            <h1 style="margin:14px 0 0;font:700 34px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:#ededee;">You&#39;re in.</h1>
            <p style="margin:16px 0 0;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#94928a;">
              We reviewed your application and would like to offer you a <strong style="color:#ededee;">${label}</strong> membership (${price}). Activate it below — one secure payment and you&#39;re a member.
            </p>
          </td></tr>
          <tr><td style="padding:28px 36px 6px;">
            <a href="${checkoutUrl}" style="display:block;background:#cdd2d8;color:#0a0a0b;text-decoration:none;text-align:center;font:600 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:15px 24px;border-radius:999px;">Activate ${label} membership →</a>
          </td></tr>
          <tr><td style="padding:16px 36px 34px;">
            <p style="margin:0;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#605f58;">
              After payment you&#39;ll set up your account and get instant access on every device. This link is just for you — please don&#39;t forward it.
            </p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font:400 11px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#605f58;">WaveHub · Analysis, not a bookmaker · ATP only</p>
      </td></tr>
    </table>
  </div>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "You're in — activate your WaveHub membership",
    html,
  });
}

// Urgency variant, sent by the automatic 1-hour auto-accept. Honest time
// pressure: Stripe checkout links expire after 24h and the club is kept small.
export async function sendUrgencyEmail(opts: {
  to: string;
  plan: Plan;
  checkoutUrl: string;
}): Promise<void> {
  const { to, plan, checkoutUrl } = opts;
  const label = planLabel(plan);
  const price = planPrice(plan);

  const html = `
  <div style="margin:0;padding:0;background:#0a0a0b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141413;border:1px solid rgba(205,210,216,.35);border-radius:18px;overflow:hidden;">
          <tr><td style="padding:34px 36px 0;">
            <div style="font:700 17px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#ededee;">Wave<span style="color:#cdd2d8;">hub</span></div>
          </td></tr>
          <tr><td style="padding:22px 36px 0;">
            <div style="font:700 11px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#cdd2d8;">Invitation · 24 hours</div>
            <h1 style="margin:14px 0 0;font:700 32px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:#ededee;">Your spot is reserved.</h1>
            <p style="margin:16px 0 0;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#94928a;">
              You made the cut for a <strong style="color:#ededee;">${label}</strong> membership (${price}). We keep the club small, so this is time-limited — <strong style="color:#eef1f4;">your activation link is valid for the next 24 hours</strong>. After that, the spot is released.
            </p>
          </td></tr>
          <tr><td style="padding:28px 36px 6px;">
            <a href="${checkoutUrl}" style="display:block;background:#cdd2d8;color:#0a0a0b;text-decoration:none;text-align:center;font:600 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:15px 24px;border-radius:999px;">Claim your ${label} membership →</a>
          </td></tr>
          <tr><td style="padding:16px 36px 34px;">
            <p style="margin:0;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#605f58;">
              One secure payment, then you set up your account and you&#39;re in on every device. Miss the window and you&#39;ll have to re-apply.
            </p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font:400 11px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#605f58;">WaveHub · Analysis, not a bookmaker · ATP only</p>
      </td></tr>
    </table>
  </div>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Your WaveHub invitation expires in 24 hours",
    html,
  });
}
