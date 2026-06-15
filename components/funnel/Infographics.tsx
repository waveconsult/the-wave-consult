"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

// Conceptual / illustrative infographics for the funnel. They show *ideas*
// (chaos without a system; the decline that follows) — NOT WaveHub results.
// Labelled "Illustration" to stay compliant (no fabricated performance).

function ChartFrame({
  caption,
  legend,
  children,
}: {
  caption: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card card-emphasis w-full p-4">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-warn">
          Illustration
        </span>
      </div>
      <div className="h-40 w-full">{children}</div>
      {legend ? <div className="mt-3">{legend}</div> : null}
      <p className="mt-3 text-[11px] leading-relaxed text-faint">{caption}</p>
    </div>
  );
}

// System (steady) vs. systemless chaos (volatile).
const CHAOS = [
  { i: 1, plan: 10, chaos: 10 },
  { i: 2, plan: 12, chaos: 13 },
  { i: 3, plan: 13, chaos: 7 },
  { i: 4, plan: 15, chaos: 12 },
  { i: 5, plan: 16, chaos: 6 },
  { i: 6, plan: 18, chaos: 10 },
  { i: 7, plan: 20, chaos: 5 },
  { i: 8, plan: 22, chaos: 8 },
];

export function DisciplineChart() {
  return (
    <ChartFrame
      caption="Schematic — a system steadies the line; chaos swings without direction."
      legend={
        <div className="flex gap-5 text-[11px]">
          <span className="flex items-center gap-1.5 text-primary-bright">
            <span className="h-0.5 w-3.5 rounded bg-primary-bright" /> with a system
          </span>
          <span className="flex items-center gap-1.5 text-neg">
            <span className="h-0.5 w-3.5 rounded bg-neg" /> systemless chaos
          </span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={CHAOS} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, 24]} />
          <Line type="monotone" dataKey="plan" stroke="#a855f7" strokeWidth={3} dot={false} animationDuration={1400} />
          <Line type="monotone" dataKey="chaos" stroke="#fb7185" strokeWidth={2.5} strokeDasharray="5 4" dot={false} animationDuration={1400} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// The slow decline without a consistent system.
const DECLINE = [
  { i: 1, v: 22 },
  { i: 2, v: 20 },
  { i: 3, v: 21 },
  { i: 4, v: 17 },
  { i: 5, v: 15 },
  { i: 6, v: 16 },
  { i: 7, v: 11 },
  { i: 8, v: 9 },
  { i: 9, v: 6 },
];

export function DeclineChart() {
  return (
    <ChartFrame caption="Schematic — without a system, variance grinds the line one way: down.">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DECLINE} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
          <defs>
            <linearGradient id="decline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fb7185" stopOpacity={0.35} />
              <stop offset="1" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, 24]} />
          <Area type="monotone" dataKey="v" stroke="#fb7185" strokeWidth={3} fill="url(#decline)" dot={false} animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
