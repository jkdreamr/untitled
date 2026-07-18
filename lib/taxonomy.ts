/**
 * The curated music taxonomy (~55 tags across four groups: genre, voice &
 * instrument, mood, and context). Used at onboarding (pick 3+), for tag
 * confirmation at upload, and as a discovery signal. Lowercase, hyphenated —
 * these ARE the tag strings.
 */
export interface TagGroup {
  key: string;
  label: string;
  tags: string[];
}

export const TAXONOMY: readonly TagGroup[] = [
  {
    key: "genre",
    label: "genre",
    tags: [
      "hip-hop",
      "rap",
      "r-and-b",
      "soul",
      "pop",
      "indie",
      "rock",
      "folk",
      "singer-songwriter",
      "bedroom-pop",
      "lo-fi",
      "jazz",
      "blues",
      "country",
      "electronic",
      "ambient",
      "afrobeats",
      "gospel",
    ],
  },
  {
    key: "voice",
    label: "voice & instrument",
    tags: [
      "vocals",
      "falsetto",
      "harmony",
      "rapping",
      "spoken-word",
      "a-cappella",
      "guitar",
      "piano",
      "keys",
      "bass",
      "drums",
      "strings",
      "sax",
      "beat",
      "instrumental",
    ],
  },
  {
    key: "mood",
    label: "mood",
    tags: [
      "melancholy",
      "warm",
      "nocturnal",
      "raw",
      "tender",
      "restless",
      "hopeful",
      "nostalgic",
      "playful",
      "moody",
      "euphoric",
      "heartbroken",
    ],
  },
  {
    key: "context",
    label: "context",
    tags: [
      "demo",
      "voice-memo",
      "live-take",
      "one-take",
      "home-recording",
      "unfinished",
      "snippet",
      "acoustic",
      "remix",
      "session",
    ],
  },
] as const;

/** Every valid tag, flat. */
export const ALL_TAGS: readonly string[] = TAXONOMY.flatMap((g) => g.tags);

const TAG_SET = new Set(ALL_TAGS);

export function isKnownTag(tag: string): boolean {
  return TAG_SET.has(tag);
}

/** Normalize free-typed tags: lowercase, hyphenate, strip junk, cap length/count. */
export function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    if (t.length >= 2 && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length >= 8) break;
  }
  return out;
}

/** A calm starter set shown in the composer before enrichment suggests more. */
const STARTER_TAGS = [
  "demo",
  "one-take",
  "acoustic",
  "lo-fi",
  "vocals",
  "raw",
] as const;

export function suggestedStarterTags(): string[] {
  return [...STARTER_TAGS];
}
