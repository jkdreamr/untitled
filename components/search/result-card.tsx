"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/player-context";
import { WaveformStatic } from "@/components/media/waveform-static";
import { TrackKindTag } from "@/components/piece/track-kind-tag";
import { muxThumbnail } from "@/lib/mux/thumb";
import { pieceTitle, formatPieceDate } from "@/lib/utils";
import type { PieceCard } from "@/lib/types";

export function ResultCard({ card }: { card: PieceCard }) {
  const player = usePlayer();
  const audio = card.media.find((m) => m.kind === "audio");
  const label = pieceTitle(card.title, card.sequence_no);
  const isPlaying = player.isCurrent(card.id) && player.playing;

  function playAudio(e: React.MouseEvent) {
    e.preventDefault();
    if (!audio?.url) return;
    if (player.isCurrent(card.id)) player.toggle();
    else
      player.play({
        id: card.id, title: label, artistName: card.artist.display_name, artistHandle: card.artist.handle,
        url: audio.url, peaks: audio.peaks, duration: audio.duration_seconds, href: `/piece/${card.id}`,
      });
  }

  return (
    <Link
      href={`/piece/${card.id}`}
      className="group flex items-center gap-4 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-bone-10 hover:bg-bone-06"
    >
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-sunken">
        {card.medium === "video" && card.mux_playback_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={muxThumbnail(card.mux_playback_id, 128)} alt="" className="h-full w-full object-cover" />
        ) : (
          <button onClick={playAudio} aria-label={isPlaying ? "pause" : "play"} className="grid size-9 place-items-center rounded-full border border-bone-16 text-bone hover:border-lime hover:text-lime">
            {isPlaying ? (
              <svg width="11" height="11" viewBox="0 0 12 12"><rect x="2.5" y="2" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="7" y="2" width="2.5" height="8" rx="1" fill="currentColor"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor"/></svg>
            )}
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-bone group-hover:text-bone">{label}</p>
        <p className="meta mt-0.5 flex items-center gap-1.5 truncate">
          <span className="truncate">@{card.artist.handle}</span>
          <span className="meta-caps">{card.medium === "video" ? "video" : "audio"}</span>
          <TrackKindTag kind={card.track_kind} />
          <span className="shrink-0">· {formatPieceDate(card.published_at)}</span>
        </p>
        {card.lyric_hit && card.lyrics ? (
          <p className="mt-1 line-clamp-1 font-serif text-sm text-lime/80">“{card.lyrics}”</p>
        ) : card.lyrics ? (
          <p className="mt-1 line-clamp-1 font-serif text-sm text-bone-46">{card.lyrics}</p>
        ) : null}
      </div>

      {card.medium === "sound" && (
        <div className="hidden h-6 w-24 shrink-0 sm:block">
          <WaveformStatic peaks={audio?.peaks} bars={28} />
        </div>
      )}
    </Link>
  );
}
