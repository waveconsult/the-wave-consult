import type { Metadata } from "next";
import { QuizFlow } from "./QuizFlow";

export const metadata: Metadata = {
  title: "Find your edge · WaveHub",
  description: "A 60-second quiz to see if WaveHub is your edge.",
};

// Public, pre-login lead funnel. (/quiz is allow-listed in lib/supabase/proxy.ts.)
export default function QuizPage() {
  return (
    <div className="public-shell flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <QuizFlow />
    </div>
  );
}
