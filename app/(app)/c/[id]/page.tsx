import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { FeedItems } from "@/components/feed/feed-items";
import { FeedQueueProvider } from "@/components/player/feed-queue";
import { CollectionFollow, DeleteCollection } from "@/components/collections/collection-actions";
import { getCollection } from "@/lib/data/collections";
import { getSessionUser } from "@/lib/data/profiles";
import { cardsToTracks } from "@/lib/tracks";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await getCollection(id);
  return { title: c ? `${c.title} · a board` : "board" };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, user] = await Promise.all([getCollection(id), getSessionUser()]);
  if (!collection) notFound();
  const authed = !!user;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-serif text-3xl text-bone">{collection.title}</h1>
        {collection.description && <p className="mt-2 text-sm leading-relaxed text-bone-64">{collection.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href={`/${collection.owner.handle}`} className="flex items-center gap-2">
            <Avatar url={collection.owner.avatar_url} name={collection.owner.display_name} size="xs" />
            <span className="text-sm text-bone-64 hover:text-bone">@{collection.owner.handle}</span>
          </Link>
          <span className="meta">{collection.item_count} pieces</span>
          <span className="meta">{formatCount(collection.follower_count)} followers</span>
          <div className="ml-auto flex items-center gap-3">
            {collection.is_owner ? (
              <DeleteCollection collectionId={collection.id} />
            ) : (
              <CollectionFollow collectionId={collection.id} initialFollowing={collection.is_following} authed={authed} />
            )}
          </div>
        </div>
      </header>

      <div className="mt-8 border-t border-bone-10">
        {collection.pieces.length === 0 ? (
          <p className="py-16 text-center text-sm text-bone-32">this board is empty.</p>
        ) : (
          <FeedQueueProvider tracks={cardsToTracks(collection.pieces)}>
            <FeedItems cards={collection.pieces} authed={authed} firstPriority />
          </FeedQueueProvider>
        )}
      </div>
    </div>
  );
}
