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
