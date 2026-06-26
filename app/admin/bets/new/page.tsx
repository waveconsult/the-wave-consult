import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { NewBetForm } from "./NewBetForm";

export const metadata: Metadata = { title: "New Bet" };

export default async function NewBetPage() {
  const profile = await requireProfile();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-xs text-faint hover:text-muted">
          ← Admin
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
          New Bet
        </h1>
      </div>
      <NewBetForm bankroll={profile.bankroll} />
    </div>
  );
}
