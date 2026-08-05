// Thin Telegram Bot API wrapper. Server-only — the token must never reach the
// client. Every call is best-effort: a Telegram outage must never break a
// Stripe webhook or lose a payment, so callers get `false` instead of a throw.

const API = "https://api.telegram.org/bot";

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

/** The private group / channel members are let into. Negative id for supergroups. */
export function groupId(): string | null {
  return process.env.TELEGRAM_GROUP_ID ?? null;
}

export async function tg<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  const t = token();
  if (!t) return null;
  try {
    const res = await fetch(`${API}${t}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: T };
    return json.ok ? (json.result ?? null) : null;
  } catch {
    return null;
  }
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  const r = await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
  return r !== null;
}

/**
 * A one-shot invite link. The group is set to approve join requests, so this
 * still lands in the request queue — the bot approves it only if the member is
 * paid. A forwarded link therefore gets nobody in.
 */
export async function createInvite(expiresInHours = 48): Promise<string | null> {
  const chat = groupId();
  if (!chat) return null;
  const r = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: chat,
    name: "WaveHub member",
    expire_date: Math.floor(Date.now() / 1000) + expiresInHours * 3600,
    member_limit: 1,
  });
  return r?.invite_link ?? null;
}

export async function approveJoin(userId: number): Promise<boolean> {
  const chat = groupId();
  if (!chat) return false;
  return (await tg("approveChatJoinRequest", { chat_id: chat, user_id: userId })) !== null;
}

export async function declineJoin(userId: number): Promise<boolean> {
  const chat = groupId();
  if (!chat) return false;
  return (await tg("declineChatJoinRequest", { chat_id: chat, user_id: userId })) !== null;
}

/**
 * Remove someone whose subscription lapsed. Ban then immediately unban —
 * a plain ban would block them from ever rejoining after they resubscribe.
 */
export async function removeMember(userId: number): Promise<boolean> {
  const chat = groupId();
  if (!chat) return false;
  const banned = await tg("banChatMember", {
    chat_id: chat,
    user_id: userId,
    revoke_messages: false,
  });
  if (banned === null) return false;
  await tg("unbanChatMember", { chat_id: chat, user_id: userId, only_if_banned: true });
  return true;
}

export async function answerCallback(id: string, text?: string): Promise<void> {
  await tg("answerCallbackQuery", { callback_query_id: id, text });
}
