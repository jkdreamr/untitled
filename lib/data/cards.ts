import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { PieceCard, MediaItem, LyricSegment } from "@/lib/types";

const MEDIA_TTL = 60 * 60; // 1h signed URLs
const AVATAR_TTL = 60 * 60;

/** Trust the shape from our own piece_card_json RPC; coerce the loose Json. */
export function parseCard(json: Json | null): PieceCard | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const c = json as Record<string, unknown>;
  const media = Array.isArray(c.media)
    ? (c.media as unknown[]).map((m) => {
        const mm = m as Record<string, unknown>;
        return {
          kind: mm.kind,
          storage_path: mm.storage_path ?? null,
          width: mm.width ?? null,
          height: mm.height ?? null,
          duration_seconds: mm.duration_seconds != null ? Number(mm.duration_seconds) : null,
          peaks: Array.isArray(mm.peaks) ? (mm.peaks as number[]) : null,
          blurhash: mm.blurhash ?? null,
          mime: mm.mime ?? null,
          position: Number(mm.position ?? 0),
          url: null,
        } as MediaItem;
      })
    : [];
  // Confirmed synced lyrics: keep only well-formed {start,end,text} lines.
  const lyric_segments: LyricSegment[] = Array.isArray(c.lyric_segments)
    ? (c.lyric_segments as unknown[])
        .map((s) => s as Record<string, unknown>)
        .filter((s) => s && typeof s.text === "string")
        .map((s) => ({ start: Number(s.start ?? 0), end: Number(s.end ?? 0), text: String(s.text) }))
    : [];
  return { ...(c as unknown as PieceCard), media, lyric_segments };
}

/**
 * Attach short-lived signed URLs to a batch of cards. Buckets are private, so
 * everything is served through time-limited signed URLs. One batched call per
 * bucket keeps feed rendering cheap.
 */
export async function attachSignedUrls(
  supabase: SupabaseClient<Database>,
  cards: PieceCard[],
): Promise<PieceCard[]> {
  const mediaPaths = new Set<string>();
  const avatarPaths = new Set<string>();
  for (const card of cards) {
    for (const m of card.media) if (m.storage_path) mediaPaths.add(m.storage_path);
    if (card.artist.avatar_path) avatarPaths.add(card.artist.avatar_path);
  }

  const [mediaMap, avatarMap] = await Promise.all([
    signBatch(supabase, "media", [...mediaPaths], MEDIA_TTL),
    signBatch(supabase, "avatars", [...avatarPaths], AVATAR_TTL),
  ]);

  for (const card of cards) {
    for (const m of card.media) m.url = m.storage_path ? (mediaMap.get(m.storage_path) ?? null) : null;
    card.artist.avatar_url = card.artist.avatar_path
      ? (avatarMap.get(card.artist.avatar_path) ?? null)
      : null;
  }
  return cards;
}

export async function attachSignedUrlsOne(
  supabase: SupabaseClient<Database>,
  card: PieceCard,
): Promise<PieceCard> {
  const [one] = await attachSignedUrls(supabase, [card]);
  return one ?? card;
}

async function signBatch(
  supabase: SupabaseClient<Database>,
  bucket: string,
  paths: string[],
  ttl: number,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, ttl);
  if (error || !data) return map;
  for (const row of data) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

/** Sign a single storage path (used for OG images, avatar on profile, etc.). */
export async function signOne(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string | null,
  ttl = AVATAR_TTL,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  return data?.signedUrl ?? null;
}
