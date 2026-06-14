"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Bets | Insights segmented control. Preserves the active tournament filter.
export function SegmentedToggle({ view }: { view: "bets" | "insights" }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (v: "bets" | "insights") => {
    const sp = new URLSearchParams(params.toString());
    if (v === "bets") sp.delete("view");
    else sp.set("view", v);
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const tab = (v: "bets" | "insights", label: string) => {
    const active = view === v;
    return (
      <Link
        href={hrefFor(v)}
        className={`flex-1 rounded-[10px] py-2.5 text-center text-[13px] font-semibold transition ${
          active
            ? "bg-gradient-to-br from-primary-deep to-primary text-white shadow-[0_4px_14px_rgba(109,40,217,0.4)]"
            : "text-muted hover:text-text"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mb-4 flex gap-1 rounded-2xl border border-border bg-surface p-1">
      {tab("bets", "Bets")}
      {tab("insights", "Insights")}
    </div>
  );
}
