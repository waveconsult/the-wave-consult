import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Proof that someone owns a mailbox, used by both the bot and the website.
//
// The bot needs it because an email address is not a secret: without a code,
// "which address did you pay with?" would hand a paid membership to anyone who
// knows a member's email. The website needs the same thing to let people back
// in on a new device. One implementation, so the rules — length, lifetime,
// attempt limit, rate limit — cannot drift apart between the two doors.

const TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

export type Purpose = "telegram_link" | "web_login";

export type IssueResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited" | "send_failed" | "config" };

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "no_request" | "expired" | "too_many_attempts" | "wrong_code" };

const norm = (email: string) => email.trim().toLowerCase();
const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/** Constant-time compare so a wrong code cannot be narrowed by timing. */
function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Six digits, uniformly random. randomInt is rejection-sampled, unlike Math.random. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Send a fresh code to `email`. Any earlier live code for the same address and
 * purpose is consumed first, so only the newest one works — otherwise a user
 * who requests twice gets two valid codes and reasonably types the older one.
 */
export async function issueCode(
  email: string,
  purpose: Purpose,
  telegramId?: number,
): Promise<IssueResult> {
  const address = norm(email);
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "config" };

  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await admin
    .from("email_codes")
    .select("id", { count: "exact", head: true })
    .eq("email", address)
    .eq("purpose", purpose)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR) return { ok: false, reason: "rate_limited" };

  await admin
    .from("email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", address)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const code = newCode();
  const { error } = await admin.from("email_codes").insert({
    email: address,
    code_hash: hash(code),
    purpose,
    telegram_id: telegramId ?? null,
    expires_at: new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) return { ok: false, reason: "send_failed" };

  try {
    const resend = new Resend(key);
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? "WaveHub <onboarding@resend.dev>",
      to: address,
      subject: `${code} is your WaveHub code`,
      html: codeEmail(code, purpose),
    });
    if (sendError) return { ok: false, reason: "send_failed" };
  } catch {
    return { ok: false, reason: "send_failed" };
  }

  return { ok: true };
}

/**
 * Check a typed code. Wrong guesses are counted against the request rather than
 * the address, so an attacker cannot lock a real member out by burning attempts
 * on a request that member never made.
 */
export async function verifyCode(
  code: string,
  purpose: Purpose,
  where: { email?: string; telegramId?: number },
): Promise<VerifyResult> {
  const typed = code.replace(/\D/g, "");
  const admin = createAdminClient();

  let query = admin
    .from("email_codes")
    .select("id, email, code_hash, expires_at, attempts")
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (where.telegramId !== undefined) query = query.eq("telegram_id", where.telegramId);
  if (where.email) query = query.eq("email", norm(where.email));

  const { data: row } = await query.maybeSingle();
  if (!row) return { ok: false, reason: "no_request" };

  if (new Date(row.expires_at) < new Date()) {
    await admin
      .from("email_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, reason: "expired" };
  }

  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (typed.length !== 6 || !sameHash(hash(typed), row.code_hash)) {
    await admin
      .from("email_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, reason: "wrong_code" };
  }

  await admin
    .from("email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  return { ok: true, email: row.email as string };
}

/** True while a code is outstanding — lets the bot read a bare six-digit
 *  message as an answer without keeping conversation state of its own. */
export async function hasPendingCode(telegramId: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_codes")
    .select("id")
    .eq("telegram_id", telegramId)
    .eq("purpose", "telegram_link")
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

function codeEmail(code: string, purpose: Purpose): string {
  const what =
    purpose === "telegram_link"
      ? "to connect your Telegram account to your membership"
      : "to sign in to WaveHub";
  return `<!doctype html><html><body style="margin:0;background:#f6f6f5;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b70">WaveHub</p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#111">Your code</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f3f45">
      Enter this ${what}. It expires in ${TTL_MINUTES} minutes.
    </p>
    <p style="margin:0 0 22px;font-size:40px;font-weight:700;letter-spacing:.18em;color:#111">${code}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b70">
      If you did not ask for this, ignore it — nothing happens without the code.
    </p>
  </div>
</body></html>`;
}
