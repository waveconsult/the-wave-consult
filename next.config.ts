import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The member area was a concept and never had a paying customer, so every
  // page of it now points at the public opt-in page instead.
  //
  // Deliberately NOT redirected: /api/* carries the lead endpoint that
  // wavehubtennis.com/start posts into, plus the Stripe and Telegram webhooks;
  // /telegram/* holds a route handler the bot deep-links to. Redirect either
  // and the sign-up form stops working.
  //
  // 307, not 308: this is meant to be reversible, and a permanent redirect
  // gets cached by browsers for a long time.
  async redirects() {
    const START = "https://www.wavehubtennis.com/start";
    const pages = [
      "/",
      "/login",
      "/signup",
      "/plans",
      "/bets",
      "/profile",
      "/tools",
      "/tournaments",
      "/quiz",
      "/notifications",
    ];
    return [
      ...pages.map((source) => ({ source, destination: START, permanent: false })),
      { source: "/admin/:path*", destination: START, permanent: false },
      { source: "/auth/:path*", destination: START, permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which rejects image/PDF attachments. Raise it.
      // Note: Vercel serverless functions cap the request body at ~4.5MB, so
      // the per-file caps in app/admin/actions.ts stay at 4MB. Larger files
      // would need a direct browser-to-Supabase upload.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
