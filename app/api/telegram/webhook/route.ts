import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceForPlan } from "@/lib/stripe";
import { PLANS, isPlan, planDetails } from "@/lib/plans";
import { approveJoin, declineJoin, sendMessage, answerCallback } from "@/lib/telegram";

// The bot. Telegram POSTs every update here.
//
// It does exactly two jobs, per the brief: sell, and let paid people in.
//   /start            -> plan buttons
//   plan button       -> a Stripe Checkout link carrying the telegram id
//   chat_join_request -> approve only if that telegram id has an active sub
//
// Telegram retries on non-200, which would spam the user, so this route
// answers 200 even when a handler fails.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";

type TgUser = { id: number; username?: string; first_name?: string };

async function upsertUser(u: TgUser) {
  const admin = createAdminClient();
  await admin.from("telegram_members").upsert(
    {
      telegram_id: u.id,
      username: u.username ?? null,
      first_name: u.first_name ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );
}

async function isActive(telegramId: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("telegram_members")
      .select("status, current_period_end")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (!data) return false;
    if (data.status !== "active" && data.status !== "past_due") return false;
    if (data.current_period_end && new Date(data.current_period_end) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

function planKeyboard() {
  return {
    inline_keyboard: PLANS.map((p) => [
      {
        text: `${p.name} — €${p.introEur}, then €${p.renewalEur}`,
        callback_data: `buy:${p.plan}`,
      },
    ]),
  };
}

async function checkoutUrl(plan: string, telegramId: number): Promise<string | null> {
  if (!isPlan(plan)) return null;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceForPlan(plan), quantity: 1 }],
      // this is how the Stripe webhook learns which Telegram account paid
      client_reference_id: `tg_${telegramId}`,
      metadata: { telegram_id: String(telegramId), plan, source: "telegram_bot" },
      subscription_data: { metadata: { telegram_id: String(telegramId), plan } },
      allow_promotion_codes: true,
      success_url: `${SITE}/telegram/thanks`,
      cancel_url: `${SITE}/telegram/cancelled`,
    });
    return session.url;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // Telegram signs updates with the secret set at setWebhook time.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: Record<string, any>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    // ── someone asks to join the group ───────────────────────────────────
    if (update.chat_join_request) {
      const from = update.chat_join_request.from as TgUser;
      await upsertUser(from);
      if (await isActive(from.id)) {
        await approveJoin(from.id);
        const admin = createAdminClient();
        await admin
          .from("telegram_members")
          .update({ in_group: true, joined_at: new Date().toISOString(), removed_at: null })
          .eq("telegram_id", from.id);
        await sendMessage(from.id, "You're in. Welcome to WaveHub. 🎾");
      } else {
        await declineJoin(from.id);
        await sendMessage(
          from.id,
          "That group is for members only.\n\nTap /start to see the plans — access is instant once you're set up.",
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── plan button pressed ──────────────────────────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const from = cq.from as TgUser;
      const data: string = cq.data ?? "";
      await answerCallback(cq.id);

      if (data.startsWith("buy:")) {
        const plan = data.slice(4);
        await upsertUser(from);
        const url = await checkoutUrl(plan, from.id);
        if (!url) {
          await sendMessage(from.id, "Checkout is not available right now. Please try again shortly.");
          return NextResponse.json({ ok: true });
        }
        const d = planDetails(plan as never);
        await sendMessage(
          from.id,
          `<b>${d.name}</b>\n€${d.introEur} now, then €${d.renewalEur} every ${d.label}. Cancel anytime.\n\n` +
            `Complete the payment and I'll send your invite link straight back here.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: `Pay €${d.introEur} →`, url }]],
            },
          },
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── plain messages ───────────────────────────────────────────────────
    const msg = update.message ?? update.edited_message;
    if (msg?.from && msg.chat?.type === "private") {
      const from = msg.from as TgUser;
      const text: string = (msg.text ?? "").trim();
      await upsertUser(from);

      if (text.startsWith("/start") || text.startsWith("/join") || text.startsWith("/buy")) {
        if (await isActive(from.id)) {
          await sendMessage(
            from.id,
            "Your membership is active. If you're not in the group yet, use the invite link I sent you — or reply here and I'll issue a new one.",
          );
        } else {
          await sendMessage(
            from.id,
            `<b>WaveHub — ATP value analysis</b>\n\n` +
              `Few calls, early prices, and an honest no-bet when there's nothing worth taking.\n\n` +
              `Pick a membership below:`,
            { reply_markup: planKeyboard() },
          );
        }
      } else {
        await sendMessage(from.id, "Tap /start to see the membership options.");
      }
    }
  } catch {
    // swallow — never let Telegram retry-storm us
  }

  return NextResponse.json({ ok: true });
}
