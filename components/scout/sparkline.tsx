import { cn } from "@/lib/utils";

/**
 * A minimal activity sparkline built from the waveform-static bar idiom:
 * bone-32 bars, the peak bar in lime (the single live-signal accent).
 */
export function Sparkline({
  values,
  className,
  bars = 30,
}: {
  values: number[];
  className?: string;
  bars?: number;
}) {
  const series = values.slice(-bars);
  const max = Math.max(1, ...series);
  const peak = series.reduce((best, v, i, arr) => (v > (arr[best] ?? 0) ? i : best), 0);
  return (
    <div className={cn("flex h-8 items-end gap-[2px]", className)} aria-hidden>
      {series.length === 0 ? (
        <span className="min-h-[2px] w-full rounded-full bg-bone-16" style={{ height: "6%" }} />
      ) : (
        series.map((v, i) => (
          <span
            key={i}
            className={cn(
              "min-h-[2px] flex-1 rounded-full",
              i === peak && v > 0 ? "bg-lime" : "bg-bone-32",
            )}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          />
        ))
      )}
    </div>
  );
}
