import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, priceForPlan } from "@/lib/stripe";
import { PLANS, isPlan, planDetails } from "@/lib/plans";
import {
  approveJoin,
  declineJoin,
  sendMessage,
  answerCallback,
  createInvite,
  freeGroupId,
} from "@/lib/telegram";

// The bot. Telegram POSTs every update here.
//
// It sells, and it guards two doors:
//   /start             -> plan buttons
//   plan button        -> a Stripe Checkout link carrying the telegram id
//   join the paid group -> approve only if that telegram id has an active sub
//   join the free group -> approve once they confirm the Instagram follow
//
// Telegram retries on non-200, which would spam the user, so this route
// answers 200 even when a handler fails.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wavehubtennis.com";
const IG = (process.env.INSTAGRAM_HANDLE ?? "wavehubtennis").replace(/^@/, "");

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

/**
 * Redeem a code minted by /telegram/thanks after a purchase on the website.
 * This is what ties an anonymous card payment to a Telegram account.
 * Returns true if the code was valid and the caller is now a member.
 */
async function redeemLinkCode(code: string, user: TgUser): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("telegram_link_codes")
    .select("*")
    .eq("code", code)
    .is("used_at", null)
    .maybeSingle();
  if (!row) return false;

  const now = new Date().toISOString();
  await admin.from("telegram_members").upsert(
    {
      telegram_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      email: row.email,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      plan: row.plan ?? undefined,
      status: "active",
      current_period_end: row.current_period_end,
      updated_at: now,
    },
    { onConflict: "telegram_id" },
  );
  // Burn the code so a shared link can't onboard a second account.
  await admin
    .from("telegram_link_codes")
    .update({ used_at: now, used_by: user.id })
    .eq("code", code);
  return true;
}

/** Mark someone as inside the free group and say hello. */
async function letIntoFreeGroup(user: TgUser, dmChatId: number | string) {
  const now = new Date().toISOString();
  await approveJoin(user.id, freeGroupId());
  await createAdminClient()
    .from("telegram_members")
    .update({ in_free_group: true, ig_follow_confirmed_at: now, updated_at: now })
    .eq("telegram_id", user.id);
  await sendMessage(
    dmChatId,
    "Thanks — you're in the free group. 🎾\n\nWhen you want the full card, tap /start.",
  );
}

/**
 * The free group's door. We can't verify an Instagram follow — Instagram has no
 * API for it — so this is a confirmation, and we record when they gave it.
 *
 * The join request is left pending, never declined: Telegram only lets a bot
 * message a stranger while their request is open, so declining first would mean
 * the prompt never arrives.
 */
async function handleFreeJoin(user: TgUser, dmChatId: number | string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("telegram_members")
    .select("ig_follow_confirmed_at")
    .eq("telegram_id", user.id)
    .maybeSingle();

  // Already confirmed once — don't make them do it again after a rejoin.
  if (data?.ig_follow_confirmed_at) {
    await letIntoFreeGroup(user, dmChatId);
    return;
  }

  await sendMessage(
    dmChatId,
    `<b>One thing before you're in.</b>\n\n` +
      `The free group runs off the Instagram — that's where the previews and the reasoning go out first.\n\n` +
      `Follow <b>@${IG}</b>, then tap the second button and I'll let you straight in.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `Follow @${IG} →`, url: `https://instagram.com/${IG}` }],
          [{ text: "I followed — let me in", callback_data: "ig:ok" }],
        ],
      },
    },
  );
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
    // ── someone asks to join a group ─────────────────────────────────────
    if (update.chat_join_request) {
      const jr = update.chat_join_request;
      const from = jr.from as TgUser;
      const chatId = String(jr.chat?.id ?? "");
      await upsertUser(from);

      // The free group: ask for the Instagram follow first. The request stays
      // pending until they confirm — declining it would close the window in
      // which we're allowed to message someone who never started the bot.
      const free = freeGroupId();
      if (free && chatId === String(free)) {
        await handleFreeJoin(from, jr.user_chat_id ?? from.id);
        return NextResponse.json({ ok: true });
      }

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

      // "I followed" on the free group's gate.
      if (data === "ig:ok") {
        await upsertUser(from);
        await letIntoFreeGroup(from, from.id);
        return NextResponse.json({ ok: true });
      }

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
        // "/start <code>" — arrived from the website's thank-you page.
        const payload = text.split(/\s+/)[1];
        if (payload) await redeemLinkCode(payload, from);

        if (await isActive(from.id)) {
          // Always hand out a fresh link rather than pointing at an old one:
          // the join request is checked against the database anyway, so an
          // extra link costs nothing and saves a support message.
          const invite = await createInvite();
          await sendMessage(
            from.id,
            invite
              ? `Your membership is active. 🎾\n\nTap to join the group:\n${invite}`
              : "Your membership is active, but I couldn't generate an invite link just now. Reply here and we'll sort it out.",
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
