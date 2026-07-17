import type { Medium } from "@/lib/types";

/**
 * The curated interest taxonomy (~60 tags across the four media + mood).
 * Used at onboarding (pick 3+), for tag confirmation at upload, and as a
 * discovery signal. Lowercase, hyphenated — these ARE the tag strings.
 */
export interface TagGroup {
  key: string;
  label: string;
  medium: Medium | "mood";
  tags: string[];
}

export const TAXONOMY: readonly TagGroup[] = [
  {
    key: "sound",
    label: "sound",
    medium: "sound",
    tags: [
      "bedroom-pop",
      "acoustic-cover",
      "demo",
      "voice-memo",
      "field-recording",
      "rap",
      "beat",
      "ambient",
      "folk",
      "lo-fi",
      "singer-songwriter",
      "jazz",
      "experimental",
      "a-cappella",
      "instrumental",
      "spoken-word",
    ],
  },
  {
    key: "image",
    label: "image",
    medium: "image",
    tags: [
      "film-photo",
      "digital-photo",
      "ink",
      "figure-drawing",
      "watercolor",
      "oil-painting",
      "sketch",
      "collage",
      "portrait",
      "landscape",
      "street-photo",
      "illustration",
      "printmaking",
      "still-life",
      "mixed-media",
    ],
  },
  {
    key: "video",
    label: "video",
    medium: "video",
    tags: [
      "live-take",
      "performance",
      "dance",
      "hand-drawn-animation",
      "short-film",
      "process",
      "one-take",
    ],
  },
  {
    key: "words",
    label: "words",
    medium: "words",
    tags: ["haiku", "poem", "lyrics", "fragment", "prose", "short-story", "essay", "letter"],
  },
  {
    key: "mood",
    label: "feeling",
    medium: "mood",
    tags: [
      "melancholy",
      "warm",
      "nocturnal",
      "minimal",
      "raw",
      "tender",
      "restless",
      "hopeful",
      "nostalgic",
      "playful",
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

/** Suggested starter tags for a given medium (used before enrichment lands). */
export function suggestedTagsForMedium(medium: Medium): string[] {
  const group = TAXONOMY.find((g) => g.medium === medium);
  return group ? group.tags.slice(0, 6) : [];
}
