"use server";

import { createClient } from "@/lib/supabase/server";

export type ApplyState = { ok: true } | { error: string } | null;

// Public application intake (982x-style apply-first). Inserts into the
// applications table; RLS allows anyone to submit, only admins read.
export async function submitApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const tierRaw = String(formData.get("requested_tier") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  const requested_tier =
    tierRaw === "core" || tierRaw === "private" ? tierRaw : null;

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({
    email,
    requested_tier,
    note: note.length ? note : null,
  });

  if (error) return { error: "Something went wrong. Please try again." };
  return { ok: true };
}
