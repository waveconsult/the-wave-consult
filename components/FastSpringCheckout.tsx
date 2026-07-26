"use client";

import Script from "next/script";
import { useCallback, useState } from "react";
import type { Plan } from "@/lib/types";

// FastSpring popup checkout. Keeps the member on-site (brand), and crucially
// attaches `tags: { user_id, plan }` to the session so the webhook can grant
// membership to the right person and record which duration they bought. Access
// is NOT granted here — only by the webhook once payment succeeds (mirrors the
// Stripe server-action flow).

// Popup storefront, e.g. "wavehub.onfastspring.com/popup-wavehub".
const STOREFRONT = process.env.NEXT_PUBLIC_FASTSPRING_STOREFRONT ?? "";

type FsBuilder = {
  builder: {
    push: (payload: unknown) => void;
    recognize?: (contact: { email?: string }) => void;
  };
};

declare global {
  interface Window {
    fastspring?: FsBuilder;
    // Called by the SBL when the popup closes; wired via data-popup-closed.
    __fsPopupClosed?: (data: { id?: string; reference?: string } | null) => void;
  }
}

export function FastSpringCheckout({
  plan,
  product,
  userId,
  email,
  label,
  className,
}: {
  plan: Plan;
  product: string;
  userId: string;
  email: string | null;
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  // Redirect to the welcome screen once the popup reports a completed order.
  // Defined on window so the SBL's data-popup-closed hook can reach it.
  if (typeof window !== "undefined") {
    window.__fsPopupClosed = (data) => {
      if (data && (data.id || data.reference)) {
        window.location.href = "/bets?welcome=1";
      }
      setBusy(false);
    };
  }

  const onClick = useCallback(() => {
    const fs = typeof window !== "undefined" ? window.fastspring : undefined;
    if (!fs?.builder) return; // script not ready yet
    setBusy(true);
    if (email) fs.builder.recognize?.({ email });
    fs.builder.push({
      reset: true,
      tags: { user_id: userId, plan },
      products: [{ path: product, quantity: 1 }],
      checkout: true,
    });
  }, [email, product, plan, userId]);

  return (
    <>
      <Script
        id="fsc-api"
        src="https://sbl.onfastspring.com/sbl/1.0.7/fastspring-builder.min.js"
        strategy="afterInteractive"
        data-storefront={STOREFRONT}
        data-popup-closed="__fsPopupClosed"
      />
      <button type="button" onClick={onClick} disabled={busy} className={className}>
        {busy ? "Opening checkout…" : label}
      </button>
    </>
  );
}
