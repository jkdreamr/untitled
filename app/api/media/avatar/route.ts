import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sniff } from "@/lib/media/validate";

export const runtime = "nodejs";

/** Process + store an avatar: EXIF-stripped, square, webp. Runs as the user. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (sniff(buf).kind !== "image") return NextResponse.json({ error: "not an image" }, { status: 415 });

  let webp: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    webp = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "couldn't process image" }, { status: 422 });
  }

  const path = `${user.id}/avatar-${Date.now()}.webp`;
  const { error } = await supabase.storage.from("avatars").upload(path, webp, { contentType: "image/webp", upsert: true });
  if (error) return NextResponse.json({ error: "couldn't store avatar" }, { status: 500 });

  return NextResponse.json({ path });
}
