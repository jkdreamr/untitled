import "server-only";

import { encode } from "blurhash";

export interface ProcessedImage {
  webp: Buffer;
  width: number;
  height: number;
  blurhash: string;
}

const MAX_EDGE = 2000; // longest edge; never upscale, never crop

/**
 * Process an uploaded image server-side:
 *   - auto-orient from EXIF, then strip ALL metadata (incl. GPS)
 *   - convert HEIC/anything to web-safe webp
 *   - downscale to a sane max edge (never crop, never upscale)
 *   - compute a blurhash placeholder
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const sharp = (await import("sharp")).default;

  // rotate() bakes EXIF orientation into pixels; not calling withMetadata() drops all metadata.
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const srcW = meta.width ?? MAX_EDGE;
  const srcH = meta.height ?? MAX_EDGE;
  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const webp = await base
    .clone()
    .resize(outW, outH, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  // blurhash from a tiny raster
  const small = await sharp(webp).raw().ensureAlpha().resize(32, 32, { fit: "inside" }).toBuffer({ resolveWithObject: true });
  const blurhash = encode(
    new Uint8ClampedArray(small.data),
    small.info.width,
    small.info.height,
    4,
    3,
  );

  return { webp, width: outW, height: outH, blurhash };
}
