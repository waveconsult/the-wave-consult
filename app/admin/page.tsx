import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types";
import { relativeDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const applications = (data as Application[]) ?? [];
  const pending = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
        Admin Panel
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <ActionTile
          href="/admin/bets/new"
          title="New Bet"
          desc="Publish a structured pick"
        />
        <ActionTile
          href="/admin/insights/new"
          title="New Insight"
          desc="Publish match analysis"
        />
      </div>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
          Applications {pending > 0 ? `· ${pending} pending` : ""}
        </h2>
        {applications.length === 0 ? (
          <div className="card px-5 py-8 text-center text-sm text-faint">
            No applications yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {applications.map((a) => (
              <li
                key={a.id}
                className="card flex items-center justify-between p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-text">{a.email}</p>
                  <p className="text-xs text-muted">
                    {a.requested_tier ?? "—"} ·{" "}
                    <span className="mono">{relativeDate(a.created_at)}</span>
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${
                    a.status === "pending"
                      ? "border-warn/30 bg-warn/10 text-warn"
                      : a.status === "accepted"
                        ? "border-pos/30 bg-pos/10 text-pos"
                        : "border-border bg-surface text-faint"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 px-1 text-xs text-faint">
          Grant access by setting <span className="mono">profiles.tier</span> in
          Supabase. Stripe checkout is deferred (§12).
        </p>
      </section>
    </div>
  );
}

function ActionTile({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card card-emphasis flex flex-col gap-1 p-4 transition hover:border-primary-bright"
    >
      <span className="font-display text-base font-semibold text-text">
        {title}
      </span>
      <span className="text-xs text-muted">{desc}</span>
    </Link>
  );
}
