/**
 * Content sniffing by magic bytes — never trust the extension or client mime.
 * Used server-side to gate uploads before they are stored or referenced.
 */

export type SniffKind = "audio" | "image" | "video";
export interface Sniffed {
  kind: SniffKind | null;
  type: string | null;
}

const startsWith = (b: Uint8Array, sig: number[], off = 0) =>
  sig.every((v, i) => b[off + i] === v);

const ascii = (b: Uint8Array, s: string, off = 0) =>
  [...s].every((c, i) => b[off + i] === c.charCodeAt(0));

export function sniff(bytes: Uint8Array): Sniffed {
  const b = bytes;
  // images
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { kind: "image", type: "image/jpeg" };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return { kind: "image", type: "image/png" };
  if (ascii(b, "RIFF") && ascii(b, "WEBP", 8)) return { kind: "image", type: "image/webp" };
  if (ascii(b, "GIF8")) return { kind: "image", type: "image/gif" };
  // HEIC/HEIF (ISO-BMFF): 'ftyp' at 4, brand at 8
  if (ascii(b, "ftyp", 4)) {
    const brand = String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
    if (["heic", "heix", "hevc", "heif", "mif1", "msf1"].includes(brand))
      return { kind: "image", type: "image/heic" };
    if (["M4A ", "mp42", "isom", "mp41", "iso2", "avc1", "dash"].includes(brand)) {
      // could be audio (m4a) or video (mp4); disambiguated by caller context
      return brand === "M4A " ? { kind: "audio", type: "audio/mp4" } : { kind: "video", type: "video/mp4" };
    }
    return { kind: "video", type: "video/mp4" };
  }
  // audio
  if (ascii(b, "ID3")) return { kind: "audio", type: "audio/mpeg" };
  if (b[0] === 0xff && (b[1] === 0xfb || b[1] === 0xf3 || b[1] === 0xf2 || b[1] === 0xfa))
    return { kind: "audio", type: "audio/mpeg" };
  if (ascii(b, "RIFF") && ascii(b, "WAVE", 8)) return { kind: "audio", type: "audio/wav" };
  if (ascii(b, "OggS")) return { kind: "audio", type: "audio/ogg" };
  if (ascii(b, "fLaC")) return { kind: "audio", type: "audio/flac" };
  // webm / matroska (audio or video)
  if (startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "video", type: "video/webm" };
  return { kind: null, type: null };
}

export const MAX_BYTES = {
  audio: 50 * 1024 * 1024,
  image: 25 * 1024 * 1024,
  video: 500 * 1024 * 1024, // Mux enforces; this is a client hint
} as const;

export const AUDIO_EXT = new Set(["mp3", "wav", "m4a", "ogg", "oga", "aac", "flac", "webm"]);
export const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"]);
export const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv"]);

export function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
