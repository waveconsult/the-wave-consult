import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Serves a stored attachment (bet slip, insight image, resource PDF) by
// redirecting to a freshly signed Supabase URL.
//
// Why this exists: signed URLs were previously baked into the rendered page and
// expired an hour later. Any page a member left open, came back to, or that was
// served from a client-side cache then showed a broken image — which is exactly
// what a newly posted bet slip looked like. The URL handed to the browser now
// never goes stale; the signature is minted per request instead.
//
// It is NOT a public file endpoint: the caller must be signed in, and only
// paths inside the attachments bucket can be reached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "bet-shots";

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path." }, { status: 400 });
  }

  // Refuse anything that tries to climb out of the bucket or address another
  // host. Supabase would reject most of these anyway; not relying on that.
  if (path.includes("..") || path.startsWith("/") || /^[a-z]+:/i.test(path)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Signed on the caller's session, so storage RLS still applies.
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    // Say why. A silent 404 here is what made the original problem so hard to
    // pin down — the browser showed a broken image and nothing else.
    console.error("[attachment] signing failed:", path, error);
    return NextResponse.json(
      { error: "Could not read attachment.", detail: error?.message ?? null },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl, { status: 307 });
}
