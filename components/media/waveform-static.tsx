import { cn } from "@/lib/utils";

/** Downsample ~800 peaks to `bars` values in [0,1]. */
function downsample(peaks: number[], bars: number): number[] {
  if (!peaks.length) return Array.from({ length: bars }, () => 0.05);
  const out: number[] = [];
  const step = peaks.length / bars;
  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * step);
    const end = Math.max(start + 1, Math.floor((i + 1) * step));
    let max = 0;
    for (let j = start; j < end && j < peaks.length; j++) max = Math.max(max, Math.abs(peaks[j] ?? 0));
    out.push(Math.min(1, max));
  }
  return out;
}

/**
 * Server-safe waveform rendered from stored peaks (never decodes audio).
 * `progress` in [0,1] paints played bars lime.
 */
export function WaveformStatic({
  peaks,
  bars = 56,
  progress = 0,
  className,
  barClassName,
}: {
  peaks: number[] | null | undefined;
  bars?: number;
  progress?: number;
  className?: string;
  barClassName?: string;
}) {
  const values = downsample(peaks ?? [], bars);
  return (
    <div className={cn("flex h-full w-full items-center gap-[2px]", className)} aria-hidden>
      {values.map((v, i) => {
        const played = i / bars < progress;
        return (
          <span
            key={i}
            className={cn(
              "min-h-[2px] flex-1 rounded-full",
              played ? "bg-lime" : "bg-bone-32",
              barClassName,
            )}
            style={{ height: `${Math.max(6, v * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
