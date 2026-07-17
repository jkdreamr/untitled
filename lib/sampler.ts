import type { Medium } from "@/lib/types";

/**
 * A curated, obviously-illustrative sampler for the logged-out landing strip.
 * Used only as a graceful fallback when the real seeded feed is empty, so the
 * page always feels alive. Fictional artists, no fabricated metrics anywhere.
 */
export interface PreviewItem {
  medium: Medium;
  title: string | null;
  sequenceNo: number;
  artistName: string;
  artistHandle: string;
  date: string;
  tags: string[];
  peaks?: number[];
  duration?: number;
  imageSvg?: string; // inline data URI (sampler)
  imageUrl?: string; // signed URL / mux thumbnail (real pieces)
  words?: string;
  aspect?: number; // w/h for image/video
}

/** Deterministic peaks (seeded) so server/client render identically. */
function peaks(seed: number, n = 96): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const env = Math.sin((i / n) * Math.PI); // fade in/out
    const detail = 0.35 + 0.65 * rand();
    out.push(Math.max(0.05, Math.min(1, env * detail)));
  }
  return out;
}

function inkWash(a: string, b: string, seed: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <defs><radialGradient id='g' cx='${30 + (seed % 40)}%' cy='${20 + (seed % 50)}%' r='90%'>
    <stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/></radialGradient>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>
    <feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0.06'/></feComponentTransfer></filter></defs>
    <rect width='400' height='400' fill='url(#g)'/>
    <rect width='400' height='400' filter='url(#n)' opacity='0.5'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SAMPLER: readonly PreviewItem[] = [
  {
    medium: "sound",
    title: null,
    sequenceNo: 12,
    artistName: "Wren Adeyemi",
    artistHandle: "wren_hums",
    date: "2026-06-30",
    tags: ["bedroom-pop", "demo", "nocturnal"],
    peaks: peaks(7),
    duration: 138,
  },
  {
    medium: "image",
    title: "morning, unmade",
    sequenceNo: 4,
    artistName: "Ilse Kováč",
    artistHandle: "ilse_draws",
    date: "2026-07-02",
    tags: ["ink", "figure-drawing"],
    imageSvg: inkWash("#2b2a26", "#0c0c0b", 3),
    aspect: 0.8,
  },
  {
    medium: "words",
    title: null,
    sequenceNo: 47,
    artistName: "Tomás Rivera",
    artistHandle: "tomas_writes",
    date: "2026-07-05",
    tags: ["fragment", "tender"],
    words: "i kept the receipt from the night\nwe didn't say anything —\nproof we were both there,\nboth quiet, both staying.",
  },
  {
    medium: "sound",
    title: "yellow (one take)",
    sequenceNo: 3,
    artistName: "Junko Vance",
    artistHandle: "junko",
    date: "2026-07-08",
    tags: ["acoustic-cover", "raw"],
    peaks: peaks(21),
    duration: 201,
  },
  {
    medium: "image",
    title: null,
    sequenceNo: 19,
    artistName: "Bea Sorokin",
    artistHandle: "film_bea",
    date: "2026-07-10",
    tags: ["film-photo", "warm"],
    imageSvg: inkWash("#3a2f24", "#0b0a09", 12),
    aspect: 1.3,
  },
  {
    medium: "video",
    title: null,
    sequenceNo: 8,
    artistName: "Otis Delacroix",
    artistHandle: "otis_plays",
    date: "2026-07-12",
    tags: ["live-take", "performance"],
    imageSvg: inkWash("#20261a", "#0a0b08", 30),
    aspect: 1.4,
    duration: 96,
  },
] as const;
