import type { BetStatus } from "@/lib/types";

// Matches the prototype `.status` styles: open is brand-purple (not muted).
const MAP: Record<BetStatus, { label: string; cls: string }> = {
  open: {
    label: "Open",
    cls: "text-primary-bright border-primary/30 bg-primary/12",
  },
  won: { label: "Won", cls: "text-pos border-pos/30 bg-pos/10" },
  lost: { label: "Lost", cls: "text-neg border-neg/30 bg-neg/10" },
  void: { label: "Void", cls: "text-faint border-border bg-surface" },
};

export function StatusBadge({ status }: { status: BetStatus }) {
  const s = MAP[status] ?? MAP.open;
  return (
    <span
      className={`mono inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
