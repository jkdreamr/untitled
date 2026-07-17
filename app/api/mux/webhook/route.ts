import { NextResponse } from "next/server";
import { verifyMuxWebhook } from "@/lib/mux/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEATURES } from "@/lib/env.server";

export const runtime = "nodejs";

/**
 * Mux webhook. Verifies the signature, then finalizes video pieces:
 * video.asset.ready -> write playback id + duration + a video piece_media row.
 * Requires the service role (no user session on a webhook).
 */
export async function POST(request: Request) {
  if (!FEATURES.muxWebhook) return NextResponse.json({ error: "not configured" }, { status: 404 });

  const raw = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = verifyMuxWebhook(raw, headers) as typeof event;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "server not configured" }, { status: 503 });

  const data = event.data ?? {};
  const pieceId = typeof data.passthrough === "string" ? data.passthrough : undefined;

  if (event.type === "video.asset.ready" && pieceId) {
    const playbackId = Array.isArray(data.playback_ids)
      ? (data.playback_ids[0] as { id?: string } | undefined)?.id
      : undefined;
    const assetId = typeof data.id === "string" ? data.id : null;
    const duration = typeof data.duration === "number" ? data.duration : null;
    const aspect = typeof data.aspect_ratio === "string" ? data.aspect_ratio : "16:9";
    const [awStr, ahStr] = aspect.split(":");
    const aw = Number(awStr);
    const ah = Number(ahStr);
    const width = Number.isFinite(aw) && aw > 0 ? Math.round(aw * 100) : 1600;
    const height = Number.isFinite(ah) && ah > 0 ? Math.round(ah * 100) : 900;

    await admin
      .from("pieces")
      .update({ mux_playback_id: playbackId ?? null, mux_asset_id: assetId })
      .eq("id", pieceId);

    await admin.from("piece_media").insert({
      piece_id: pieceId,
      kind: "video",
      storage_path: null,
      width,
      height,
      duration_seconds: duration,
      position: 0,
    });
  } else if (event.type === "video.asset.errored" && pieceId) {
    // hide a piece whose asset failed to process
    await admin.from("pieces").update({ status: "hidden" }).eq("id", pieceId);
  }

  return NextResponse.json({ received: true });
}
