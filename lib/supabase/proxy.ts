import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and guards the
// authed surfaces. Called from the root `proxy.ts` (Next.js 16's renamed
// Middleware). Keep logic light — this is an optimistic check, not the only
// authorization layer (RLS + per-page checks remain the source of truth).

// /telegram is public because that is where Stripe returns a buyer, and a buyer
// is by definition not logged in yet — an account is never required to purchase.
// Without it the proxy bounced them to /login the moment they finished paying,
// so the screen carrying their group invite was unreachable for exactly the
// people it exists for, and only the webhook's email got them in. /telegram
// pages carry no member data: they read a Stripe session id the buyer is
// already holding, and everything they can do with it is scoped to that
// purchase.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/quiz", "/api", "/telegram"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env vars (e.g. before the operator wires Supabase) just pass through.
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated user trying to reach an authed surface → send to login.
  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated user on an auth page → send to the feed.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/bets";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
