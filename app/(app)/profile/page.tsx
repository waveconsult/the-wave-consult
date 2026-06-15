import Link from "next/link";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { getTrackRecord } from "@/lib/data";
import { euro } from "@/lib/format";
import { ResponsibleGamblingBanner } from "@/components/ResponsibleGambling";
import { RiskManagementForm } from "./RiskManagementForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { signout } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Profile" };

const TIER_LABEL: Record<string, string> = {
  none: "Free",
  core: "Core",
  private: "Private",
};

export default async function ProfilePage() {
  const profile = await requireProfile();
  const name = profile.username ?? profile.email?.split("@")[0] ?? "you";
  const initial = name.charAt(0).toUpperCase();

  const tr = await getTrackRecord(profile.created_at);
  const profitEur = profile.bankroll * tr.fraction;

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Profile
      </h1>

      <div className="mb-2 mt-2 flex items-center gap-3.5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-deep to-primary-bright font-display text-xl font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold text-text">{name}</p>
          <p className="truncate text-xs text-muted">{profile.email}</p>
        </div>
      </div>

      {/* Subscription */}
      <Eyebrow>Subscription</Eyebrow>
      <div className="card flex items-center justify-between p-4">
        <p className="font-display text-base font-bold text-text">
          {TIER_LABEL[profile.tier] ?? "Free"}
        </p>
        <Link href="/plans" className="text-[11px] font-semibold text-primary-bright">
          {profile.tier === "none" ? "Upgrade →" : "Manage →"}
        </Link>
      </div>

      {/* Track record — real, settled picks since join */}
      <Eyebrow>Track Record</Eyebrow>
      <div className="card card-emphasis p-4">
        {tr.total === 0 ? (
          <>
            <p className="font-display text-xl font-bold text-text">€0.00</p>
            <p className="mt-1 text-[13px] text-muted">
              No settled picks yet — your record starts now.
            </p>
          </>
        ) : (
          <>
            <p
              className={`mono text-[28px] font-bold ${
                profitEur >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {profitEur >= 0 ? "+" : ""}
              {euro(profitEur)}
            </p>
            <p className="mono mt-1 text-[13px] text-muted">
              {tr.units >= 0 ? "+" : ""}
              {tr.units.toFixed(1)}u · {tr.total} settled · {tr.won}–{tr.lost}
            </p>
          </>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Settled WaveHub picks since you joined, at your bankroll. Past results —
          not a promise.
        </p>
      </div>

      {/* Risk management — just bankroll + play style */}
      <Eyebrow>Risk Management</Eyebrow>
      <RiskManagementForm profile={profile} />

      {/* Password */}
      <Eyebrow>Password</Eyebrow>
      <ChangePasswordForm />

      {/* Admin */}
      {profile.role === "admin" ? (
        <>
          <Eyebrow>Admin</Eyebrow>
          <Link
            href="/admin"
            className="card flex items-center justify-between p-4 transition hover:border-border-strong"
          >
            <span className="text-sm font-semibold text-text">Admin Panel</span>
            <span className="text-lg text-primary-bright">→</span>
          </Link>
        </>
      ) : null}

      <div className="mt-5">
        <ResponsibleGamblingBanner />
      </div>

      <form action={signout} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-xl border border-border-strong py-2.5 text-sm font-medium text-muted transition hover:text-text"
        >
          Sign out
        </button>
      </form>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-faint">
        WaveHub · Tennis betting analysis
        <br />
        No profit guarantees · 18+
      </p>
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mono mb-2.5 mt-6 text-[10px] font-semibold uppercase tracking-[1.5px] text-faint">
      {children}
    </h2>
  );
}
