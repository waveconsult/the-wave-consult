"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type QuizAnswers = Record<string, string>;

// High intent → route straight to membership. Everyone else → free guide.
function isHighIntent(a: QuizAnswers): boolean {
  return a.q4 === "invest" || a.q3 === "2kplus";
}

// Upsert progress after each answer so we know the exact drop-off step even if
// the visitor never finishes. Best-effort: never blocks the UI.
export async function saveProgress(input: {
  sessionId: string;
  step: number;
  answers: QuizAnswers;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("quiz_sessions").upsert(
      {
        id: input.sessionId,
        answers: input.answers,
        dropped_at_step: input.step,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // Supabase not configured / transient error — don't break the funnel.
  }
}

// Final step: store the email, compute the branch, mark complete.
export async function finishQuiz(input: {
  sessionId: string;
  email: string;
  answers: QuizAnswers;
}): Promise<{ result: "membership" | "guide" }> {
  const result = isHighIntent(input.answers) ? "membership" : "guide";
  try {
    const admin = createAdminClient();
    await admin.from("quiz_sessions").upsert(
      {
        id: input.sessionId,
        email: input.email.trim().toLowerCase(),
        answers: input.answers,
        dropped_at_step: 5,
        result,
        completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    // TODO (phase 2): send the value-read email via Resend.
  } catch {
    // Lead is lost only if the DB is down; still show the result screen.
  }
  return { result };
}
