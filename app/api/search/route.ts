import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { searchPieces, searchArtists } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { consumeUserRateLimit, consumeAnonRateLimit, subjectFromRequest } from "@/lib/rate-limit";
import { ARTIST_ROLES, OPEN_TO, type Medium, type TrackKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA = new Set<Medium>(["sound", "video"]);
const VALID_KINDS = new Set<TrackKind>(["original", "cover", "beat", "freestyle"]);
const VALID_ROLES = new Set<string>(ARTIST_ROLES);
const VALID_OPEN_TO = new Set<string>(OPEN_TO);

function list(v: string | null): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Search endpoint (GET, cancellable from the client). Returns two sections —
 * tracks and musicians. Rate-limited; on limit it degrades to empty results
 * rather than erroring — search never errors the user.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const media = list(url.searchParams.get("media")).filter((m): m is Medium => VALID_MEDIA.has(m as Medium));
  const kinds = list(url.searchParams.get("kinds")).filter((k): k is TrackKind => VALID_KINDS.has(k as TrackKind));
  const roles = list(url.searchParams.get("roles")).filter((r) => VALID_ROLES.has(r));
  const openTo = list(url.searchParams.get("open_to")).filter((o) => VALID_OPEN_TO.has(o));
  const tags = list(url.searchParams.get("tags")).slice(0, 6);
  const vocalsParam = url.searchParams.get("vocals");
  const hasVocals = vocalsParam === "yes" ? true : vocalsParam === "no" ? false : undefined;

  const trackActive = !!q.trim() || media.length > 0 || kinds.length > 0 || hasVocals !== undefined || tags.length > 0;
  const artistActive = !!q.trim() || roles.length > 0 || openTo.length > 0;

  if (!trackActive && !artistActive) {
    return NextResponse.json({ results: [], artists: [] });
  }

  // rate limit: 60/min (user, else hashed IP)
  const user = await getSessionUser();
  const allowed = user
    ? await consumeUserRateLimit("search", 60, 60)
    : await consumeAnonRateLimit(await subjectFromRequest(await headers()), "search", 60, 60);
  if (!allowed) return NextResponse.json({ results: [], artists: [], limited: true });

  try {
    const [tracks, artists] = await Promise.all([
      trackActive
        ? searchPieces(q, { media, kinds, hasVocals, tags, limit: 30 })
        : Promise.resolve({ cards: [] }),
      artistActive ? searchArtists(q, { roles, openTo, tags, limit: 12 }) : Promise.resolve([]),
    ]);
    return NextResponse.json({ results: tracks.cards, artists });
  } catch {
    return NextResponse.json({ results: [], artists: [] }); // never error to the user
  }
}
