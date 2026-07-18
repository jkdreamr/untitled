"use client";

import { useState } from "react";
import { SyncedLyrics } from "@/components/piece/synced-lyrics";
import { cn, pieceTitle } from "@/lib/utils";
import type { PieceCard } from "@/lib/types";
import type { PlayerTrack } from "@/components/player/player-context";

/**
 * Confirmed lyrics on a track page. Audio tracks get the synced, tap-to-seek
 * view; video tracks get a toggle panel (the artist's show_lyrics sets whether
 * it opens by default). Nothing renders until lyrics are confirmed.
 */
export function TrackLyrics({ card }: { card: PieceCard }) {
  const [open, setOpen] = useState(card.show_lyrics);
  if (!card.lyrics) return null;

  const sourceLabel = card.lyrics_source === "transcribed_confirmed" ? "lyrics · transcribed, confirmed" : "lyrics";

  if (card.medium === "video") {
    return (
      <section aria-label="lyrics" className="mt-4">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="meta meta-caps flex items-center gap-2 text-bone-46 transition-colors hover:text-bone"
        >
          <span>{open ? "hide lyrics" : "show lyrics"}</span>
          <span className={cn("transition-transform duration-200", open && "rotate-90")}>›</span>
        </button>
        {open && (
          <div className="mt-3 [animation:veil-up_.24s_var(--ease-out)_both]">
            <p className="meta meta-caps mb-2 text-bone-32">{sourceLabel}</p>
            <div className="prose-words whitespace-pre-wrap rounded-lg bg-ink-sunken/40 p-6 font-serif text-[1.25rem] leading-relaxed text-bone-80 sm:p-8 sm:text-[1.4rem]">
              {card.lyrics}
            </div>
          </div>
        )}
      </section>
    );
  }

  // audio: synced, tap-to-seek
  const audio = card.media.find((m) => m.kind === "audio");
  const track: PlayerTrack | undefined = audio?.url
    ? {
        id: card.id,
        title: pieceTitle(card.title, card.sequence_no),
        artistName: card.artist.display_name,
        artistHandle: card.artist.handle,
        url: audio.url,
        peaks: audio.peaks,
        duration: audio.duration_seconds,
        href: `/piece/${card.id}`,
      }
    : undefined;

  return (
    <section aria-label="lyrics" className="mt-4">
      <p className="meta meta-caps mb-2 text-bone-32">{sourceLabel}</p>
      <SyncedLyrics
        pieceId={card.id}
        lyrics={card.lyrics}
        segments={card.lyric_segments}
        track={track}
      />
    </section>
  );
}
