import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parseCard, attachSignedUrls, attachSignedUrlsOne } from "@/lib/data/cards";
import { embedQuery } from "@/lib/embeddings";
import type { PieceCard, PieceComment, Cursor, Medium, WanderItem, ReactionKind } from "@/lib/types";
import type { Json } from "@/lib/supabase/types";

export interface FeedPage {
  cards: PieceCard[];
  nextCursor: Cursor | null;
}

function toPage(
  rows: { card: Json; published_at: string; id: string }[] | null,
  limit: number,
): { cards: PieceCard[]; rows: { published_at: string; id: string }[] } {
  const cards: PieceCard[] = [];
  const kept: { published_at: string; id: string }[] = [];
  for (const r of rows ?? []) {
    const c = parseCard(r.card);
    if (c) {
      cards.push(c);
      kept.push({ published_at: r.published_at, id: r.id });
    }
  }
  return { cards, rows: kept };
}

export async function getFollowingFeed(cursor?: Cursor, limit = 20): Promise<FeedPage> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_following_feed", {
    p_cursor_ts: cursor?.ts,
    p_cursor_id: cursor?.id,
    p_limit: limit,
  });
  const { cards, rows } = toPage(data, limit);
  await attachSignedUrls(supabase, cards);
  const last = rows.length === limit ? rows[rows.length - 1] : null;
  return { cards, nextCursor: last ? { ts: last.published_at, id: last.id } : null };
}

export async function getProfilePieces(
  handle: string,
  medium: Medium | null,
  cursor?: Cursor,
  limit = 24,
): Promise<FeedPage> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_profile_pieces", {
    p_handle: handle,
    p_medium: medium ?? undefined,
    p_cursor_ts: cursor?.ts,
    p_cursor_id: cursor?.id,
    p_limit: limit,
  });
  const { cards, rows } = toPage(data, limit);
  await attachSignedUrls(supabase, cards);
  const last = rows.length === limit ? rows[rows.length - 1] : null;
  return { cards, nextCursor: last ? { ts: last.published_at, id: last.id } : null };
}

/** Fetch a set of cards by id (order preserved), batch-signed. */
export async function getCardsByIds(ids: string[]): Promise<PieceCard[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id) => supabase.rpc("piece_card_json", { p_id: id }).then((r) => parseCard(r.data))),
  );
  const cards = results.filter((c): c is PieceCard => !!c);
  await attachSignedUrls(supabase, cards);
  return cards;
}

export async function getPiece(id: string): Promise<PieceCard | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_piece", { p_id: id });
  const card = parseCard(data);
  if (!card) return null;
  return attachSignedUrlsOne(supabase, card);
}

export async function getPiecesAfter(id: string, limit = 12): Promise<PieceCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_pieces_after", { p_id: id, p_limit: limit });
  const cards = (data ?? []).map((r) => parseCard(r.card)).filter((c): c is PieceCard => !!c);
  return attachSignedUrls(supabase, cards);
}

export async function getPieceComments(id: string, limit = 100): Promise<PieceComment[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_piece_comments", { p_id: id, p_limit: limit });
  return (data ?? [])
    .map((r) => r.comment as unknown as PieceComment)
    .filter((c): c is PieceComment => !!c && typeof c === "object");
}

export async function getPieceReactions(id: string): Promise<Record<ReactionKind, number> | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_piece_reactions", { p_id: id });
  if (!data || typeof data !== "object") return null;
  return data as unknown as Record<ReactionKind, number>;
}

export interface SearchResult {
  cards: PieceCard[];
}

export async function searchPieces(
  query: string,
  opts: { media?: Medium[]; tags?: string[]; limit?: number } = {},
): Promise<SearchResult> {
  const supabase = await createClient();
  const trimmed = query.trim();
  // Layer A: embed the query in the same space as the corpus (graceful null).
  const emb = trimmed ? await embedQuery(trimmed) : null;

  const { data } = await supabase.rpc("search_pieces", {
    p_query: trimmed,
    p_query_emb: emb?.dim === 1536 ? emb.literal : undefined,
    p_query_emb_small: emb?.dim === 384 ? emb.literal : undefined,
    p_media: opts.media && opts.media.length ? opts.media : undefined,
    p_tags: opts.tags && opts.tags.length ? opts.tags : undefined,
    p_limit: opts.limit ?? 24,
  });

  const cards = (data ?? []).map((r) => parseCard(r.card)).filter((c): c is PieceCard => !!c);
  await attachSignedUrls(supabase, cards);
  return { cards };
}

/**
 * Wander pool + forced diversity, applied here (not in SQL):
 *   - never >2 consecutive same-medium or same-artist
 *   - ~20% of slots reserved for exploration (artists with <5 followers)
 */
export async function getWander(limit = 30, exclude: string[] = []): Promise<WanderItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_wander_pool", {
    p_limit: Math.min(80, limit * 2 + 20),
    p_exclude: exclude,
  });
  const pool: WanderItem[] = (data ?? [])
    .map((r) => {
      const card = parseCard(r.card);
      return card
        ? { card, score: r.score, is_exploration: r.is_exploration, medium: r.medium, artist_id: r.artist_id }
        : null;
    })
    .filter((x): x is WanderItem => !!x);

  const ordered = diversify(pool, limit);
  await attachSignedUrls(
    supabase,
    ordered.map((w) => w.card),
  );
  return ordered;
}

function diversify(pool: WanderItem[], limit: number): WanderItem[] {
  const explore = pool.filter((p) => p.is_exploration);
  const main = pool.filter((p) => !p.is_exploration);
  const targetExplore = Math.round(limit * 0.2);

  const result: WanderItem[] = [];
  const used = new Set<string>();

  const canPlace = (item: WanderItem): boolean => {
    const n = result.length;
    if (n >= 2) {
      const a = result[n - 1];
      const b = result[n - 2];
      if (a && b && a.medium === item.medium && b.medium === item.medium) return false;
      if (a && b && a.artist_id === item.artist_id && b.artist_id === item.artist_id) return false;
    }
    return true;
  };

  const take = (from: WanderItem[]) => {
    for (let i = 0; i < from.length; i++) {
      const item = from[i];
      if (!item || used.has(item.card.id)) continue;
      if (canPlace(item)) {
        result.push(item);
        used.add(item.card.id);
        return true;
      }
    }
    return false;
  };

  let exploreUsed = 0;
  while (result.length < limit) {
    const wantExplore = exploreUsed < targetExplore && result.length % 5 === 4;
    const primary = wantExplore ? explore : main;
    const secondary = wantExplore ? main : explore;
    const before = result.length;
    if (!take(primary)) take(secondary);
    if (result.length === before) break; // pool exhausted or all blocked
    if (wantExplore && result.length > before) exploreUsed++;
  }
  return result;
}
