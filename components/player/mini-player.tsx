"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/player-context";
import { Waveform } from "@/components/media/waveform";
import { formatDuration, pieceTitle } from "@/lib/utils";

export function MiniPlayer() {
  const player = usePlayer();
  const t = player.current;
  if (!t) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bone-10 bg-ink/85 backdrop-blur-xl [box-shadow:var(--shadow-player)] [animation:veil-up_.24s_var(--ease-out)_both]">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <button
          onClick={player.toggle}
          aria-label={player.playing ? "pause" : "play"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-bone text-ink transition-transform duration-150 active:scale-95"
        >
          {player.playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>

        <div className="hidden min-w-0 shrink-0 basis-40 sm:block">
          <Link href={t.href} className="block truncate text-sm text-bone hover:underline">
            {t.title}
          </Link>
          <Link href={`/${t.artistHandle}`} className="meta block truncate hover:text-bone">
            @{t.artistHandle}
          </Link>
        </div>

        <span className="meta hidden w-9 shrink-0 text-right tabular-nums sm:inline">
          {formatDuration(player.time)}
        </span>
        <div className="h-8 flex-1">
          <Waveform peaks={t.peaks} progress={player.progress} bars={72} onSeek={player.seekRatio} label="seek in track" />
        </div>
        <span className="meta w-9 shrink-0 tabular-nums">{formatDuration(player.duration)}</span>

        <div className="flex shrink-0 items-center gap-1">
          {player.queue.length > 1 && (
            <>
              <button onClick={player.prev} aria-label="previous" className="grid size-8 place-items-center rounded-full text-bone-46 hover:text-bone">
                <SkipGlyph dir="prev" />
              </button>
              <button onClick={player.next} aria-label="next" className="grid size-8 place-items-center rounded-full text-bone-46 hover:text-bone">
                <SkipGlyph dir="next" />
              </button>
            </>
          )}
          <button onClick={player.stop} aria-label="close player" className="grid size-8 place-items-center rounded-full text-bone-32 hover:text-bone">
            <CloseGlyph />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden>
      <path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <rect x="2.5" y="2" width="2.5" height="8" rx="1" fill="currentColor" />
      <rect x="7" y="2" width="2.5" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}
function SkipGlyph({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden style={{ transform: dir === "prev" ? "scaleX(-1)" : undefined }}>
      <path d="M3 3.5v7l5-3.5-5-3.5Z" fill="currentColor" />
      <rect x="9.5" y="3" width="1.6" height="8" rx="0.8" fill="currentColor" />
    </svg>
  );
}
function CloseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
