import Link from "next/link";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { ResponsibleGamblingBanner } from "@/components/ResponsibleGambling";
import { RiskManagementForm } from "./RiskManagementForm";
import { signout } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Profile" };

const TIER_LABEL: Record<string, string> = {
  none: "Free",
  core: "Wave Core",
  private: "Wave Private",
};

export default async function ProfilePage() {
  const profile = await requireProfile();
  const name = profile.username ?? profile.email?.split("@")[0] ?? "you";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">
        Profile
      </h1>

      {/* prof-head */}
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
        <div>
          <p className="font-display text-base font-bold text-text">
            {TIER_LABEL[profile.tier] ?? "Free"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {profile.tier === "none"
              ? "Apply for Core or Private access"
              : "Active"}
          </p>
        </div>
        <Link
          href="/plans"
          className="text-[11px] font-semibold text-primary-bright"
        >
          {profile.tier === "none" ? "View plans →" : "Manage →"}
        </Link>
      </div>

      {/* Track Record · CLV — placeholders only (briefing §0, §13) */}
      <Eyebrow>Track Record · CLV</Eyebrow>
      <div className="card card-emphasis p-4">
        <p className="mono text-[10px] uppercase tracking-wide text-faint">
          Avg Closing Line Value · 90 days
          <span className="ml-2 rounded border border-primary/30 bg-primary/12 px-1.5 py-0.5 text-primary-bright">
            Demo
          </span>
        </p>
        <DemoSparkline />
        <div className="mono mt-1 flex justify-between text-[10px] text-faint">
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>
      <div className="card p-4">
        <Kv label="Period" value="— placeholder —" />
        <Kv label="Sample (bets)" value="— placeholder —" />
        <Kv label="% beating closing line" value="— placeholder —" />
        <Kv label="Externally verified" value="pending" muted last />
      </div>
      <p className="mx-1 mt-[-2px] text-[13px] leading-relaxed text-muted">
        Filled with your <b className="text-text">real, documented numbers</b> —
        nothing estimated. CLV is a quality signal,{" "}
        <b className="text-text">not a profit promise.</b>
      </p>

      {/* Risk Management (editable — drives stake amounts live) */}
      <Eyebrow>Risk Management</Eyebrow>
      <RiskManagementForm profile={profile} />

      {/* Admin */}
      {profile.role === "admin" ? (
        <>
          <Eyebrow>Admin</Eyebrow>
          <Link
            href="/admin"
            className="card flex items-center justify-between p-4 transition hover:border-border-strong"
          >
            <div>
              <p className="text-sm font-semibold text-text">Admin Panel</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Publish bets &amp; insights · upload screenshots
              </p>
            </div>
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

function Kv({
  label,
  value,
  muted,
  last,
}: {
  label: string;
  value: string;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-2.5 text-[13px] ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="text-muted">{label}</span>
      <span className={`mono font-semibold ${muted ? "text-muted" : "text-text"}`}>
        {value}
      </span>
    </div>
  );
}

// Purely decorative demo sparkline — NOT real performance data.
function DemoSparkline() {
  const pts = [44, 42, 38, 40, 32, 28, 30, 22, 24, 16, 18, 12, 10];
  const w = 300;
  const xs = (i: number) => (i / (pts.length - 1)) * w;
  const line = pts.map((y, i) => `${i === 0 ? "M" : "L"}${xs(i)},${y}`).join(" ");
  const area = `${line} L${w},60 L0,60 Z`;

  return (
    <svg
      viewBox="0 0 300 60"
      className="mt-2.5 h-[60px] w-full"
      preserveAspectRatio="none"
      aria-label="Demo sparkline (illustrative only)"
    >
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path
        d={line}
        fill="none"
        stroke="#a855f7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
