import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { searchPieces } from "@/lib/data/pieces";

export const metadata: Metadata = { title: "search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const query = (q ?? "").slice(0, 200);
  const tags = tag ? [tag.slice(0, 30)] : [];

  let initialResults: Awaited<ReturnType<typeof searchPieces>>["cards"] = [];
  if (query.trim() || tags.length) {
    const { cards } = await searchPieces(query, { tags, limit: 30 });
    initialResults = cards;
  }

  return <SearchView initialQuery={query} initialTags={tags} initialResults={initialResults} />;
}
