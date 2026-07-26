import Link from "next/link";

// Auth shell (982x-style): near-black, typographic, hairlines, gold accent.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-6">
        <Link
          href="/"
          className="font-display text-[15px] font-bold uppercase tracking-wide"
        >
          Wave<span className="text-[#cdd2d8]">hub</span>
        </Link>
        <Link href="/signup" className="btn-pill btn-pill-gold !px-5 !py-2 text-[12px]">
          Sign up
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
        {children}
      </main>

      <footer className="border-t border-white/[0.07] px-6 py-5 text-center">
        <p className="mono text-[10px] uppercase tracking-[2px] text-[#94928a]">
          Analysis, not a bookmaker · ATP only
        </p>
      </footer>
    </div>
  );
}
