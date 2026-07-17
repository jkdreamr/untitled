import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { processImage } from "@/lib/images/process";
import { sniff } from "@/lib/media/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  pieceId: z.string().uuid(),
  stagingPath: z.string().min(1),
  position: z.number().int().min(0).max(5),
});

/**
 * Process a staged image original: verify ownership + magic bytes, strip EXIF,
 * convert to webp, compute blurhash, store under the piece folder, drop staging.
 * Runs as the authenticated user (RLS-scoped) — no service role needed.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { pieceId, stagingPath, position } = parsed.data;

  if (!stagingPath.startsWith(`${user.id}/staging/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: blob, error: dlErr } = await supabase.storage.from("media").download(stagingPath);
  if (dlErr || !blob) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.byteLength > 25 * 1024 * 1024) {
    await supabase.storage.from("media").remove([stagingPath]).catch(() => {});
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  if (sniff(buf).kind !== "image") {
    await supabase.storage.from("media").remove([stagingPath]).catch(() => {});
    return NextResponse.json({ error: "not an image" }, { status: 415 });
  }

  let processed;
  try {
    processed = await processImage(buf);
  } catch {
    return NextResponse.json({ error: "couldn't process image" }, { status: 422 });
  }

  const finalPath = `${user.id}/${pieceId}/${position}.webp`;
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(finalPath, processed.webp, { contentType: "image/webp", upsert: true });
  if (upErr) return NextResponse.json({ error: "couldn't store image" }, { status: 500 });

  await supabase.storage.from("media").remove([stagingPath]).catch(() => {});

  return NextResponse.json({
    path: finalPath,
    width: processed.width,
    height: processed.height,
    blurhash: processed.blurhash,
    bytes: processed.webp.byteLength,
  });
}
