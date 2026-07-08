import Link from "next/link";

// Shown to Free members in place of a bet/insight that's newer than 3 days.
// Renders ONLY a blurred placeholder (no real fields), so nothing sensitive is
// sent to the client — plus a lock overlay that points to the plans.
export function LockedCard() {
  return (
    <article className="relative mb-3.5 overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_36px_-18px_rgba(0,0,0,0.7)]">
      {/* blurred placeholder — no real data */}
      <div className="select-none blur-[5px]" aria-hidden="true">
        <header className="bg-gradient-to-r from-[#a98b56] to-[#caa76b] px-4 py-3">
          <p className="font-display text-[17px] font-bold leading-tight text-[#14110a]">
            Hidden pick ••••••
          </p>
          <p className="text-[11px] font-medium text-[#14110a]/70">Match Winner</p>
        </header>
        <div className="p-4">
          <p className="mono text-[10px] uppercase tracking-wide text-faint">
            ••••••••• · R••
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold text-text">
            ••••••• vs •••••••
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[10px] border border-border bg-surface-2 px-2.5 py-2">
              <p className="mono text-[9px] uppercase tracking-wide text-faint">Stake</p>
              <p className="mono mt-1 text-[15px] font-bold text-text">•%</p>
            </div>
            <div className="rounded-[10px] border border-border bg-surface-2 px-2.5 py-2">
              <p className="mono text-[9px] uppercase tracking-wide text-faint">Amount</p>
              <p className="mono mt-1 text-[15px] font-bold text-text">••••</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
          </p>
        </div>
      </div>

      {/* lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 px-6 text-center backdrop-blur-[1px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#caa76b]/40 bg-elevated text-[#caa76b]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          </svg>
        </span>
        <p className="font-display text-[15px] font-bold text-text">
          Unlock with Core or Private
        </p>
        <p className="max-w-[15rem] text-[12px] leading-relaxed text-muted">
          Recent picks are members-only. Free to read 3 days after posting.
        </p>
        <Link
          href="/plans"
          className="btn-pill btn-pill-gold mt-1 !px-4 !py-2 text-[13px]"
        >
          See plans
        </Link>
      </div>
    </article>
  );
}
