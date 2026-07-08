import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = { title: "Apply" };

// Public application page (982x-style). searchParams is async in Next.js 16.
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect("/bets");
  const { plan } = await searchParams;

  return (
    <div className="public-shell flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-6">
        <Link
          href="/"
          className="font-display text-[15px] font-bold uppercase tracking-wide"
        >
          Wave<span className="text-[#caa76b]">hub</span>
        </Link>
        <Link
          href="/login"
          className="-my-2.5 border-b border-white/20 py-2.5 text-[13px] font-semibold transition hover:border-white"
        >
          Members access
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
        <ApplyForm plan={plan} />
      </main>

      <footer className="border-t border-white/[0.07] px-6 py-5 text-center">
        <p className="mono text-[10px] uppercase tracking-[2px] text-[#94928a]">
          Analysis, not a bookmaker · ATP only
        </p>
      </footer>
    </div>
  );
}
