import type { Metadata } from "next";
import Link from "next/link";
import { NewResourceForm } from "./NewResourceForm";

export const metadata: Metadata = { title: "New Resource" };

export default function NewResourcePage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-xs text-faint hover:text-muted">
          ← Admin
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
          New Resource
        </h1>
        <p className="mt-1 text-sm text-muted">
          Upload a PDF (tournament analysis, tools). Appears under Tools.
        </p>
      </div>
      <NewResourceForm />
    </div>
  );
}
