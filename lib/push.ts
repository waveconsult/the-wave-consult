// SERVER ONLY. Sends Web Push notifications via VAPID. Never import in a client
// component. Configure with NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and
// (optional) VAPID_SUBJECT env vars.
import webpush from "web-push";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:markus.prenner@gmx.at";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(PUBLIC && PRIVATE);
}

export type StoredSub = { endpoint: string; p256dh: string; auth: string };

// Returns { ok } on success; { gone: true } when the subscription is expired
// (404/410) so the caller can delete it.
export async function sendPush(
  sub: StoredSub,
  payload: { title: string; body: string; url?: string },
): Promise<{ ok: boolean; gone: boolean }> {
  if (!ensureConfigured()) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, gone: false };
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    return { ok: false, gone: code === 404 || code === 410 };
  }
}
