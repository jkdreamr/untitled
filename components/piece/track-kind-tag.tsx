import type { TrackKind } from "@/lib/types";

/**
 * A small lime chip for a track's kind. 'original' is the default, so it stays
 * quiet (renders nothing) — we only call out covers, beats, and freestyles.
 */
export function TrackKindTag({ kind, className }: { kind: TrackKind; className?: string }) {
  if (kind === "original") return null;
  return (
    <span
      className={`rounded-full border border-lime/30 bg-lime/5 px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-lime ${className ?? ""}`}
    >
      {kind}
    </span>
  );
}

/** "cover of Yellow — Coldplay" style attribution. Text-only, always escaped. */
export function CoverOf({
  title,
  artist,
  verb = "cover of",
  className,
}: {
  title: string | null;
  artist: string | null;
  verb?: string;
  className?: string;
}) {
  if (!title && !artist) return null;
  return (
    <p className={`meta text-bone-52 ${className ?? ""}`}>
      {verb}{" "}
      {title && <span className="text-bone-64">{title}</span>}
      {title && artist ? " — " : ""}
      {artist && <span className="text-bone-64">{artist}</span>}
    </p>
  );
}
