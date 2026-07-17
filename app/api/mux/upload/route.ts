import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMux } from "@/lib/mux/client";
import { FEATURES } from "@/lib/env.server";
import { consumeUserRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({ pieceId: z.string().uuid() });

/** Create a Mux direct-upload URL. The client uploads the video straight to Mux. */
export async function POST(request: Request) {
  if (!FEATURES.video) return NextResponse.json({ error: "video unavailable" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  if (!(await consumeUserRateLimit("post", 10, 24 * 60 * 60))) {
    return NextResponse.json({ error: "daily posting limit reached" }, { status: 429 });
  }

  const mux = getMux();
  if (!mux) return NextResponse.json({ error: "video unavailable" }, { status: 404 });

  const origin = request.headers.get("origin") ?? "*";
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: {
        playback_policies: ["public"],
        passthrough: parsed.data.pieceId,
        video_quality: "basic",
      },
    });
    return NextResponse.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch {
    return NextResponse.json({ error: "couldn't start the video upload" }, { status: 502 });
  }
}
