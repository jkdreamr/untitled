"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmLyrics, type PendingTranscription } from "@/lib/lyrics/actions";
import { diceCoefficient, LYRIC_SIMILARITY_FLOOR } from "@/lib/lyrics/similarity";
import type { LyricSegment } from "@/lib/types";

interface Line {
  original: string;
  text: string;
  start: number;
  end: number;
  hasTiming: boolean;
}

/**
 * Owner-only: review the raw transcription and confirm it. Only after this does
 * anything become public. Lines the artist rewrites heavily (below the
 * similarity floor) keep their words but lose their timing, so the synced view
 * never lands a line on the wrong moment.
 */
export function LyricConfirm({ pieceId, pending }: { pieceId: string; pending: PendingTranscription }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo<Line[]>(() => {
    if (pending.segments.length > 0) {
      return pending.segments.map((s) => ({ original: s.text, text: s.text, start: s.start, end: s.end, hasTiming: true }));
    }
    return (pending.transcript ?? "")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ original: t, text: t, start: 0, end: 0, hasTiming: false }));
  }, [pending]);

  const [lines, setLines] = useState<Line[]>(initial);

  if (pending.already_confirmed || (!pending.transcript && pending.segments.length === 0)) return null;

  function setLine(i: number, text: string) {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, text } : l)));
  }

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const kept = lines.map((l) => l.text.trim()).filter(Boolean);
    const lyrics = kept.join("\n");
    if (!lyrics) {
      setError("there's nothing to confirm — edit the lines or discard.");
      setBusy(false);
      return;
    }
    // keep timing only for lines still close to what was transcribed
    const segments: LyricSegment[] = lines
      .filter((l) => l.hasTiming && l.text.trim() && diceCoefficient(l.text, l.original) >= LYRIC_SIMILARITY_FLOOR)
      .map((l) => ({ start: l.start, end: l.end, text: l.text.trim() }));

    const res = await confirmLyrics(pieceId, lyrics, segments);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "couldn't save the lyrics.");
      return;
    }
    router.refresh();
  }

  const droppedTiming = lines.filter(
    (l) => l.hasTiming && l.text.trim() && diceCoefficient(l.text, l.original) < LYRIC_SIMILARITY_FLOOR,
  ).length;

  return (
    <section className="mt-4 rounded-lg border border-lime/30 bg-lime/[0.04] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meta meta-caps text-lime">we transcribed this take</p>
          <p className="mt-2 text-sm text-bone-64">
            AI heard the vocal and wrote down the words. nothing shows publicly until you confirm —
            fix anything it got wrong, then make it yours.
          </p>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            review &amp; confirm
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 [animation:veil-up_.24s_var(--ease-out)_both]">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <input
                key={i}
                value={l.text}
                onChange={(e) => setLine(i, e.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-bone-16 bg-ink-sunken px-3 py-2 font-serif text-[1.05rem] text-bone outline-none focus-visible:border-lime/40"
              />
            ))}
          </div>

          {droppedTiming > 0 && (
            <p className="meta mt-3 text-bone-52">
              {droppedTiming} line{droppedTiming > 1 ? "s" : ""} changed a lot — {droppedTiming > 1 ? "they'll" : "it'll"}{" "}
              stay in the lyrics but won&apos;t scroll in time.
            </p>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-bone-64">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            <Button variant="solid" size="sm" onClick={onConfirm} disabled={busy}>
              {busy ? "saving…" : "confirm lyrics"}
            </Button>
            <button onClick={() => setOpen(false)} className="meta text-bone-64 hover:text-bone">
              not now
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
