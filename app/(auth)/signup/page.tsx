import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign up" };

const PLAN_LABEL: Record<string, string> = {
  core: "Core",
  private: "Private",
};

// searchParams is async in Next.js 16.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planLabel = plan ? PLAN_LABEL[plan] : undefined;

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-text">
        {planLabel ? `Join — ${planLabel}` : "Create your account"}
      </h1>
      <p className="mb-5 text-sm text-muted">
        {planLabel
          ? "Create your account and get started right away. No payment in the app."
          : "Access starts with a free account."}
      </p>
      <AuthForm mode="signup" plan={plan} />
    </>
  );
}
