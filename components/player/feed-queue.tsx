"use client";

import { createContext, useContext } from "react";
import type { PlayerTrack } from "@/components/player/player-context";

const FeedQueueContext = createContext<PlayerTrack[] | null>(null);

/**
 * Wraps a run of feed cards so pressing play on one enqueues all the audio
 * pieces in view — the queue keeps going while you scroll.
 */
export function FeedQueueProvider({
  tracks,
  children,
}: {
  tracks: PlayerTrack[];
  children: React.ReactNode;
}) {
  return <FeedQueueContext.Provider value={tracks}>{children}</FeedQueueContext.Provider>;
}

export function useFeedQueue(): PlayerTrack[] | null {
  return useContext(FeedQueueContext);
}
