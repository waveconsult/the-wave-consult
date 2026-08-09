import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, lineItemsForPlan } from "@/lib/stripe";
import { PLANS, isPlan, planDetails } from "@/lib/plans";
import {
  approveJoin,
  declineJoin,
  sendMessage,
  answerCallback,
  createInvite,
  freeGroupId,
} from "@/lib/telegram";
import { grantsAccess } from "@/lib/subscription";
import { withdrawalConsent } from "@/lib/consent";
import { issueCode, verifyCode, hasPendingCode } from "@/lib/email-codes";

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
    // Shared with the website — see lib/subscription for why these must agree.
    return grantsAccess(data.status, data.current_period_end);
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

// ── "I already paid" ──────────────────────────────────────────────────────
//
// Someone who loses their link — tab closed, mail in spam, address typo'd at
// checkout — used to arrive here, tap /start, and be shown the price list
// again. That is the worst moment in the whole product: they have paid and the
// bot is selling to them.
//
// So they can name the address they paid with instead. It cannot be taken at
// face value, though: an email address is not a secret, and anyone who knows a
// member's would otherwise be able to move that membership onto their own
// Telegram account. A code goes to the mailbox and has to come back.
//
// No conversation state is stored anywhere. A message shaped like an email is
// read as a claim; six digits, while a code is outstanding, are read as the
// answer. That survives a restart, a slow reply, and someone wandering off
// mid-flow.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Ask for the payment email rather than pitching to someone who already paid. */
async function offerRecovery(chatId: number | string) {
  await sendMessage(
    chatId,
    `<b>Already paid?</b>\n\n` +
      `Send me the email address you paid with and I'll send a 6-digit code to it. ` +
      `Type the code back here and you're in.\n\n` +
      `Not a member yet? Tap /start again and pick a plan.`,
  );
}

/** Step one: they named an address. Look for a purchase under it. */
async function handleClaimedEmail(user: TgUser, email: string) {
  const address = email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: purchase } = await admin
    .from("telegram_link_codes")
    .select("stripe_subscription_id, current_period_end, used_by")
    .eq("email", address)
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Deliberately the same reply whether or not a purchase exists. Answering
  // "no membership on that address" would turn the bot into a tool for testing
  // which addresses are customers.
  if (!purchase?.stripe_subscription_id) {
    await sendMessage(
      user.id,
      `If a membership exists for <b>${escapeHtml(address)}</b>, a 6-digit code is on its way. ` +
        `Type it here.\n\nNothing arrived after a few minutes? Check spam, or reply here and we'll sort it out.`,
    );
    return;
  }

  const sent = await issueCode(address, "telegram_link", user.id);
  if (!sent.ok) {
    await sendMessage(
      user.id,
      sent.reason === "rate_limited"
        ? "That's a few codes in a short time. Wait an hour and try again, or reply here and we'll sort it out."
        : "I couldn't send the code just now. Reply here and we'll sort it out.",
    );
    return;
  }

  await sendMessage(
    user.id,
    `Code sent to <b>${escapeHtml(address)}</b>. Type the 6 digits here — it expires in 15 minutes.`,
  );
}

