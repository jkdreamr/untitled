"use server";

import { FeedItems } from "@/components/feed/feed-items";
import { getProfilePieces } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";
import type { MorePage } from "@/lib/feed/actions";
import type { Cursor, TrackKind } from "@/lib/types";

/** Paginate a musician's discography (bound to handle + track kind, then cursor). */
export async function loadMoreProfile(
  handle: string,
  kind: TrackKind | null,
  cursor: Cursor,
): Promise<MorePage> {
  const user = await getSessionUser();
  const { cards, nextCursor } = await getProfilePieces(handle, kind, cursor);
  return {
    node: <FeedItems cards={cards} authed={!!user} />,
    nextCursor,
    tracks: cardsToTracks(cards),
  };
}
