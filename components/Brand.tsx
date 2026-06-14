// Wave wordmark + glyph — matches the prototype: a single gradient wave stroke
// and the wordmark "Wave Consult" with "Consult" in brand purple.

export function WaveGlyph({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,.45))" }}
    >
      <defs>
        <linearGradient
          id="wave-mark"
          x1="6"
          y1="30"
          x2="42"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6d28d9" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M6 28 C 12 14, 20 14, 24 24 C 28 34, 36 34, 42 20"
        stroke="url(#wave-mark)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Brand({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <WaveGlyph size={size} />
      <span className="font-display text-lg font-bold tracking-wide text-text">
        Wave<span className="text-primary-bright"> Consult</span>
      </span>
    </div>
  );
}
