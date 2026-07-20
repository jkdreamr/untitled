import type { Metadata } from "next";
import Link from "next/link";
import { FeedItems } from "@/components/feed/feed-items";
import { WanderStream } from "@/components/wander/wander-stream";
import { buttonClasses } from "@/components/ui/button";
import { getWander } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";

export const metadata: Metadata = { title: "wander" };
export const dynamic = "force-dynamic";

export default async function WanderPage() {
  const [items, user] = await Promise.all([getWander(24), getSessionUser()]);
  const cards = items.map((i) => i.card);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <div className="py-6">
        <h1 className="font-serif text-2xl text-bone">wander</h1>
      </div>

      {cards.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl text-bone">nothing to wander yet.</p>
          <Link href="/compose" className={buttonClasses("solid", "md", "mt-6")}>post the first take</Link>
        </div>
      ) : (
        <WanderStream
          initialNode={<FeedItems cards={cards} authed={!!user} firstPriority />}
          initialIds={cards.map((c) => c.id)}
          initialTracks={cardsToTracks(cards)}
        />
      )}
    </div>
  );
}
