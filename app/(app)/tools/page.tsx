import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { StakingCalculator } from "./StakingCalculator";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader
        title="Staking Calculator"
        subtitle="It also tells you when not to bet. That's the point."
      />
      <StakingCalculator
        initialBankroll={profile.bankroll}
        initialStrategy={profile.staking_strategy}
      />
    </>
  );
}
