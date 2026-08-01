import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Lead capture for the tournament preview pages on the marketing site.
// Called cross-origin from wavehubtennis.com, so it answers CORS preflight.
// Does three things, each independently best-effort:
//   1. store the lead in Supabase (source of truth)
//   2. email the PDF via Resend
//   3. subscribe to Mailchimp, tagged with the tournament
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "https://wavehubtennis.com",
  "https://www.wavehubtennis.com",
  "https://wavehub-landing.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:8793",
]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED.has(origin) ? origin : "https://www.wavehubtennis.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

const SITE = "https://www.wavehubtennis.com";

function pdfEmail(name: string, title: string, pdfUrl: string) {
  const hi = name ? `Hi ${name},` : "Hi,";
  return `<!doctype html><html><body style="margin:0;background:#000;padding:28px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141414;border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden">
  <tr><td style="padding:26px 28px 0">
    <div style="font:800 18px system-ui;letter-spacing:-.02em;text-transform:uppercase;color:#f5f5f6">Wave<span style="color:#5b9bff">hub</span></div>
    <div style="margin-top:22px;font:600 11px system-ui;letter-spacing:2.6px;text-transform:uppercase;color:#5b9bff">Your free preview</div>
    <div style="margin-top:8px;font:700 25px system-ui;letter-spacing:-.03em;color:#fff">${title}</div>
  </td></tr>
  <tr><td style="padding:18px 28px 0;font:400 15px/1.65 system-ui;color:#a2a2ab">
    ${hi}<br><br>here is your free preview — the draw broken down quarter by quarter,
    where the seeding lies, and the spots actually worth the money.
  </td></tr>
  <tr><td style="padding:24px 28px 0">
    <a href="${pdfUrl}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;text-align:center;font:600 15px system-ui;padding:15px 24px;border-radius:999px">Download the PDF &rarr;</a>
  </td></tr>
  <tr><td style="padding:20px 28px 28px;font:400 12px/1.6 system-ui;color:#6a6a72">
    ATP only. WaveHub publishes sports analysis — we are not a bookmaker, we take no bets
    and hold no money. Nothing here is a promise of profit. 18+.
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function toMailchimp(email: string, name: string, tournament: string) {
  const key = process.env.MAILCHIMP_API_KEY;
  const list = process.env.MAILCHIMP_LIST_ID;
  if (!key || !list) return false;
  const dc = key.split("-")[1];
  if (!dc) return false;
  const hash = createHash("md5").update(email.toLowerCase()).digest("hex");
  const res = await fetch(
    `https://${dc}.api.mailchimp.com/3.0/lists/${list}/members/${hash}`,
    {
      method: "PUT", // upsert — never fails on an existing subscriber
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: "subscribed",
        merge_fields: name ? { FNAME: name } : {},
        tags: [`preview-${tournament}`],
      }),
    },
  );
  return res.ok;
}

export async function POST(req: Request) {
  const headers = cors(req.headers.get("origin"));
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400, headers });
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase();
  const tournament = String(body.tournament ?? "").trim().slice(0, 60) || "general";
  const title = String(body.title ?? "").trim().slice(0, 120) || "ATP preview";
  const pdf = String(body.pdf ?? "").trim();
  const followedIg = body.followed_ig === true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400, headers });
  }
  // only ever link a PDF hosted on our own site
  const pdfUrl = pdf.startsWith("/") ? SITE + pdf : `${SITE}/assets/previews/${tournament}.pdf`;

  let emailed = false;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const resend = new Resend(key);
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "WaveHub <onboarding@resend.dev>",
        to: email,
        subject: `Your free ${title} preview`,
        html: pdfEmail(name, title, pdfUrl),
      });
      emailed = true;
    } catch {
      // fall through — the lead is still stored and Mailchimp can deliver
    }
  }

  let synced = false;
  try {
    synced = await toMailchimp(email, name, tournament);
  } catch {
    /* non-fatal */
  }

  try {
    const admin = createAdminClient();
    await admin.from("preview_leads").insert({
      name: name || null,
      email,
      tournament,
      source: req.headers.get("referer")?.slice(0, 200) ?? null,
      followed_ig: followedIg,
      emailed_at: emailed ? new Date().toISOString() : null,
      mailchimp_synced: synced,
    });
  } catch {
    // If the DB is down we still delivered the PDF — don't fail the user.
  }

  return NextResponse.json({ ok: true, emailed }, { headers });
}
