"use server";

import { FeedItems } from "@/components/feed/feed-items";
import { getFollowingFeed, getWander } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";
import type { Cursor } from "@/lib/types";
import type { PlayerTrack } from "@/components/player/player-context";

export interface MorePage {
  node: React.ReactNode;
  nextCursor: Cursor | null;
  tracks: PlayerTrack[];
}

/** Append the next page of the following feed (RSC-streamed). */
export async function loadMoreFeed(cursor: Cursor): Promise<MorePage> {
  const user = await getSessionUser();
  const { cards, nextCursor } = await getFollowingFeed(cursor);
  return {
    node: <FeedItems cards={cards} authed={!!user} />,
    nextCursor,
    tracks: cardsToTracks(cards),
  };
}

/** Append the next batch of wander items (excludes what's already shown). */
export async function loadMoreWander(
  exclude: string[],
): Promise<{ node: React.ReactNode; ids: string[]; tracks: PlayerTrack[] }> {
  const user = await getSessionUser();
  const items = await getWander(24, exclude);
  const cards = items.map((i) => i.card);
  return {
    node: <FeedItems cards={cards} authed={!!user} />,
    ids: cards.map((c) => c.id),
    tracks: cardsToTracks(cards),
  };
}
