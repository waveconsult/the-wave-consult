import type { InsightWithMeta } from "@/lib/types";
import { Attachment } from "./Attachment";
import { LockedCard } from "./LockedCard";
import { deleteInsight } from "@/app/admin/actions";

// Insight card — same premium look as the bets: a champagne-gold header with
// the match, over a dark club-surface body with the stats table and the read.
export function InsightCard({
  insight,
  isAdmin = false,
  locked = false,
}: {
  insight: InsightWithMeta;
  isAdmin?: boolean;
  locked?: boolean;
}) {
  if (locked) return <LockedCard />;

  const rows = insight.stats ?? [];
  const hasStats = rows.length > 0;
  const date = new Date(insight.published_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const flag = insight.tournament?.country_flag ?? "";
  const tname = insight.tournament?.name ?? insight.tournament_name ?? undefined;
  const meta = [date, tname].filter(Boolean).join(" · ") + (flag ? ` ${flag}` : "");

  return (
    <article className="mb-3.5 overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_36px_-18px_rgba(0,0,0,0.7)]">
      {/* gold header */}
      <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#9aa0a8] to-[#cdd2d8] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#14110a]/70">{meta}</p>
          <h3 className="mt-0.5 font-display text-[17px] font-bold leading-tight text-[#14110a]">
            {insight.title}
          </h3>
        </div>
        {isAdmin ? (
          <form action={deleteInsight}>
            <input type="hidden" name="id" value={insight.id} />
            <button
              type="submit"
              aria-label="Delete insight"
              className="shrink-0 rounded-md border border-black/25 px-1.5 py-1 text-[#14110a]/70 transition hover:border-black/50 hover:text-[#14110a]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </form>
        ) : null}
      </header>

      {/* dark body */}
      <div className="p-4">
        {hasStats ? (
          <table className="mono mb-3 w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-faint">
                <th className="border-b border-border py-1.5 pr-2 text-left text-[9px] font-semibold uppercase tracking-wide">
                  Player
                </th>
                <Th>W</Th>
                <Th>UE</Th>
                <Th>TT</Th>
                <Th>W/UE</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const ratio = Number(r.ratio);
                const ratioCls =
                  Number.isFinite(ratio) && ratio >= 1.5
                    ? "text-pos"
                    : Number.isFinite(ratio) && ratio < 1.0
                      ? "text-warn"
                      : "text-text";
                return (
                  <tr key={i} className="border-b border-border">
                    <td className="py-1.5 pr-2 font-sans text-muted">
                      {r.player}
                    </td>
                    <Td>{r.w ?? "—"}</Td>
                    <Td>{r.ue ?? "—"}</Td>
                    <Td>{r.tt ?? "—"}</Td>
                    <td className={`py-1.5 pl-2 text-right font-bold ${ratioCls}`}>
                      {r.ratio ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted">
          {insight.body}
        </p>

        {insight.screenshot_url ? (
          <Attachment
            url={insight.screenshot_url}
            path={insight.screenshot_path}
            label="Document"
          />
        ) : null}
      </div>
    </article>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-border py-1.5 pl-2 text-right text-[9px] font-semibold uppercase tracking-wide">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-1.5 pl-2 text-right font-semibold text-text">
      {children}
    </td>
  );
}
