"use server";

import { FeedItems } from "@/components/feed/feed-items";
import { getProfilePieces } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";
import type { MorePage } from "@/lib/feed/actions";
import type { Cursor, Medium } from "@/lib/types";

/** Paginate a profile's work grid (bound to handle + medium, then cursor). */
export async function loadMoreProfile(
  handle: string,
  medium: Medium | null,
  cursor: Cursor,
): Promise<MorePage> {
  const user = await getSessionUser();
  const { cards, nextCursor } = await getProfilePieces(handle, medium, cursor);
  return {
    node: <FeedItems cards={cards} authed={!!user} />,
    nextCursor,
    tracks: cardsToTracks(cards),
  };
}
