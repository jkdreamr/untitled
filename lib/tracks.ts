import { pieceTitle } from "@/lib/utils";
import type { PieceCard } from "@/lib/types";
import type { PlayerTrack } from "@/components/player/player-context";

/** Build the ordered audio queue for a list of cards (sound pieces with a URL). */
export function cardsToTracks(cards: PieceCard[]): PlayerTrack[] {
  const tracks: PlayerTrack[] = [];
  for (const card of cards) {
    const audio = card.media.find((m) => m.kind === "audio");
    if (card.medium === "sound" && audio?.url) {
      tracks.push({
        id: card.id,
        title: pieceTitle(card.title, card.sequence_no),
        artistName: card.artist.display_name,
        artistHandle: card.artist.handle,
        url: audio.url,
        peaks: audio.peaks,
        duration: audio.duration_seconds,
        href: `/piece/${card.id}`,
      });
    }
  }
  return tracks;
}
