import type { TrackMedium } from "@/lib/types";

/**
 * A curated, obviously-illustrative sampler for the logged-out landing strip.
 * Used only as a graceful fallback when the real seeded feed is empty, so the
 * page always feels alive. Fictional musicians, no fabricated metrics anywhere.
 */
export interface PreviewItem {
  medium: TrackMedium;
  title: string | null;
  sequenceNo: number;
  artistName: string;
  artistHandle: string;
  date: string;
  tags: string[];
  peaks?: number[];
  duration?: number;
  imageSvg?: string; // inline data URI (sampler video poster)
  imageUrl?: string; // signed URL / mux thumbnail (real pieces)
  lyrics?: string; // a short lyric teaser
  aspect?: number; // w/h for video
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
    lyrics: "if the kitchen light is still on\ni'm still awake, still humming this",
  },
  {
    medium: "video",
    title: "at the piano, 2am",
    sequenceNo: 4,
    artistName: "Ilse Kováč",
    artistHandle: "ilse_keys",
    date: "2026-07-02",
    tags: ["singer-songwriter", "live-take", "tender"],
    imageSvg: inkWash("#2b2a26", "#0c0c0b", 3),
    aspect: 1.4,
    duration: 112,
  },
  {
    medium: "sound",
    title: null,
    sequenceNo: 47,
    artistName: "Tomás Rivera",
    artistHandle: "tomas_raps",
    date: "2026-07-05",
    tags: ["hip-hop", "freestyle", "one-take"],
    peaks: peaks(51),
    duration: 89,
    lyrics: "kept the receipt from the night we said nothing —\nproof we were both there, both staying",
  },
  {
    medium: "sound",
    title: "yellow (one take)",
    sequenceNo: 3,
    artistName: "Junko Vance",
    artistHandle: "junko",
    date: "2026-07-08",
    tags: ["acoustic", "raw", "vocals"],
    peaks: peaks(21),
    duration: 201,
    lyrics: "look at the stars, look how they shine for you",
  },
  {
    medium: "sound",
    title: null,
    sequenceNo: 19,
    artistName: "Bea Sorokin",
    artistHandle: "bea_beats",
    date: "2026-07-10",
    tags: ["beat", "lo-fi", "instrumental"],
    peaks: peaks(66),
    duration: 74,
  },
  {
    medium: "video",
    title: null,
    sequenceNo: 8,
    artistName: "Otis Delacroix",
    artistHandle: "otis_plays",
    date: "2026-07-12",
    tags: ["blues", "live-take", "guitar"],
    imageSvg: inkWash("#20261a", "#0a0b08", 30),
    aspect: 1.4,
    duration: 96,
  },
] as const;
