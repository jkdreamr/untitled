"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

function downsample(peaks: number[], bars: number): number[] {
  if (!peaks.length) return Array.from({ length: bars }, () => 0.06);
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
 * Interactive waveform drawn from stored peaks. Progress paints lime; clicking
 * or dragging seeks. On first mount it draws left-to-right (signature moment).
 */
export function Waveform({
  peaks,
  progress,
  bars = 80,
  onSeek,
  className,
  draw = false,
  label = "seek",
}: {
  peaks: number[] | null | undefined;
  progress: number; // 0..1
  bars?: number;
  onSeek?: (ratio: number) => void;
  className?: string;
  draw?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const values = useMemo(() => downsample(peaks ?? [], bars), [peaks, bars]);

  function seekFromClientX(clientX: number) {
    const el = ref.current;
    if (!el || !onSeek) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio);
  }

  return (
    <div
      ref={ref}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? label : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      onPointerDown={onSeek ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFromClientX(e.clientX); } : undefined}
      onPointerMove={onSeek ? (e) => { if (e.buttons === 1) seekFromClientX(e.clientX); } : undefined}
      onKeyDown={
        onSeek
          ? (e) => {
              if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.02));
              if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.02));
            }
          : undefined
      }
      className={cn(
        "flex h-full w-full items-center gap-[2px]",
        onSeek && "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime",
        className,
      )}
    >
      {values.map((v, i) => {
        const played = i / bars <= progress;
        return (
          <span
            key={i}
            className={cn(
              "min-h-[2px] flex-1 rounded-full transition-colors duration-75",
              played ? "bg-lime" : "bg-bone-32",
              draw && "origin-bottom [animation:wave-grow_.3s_var(--ease-out)_both]",
            )}
            style={{ height: `${Math.max(6, v * 100)}%`, animationDelay: draw ? `${i * 5}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}
