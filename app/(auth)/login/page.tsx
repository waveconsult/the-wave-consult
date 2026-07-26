import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Members access" };

// searchParams is a Promise in this Next version and must be awaited.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Set by the account-deletion flow, which signs the member out and lands them
  // here. Without a word of confirmation, "Welcome back." is a jarring thing to
  // meet immediately after erasing your account.
  const deleted = (await searchParams).deleted === "1";

  return (
    <>
      <p className="eyebrow text-center">Members access</p>
      <h1 className="mt-5 text-center font-display text-[clamp(34px,9vw,52px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
        {deleted ? "Account deleted." : "Welcome back."}
      </h1>

      {deleted && (
        <p className="mx-auto mt-5 max-w-[21rem] text-center text-[14.5px] leading-relaxed text-[#94928a]">
          Your account and your data have been removed, and your membership has
          been cancelled. Thanks for having been part of WaveHub.
        </p>
      )}

      <div className="mt-10">
        <AuthForm mode="login" />
      </div>
    </>
  );
}
