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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-5 py-3 backdrop-blur-xl">
        <Link href="/bets" aria-label="WaveHub home">
          <Brand size={28} />
        </Link>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <BottomNav />
    </div>
  );
}
