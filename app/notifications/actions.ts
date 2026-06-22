"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushConfigured } from "@/lib/push";

export type PushResult = { ok?: string; error?: string } | null;

type BrowserSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Store the current user's browser push subscription.
export async function subscribeToPush(sub: BrowserSub): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Invalid subscription." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint", ignoreDuplicates: true },
  );
  if (error) return { error: error.message };
  return { ok: "Notifications enabled." };
}

export async function unsubscribeFromPush(endpoint: string): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: "Notifications turned off." };
}

// Admin: send a custom notification to everyone subscribed.
export async function sendPushToAll(
  _prev: PushResult,
  formData: FormData,
): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: "Admins only." };

  if (!pushConfigured()) {
    return {
      error:
        "Push is not configured yet. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT, then redeploy.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || "/bets";
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Message is required." };

  // Read all subscriptions with the service-role client (bypasses RLS).
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  const list = (subs as { endpoint: string; p256dh: string; auth: string }[]) ?? [];
  if (list.length === 0) return { ok: "No one has enabled notifications yet." };

  let sent = 0;
  const dead: string[] = [];
  await Promise.allSettled(
    list.map(async (s) => {
      const r = await sendPush(s, { title, body, url });
      if (r.ok) sent += 1;
      else if (r.gone) dead.push(s.endpoint);
    }),
  );

  // Clean up expired subscriptions.
  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return { ok: `Sent to ${sent} of ${list.length} device(s).` };
}
