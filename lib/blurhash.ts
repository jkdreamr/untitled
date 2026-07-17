import "server-only";

import { decode } from "blurhash";

const cache = new Map<string, string>();

/**
 * Decode a blurhash into a tiny PNG data URL for next/image's blur placeholder.
 * Cached per-hash in memory. Returns null on any failure (image still renders).
 */
export async function blurhashToDataUrl(hash: string | null, w = 32, h = 32): Promise<string | null> {
  if (!hash) return null;
  const key = `${hash}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const pixels = decode(hash, w, h);
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();
    const url = `data:image/png;base64,${png.toString("base64")}`;
    if (cache.size < 2000) cache.set(key, url);
    return url;
  } catch {
    return null;
  }
}
