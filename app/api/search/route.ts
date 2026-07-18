import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { searchPieces } from "@/lib/data/pieces";
import { getSessionUser } from "@/lib/data/profiles";
import { consumeUserRateLimit, consumeAnonRateLimit, subjectFromRequest } from "@/lib/rate-limit";
import type { Medium } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA = new Set<Medium>(["sound", "video"]);

/**
 * Search endpoint (GET, cancellable from the client). Rate-limited; on limit it
 * degrades to empty results rather than erroring — search never errors the user.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const media = (url.searchParams.get("media") ?? "")
    .split(",")
    .filter((m): m is Medium => VALID_MEDIA.has(m as Medium));
  const tags = (url.searchParams.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6);

  if (!q.trim() && media.length === 0 && tags.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // rate limit: 60/min (user, else hashed IP)
  const user = await getSessionUser();
  const allowed = user
    ? await consumeUserRateLimit("search", 60, 60)
    : await consumeAnonRateLimit(await subjectFromRequest(await headers()), "search", 60, 60);
  if (!allowed) return NextResponse.json({ results: [], limited: true });

  try {
    const { cards } = await searchPieces(q, { media, tags, limit: 30 });
    return NextResponse.json({ results: cards });
  } catch {
    return NextResponse.json({ results: [] }); // never error to the user
  }
}
