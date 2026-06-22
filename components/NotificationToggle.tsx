"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/app/notifications/actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotificationToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(VAPID_PUBLIC);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permission was denied in the browser.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC as string),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await subscribeToPush(json);
      if (res?.error) setMsg(res.error);
      else {
        setEnabled(true);
        setMsg("You're in. We'll ping you on new picks.");
      }
    } catch {
      setMsg("Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg("Notifications turned off.");
    } catch {
      setMsg("Could not turn notifications off.");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <div className="card p-4 text-[12px] leading-relaxed text-muted">
        Push notifications aren&apos;t available in this browser. On iPhone,
        install WaveHub to your home screen first (Share → Add to Home Screen),
        then open it from there.
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text">Push notifications</p>
        <p className="text-[12px] leading-relaxed text-muted">
          {enabled
            ? "On — you'll get new picks and reads."
            : "Get a ping the moment a new pick drops."}
        </p>
        {msg ? <p className="mt-1 text-[11px] text-faint">{msg}</p> : null}
      </div>
      <button
        type="button"
        onClick={enabled ? disable : enable}
        disabled={busy || supported === null}
        className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition disabled:opacity-60 ${
          enabled
            ? "border border-border-strong text-muted hover:text-text"
            : "bg-gradient-to-br from-primary-deep to-primary text-white"
        }`}
      >
        {busy ? "…" : enabled ? "Turn off" : "Enable"}
      </button>
    </div>
  );
}
