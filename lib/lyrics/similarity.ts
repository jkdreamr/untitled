/**
 * Sørensen–Dice coefficient over character bigrams — a cheap 0..1 similarity.
 * Used by the lyric-confirm flow: if an edited line drifts too far from the
 * transcribed line it was timed against, we keep the text but DROP its timing,
 * so the synced view never scrolls a line onto the wrong moment.
 */
export function diceCoefficient(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < x.length - 1; i++) {
    const g = x.slice(i, i + 2);
    bigrams.set(g, (bigrams.get(g) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < y.length - 1; i++) {
    const g = y.slice(i, i + 2);
    const count = bigrams.get(g) ?? 0;
    if (count > 0) {
      bigrams.set(g, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (x.length - 1 + (y.length - 1));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Timing is trustworthy only if the edited line still resembles the original. */
export const LYRIC_SIMILARITY_FLOOR = 0.6;
