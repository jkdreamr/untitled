"use client";

import { usePlayer, type PlayerTrack } from "@/components/player/player-context";
import { useFeedQueue } from "@/components/player/feed-queue";
import { Waveform } from "@/components/media/waveform";
import { formatDuration } from "@/lib/utils";

export function SoundBlock({ track, tall = false }: { track: PlayerTrack; tall?: boolean }) {
  const player = usePlayer();
  const queue = useFeedQueue();
  const isCurrent = player.isCurrent(track.id);
  const playing = isCurrent && player.playing;
  const progress = isCurrent ? player.progress : 0;

  function onPress() {
    if (isCurrent) {
      player.toggle();
    } else if (queue && queue.length > 1 && queue.some((t) => t.id === track.id)) {
      player.playQueue(queue, track.id);
    } else {
      player.play(track);
    }
  }

  return (
    <div className={`flex items-center gap-4 rounded-lg bg-ink-sunken/70 px-4 ${tall ? "h-32" : "h-24"}`}>
      <button
        onClick={onPress}
        aria-label={playing ? "pause" : "play"}
        className="grid size-12 shrink-0 place-items-center rounded-full border border-bone-16 text-bone transition-all duration-150 hover:border-lime/60 hover:text-lime active:scale-95 data-[on=true]:border-lime data-[on=true]:text-lime"
        data-on={playing}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden>
            <rect x="2.5" y="2" width="2.5" height="8" rx="1" fill="currentColor" />
            <rect x="7" y="2" width="2.5" height="8" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 12 12" aria-hidden>
            <path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor" />
          </svg>
        )}
      </button>

      <div className="h-full flex-1 py-4">
        <Waveform
          peaks={track.peaks}
          progress={progress}
          bars={tall ? 96 : 72}
          draw={tall}
          onSeek={isCurrent ? player.seekRatio : undefined}
        />
      </div>

      <span className="meta w-16 shrink-0 text-right tabular-nums">
        {isCurrent ? formatDuration(player.time) : "0:00"} / {formatDuration(track.duration)}
      </span>
    </div>
  );
}
