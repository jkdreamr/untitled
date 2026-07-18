"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";
import type { Json } from "@/lib/supabase/types";
import type { LyricSegment } from "@/lib/types";

export interface PendingTranscription {
  transcript: string | null;
  segments: LyricSegment[];
  already_confirmed: boolean;
  has_lyrics: boolean;
}

/**
 * Owner-only: the raw whisper output for a track, so the artist can review and
 * confirm it. The RPC returns null to anyone who isn't the track's owner, so
 * unconfirmed transcription never leaves the owner's own review surface.
 */
export async function fetchPendingTranscription(pieceId: string): Promise<PendingTranscription | null> {
  if (!z.string().uuid().safeParse(pieceId).success) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_pending_transcription", { p_id: pieceId });
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const segments: LyricSegment[] = Array.isArray(d.segments)
    ? (d.segments as unknown[])
        .map((s) => s as Record<string, unknown>)
        .filter((s) => s && typeof s.text === "string")
        .map((s) => ({ start: Number(s.start ?? 0), end: Number(s.end ?? 0), text: String(s.text) }))
    : [];
  return {
    transcript: typeof d.transcript === "string" ? d.transcript : null,
    segments,
    already_confirmed: Boolean(d.already_confirmed),
    has_lyrics: Boolean(d.has_lyrics),
  };
}

const SegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string().min(1).max(500),
});

/** Owner confirms (optionally edited) lyrics + the synced lines they trust. */
export async function confirmLyrics(
  pieceId: string,
  lyrics: string,
  segments: LyricSegment[],
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in first" };
  if (!z.string().uuid().safeParse(pieceId).success) return { ok: false, error: "bad id" };

  const cleanLyrics = lyrics.trim().slice(0, 4000);
  if (!cleanLyrics) return { ok: false, error: "nothing to confirm" };

  const parsedSegments = z.array(SegmentSchema).max(400).safeParse(segments);
  const segs = parsedSegments.success ? parsedSegments.data : [];

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_lyrics", {
    p_id: pieceId,
    p_lyrics: cleanLyrics,
    p_segments: segs as unknown as Json,
  });
  if (error) return { ok: false, error: "couldn't save the lyrics. try again." };

  revalidatePath(`/piece/${pieceId}`);
  return { ok: true };
}
