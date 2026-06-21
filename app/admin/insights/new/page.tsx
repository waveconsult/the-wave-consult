import type { Metadata } from "next";
import Link from "next/link";
import { NewInsightForm } from "./NewInsightForm";

export const metadata: Metadata = { title: "New Insight" };

export default function NewInsightPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-xs text-faint hover:text-muted">
          ← Admin
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
          New Insight
        </h1>
      </div>
      <NewInsightForm />
    </div>
  );
}
