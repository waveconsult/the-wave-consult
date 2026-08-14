import { NextResponse } from "next/server";
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
    and hold no money. Nothing here is a promise of profit.
  </td></tr>
</table></td></tr></table></body></html>`;
}

// The /start funnel asks four questions and works out a figure from the
// answers. The page shows it straight away; this is the copy that follows.
// The arithmetic already happened on the page — we only lay it out here, so
// the two can never disagree.
type Read = { turnover: number; point: number; method: string; openPoints: number; gap: number };

function money(n: number) {
  return "€" + Math.round(n).toLocaleString("en-US");
}

const WEEKS = 44; // the ATP season, January to the Finals

function assessmentEmail(name: string, read: Read, stake: number, vol: number) {
  const hi = name ? `Hi ${name},` : "Hi,";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:13px 0;border-bottom:1px solid rgba(255,255,255,.10);font:400 14px system-ui;color:#9b9bab">${label}</td>
     <td style="padding:13px 0;border-bottom:1px solid rgba(255,255,255,.10);font:600 16px ui-monospace,monospace;color:#fff;text-align:right;white-space:nowrap">${value}</td></tr>`;

  // Same three branches as the page, in the same order and the same words. If
  // the two drift apart, the email reads as a different framework than the one
  // they just looked at.
  const covers = read.openPoints <= 0.6;
  const small = !covers && read.gap < 500;
  const gapLabel = small ? "What it is worth at your size" : "What the structure is worth to you";
  const closing = covers
    ? `You already do the hard part: you price the match before you look at the book, so there is very little
       left lying on the table. What you are missing is coverage, not method. Nobody watches sixty
       tournaments a year alone.`
    : small
      ? `That is money you are handing over for nothing, at the size you play now. The four steps below cost
         the same to run at ${money(stake)} a bet as they do at ten times that, which is the whole reason to
         put them in before the stakes go up rather than after. Structure first, size second. It does not
         work in the other order.`
      : `On the same ATP match, the first price you see and the best price available are routinely a few percent
         apart. Against how you pick now, about ${read.openPoints.toFixed(1)} of those points are still on the
         table. Across a season on your turnover, that is ${money(read.gap)} that never depended on picking
         more winners.`;

  // The two steps that carry the person's own figures. Kept identical in
  // wording to the page so the email cannot read as a different framework.
  const step3 = stake && vol
    ? `Your number and their price disagree by enough, or you pass. Most matches you pass. At your volume
       that is roughly ${Math.round(vol * WEEKS)} positions a season, out of well over two thousand
       ATP matches.`
    : `Your number and their price disagree by enough, or you pass. Most matches you pass.`;
  const step4 = stake
    ? `Every bet the same size, whatever your read says. At ${money(stake)} a bet, one to two percent of bank
       puts your working bank at ${money(stake * 50)} to ${money(stake * 100)}. Below that, one ordinary
       losing run takes you out before the edge has room to show up.`
    : `Every bet the same size, whatever your read says. The size never moves with how sure you feel.`;

  const step = (n: string, head: string, body: string) =>
    `<tr><td style="padding:20px 0 0">
       <div style="font:500 13px ui-monospace,monospace;color:#3D7BFF">${n}</div>
       <div style="margin-top:3px;font:600 16px system-ui;letter-spacing:-.015em;color:#fff">${head}</div>
       <div style="margin-top:4px;font:400 14px/1.6 system-ui;color:#9b9bab">${body}</div>
     </td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:#07070E;padding:28px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#101018;border:1px solid rgba(255,255,255,.12);border-radius:18px;overflow:hidden">
  <tr><td style="padding:26px 28px 0">
    <div style="font:800 18px system-ui;letter-spacing:-.02em;color:#f5f5f6">Wave<span style="color:#3D7BFF">Hub</span></div>
    <div style="margin-top:22px;font:600 11px system-ui;letter-spacing:2.6px;text-transform:uppercase;color:#3D7BFF">Your framework</div>
    <div style="margin-top:8px;font:700 25px system-ui;letter-spacing:-.03em;color:#fff">Built around your numbers</div>
  </td></tr>
  <tr><td style="padding:18px 28px 0;font:400 15px/1.65 system-ui;color:#9b9bab">
    ${hi}<br><br>here is the framework, sized to the four answers you gave.
  </td></tr>
  <tr><td style="padding:14px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row("Season turnover", money(read.turnover))}
      ${row("One percent of that", money(read.point))}
      ${row("How you price a match now", read.method)}
    </table>
  </td></tr>
  <tr><td style="padding:26px 28px 0">
    <div style="font:600 11px system-ui;letter-spacing:2.6px;text-transform:uppercase;color:#3D7BFF">${gapLabel}</div>
    <div style="margin-top:6px;font:600 44px ui-monospace,monospace;letter-spacing:-.045em;color:#3D7BFF">${money(read.gap)}</div>
  </td></tr>
  <tr><td style="padding:14px 28px 0;font:400 15px/1.65 system-ui;color:#9b9bab">${closing}</td></tr>
  <tr><td style="padding:30px 28px 0">
    <div style="font:600 11px system-ui;letter-spacing:2.6px;text-transform:uppercase;color:#3D7BFF">The framework</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step("01", "One tour, all season.",
             "ATP only, sixty-plus tournaments. Depth on one tour beats a thin read on four. You cannot know a market you visit twice a month.")}
      ${step("02", "Price the match before you open the book.",
             "Rating in, win probability out, win probability into fair odds. You end up with your own number for the match. Until you have it, you have nothing to compare the bookmaker to.")}
      ${step("03", "Bet the gap, not the winner.", step3)}
      ${step("04", "Flat stakes, sized to the bank.", step4)}
    </table>
  </td></tr>
  <tr><td style="padding:28px 28px 0">
    <a href="${SITE}/plans" style="display:block;background:#F5F5F5;color:#0A0A12;text-decoration:none;text-align:center;font:700 15px system-ui;letter-spacing:.4px;padding:16px 24px;border-radius:999px">See it run on this week&rsquo;s draw &rarr;</a>
  </td></tr>
  <tr><td style="padding:20px 28px 28px;font:400 12px/1.6 system-ui;color:#61616e">
    ATP only. WaveHub publishes sports analysis.
  </td></tr>
</table></td></tr></table></body></html>`;
}

