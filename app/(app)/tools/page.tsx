import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { StakingCalculator } from "./StakingCalculator";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const profile = await requireProfile();

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
      <div className="card flex flex-col items-center gap-1 px-6 py-10 text-center">
        <p className="font-display text-base font-semibold text-text">
          No resources yet
        </p>
        <p className="max-w-xs text-sm text-muted">
          Tournament PDFs and tools will appear here.
        </p>
      </div>
    </>
  );
}
