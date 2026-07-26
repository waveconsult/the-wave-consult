import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { isPlan, planDetails } from "@/lib/plans";

export const metadata: Metadata = { title: "Create account" };

// searchParams is a Promise in this Next version and must be awaited.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; welcome?: string }>;
}) {
  const { plan, welcome } = await searchParams;
  // Read the label from lib/plans.ts rather than a local map — a local copy is
  // how this page ended up still naming the retired Core/Private tiers.
  const planLabel = isPlan(plan) ? planDetails(plan).name : undefined;

  return (
    <>
      {welcome ? (
        <p className="mb-6 rounded-xl border border-[#cdd2d8]/40 bg-[#cdd2d8]/10 px-4 py-3 text-center text-[13px] font-medium text-[#eef1f4]">
          ✓ Payment received — create your account to get in.
        </p>
      ) : null}

      <p className="eyebrow text-center">
        {planLabel ? `Membership · ${planLabel}` : "Create account"}
      </p>
      <h1 className="mt-5 text-center font-display text-[clamp(34px,9vw,52px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
        {welcome ? "You’re in." : "Join WaveHub."}
      </h1>
      <p className="mx-auto mt-5 max-w-[21rem] text-center text-[14.5px] leading-relaxed text-[#94928a]">
        {welcome
          ? "Create your account and log in across every device."
          : "Create your account in seconds, then choose a membership whenever you’re ready."}
      </p>

      <div className="mt-10">
        <AuthForm mode="signup" plan={plan} />
      </div>
    </>
  );
}
