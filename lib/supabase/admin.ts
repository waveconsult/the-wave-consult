import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER ONLY. Uses the service-role key — bypasses RLS. Use exclusively in
// route handlers / server actions for privileged work (e.g. Storage uploads).
// Never import this into a client component. (Briefing §8 security boundary.)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not set. " +
        "The operator must fill these in .env.local (server-side only).",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
