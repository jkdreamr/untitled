import type { Metadata } from "next";
import Link from "next/link";
import { listMyCollections, listPublicCollections, type CollectionSummary } from "@/lib/data/collections";
import { getSessionUser } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const user = await getSessionUser();
  const [mine, publicBoards] = await Promise.all([
    user ? listMyCollections() : Promise.resolve([]),
    listPublicCollections(),
  ]);
  const othersBoards = publicBoards.filter((b) => !mine.some((m) => m.id === b.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-3xl text-bone">collections</h1>
      <p className="meta mt-1">boards of work worth returning to. collect from any piece.</p>

      {user && (
        <section className="mt-10">
          <h2 className="meta meta-caps mb-4 text-bone-46">your boards</h2>
          {mine.length === 0 ? (
            <p className="text-sm text-bone-32">no boards yet. tap “collect” on any piece to start one.</p>
          ) : (
            <Grid boards={mine} />
          )}
        </section>
      )}

      <section className="mt-12">
        <h2 className="meta meta-caps mb-4 text-bone-46">boards to follow</h2>
        {othersBoards.length === 0 ? (
          <p className="text-sm text-bone-32">no public boards yet.</p>
        ) : (
          <Grid boards={othersBoards} showOwner />
        )}
      </section>
    </div>
  );
}

function Grid({ boards, showOwner = false }: { boards: CollectionSummary[]; showOwner?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((b) => (
        <Link
          key={b.id}
          href={`/c/${b.id}`}
          className="flex flex-col justify-between rounded-lg border border-bone-10 bg-ink-raised/40 p-5 transition-colors hover:border-bone-16"
        >
          <div>
            <p className="text-bone">{b.title}</p>
            {b.description && <p className="mt-1 line-clamp-2 text-sm text-bone-46">{b.description}</p>}
          </div>
          <p className="meta mt-4">
            {b.item_count} {b.item_count === 1 ? "piece" : "pieces"}
            {showOwner && b.owner_handle ? ` · @${b.owner_handle}` : ""}
            {!b.is_public ? " · private" : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}
