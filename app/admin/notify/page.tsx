import type { Metadata } from "next";
import Link from "next/link";
import { NotifyForm } from "./NotifyForm";

export const metadata: Metadata = { title: "Send Notification" };

export default function NotifyPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-xs text-faint hover:text-muted">
          ← Admin
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
          Send Notification
        </h1>
        <p className="mt-1 text-xs text-muted">
          Goes to everyone who enabled notifications (iPhone &amp; Android).
        </p>
      </div>
      <NotifyForm />
    </div>
  );
}
