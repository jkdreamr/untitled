"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedQueueProvider } from "@/components/player/feed-queue";
import { loadMoreFeed } from "@/lib/feed/actions";
import { Button } from "@/components/ui/button";
import type { Cursor } from "@/lib/types";
import type { PlayerTrack } from "@/components/player/player-context";

export function FeedStream({
  initialNode,
  initialCursor,
  initialTracks,
}: {
  initialNode: React.ReactNode;
  initialCursor: Cursor | null;
  initialTracks: PlayerTrack[];
}) {
  const [chunks, setChunks] = useState<React.ReactNode[]>([initialNode]);
  const [cursor, setCursor] = useState<Cursor | null>(initialCursor);
  const [tracks, setTracks] = useState<PlayerTrack[]>(initialTracks);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const more = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const r = await loadMoreFeed(cursor);
      setChunks((c) => [...c, r.node]);
      setTracks((t) => [...t, ...r.tracks]);
      setCursor(r.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && more(), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, more]);

  return (
    <FeedQueueProvider tracks={tracks}>
      {chunks.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
      <div ref={sentinel} aria-hidden />
      <div className="py-10 text-center">
        {cursor ? (
          <Button variant="ghost" onClick={more} disabled={loading}>
            {loading ? "loading…" : "more"}
          </Button>
        ) : (
          <p className="meta text-bone-32">that&apos;s everything for now.</p>
        )}
      </div>
    </FeedQueueProvider>
  );
}
