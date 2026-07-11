import Link from "next/link";

// Public pre-login screen (982x-style): near-black, huge uppercase type,
// champagne-gold accent, one Apply CTA. Matches the marketing front page 1:1.
export function PreLogin() {
  return (
    <div className="public-shell flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-6">
        <span className="font-display text-[15px] font-bold uppercase tracking-wide">
          Wave<span className="text-[#cdd2d8]">hub</span>
        </span>
        <Link
          href="/login"
          className="-my-2.5 border-b border-white/20 py-2.5 text-[13px] font-semibold transition hover:border-white"
        >
          Members access
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="eyebrow">The 2% play differently · ATP · Since 2022</p>
        <h1 className="mt-8 max-w-[14ch] font-display text-[clamp(38px,11vw,64px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
          A members&apos; club for a <span className="u-gold">high-income skill</span>.
        </h1>
        <p className="mt-7 max-w-[21rem] text-[15px] leading-relaxed text-[#94928a]">
          We&apos;re operators, not punters. One sport, early prices, real edge —
          and the discipline to hold the line. If you play to win, you&apos;re home.
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col items-center gap-5">
          <Link href="/apply" className="btn-pill w-full">
            Apply for membership
          </Link>
          <Link
            href="/login"
            className="-my-2.5 border-b border-white/20 py-2.5 text-[13px] font-semibold transition hover:border-white"
          >
            Members access →
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/[0.07] px-6 py-5 text-center">
        <p className="mono text-[10px] uppercase tracking-[2px] text-[#94928a]">
          Analysis, not a bookmaker · ATP only
        </p>
      </footer>
    </div>
  );
}
