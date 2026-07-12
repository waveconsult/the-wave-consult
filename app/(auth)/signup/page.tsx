import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create account" };

const PLAN_LABEL: Record<string, string> = {
  core: "Core",
  private: "Private",
};

// searchParams is async in Next.js 16.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; welcome?: string }>;
}) {
  const { plan, welcome } = await searchParams;
  const planLabel = plan ? PLAN_LABEL[plan] : undefined;

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
        You&apos;re in.
      </h1>
      <p className="mx-auto mt-5 max-w-[21rem] text-center text-[14.5px] leading-relaxed text-[#94928a]">
        Accepted into the club. Create your account and log in across every device.
      </p>
      <div className="mt-10">
        <AuthForm mode="signup" plan={plan} />
      </div>
    </>
  );
}
