import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoutNav } from "@/components/scout/scout-nav";
import { ScoutSearchControls } from "@/components/scout/scout-search-controls";
import { SaveSearchButton } from "@/components/scout/save-search-button";
import { ArtistRow } from "@/components/scout/artist-row";
import {
  isApprovedScout,
  scoutSearchArtists,
  getScoutListNames,
  getSavedSearches,
  type SavedSearchParams,
} from "@/lib/data/scout";
import { ARTIST_ROLES, OPEN_TO, type TrackKind } from "@/lib/types";

export const metadata: Metadata = { title: "scout · search", robots: "noindex" };
export const dynamic = "force-dynamic";

const VALID_KINDS = new Set(["original", "cover", "freestyle", "beat"]);
const VALID_ROLES = new Set<string>(ARTIST_ROLES);
const VALID_OPEN = new Set<string>(OPEN_TO);
const VALID_SORT = new Set(["momentum", "recent", "relevance"]);

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function savedToHref(p: SavedSearchParams): string {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.roles?.length) q.set("roles", p.roles.join(","));
  if (p.open_to?.length) q.set("open_to", p.open_to.join(","));
  if (p.kinds?.length) q.set("kinds", p.kinds.join(","));
  if (p.vocals && p.vocals !== "any") q.set("vocals", p.vocals);
  if (p.sort && p.sort !== "momentum") q.set("sort", p.sort);
  return `/scout/search${q.toString() ? `?${q}` : ""}`;
}

export default async function ScoutSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isApprovedScout())) notFound();

  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const q = (get("q") ?? "").slice(0, 200);
  const roles = list(get("roles")).filter((r) => VALID_ROLES.has(r));
  const openTo = list(get("open_to")).filter((o) => VALID_OPEN.has(o));
  const kinds = list(get("kinds")).filter((k) => VALID_KINDS.has(k)) as TrackKind[];
  const vocalsRaw = get("vocals");
  const vocals = vocalsRaw === "yes" ? "yes" : vocalsRaw === "no" ? "no" : "any";
  const hasVocals = vocals === "yes" ? true : vocals === "no" ? false : undefined;
  const sort = (VALID_SORT.has(get("sort") ?? "") ? get("sort")! : "momentum") as
    | "momentum"
    | "recent"
    | "relevance";

  const [artists, lists, saved] = await Promise.all([
    scoutSearchArtists({ query: q, roles, openTo, kinds, hasVocals, sort }),
    getScoutListNames(),
    getSavedSearches(),
  ]);

  const savedParams: SavedSearchParams = { q, roles, open_to: openTo, kinds, vocals, sort };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ScoutNav active="search" />
      <ScoutSearchControls initial={{ q, roles, openTo, kinds, vocals, sort }} />

      <div className="mt-4 flex items-center justify-between">
        <span className="meta text-bone-32">
          {artists.length} {artists.length === 1 ? "artist" : "artists"}
        </span>
        <SaveSearchButton params={savedParams as Record<string, unknown>} />
      </div>

      {saved.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="meta meta-caps text-bone-46">saved</span>
          {saved.map((s) => (
            <Link
              key={s.id}
              href={savedToHref(s.params)}
              className="meta rounded-full border border-bone-16 px-2.5 py-0.5 text-bone-64 transition-colors hover:text-bone"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        {artists.length === 0 ? (
          <p className="py-16 text-center text-sm text-bone-52">
            no artists match — widen the filters, or sort by recent.
          </p>
        ) : (
          artists.map((a) => <ArtistRow key={a.id} artist={a} lists={lists} />)
        )}
      </div>
    </div>
  );
}
