// Parse a user-entered decimal that may use a comma (de-DE) or dot as the
// decimal separator, e.g. "1,75" or "1.75" → 1.75. Returns NaN if not numeric.
export function parseDecimal(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  return s === "" ? NaN : Number(s);
}

// Display formatters. Numbers render in mono per the design spec (§10).

export function euro(n: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

export function odds(n: number): string {
  return Number(n).toFixed(2);
}

export function pct(n: number, decimals = 1): string {
  return `${Number(n).toFixed(decimals)}%`;
}

export function signedPct(n: number, decimals = 1): string {
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}%`;
}

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// When a pick was published, as day + time.
//
// Pinned to Europe/Vienna on purpose. This renders on the server, which runs in
// UTC on Vercel, so formatting in the runtime's zone would quietly show every
// member a time an hour or two off — and for a feed whose whole selling point
// is "posted before the price moved", a wrong timestamp is worse than none.
// A fixed zone also keeps server and client output identical, so there is no
// hydration mismatch. CET/CEST is the right reference for a European ATP feed.
export function publishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/Vienna",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