// Add the lead to the Resend audience (Resend's own contact list — no separate
// newsletter provider needed). Re-adding an existing contact just 409s, which
// we treat as success. Skipped silently when no audience is configured.
async function toAudience(resend: Resend, email: string, name: string) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return false;
  try {
    const { error } = await resend.contacts.create({
      audienceId,
      email,
      firstName: name || undefined,
      unsubscribed: false,
    });
    // already on the list -> still "synced" as far as we care
    return !error || /exist/i.test(error.message ?? "");
  } catch {
    return false;
  }
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
  const isAssessment = body.kind === "assessment";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400, headers });
  }
  // only ever link a PDF hosted on our own site
  const pdfUrl = pdf.startsWith("/") ? SITE + pdf : `${SITE}/assets/previews/${tournament}.pdf`;

  // The figures come off the page so the email cannot contradict what the
  // person just looked at. Everything gets coerced to a finite number — a
  // hand-rolled POST must not be able to put "NaN" or a novel in an email.
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e9) : 0;
  };
  const raw = (body.read ?? {}) as Record<string, unknown>;
  const read: Read = {
    turnover: num(raw.turnover),
    point: num(raw.point),
    method: String(raw.method ?? "").slice(0, 40),
    openPoints: num(raw.openPoints),
    gap: num(raw.gap),
  };
  const answers = isAssessment && body.answers && typeof body.answers === "object"
    ? (body.answers as Record<string, unknown>)
    : null;
  const stake = num(answers?.stake);
  const vol = num(answers?.bets_per_week);

  let emailed = false;
  let synced = false;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const resend = new Resend(key);
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "WaveHub <onboarding@resend.dev>",
        to: email,
        subject: isAssessment ? "Your betting framework" : `Your free ${title} preview`,
        html: isAssessment
          ? assessmentEmail(name, read, stake, vol)
          : pdfEmail(name, title, pdfUrl),
      });
      emailed = true;
    } catch {
      // fall through — the page falls back to a direct download link
    }
    synced = await toAudience(resend, email, name);
  }

  try {
    const admin = createAdminClient();
    const row: Record<string, unknown> = {
      name: name || null,
      email,
      tournament,
      source: req.headers.get("referer")?.slice(0, 200) ?? null,
      followed_ig: followedIg,
      emailed_at: emailed ? new Date().toISOString() : null,
      list_synced: synced,
    };
    if (answers) row.answers = answers;

    // The answers column arrived with the /start funnel. If the migration has
    // not been run yet the insert fails on that one column and we would lose
    // the lead altogether — so drop it and keep the rest.
    const { error } = await admin.from("preview_leads").insert(row);
    if (error && answers) {
      delete row.answers;
      await admin.from("preview_leads").insert(row);
    }
  } catch {
    // If the DB is down we still delivered the PDF — don't fail the user.
  }

  return NextResponse.json({ ok: true, emailed }, { headers });
}
