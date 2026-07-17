"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedQueueProvider } from "@/components/player/feed-queue";
import { loadMoreWander } from "@/lib/feed/actions";
import { Button } from "@/components/ui/button";
import type { PlayerTrack } from "@/components/player/player-context";

/** A calm interstitial every ~40 pieces — discovery that tells you to leave. */
function Interstitial() {
  return (
    <div className="my-6 rounded-xl border border-bone-10 bg-ink-raised/40 px-6 py-10 text-center">
      <p className="font-serif text-2xl text-bone">you&apos;ve wandered far.</p>
      <p className="mt-2 text-sm text-bone-46">go make something.</p>
      <Link href="/compose" className="mt-5 inline-flex text-sm text-lime hover:underline">
        post a take →
      </Link>
    </div>
  );
}

export function WanderStream({
  initialNode,
  initialIds,
  initialTracks,
}: {
  initialNode: React.ReactNode;
  initialIds: string[];
  initialTracks: PlayerTrack[];
}) {
  const [chunks, setChunks] = useState<React.ReactNode[]>([initialNode]);
  const [tracks, setTracks] = useState<PlayerTrack[]>(initialTracks);
  const seen = useRef<Set<string>>(new Set(initialIds));
  const count = useRef<number>(initialIds.length);
  const nextInterstitial = useRef<number>(40);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialIds.length === 0);
  const sentinel = useRef<HTMLDivElement>(null);

  const more = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const r = await loadMoreWander([...seen.current]);
      const fresh = r.ids.filter((id) => !seen.current.has(id));
      if (fresh.length === 0) {
        setDone(true);
        return;
      }
      fresh.forEach((id) => seen.current.add(id));
      count.current += r.ids.length;
      setTracks((t) => [...t, ...r.tracks]);
      const additions: React.ReactNode[] = [r.node];
      if (count.current >= nextInterstitial.current) {
        additions.push(<Interstitial key={`int-${nextInterstitial.current}`} />);
        nextInterstitial.current += 40;
      }
      setChunks((c) => [...c, ...additions]);
    } finally {
      setLoading(false);
    }
  }, [loading, done]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && more(), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, done]);

  return (
    <FeedQueueProvider tracks={tracks}>
      {chunks.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
      <div ref={sentinel} aria-hidden />
      <div className="py-10 text-center">
        {done ? (
          <p className="meta text-bone-32">you&apos;ve seen it all for now. go make something.</p>
        ) : (
          <Button variant="ghost" onClick={more} disabled={loading}>
            {loading ? "finding…" : "wander further"}
          </Button>
        )}
      </div>
    </FeedQueueProvider>
  );
}
