import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

export default function AdminHome() {
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
