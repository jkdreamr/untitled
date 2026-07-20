"use client";

import { usePlayer, type PlayerTrack } from "@/components/player/player-context";
import { cn, formatDuration } from "@/lib/utils";

/** Compact audition list — plays through the app's global mini-player. */
export function ScoutTracks({ tracks }: { tracks: PlayerTrack[] }) {
  const player = usePlayer();
  if (tracks.length === 0) {
    return <p className="py-6 text-sm text-bone-32">no audio tracks to audition here.</p>;
  }
  return (
    <div className="divide-y divide-bone-10">
      {tracks.map((t) => {
        const on = player.isCurrent(t.id);
        const playing = on && player.playing;
        return (
          <button
            key={t.id}
            onClick={() => player.playQueue(tracks, t.id)}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
                playing ? "border-lime text-lime" : "border-bone-16 text-bone-64 group-hover:text-bone",
              )}
            >
              {playing ? <Pause /> : <Play />}
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-sm", on ? "text-lime" : "text-bone")}>{t.title}</span>
            <span className="meta shrink-0">{formatDuration(t.duration ?? 0)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Play() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor" />
    </svg>
  );
}
function Pause() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="3" y="2.4" width="2.2" height="7.2" rx="0.6" fill="currentColor" />
      <rect x="6.8" y="2.4" width="2.2" height="7.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}
