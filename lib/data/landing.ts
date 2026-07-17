import "server-only";

import { getWander } from "@/lib/data/pieces";
import { muxThumbnail } from "@/lib/mux/thumb";
import { SAMPLER, type PreviewItem } from "@/lib/sampler";
import type { PieceCard } from "@/lib/types";

/**
 * The landing strip: real recent public pieces when the feed is seeded,
 * a curated illustrative sampler otherwise, so the page always feels alive.
 */
export async function getLandingPreviews(): Promise<PreviewItem[]> {
  let cards: PieceCard[] = [];
  try {
    const wander = await getWander(8);
    cards = wander.map((w) => w.card);
  } catch {
    cards = [];
  }
  if (cards.length < 4) return [...SAMPLER];
  return cards.map(toPreview);
}

function toPreview(card: PieceCard): PreviewItem {
  const audio = card.media.find((m) => m.kind === "audio");
  const image = card.media.find((m) => m.kind === "image");
  return {
    medium: card.medium,
    title: card.title,
    sequenceNo: card.sequence_no,
    artistName: card.artist.display_name,
    artistHandle: card.artist.handle,
    date: card.published_at,
    tags: card.tags.slice(0, 3),
    peaks: audio?.peaks ?? undefined,
    duration: audio?.duration_seconds ?? undefined,
    imageUrl:
      card.medium === "video" && card.mux_playback_id
        ? muxThumbnail(card.mux_playback_id, 640)
        : (image?.url ?? undefined),
    words: card.medium === "words" ? (card.body ?? undefined) : undefined,
  };
}
