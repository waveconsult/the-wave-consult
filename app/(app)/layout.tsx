import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { BottomNav } from "@/components/BottomNav";

// Authed shell with top brand bar and bottom tab bar (briefing §2, §5).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();

  return (
    <>
      {/* ambient aurora — adds depth behind the whole app */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-deep/25 blur-[110px]" />
        <div className="absolute bottom-[-10%] right-[-25%] h-64 w-64 rounded-full bg-[#4c1d95]/20 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/70 px-5 py-3 backdrop-blur-xl">
          <Link href="/bets" aria-label="WaveHub home">
            <Brand size={28} />
          </Link>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5">{children}</main>

        <BottomNav />
      </div>
    </>
  );
}
