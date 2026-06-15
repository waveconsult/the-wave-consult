"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts";

// Conceptual / illustrative infographics for the funnel. These show *ideas*
// (discipline vs. chasing; what CLV means) — NOT WaveHub performance. Every
// chart is labelled "Illustration" to stay compliant (no fabricated results).

function ChartFrame({
  title,
  caption,
  legend,
  children,
}: {
  title: string;
  caption: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card card-emphasis w-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{title}</p>
        <span className="shrink-0 rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-warn">
          Illustration
        </span>
      </div>

      {/* chart area — fixed height, holds only the chart */}
      <div className="h-40 w-full">{children}</div>

      {legend ? <div className="mt-3">{legend}</div> : null}

      <p className="mt-3 text-[11px] leading-relaxed text-faint">{caption}</p>
    </div>
  );
}

// Steady discipline vs. volatile "chasing" — shapes only, no numbers on axes.
const DISCIPLINE = [
  { i: 1, plan: 10, chaos: 10 },
  { i: 2, plan: 12, chaos: 13 },
  { i: 3, plan: 13, chaos: 8 },
  { i: 4, plan: 15, chaos: 11 },
  { i: 5, plan: 16, chaos: 6 },
  { i: 6, plan: 18, chaos: 9 },
  { i: 7, plan: 20, chaos: 4 },
  { i: 8, plan: 22, chaos: 5 },
];

export function DisciplineChart() {
  return (
    <ChartFrame
      title="With a system vs. gut feeling"
      caption="Schematic: a clear plan smooths the curve; gut bets and chasing create chaos. Not real results."
      legend={
        <div className="flex gap-5 text-[11px]">
          <span className="flex items-center gap-1.5 text-primary-bright">
            <span className="h-0.5 w-3.5 rounded bg-primary-bright" /> with system
          </span>
          <span className="flex items-center gap-1.5 text-neg">
            <span className="h-0.5 w-3.5 rounded bg-neg" /> without a plan
          </span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DISCIPLINE} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, 24]} />
          <Line
            type="monotone"
            dataKey="plan"
            stroke="#a855f7"
            strokeWidth={3}
            dot={false}
            animationDuration={1400}
          />
          <Line
            type="monotone"
            dataKey="chaos"
            stroke="#fb7185"
            strokeWidth={2.5}
            strokeDasharray="5 4"
            dot={false}
            animationDuration={1400}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

// CLV as a single worked example (clearly an example, not a track record).
const CLV = [
  { name: "Your price", v: 1.95, fill: "#a855f7" },
  { name: "Closing", v: 1.82, fill: "#6d28d9" },
];

export function ClvChart() {
  return (
    <ChartFrame
      title="What CLV means (example)"
      caption="Example: you take 1.95, the market closes at 1.82 — you beat the closing price (CLV+). That's what WaveHub measures, instead of promising profit."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={CLV} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#9a93ad", fontSize: 11 }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[1.6, 2.0]} />
          <Bar dataKey="v" radius={[8, 8, 0, 0]} barSize={70} animationDuration={1200}>
            {CLV.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
