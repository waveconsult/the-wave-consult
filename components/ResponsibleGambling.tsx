// Compliance furniture (briefing §0, §13). 18+ and "Gamble responsibly" must
// be visible. The AT problem-gambling helpline is a PLACEHOLDER — the operator
// inserts the official line before launch. Do not invent a number.

export const HELPLINE_PLACEHOLDER =
  "Problem gambling helpline: [OPERATOR — insert official AT helpline before launch]";

export function ResponsibleGamblingBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warn/20 bg-warn/[0.06] px-3 py-3 text-[11px] leading-relaxed text-[#d6c89a]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <path
          d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <b className="text-text">18+ · Gamble responsibly.</b> Only stake what
        you can afford to lose. WaveHub is an analysis tool — not a bookmaker —
        and does not take, hold, or move money. No profit is guaranteed.{" "}
        {HELPLINE_PLACEHOLDER}
      </span>
    </div>
  );
}

export function ComplianceFooter() {
  return (
    <footer className="px-5 pb-3 pt-6 text-center text-[11px] text-faint">
      <p>
        18+ · Gamble responsibly · Analysis &amp; consulting only — not wager
        processing
      </p>
      <p className="mt-1">{HELPLINE_PLACEHOLDER}</p>
    </footer>
  );
}
