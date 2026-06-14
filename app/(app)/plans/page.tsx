import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { PlansView } from "./PlansView";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader
        title="Plans"
        subtitle="Apply first → on acceptance you choose your tier. Limited spots per intake."
      />
      <PlansView currentTier={profile.tier} />
    </>
  );
}
