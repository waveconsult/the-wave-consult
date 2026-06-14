import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

// Server-side gate (briefing §5.6): non-admins are redirected away.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary-deep px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Admin
          </span>
          <span className="font-display text-sm font-semibold text-text">
            The Wave Consult
          </span>
        </div>
        <Link
          href="/bets"
          className="text-xs text-faint transition hover:text-muted"
        >
          ← Back to app
        </Link>
      </header>

      <main className="flex-1 px-5 pb-16 pt-5">{children}</main>
    </div>
  );
}
