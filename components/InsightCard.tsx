import type { InsightWithMeta } from "@/lib/types";

// Match analysis card — matches the prototype: meta line, match title, an
// optional W/UE/TT stats table (ratio colour-coded), then the read.
export function InsightCard({ insight }: { insight: InsightWithMeta }) {
  const rows = insight.stats ?? [];
  const hasStats = rows.length > 0;
  const date = new Date(insight.published_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const flag = insight.tournament?.country_flag ?? "";
  const tname = insight.tournament?.name;
  const meta = [date, tname].filter(Boolean).join(" · ") + (flag ? ` ${flag}` : "");

  return (
    <article className="card mb-3.5 p-4">
      <p className="mono text-[10px] uppercase tracking-wide text-faint">
        {meta}
      </p>
      <h3 className="mb-3 mt-0.5 font-display text-base font-semibold text-text">
        {insight.title}
      </h3>

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
                <tr key={i} className="border-b border-white/5">
                  <td className="py-1.5 pr-2 font-sans text-muted">{r.player}</td>
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
  return <td className="py-1.5 pl-2 text-right font-semibold">{children}</td>;
}
