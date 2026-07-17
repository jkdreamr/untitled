import type { Metadata } from "next";
import Link from "next/link";
import { FeedItems } from "@/components/feed/feed-items";
import { FeedStream } from "@/components/feed/feed-stream";
import { buttonClasses } from "@/components/ui/button";
import { getFollowingFeed } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";

export const metadata: Metadata = { title: "your feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  const { cards, nextCursor } = await getFollowingFeed();

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-bone">your feed is quiet.</h1>
        <p className="mt-3 text-sm leading-relaxed text-bone-46">
          nothing here yet — that&apos;s the point. follow a few artists, or post the first take.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/wander" className={buttonClasses("solid", "md")}>
            wander in
          </Link>
          <Link href="/compose" className={buttonClasses("outline", "md")}>
            post something
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <div className="flex items-baseline justify-between py-6">
        <h1 className="font-serif text-2xl text-bone">following</h1>
        <span className="meta">reverse-chronological · no ranking</span>
      </div>
      <FeedStream
        initialNode={<FeedItems cards={cards} authed={!!user} firstPriority />}
        initialCursor={nextCursor}
        initialTracks={cardsToTracks(cards)}
      />
    </div>
  );
}
