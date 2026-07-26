import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types";
import { relativeDate } from "@/lib/format";
import { acceptApplication, declineApplication } from "./actions";
import { PLANS, introLabel } from "@/lib/plans";

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
        <ActionTile
          href="/admin/resources/new"
          title="New Resource"
          desc="Upload a PDF / tool"
        />
        <ActionTile
          href="/admin/notify"
          title="Send Notification"
          desc="Push to all members"
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
            {applications.map((a) => {
              const paid = !!a.paid_at;
              return (
                <li key={a.id} className="card p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-text">{a.email}</p>
                      <p className="text-xs text-muted">
                        {a.requested_tier ?? "no pref"} ·{" "}
                        <span className="mono">{relativeDate(a.created_at)}</span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] capitalize ${
                        paid
                          ? "border-pos/30 bg-pos/10 text-pos"
                          : a.status === "pending"
                            ? "border-warn/30 bg-warn/10 text-warn"
                            : a.status === "accepted"
                              ? "border-primary/30 bg-primary/10 text-primary-bright"
                              : "border-border bg-surface text-faint"
                      }`}
                    >
                      {paid ? "paid" : a.status}
                    </span>
                  </div>

                  {a.note ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted">{a.note}</p>
                  ) : null}

                  {a.status === "pending" ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <form
                        action={acceptApplication}
                        className="flex flex-1 items-center gap-2"
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <select
                          name="plan"
                          defaultValue={a.requested_plan ?? "1y"}
                          aria-label="Membership length"
                          className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-text"
                        >
                          {PLANS.map((p) => (
                            <option key={p.plan} value={p.plan}>
                              {p.label} · {introLabel(p.plan)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="btn-pill btn-pill-gold flex-1 !py-2 text-xs"
                        >
                          Accept &amp; send link
                        </button>
                      </form>
                      <form action={declineApplication}>
                        <input type="hidden" name="id" value={a.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:text-text"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  ) : a.status === "accepted" && !paid ? (
                    <p className="mt-2 text-[11px] text-faint">
                      Checkout link sent — waiting for payment.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 px-1 text-xs text-faint">
          Pending applications are auto-accepted after 1 hour and sent an
          urgency checkout link — or accept early / decline here. Access is
          granted automatically once they pay.
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