/** Step two: they typed the code. Verify possession, then link. */
async function handleTypedCode(user: TgUser, code: string) {
  const result = await verifyCode(code, "telegram_link", { telegramId: user.id });

  if (!result.ok) {
    const say: Record<typeof result.reason, string> = {
      no_request: "I'm not waiting on a code from you. Send the email address you paid with first.",
      expired: "That code has expired. Send your email address again and I'll issue a new one.",
      too_many_attempts: "Too many wrong tries. Send your email address again for a fresh code.",
      wrong_code: "That code doesn't match. Check the email and try again.",
    };
    await sendMessage(user.id, say[result.reason]);
    return;
  }

  const admin = createAdminClient();
  const { data: purchase } = await admin
    .from("telegram_link_codes")
    .select("stripe_customer_id, stripe_subscription_id, plan, current_period_end, email")
    .eq("email", result.email)
    .not("stripe_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!purchase?.stripe_subscription_id) {
    await sendMessage(
      user.id,
      "That address checks out, but I can't find a membership on it. Reply here and we'll sort it out.",
    );
    return;
  }

  if (!grantsAccess("active", purchase.current_period_end)) {
    await sendMessage(
      user.id,
      "That membership has run out. Tap /start to pick it back up.",
    );
    return;
  }

  // One Telegram account per subscription. If the membership already sits on a
  // different account, say so plainly rather than silently moving it — the
  // usual cause is a shared link, and the usual fix is a human.
  const { data: existing } = await admin
    .from("telegram_members")
    .select("telegram_id")
    .eq("stripe_subscription_id", purchase.stripe_subscription_id)
    .maybeSingle();

  if (existing?.telegram_id && Number(existing.telegram_id) !== user.id) {
    await sendMessage(
      user.id,
      "That membership is already connected to a different Telegram account. " +
        "Reply here and we'll move it across.",
    );
    return;
  }

  await admin.from("telegram_members").upsert(
    {
      telegram_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      email: purchase.email,
      stripe_customer_id: purchase.stripe_customer_id,
      stripe_subscription_id: purchase.stripe_subscription_id,
      plan: purchase.plan ?? undefined,
      status: "active",
      current_period_end: purchase.current_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );

  const invite = await createInvite();
  await sendMessage(
    user.id,
    invite
      ? `Verified — your membership is on this account now. 🎾\n\nTap to join the group:\n${invite}`
      : "Verified — your membership is on this account now. I couldn't generate an invite link just yet; reply here and we'll sort it out.",
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        text: `${p.name} — €${p.yearlyEur} / year`,
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
      line_items: lineItemsForPlan(plan),
      // this is how the Stripe webhook learns which Telegram account paid
      client_reference_id: `tg_${telegramId}`,
      metadata: { telegram_id: String(telegramId), plan, source: "telegram_bot" },
      subscription_data: { metadata: { telegram_id: String(telegramId), plan } },
      allow_promotion_codes: true,
      ...withdrawalConsent(),
      success_url: `${SITE}/telegram/welcome?s={CHECKOUT_SESSION_ID}`,
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

      const dm = jr.user_chat_id ?? from.id;

      if (await isActive(from.id)) {
        await approveJoin(from.id);
        const admin = createAdminClient();
        await admin
          .from("telegram_members")
          .update({ in_group: true, joined_at: new Date().toISOString(), removed_at: null })
          .eq("telegram_id", from.id);
        await sendMessage(dm, "You're in. Welcome to WaveHub. 🎾");
      } else {
        // Pitch first, decline second. Processing the request shuts the window
        // in which Telegram lets us message someone who never started the bot,
        // and someone knocking on the paid door is exactly who should hear it.
        await sendMessage(
          dm,
          "That group is for members only.\n\nTap /start to see the plans — access is instant once you're set up.\n\n" +
            "Already paid? Send me the email address you used and I'll get you in.",
        );
        await declineJoin(from.id);
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
          `<b>${d.name}</b>\n€${d.yearlyEur} a year. Cancel anytime.\n\n` +
            d.features.map((f) => `• ${f}`).join("\n") +
            `\n\nComplete the payment and I'll send your invite link straight back here.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: `Pay €${d.yearlyEur} →`, url }]],
            },
          },
        );
      }
      return NextResponse.json({ ok: true });
    }

    const msg = update.message ?? update.edited_message;

    // ── "/id" inside a group ─────────────────────────────────────────────
    // Setup helper, and the only reason the bot listens in groups at all:
    // this is how you read TELEGRAM_GROUP_ID / TELEGRAM_FREE_GROUP_ID off a
    // chat without inviting some third-party bot into it.
    if (msg?.chat && msg.chat.type !== "private") {
      const text: string = (msg.text ?? "").trim();
      if (text === "/id" || text.startsWith("/id@")) {
        await sendMessage(
          msg.chat.id,
          `<b>${msg.chat.title ?? "This chat"}</b>\nChat ID: <code>${msg.chat.id}</code>`,
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── plain messages ───────────────────────────────────────────────────
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
              `Get full access to selected bets, advanced models, exclusive insights, ` +
              `premium Telegram data and 20+ framework videos showing the exact system ` +
              `used to scale.\n\n` +
              `Pick a membership below:`,
            { reply_markup: planKeyboard() },
          );
          // A plan list is the wrong answer for someone who has already paid,
          // so the way back in is offered in the same breath.
          await offerRecovery(from.id);
        }
      } else if (text === "/recover" || text === "/help") {
        await offerRecovery(from.id);
      } else if (EMAIL_RE.test(text)) {
        await handleClaimedEmail(from, text);
      } else if (/^\d[\d\s-]{4,}$/.test(text) && (await hasPendingCode(from.id))) {
        await handleTypedCode(from, text);
      } else if (await isActive(from.id)) {
        await sendMessage(from.id, "Tap /start for your group link.");
      } else {
        await sendMessage(
          from.id,
          "Tap /start to see the membership options — or send the email address you paid with if you are already a member.",
        );
      }
    }
  } catch {
    // swallow — never let Telegram retry-storm us
  }

  return NextResponse.json({ ok: true });
}
