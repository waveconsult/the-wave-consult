import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getResources } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { StakingCalculator } from "./StakingCalculator";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const profile = await requireProfile();
  const resources = await getResources();

  return (
    <>
      <PageHeader title="Tools" />

      <h2 className="mono mb-2.5 text-[10px] font-semibold uppercase tracking-[1.5px] text-faint">
        Staking calculator
      </h2>
      <StakingCalculator
        initialBankroll={profile.bankroll}
        initialStrategy={profile.staking_strategy}
      />

      <h2 className="mono mb-2.5 mt-7 text-[10px] font-semibold uppercase tracking-[1.5px] text-faint">
        Resources
      </h2>

      {resources.length === 0 ? (
        <div className="card flex flex-col items-center gap-1 px-6 py-10 text-center">
          <p className="font-display text-base font-semibold text-text">
            No resources yet
          </p>
          <p className="max-w-xs text-sm text-muted">
            Tournament PDFs and tools will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <a
              key={r.id}
              href={r.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-3.5 p-4 transition hover:border-border-strong"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary-deep/40 to-primary/10 text-primary-bright">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{r.title}</p>
                <p className="text-[11px] text-muted">PDF · tap to open</p>
              </div>
              <span className="text-primary-bright">↗</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
