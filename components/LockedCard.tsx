import Link from "next/link";

// Shown to Free members in place of a bet/insight that's newer than 3 days.
// Renders ONLY a blurred placeholder (no real fields), so nothing sensitive is
// sent to the client — plus a lock overlay that points to the plans.
export function LockedCard() {
  return (
    <article className="relative mb-3.5 overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_14px_36px_-16px_rgba(0,0,0,0.6)]">
      {/* blurred placeholder — no real data */}
      <div className="select-none blur-[5px]" aria-hidden="true">
        <header className="bg-gradient-to-r from-primary-deep to-primary px-4 py-3">
          <p className="font-display text-[17px] font-bold leading-tight text-white">
            Hidden pick ••••••
          </p>
          <p className="text-[11px] font-medium text-white/70">Match Winner</p>
        </header>
        <div className="p-4">
          <p className="mono text-[10px] uppercase tracking-wide text-[#8b8794]">
            ••••••••• · R••
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold text-[#15131f]">
            ••••••• vs •••••••
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[10px] border border-[#ece9f4] bg-[#f5f3fa] px-2.5 py-2">
              <p className="mono text-[9px] uppercase tracking-wide text-[#8b8794]">Stake</p>
              <p className="mono mt-1 text-[15px] font-bold text-[#1a1722]">•%</p>
            </div>
            <div className="rounded-[10px] border border-[#ece9f4] bg-[#f5f3fa] px-2.5 py-2">
              <p className="mono text-[9px] uppercase tracking-wide text-[#8b8794]">Amount</p>
              <p className="mono mt-1 text-[15px] font-bold text-[#1a1722]">••••</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[#5b5766]">
            •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
          </p>
        </div>
      </div>

      {/* lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/30 px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#15131f] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          </svg>
        </span>
        <p className="font-display text-[15px] font-bold text-[#15131f]">
          Unlock with Core or Private
        </p>
        <p className="max-w-[15rem] text-[12px] leading-relaxed text-[#5b5766]">
          Recent picks are members-only. Free to read 3 days after posting.
        </p>
        <Link
          href="/plans"
          className="mt-1 rounded-xl bg-gradient-to-br from-primary-deep to-primary px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(109,40,217,0.4)]"
        >
          See plans
        </Link>
      </div>
    </article>
  );
}
