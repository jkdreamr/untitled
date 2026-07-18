"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";
import { consumeUserRateLimit } from "@/lib/rate-limit";
import { normalizeTags } from "@/lib/taxonomy";
import { sniff, AUDIO_EXT } from "@/lib/media/validate";
import { PublishInput, type PublishInputT } from "@/lib/compose/schema";
import { FEATURES } from "@/lib/env.server";

const EXT_MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg",
  oga: "audio/ogg", aac: "audio/aac", flac: "audio/flac", webm: "audio/webm",
};

/** Mint a per-user, per-piece signed upload URL for the track's audio. Path is built server-side. */
export async function requestUploadUrl(
  pieceId: string,
  ext: string,
): Promise<{ ok: true; signedUrl: string; path: string; token: string } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in first" };
  if (!z.string().uuid().safeParse(pieceId).success) return { ok: false, error: "bad id" };

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!AUDIO_EXT.has(cleanExt)) return { ok: false, error: "unsupported audio type" };

  const path = `${user.id}/${pieceId}/audio.${cleanExt}`;

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("media").createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return { ok: false, error: "couldn't start upload" };
  return { ok: true, signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export interface PublishResult {
  ok: boolean;
  error?: string;
}

/** Publish a piece: validate, verify ownership + magic bytes, insert piece + media. */
export async function publishPiece(raw: PublishInputT): Promise<PublishResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "your session expired — sign in again." };

  const parsed = PublishInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "check the details" };
  }
  const input = parsed.data;

  if (input.medium === "video" && !FEATURES.video) {
    return { ok: false, error: "video posting isn't available right now." };
  }

  const allowed = await consumeUserRateLimit("post", 10, 24 * 60 * 60);
  if (!allowed) return { ok: false, error: "you've hit today's posting limit (10). rest the hands." };

  const supabase = await createClient();
  const prefix = `${user.id}/${input.id}/`;

  // ownership: the audio path must be inside this user's folder for this piece
  if (input.audio && !input.audio.path.startsWith(prefix)) return { ok: false, error: "audio path mismatch" };

  // magic-byte validation for audio (never trust the extension)
  if (input.medium === "sound" && input.audio) {
    const ok = await verifyAudioMagic(supabase, input.audio.path);
    if (!ok) {
      await supabase.storage.from("media").remove([input.audio.path]).catch(() => {});
      return { ok: false, error: "that file didn't look like audio." };
    }
  }

  // validate `after` target is visible
  if (input.after_piece_id) {
    const { data: viewable } = await supabase.rpc("can_view_piece", { p_id: input.after_piece_id });
    if (!viewable) return { ok: false, error: "the track you linked isn't available." };
  }

  const tags = normalizeTags(input.tags);
  const lyrics = input.lyrics?.trim() || null;
  // Beats/instrumentals carry no vocals; everything else defaults to having them.
  const hasVocals = input.track_kind === "beat" ? false : input.has_vocals;

  const { error: pieceErr } = await supabase.from("pieces").insert({
    id: input.id,
    artist_id: user.id,
    medium: input.medium,
    track_kind: input.track_kind,
    has_vocals: hasVocals,
    title: input.title?.trim() || null,
    caption: input.caption?.trim() || null,
    cover_of_title: input.cover_of_title?.trim() || null,
    cover_of_artist: input.cover_of_artist?.trim() || null,
    lyrics,
    // pasted lyrics are 'written'; the transcribe → confirm flow sets 'transcribed_confirmed'
    lyrics_source: lyrics ? (input.lyrics_source ?? "written") : null,
    show_lyrics: input.show_lyrics,
    tags,
    visibility: input.visibility,
    after_piece_id: input.after_piece_id ?? null,
    attested: true,
    status: "active",
    sequence_no: 0, // overwritten by the assign_piece_sequence trigger
  });
  if (pieceErr) {
    return { ok: false, error: pieceErr.code === "23505" ? "already posted." : "couldn't post that. try again." };
  }

  // audio media row (video lives in Mux; its media row is written by the webhook)
  if (input.medium === "sound" && input.audio) {
    const peaks = input.audio.peaks.map((p) => Math.round(Math.min(1, Math.max(0, p)) * 1000) / 1000);
    const ext = input.audio.path.split(".").pop()?.toLowerCase() ?? "mp3";
    const { error: mediaErr } = await supabase.from("piece_media").insert({
      piece_id: input.id,
      kind: "audio",
      storage_path: input.audio.path,
      duration_seconds: input.audio.duration,
      peaks,
      mime: EXT_MIME[ext] ?? input.audio.mime,
      bytes: input.audio.bytes,
      position: 0,
    });
    if (mediaErr) {
      // roll back the piece (cascades piece_search + jobs)
      await supabase.from("pieces").delete().eq("id", input.id);
      return { ok: false, error: "couldn't attach the audio. try again." };
    }
  }

  redirect(`/piece/${input.id}`);
}

/** Search-as-you-type over existing pieces for the "after" credit. */
export async function searchAfterPieces(
  query: string,
): Promise<Array<{ id: string; label: string; handle: string; medium: string }>> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_pieces", { p_query: q, p_limit: 8 });
  const out: Array<{ id: string; label: string; handle: string; medium: string }> = [];
  for (const row of data ?? []) {
    const c = row.card as Record<string, unknown> | null;
    if (!c) continue;
    const artist = c.artist as Record<string, unknown> | undefined;
    out.push({
      id: String(c.id),
      label: (c.title as string) || `untitled no. ${c.sequence_no}`,
      handle: String(artist?.handle ?? ""),
      medium: String(c.medium ?? ""),
    });
  }
  return out;
}

async function verifyAudioMagic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<boolean> {
  try {
    const { data } = await supabase.storage.from("media").createSignedUrl(path, 60);
    if (!data?.signedUrl) return false;
    const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-63" } });
    if (!res.ok && res.status !== 206) return false;
    const buf = new Uint8Array(await res.arrayBuffer());
    return sniff(buf).kind === "audio";
  } catch {
    return false;
  }
}
