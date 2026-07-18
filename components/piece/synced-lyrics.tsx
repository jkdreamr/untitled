"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer, type PlayerTrack } from "@/components/player/player-context";
import { cn } from "@/lib/utils";
import type { LyricSegment } from "@/lib/types";

/**
 * Confirmed lyrics. When the track is playing and has time-synced segments, the
 * active line highlights and tap-to-seek works; otherwise it's a calm static
 * read in Instrument Serif. The active line is tracked with a single rAF loop
 * that reads the player's live time and only re-renders when the line changes —
 * no per-frame React state churn.
 */
export function SyncedLyrics({
  pieceId,
  lyrics,
  segments,
  track,
  className,
}: {
  pieceId: string;
  lyrics: string;
  segments: LyricSegment[];
  track?: PlayerTrack;
  className?: string;
}) {
  const player = usePlayer();
  // Pull the stable callbacks out so effects don't restart on every timeupdate
  // (the player api object is recreated ~4x/sec as `time` ticks).
  const { getTime, seekTo, play } = player;
  const isCurrent = player.isCurrent(pieceId);
  const playing = player.playing;
  const synced = segments.length > 0;
  const [active, setActive] = useState(-1);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingSeek = useRef<number | null>(null);

  // rAF: follow the live playhead, set state only when the active line changes.
  useEffect(() => {
    if (!synced || !isCurrent) {
      setActive(-1);
      return;
    }
    let raf = 0;
    let last = -1;
    const tick = () => {
      const t = getTime();
      let idx = -1;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i]!.start <= t + 0.15) idx = i;
        else break;
      }
      if (idx !== last) {
        last = idx;
        setActive(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [synced, isCurrent, segments, getTime]);

  // Apply a queued seek once the tapped track has actually started.
  useEffect(() => {
    if (isCurrent && playing && pendingSeek.current != null) {
      seekTo(pendingSeek.current);
      pendingSeek.current = null;
    }
  }, [isCurrent, playing, seekTo]);

  // Center the active line within its own scroll container (never scroll the page).
  useEffect(() => {
    if (active < 0) return;
    const container = scrollRef.current;
    const el = lineRefs.current[active];
    if (!container || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  function onLine(i: number) {
    const seg = segments[i];
    if (!seg) return;
    if (isCurrent) {
      seekTo(seg.start);
    } else if (track) {
      pendingSeek.current = seg.start;
      play(track);
    }
  }

  if (!synced) {
    return (
      <div
        className={cn(
          "prose-words whitespace-pre-wrap rounded-lg bg-ink-sunken/40 p-6 font-serif text-[1.35rem] leading-relaxed text-bone-80 sm:p-8 sm:text-[1.5rem]",
          className,
        )}
      >
        {lyrics}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "no-scrollbar max-h-[22rem] overflow-y-auto rounded-lg bg-ink-sunken/40 p-6 sm:p-8",
        className,
      )}
    >
      <ol className="space-y-1">
        {segments.map((seg, i) => (
          <li key={i}>
            <button
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              onClick={() => onLine(i)}
              aria-current={i === active}
              className={cn(
                "block w-full text-left font-serif text-[1.3rem] leading-relaxed transition-colors duration-200 sm:text-[1.45rem]",
                i === active ? "text-lime" : i < active ? "text-bone-46" : "text-bone-64 hover:text-bone",
              )}
            >
              {seg.text}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
