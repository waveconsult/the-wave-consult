import Image from "next/image";

// WaveHub wordmark + logo. The glossy wave logo (public/logo.png) on transparent
// background sits over the dark UI; wordmark "WaveHub" with "Hub" in brand purple.

export function WaveGlyph({ size = 30 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,.45))" }}
    />
  );
}

export function Brand({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <WaveGlyph size={size} />
      <span className="font-display text-lg font-bold tracking-wide text-text">
        Wave<span className="text-primary-bright">Hub</span>
      </span>
    </div>
  );
}
